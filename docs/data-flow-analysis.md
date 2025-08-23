# Data Flow Analysis: Real-time Collaborative Editor Architecture

## Overview

This document analyzes the end-to-end data flow for the real-time collaborative editor system in mylg-app, covering the backend yjs-websocket server, frontend DataProvider context, EditorPage component, and LexicalEditor component.

## Architecture Summary

The application implements a "JSON Truth" architecture where:
- **Database**: Stores authoritative human-readable Lexical JSON
- **Yjs**: Provides real-time collaboration layer using binary CRDT format
- **No Server-side Conversion**: Avoids constant JSON ↔ Binary conversion overhead
- **Debounced Persistence**: Ensures persistence without API spam

## Component Analysis

### 1. Backend: yjs-websocket Server

**Location**: `backend/yjs-websocket/`
**URL**: `ws://35.165.113.63:1234` (EC2 instance)

#### Key Files:
- `bin/server.cjs` - WebSocket server implementation
- `bin/store.cjs` - Persistence layer (DynamoDB or in-memory)

#### Data Flow:
```
1. Client connects via WebSocket to: ws://35.165.113.63:1234
2. Server normalizes document names: /yjs/project/<projectId>/<subdoc>
3. Maps to docId format: <projectId>#<subdoc> (e.g., "9000#description")
4. Creates Y.Doc instance for real-time collaboration
5. Optionally persists to DynamoDB with 3-second debouncing
```

#### Persistence Behavior:
```javascript
// When USE_DDB_PERSISTENCE=1
- Reads from DynamoDB on document initialization
- Seeds Yjs Y.Text if document is empty
- Debounced saves (3s) on document updates
- Stores serialized Y.Text content as string

// When USE_DDB_PERSISTENCE!=1 (default)
- Uses in-memory persistence only
- No cross-session persistence
```

#### URL Structure:
- **Expected**: `/yjs/project/<projectId>/<subdoc>`
- **Example**: `/yjs/project/abc123/description`
- **DocId**: `abc123#description`

### 2. Frontend: DataProvider Context

**Location**: `src/app/contexts/DataProvider.tsx`

#### Responsibilities:
- Manages project state and active project selection
- Provides `updateProjectFields()` for database persistence
- Stores projects with `description` field (Lexical JSON format)

#### Key Functions:
```typescript
updateProjectFields(projectId: string, fields: Partial<Project>): Promise<void>
// Calls API to update project in database
// Used by EditorPage to save description changes
```

#### Data Storage:
```typescript
interface Project {
  projectId: string;
  title?: string;
  description?: string; // Lexical JSON format
  // ... other fields
}
```

### 3. Frontend: EditorPage Component

**Location**: `src/pages/dashboard/editorPage.tsx`

#### Data Flow:
```typescript
1. Receives activeProject from DataProvider
2. Extracts activeProject.description (Lexical JSON)
3. Passes to LexicalEditor as initialContent
4. Sets up debounced save (2 seconds)
5. On editor changes: calls updateProjectFields()
```

#### Debounced Save Implementation:
```typescript
const debouncedSaveDescription = useMemo(
  () => debounce((json: string) => {
    if (activeProject?.projectId) {
      updateProjectFields(activeProject.projectId, { description: json });
    }
  }, 2000), // 2 second debounce
  [activeProject?.projectId, updateProjectFields]
);
```

### 4. Frontend: LexicalEditor Component

**Location**: `src/components/LexicalEditor/LexicalEditor.tsx`

#### Initialization Flow:
```typescript
1. Creates projectId from activeProject
2. Sets up WebSocket provider: new WebsocketProvider("ws://35.165.113.63:1234", id, doc)
3. Creates IndexeddbPersistence for local storage
4. Initializes CollaborationPlugin with provider
5. Sets up OnChangePlugin to trigger parent onChange
```

#### Provider Setup:
```typescript
const getProvider = useCallback((id: string, yjsDocMap: Map<string, Y.Doc>) => {
  let doc = yjsDocMap.get(id);
  if (!doc) {
    doc = new Y.Doc();
    yjsDocMap.set(id, doc);
  }
  
  // Local persistence
  const persistence = new IndexeddbPersistence(id, doc);
  
  // WebSocket for real-time collaboration
  const provider = new WebsocketProvider("ws://35.165.113.63:1234", id, doc);
  
  return provider;
}, []);
```

## Complete Data Flow End-to-End

### Initial Load (Hydration)
```
1. DataProvider loads projects from API
   └── Projects include description field (Lexical JSON)

2. EditorPage receives activeProject
   └── Extracts activeProject.description

3. LexicalEditor initializes
   ├── Creates Y.Doc for projectId
   ├── Sets up IndexeddbPersistence (local)
   ├── Connects WebSocket to yjs-websocket server
   └── Initializes with activeProject.description
```

### Real-time Collaboration
```
1. User types in LexicalEditor
   ├── Lexical creates EditorState changes
   ├── CollaborationPlugin syncs to Y.Doc
   └── WebSocket sends binary updates to server

2. Server distributes updates
   ├── Receives binary Y.Doc updates
   ├── Broadcasts to all connected clients
   └── Optionally saves to DynamoDB (debounced)

3. Other clients receive updates
   ├── WebSocket receives binary updates
   ├── Y.Doc applies changes
   └── Lexical editor updates automatically
```

