# Lexical Editor + Yjs Integration Analysis

## Current Implementation Overview

### Content Hydration Flow
1. **Initial Load**: `activeProject.description` (stringified Lexical JSON) → `LexicalEditor` `initialContent` prop
2. **Yjs Seeding**: `CollaborationPlugin` calls `initialEditorState` function when Yjs doc is empty
3. **Real-time Sync**: WebSocket provider synchronizes Yjs CRDT updates between clients
4. **Local Persistence**: IndexedDB stores Yjs binary updates per project ID

### Current Architecture Components

#### Client Side (`LexicalEditor.tsx`)
- **WebSocket Provider**: Connects to same-origin `/yjs` endpoint (was hardcoded `ws://35.165.113.63:1234`)
- **CollaborationPlugin**: Handles bidirectional sync between Lexical EditorState ↔ Yjs.Text
- **IndexeddbPersistence**: Browser-local storage of Yjs document state
- **YjsSyncPlugin**: Debounced re-renders when Yjs doc updates (Firefox optimization)

#### Server Side (`backend/EC2/bin/y-websocket/`)
- **server.cjs**: Basic WebSocket server, creates Y.Doc per room ID (project ID)
- **store.cjs**: Mock "InMemoryPersistence" that logs but doesn't actually persist

#### Integration Point (`editorPage.tsx`)
```tsx
<LexicalEditor
  key={activeProject?.projectId}
  initialContent={activeProject.description || undefined}
  onChange={() => {/* set dirty if you need */}}  // ← EMPTY CALLBACK
  registerToolbar={setBriefToolbarActions}
/>
```

### y-websocket EC2 Instance Role
- **Real-time Coordination**: Broadcasts Yjs CRDT updates between connected clients
- **Room Management**: Maintains separate Y.Doc instances per project ID
- **NO PERSISTENCE**: Server restart = all collaborative state lost
- **NO AUTHENTICATION**: Anyone with room ID can join

## Critical Issues Identified

### 1. "Mixing Lexical JSON Truth vs Yjs Truth"
**YES - This is happening:**

- **Database Truth**: `activeProject.description` contains stringified Lexical JSON
- **Collaborative Truth**: Yjs maintains binary CRDT state in memory/IndexedDB
- **Disconnect**: `onChange` callback is empty, so collaborative edits don't save to DB
- **Stale Risk**: If new user joins existing Yjs session, DB JSON may be outdated

### 2. No Final Persistence
**CONFIRMED**: 
- Server uses mock `InMemoryPersistence` that only logs
- No server-side storage of collaborative state
- IndexedDB is browser-local only

### 3. Missing Save Implementation
**CRITICAL**: The `onChange` callback in `editorPage.tsx` is empty:
```tsx
onChange={() => {/* set dirty if you need */}}
```

Should integrate with existing `updateProjectFields` API:
```tsx
const { updateProjectFields } = useData();
// ...
onChange={(json) => updateProjectFields(activeProject.projectId, { description: json })}
```

## Why Server-Only Persistence is Complex

The problem statement correctly identifies this challenge:

1. **Format Mismatch**: 
   - Database stores human-readable Lexical JSON
   - Yjs only understands binary CRDT updates (Uint8Array)

2. **Translation Overhead**:
   ```
   Client Edit → Yjs Binary Update → Server decodes → 
   Apply to Y.Doc → Export to Lexical JSON → Save to DB
   ```

3. **Constant Conversion**:
   - Every collaborative edit requires JSON ↔ Binary conversion
   - Risk of state divergence between formats
   - CPU-intensive for high-frequency updates

4. **Client Expectations**:
   - Lexical only accepts JSON for `setEditorState()`
   - Can't directly consume Yjs binary format

## Recommended Solution: "Plan A - JSON Truth"

### 1. Fix Load Order
**Current Issue**: Race condition between JSON load and Yjs sync

**Solution**: Implement proper initialization sequence:
```tsx
// In LexicalEditor.tsx - modify initialConfig
initialEditorState: (editor) => {
  const seed = parseInitialEditorState();
  if (!seed) return;
  
  // Set editor state FIRST, before Yjs collaboration starts
  const parsed = editor.parseEditorState(seed);
  editor.setEditorState(parsed);
}
```

### 2. Implement Debounced JSON Save
**Options:**
- **Client-side debounced save** (simpler, recommended)
- Server-side RPC with leader election
- DynamoDB optimistic locking

**Implementation**:
```tsx
// In editorPage.tsx
const debouncedSave = useMemo(
  () => debounce((json: string) => {
    updateProjectFields(activeProject.projectId, { description: json });
  }, 2000),
  [activeProject.projectId, updateProjectFields]
);

// Replace empty onChange
onChange={debouncedSave}
```

### 3. Security & Performance Improvements

#### Server-side (`server.cjs`):
```javascript
// Add JWT validation on upgrade
server.on('upgrade', (req, socket, head) => {
  const token = new URL(req.url, "http://dummy").searchParams.get("token");
  if (!validateJWT(token)) {
    socket.destroy();
    return;
  }
  // ... existing handleAuth
});

// Add heartbeat pings
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  });
}, 30000);
```

#### Client-side:
```tsx
// Disable compression if not needed
const provider = new WebsocketProvider(
  WS_ENDPOINT + `?token=${authToken}`, 
  id, 
  doc,
  { disableBC: true } // Disable BroadcastChannel for security
);
```

### 4. Remove Yjs Server Persistence
**Current `store.cjs` should remain as-is** - it's already not persisting, which is correct for "JSON truth" approach.

**Optional**: Remove IndexedDB persistence for simpler architecture:
```tsx
// Remove this line if not needed:
persistenceRef.current = new IndexeddbPersistence(id, doc);
```

## Implementation Priority

### High Priority (Critical)
- [ ] Fix empty `onChange` callback in `editorPage.tsx`
- [ ] Implement debounced save mechanism
- [ ] Add JWT authentication to WebSocket

### Medium Priority (Important)
- [ ] Correct load order to avoid race conditions
- [ ] Add rate limiting and heartbeat pings
- [ ] Remove hardcoded WebSocket endpoint

### Low Priority (Nice to have)
- [ ] Remove IndexedDB persistence (if not needed)
- [ ] Add compression toggle
- [ ] Implement proper error handling

## Code Changes Required

### 1. Fix Save Implementation (`editorPage.tsx`)
```tsx
const handleDescriptionChange = useCallback(
  debounce((json: string) => {
    updateProjectFields(activeProject?.projectId, { description: json });
  }, 2000),
  [activeProject?.projectId, updateProjectFields]
);

// Replace:
onChange={() => {/* set dirty if you need */}}
// With:
onChange={handleDescriptionChange}
```

### 2. Add Authentication (`server.cjs`)
```javascript
const { validateToken } = require('./auth-utils');

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, "http://dummy");
  const token = url.searchParams.get("token");
  
  if (!validateToken(token)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});
```

### 3. Update Client WebSocket Connection
```tsx
const getProvider = useCallback((id: string, yjsDocMap: Map<string, Y.Doc>) => {
  // ... existing code ...
  
  const wsUrl = `${WS_ENDPOINT}?token=${authToken}&room=${id}`;
  const provider = new WebsocketProvider(wsUrl, id, doc);
  
  // ... rest of implementation
}, [WS_ENDPOINT, authToken]);
```

## Summary

**Current State**: Mixed truth sources with incomplete save implementation
**Root Issue**: Empty `onChange` callback means collaborative edits don't persist to database
**Recommended Approach**: JSON as source of truth with proper save mechanism and security improvements
**Why Not Server Persistence**: Format translation overhead and complexity vs minimal benefit