### Persistence to Database
```
1. LexicalEditor OnChangePlugin triggers
   └── Calls onChange(jsonString) with Lexical JSON

2. EditorPage debounced save (2s)
   └── Calls updateProjectFields(projectId, { description: json })

3. DataProvider updateProjectFields
   └── Makes API call to EDIT_PROJECT_URL

4. Backend API updates project
   └── Stores Lexical JSON in database
```

## Current Architecture Strengths

### ✅ Efficient Real-time Collaboration
- Binary CRDT format minimizes network overhead
- Yjs handles conflict resolution automatically
- Cross-tab communication via BroadcastChannel

### ✅ Offline Capabilities
- IndexeddbPersistence provides local storage
- Editor works offline with local sync

### ✅ Scalable Persistence Strategy
- Avoids constant JSON ↔ Binary conversion
- Database remains authoritative source
- Debounced saves prevent API spam

### ✅ Separation of Concerns
- Real-time layer (Yjs) separate from persistence layer
- Clean component boundaries

## Identified Issues & Improvement Opportunities

### 🚨 Critical Issues

#### 1. **Race Condition Risk**
```
Problem: Real-time updates and database saves are not coordinated
Scenario: 
- User A makes changes → triggers debounced save
- User B makes changes → overwrites A's changes before save completes
- Database receives stale data

Suggestion: Implement conflict resolution or version locking
```

#### 2. **Error Handling Gaps**
```
Problem: Limited error handling for network failures
Issues:
- WebSocket disconnection handling
- Database save failures
- Conflicting state between local and remote

Suggestion: Implement retry logic and conflict resolution UI
```

#### 3. **Hard-coded WebSocket URL**
```
Problem: WebSocket URL is hard-coded in component
Current: "ws://35.165.113.63:1234"

Suggestion: Move to environment variables or configuration
```

### 🔄 Architecture Improvements

#### 1. **State Synchronization**
```typescript
// Current: Two separate persistence paths
// 1. Yjs → WebSocket → Server (real-time)
// 2. Lexical → API → Database (persistence)

// Suggested: Unified state management
interface EditorState {
  localChanges: EditorState;
  remoteChanges: Y.Doc;
  lastSaved: timestamp;
  conflictResolution: 'local' | 'remote' | 'manual';
}
```

#### 2. **Enhanced Error Recovery**
```typescript
// Suggested: Robust error handling
class EditorErrorHandler {
  handleWebSocketDisconnect(): void;
  handleSaveFailure(error: Error): void;
  resolveConflicts(local: EditorState, remote: EditorState): EditorState;
  showConflictResolutionUI(): void;
}
```

#### 3. **Configuration Management**
```typescript
// Suggested: Environment-based configuration
interface EditorConfig {
  websocketUrl: string;
  debounceMs: number;
  retryAttempts: number;
  conflictResolution: 'auto' | 'manual';
}
```

### 📊 Performance Improvements

#### 1. **Connection Pooling**
```
Current: Each project creates new WebSocket connection
Suggested: Shared connection with document multiplexing
```

#### 2. **Optimistic Updates**
```
Current: Changes require round-trip for persistence
Suggested: Optimistic UI updates with rollback on failure
```

#### 3. **Incremental Persistence**
```
Current: Saves entire document on change
Suggested: Delta-based persistence for large documents
```

## Implementation Roadmap

### Phase 1: Critical Fixes (High Priority)
1. **Environment Configuration**
   - Move WebSocket URL to environment variables
   - Add configuration for debounce timings

2. **Error Handling**
   - Implement WebSocket reconnection logic
   - Add save failure retry mechanism

3. **Monitoring & Logging**
   - Add telemetry for connection status
   - Log persistence failures and conflicts

### Phase 2: Architecture Improvements (Medium Priority)
1. **State Management**
   - Implement conflict detection
   - Add manual conflict resolution UI

2. **Performance Optimization**
   - Connection pooling for multiple documents
   - Optimistic updates

### Phase 3: Advanced Features (Low Priority)
1. **Enhanced Collaboration**
   - User presence indicators
   - Change attribution and history

2. **Scalability**
   - Document sharding for large projects
   - Horizontal scaling of WebSocket servers

## Security Considerations

### Authentication
- WebSocket connections should validate user permissions
- Document access should be restricted by project membership

### Data Validation
- Sanitize content before persistence
- Validate document structure integrity

### Rate Limiting
- Implement rate limiting on WebSocket connections
- Prevent abuse of persistence endpoints

## Conclusion

The current architecture successfully implements real-time collaboration while maintaining a clean separation between the collaboration layer (Yjs) and persistence layer (Database). The "JSON Truth" approach avoids complexity while ensuring data integrity.

Key improvements should focus on error handling, conflict resolution, and configuration management before pursuing advanced features. The architecture is well-positioned for scaling with proper implementation of the suggested improvements.