# Lexical Editor Architecture Documentation

## Overview

The mylg-app implements a real-time collaborative text editor using Facebook's Lexical framework combined with Yjs for operational transformation and conflict resolution. This document provides a comprehensive analysis of the current implementation, data flow, and suggested improvements.

## Current Architecture

### Core Technologies

- **Frontend**: React + TypeScript with Vite
- **Editor**: Lexical (@lexical/react v0.34.0)
- **Real-time Collaboration**: Yjs (v13.6.27) + y-websocket (v3.0.0)
- **Local Persistence**: y-indexeddb (v9.0.12)
- **Backend**: Node.js WebSocket server + AWS Lambda WebSocket API

### Component Hierarchy

```
LexicalEditor.tsx (Main Editor)
├── LexicalComposer (Lexical Framework)
├── CollaborationPlugin (@lexical/react)
├── YjsSyncPlugin (Custom Plugin)
├── Various Editor Plugins
│   ├── RichTextPlugin
│   ├── ListPlugin
│   ├── LinkPlugin
│   ├── ImagePlugin
│   ├── DragAndDropPlugin
│   └── TextStylePlugin
└── Toolbar Components
```

## Data Flow Architecture

### 1. Content Hydration Process

#### Initial Load Sequence:
1. **Project Selection**: When a user selects a project, the `projectId` is derived from `activeProject`
2. **Provider Creation**: `getProvider()` function creates or reuses a YJS WebSocket provider
3. **Document Initialization**: 
   - YJS document (`Y.Doc`) is created for the project
   - IndexedDB persistence is established for offline access
   - WebSocket connection to YJS server is initiated
4. **Content Loading**:
   - `initialContent` prop contains stringified Lexical JSON from database
   - `CollaborationPlugin` handles the initial editor state hydration
   - If content exists locally in IndexedDB, it may merge with remote content

#### Code Flow:
```typescript
// LexicalEditor.tsx - Provider Creation
const getProvider = useCallback((id: string, yjsDocMap: Map<string, Y.Doc>) => {
  let doc = yjsDocMap.get(id);
  if (!doc) {
    doc = new Y.Doc();
    yjsDocMap.set(id, doc);
  }
  
  // Local persistence
  const persistence = new IndexeddbPersistence(id, doc);
  
  // Real-time collaboration
  const provider = new WebsocketProvider(WS_ENDPOINT, id, doc);
  
  return provider;
}, [WS_ENDPOINT]);
```

### 2. Real-time Synchronization

#### YJS WebSocket Server Role:
- **Location**: Runs on EC2 instance (currently hardcoded to specific IP in legacy code)
- **Purpose**: Central coordination point for all editor document changes
- **Technology**: Node.js with `y-websocket` library

#### Synchronization Flow:
1. **User Types**: User makes changes in the Lexical editor
2. **Change Detection**: `OnChangePlugin` captures editor state changes
3. **YJS Integration**: `YjsSyncPlugin` listens for YJS document updates
4. **Operational Transform**: YJS applies operational transformation for conflict resolution
5. **Broadcast**: Changes are broadcast to all connected clients via WebSocket
6. **Local Update**: Other clients receive and apply changes to their editors

#### YJS Server Implementation:
```javascript
// backend/yjs-server/server.cjs
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');

// Document name normalization for project-based rooms
function normalizeDocNameFromUrl(reqUrl) {
  // Accepts: /yjs/project/<projectId>/<subdoc>
  const parts = u.pathname.split('/').filter(Boolean);
  const projectId = decodeURIComponent(parts[2]);
  const subdoc = parts.slice(3).join('/');
  return `project/${projectId}/${subdoc}`;
}
```

### 3. Data Persistence Strategy

#### Multi-layer Persistence:
1. **Local (Browser)**:
   - IndexedDB via `y-indexeddb`
   - Automatic sync when online
   - Offline editing capability
   
2. **Memory (YJS Server)**:
   - In-memory document storage
   - Fast access for real-time collaboration
   - Lost on server restart (needs improvement)

3. **Database Persistence**:
   - Stringified Lexical JSON stored in main database
   - Triggered by `OnChangePlugin` in parent component
   - Used for initial content loading

#### Data Saving Flow:
```typescript
// OnChangePlugin callback
useEffect(() => {
  editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      const json = JSON.stringify(editorState.toJSON());
      console.log("[Editor State] Updated:", json);
      onChange(json); // Saves to database via parent component
    });
  });
}, [onChange]);
```

## Current Implementation Analysis

### Strengths
1. **Real-time Collaboration**: Effective use of YJS for conflict-free replicated data types
2. **Offline Support**: IndexedDB provides local persistence
3. **Modular Design**: Plugin-based architecture for extensibility
4. **Rich Editing**: Comprehensive plugin ecosystem for various content types

### Current Issues

#### 1. **Connection Management**
- **Problem**: Limited error handling for WebSocket disconnections
- **Impact**: Users may lose real-time sync without notification
- **Evidence**: No reconnection logic in current YjsSyncPlugin

#### 2. **Performance Concerns**
- **Problem**: Frequent updates may cause performance issues
- **Impact**: Especially problematic in Firefox (addressed with debouncing in YjsSyncPlugin)
- **Evidence**: 16ms debounce timeout added specifically for Firefox

#### 3. **Security Vulnerabilities**
- **Problem**: No authentication on YJS WebSocket connections
- **Impact**: Anyone with endpoint access can join collaboration sessions
- **Evidence**: WebSocket server accepts all connections without validation

#### 4. **Infrastructure Limitations**
- **Problem**: Hardcoded EC2 WebSocket endpoint (legacy code)
- **Impact**: Single point of failure, no load balancing
- **Evidence**: `ws://35.165.113.63:1234` in older code versions

#### 5. **Data Persistence Gaps**
- **Problem**: YJS server doesn't persist to permanent storage
- **Impact**: Document history lost on server restart
- **Evidence**: Only in-memory persistence in current implementation

#### 6. **Project Switching Issues**
- **Problem**: Incomplete cleanup when switching between projects
- **Impact**: Memory leaks and potential data contamination
- **Evidence**: IndexedDB cleanup in useEffect but provider cleanup is limited

## Suggested Improvements

### 1. **Enhanced Connection Resilience**

#### Implementation:
```typescript
// Enhanced YjsSyncPlugin with reconnection
const YjsSyncPluginEnhanced = ({ provider }) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!provider) return;

    const handleConnectionChange = (status) => {
      setConnectionStatus(status);
      if (status === 'disconnected' && reconnectAttempts.current < maxReconnectAttempts) {
        setTimeout(() => {
          reconnectAttempts.current++;
          provider.connect();
        }, Math.pow(2, reconnectAttempts.current) * 1000);
      }
    };

    provider.on('status', handleConnectionChange);
    return () => provider.off('status', handleConnectionChange);
  }, [provider]);

  return <ConnectionStatusIndicator status={connectionStatus} />;
};
```

### 2. **Security Enhancements**

#### JWT-based Authentication:
```typescript
// Secure WebSocket connection
const createSecureProvider = async (projectId: string, doc: Y.Doc) => {
  const token = await getAuthTokens();
  const provider = new WebsocketProvider(
    `${WS_ENDPOINT}?token=${token.idToken}`,
    projectId,
    doc
  );
  return provider;
};
```

#### Server-side Authentication:
```javascript
// backend/yjs-server/server.cjs - Add authentication
wss.on('connection', async (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  
  try {
    const user = await verifyJWTToken(token);
    ws.userId = user.sub;
    ws.userRole = user.role;
  } catch (error) {
    ws.close(1008, 'Unauthorized');
    return;
  }
  
  // Continue with existing connection logic...
});
```

### 3. **Persistent Document Storage**

#### Database Integration:
```javascript
// Enhanced store.cjs with database persistence
const { DynamoDB } = require('aws-sdk');
const dynamodb = new DynamoDB.DocumentClient();

const persistence = {
  async bindState(docName, ydoc) {
    // Load from DynamoDB
    const { Item } = await dynamodb.get({
      TableName: 'YjsDocuments',
      Key: { docName }
    }).promise();
    
    if (Item?.content) {
      Y.applyUpdate(ydoc, Buffer.from(Item.content, 'base64'));
    }
  },

  async writeState(docName, ydoc) {
    // Save to DynamoDB
    const update = Y.encodeStateAsUpdate(ydoc);
    await dynamodb.put({
      TableName: 'YjsDocuments',
      Item: {
        docName,
        content: Buffer.from(update).toString('base64'),
        lastModified: new Date().toISOString()
      }
    }).promise();
  }
};
```

### 4. **Performance Optimizations**

#### Debounced Sync with Batching:
```typescript
const useOptimizedSync = (provider: ProviderLike) => {
  const batchedUpdates = useRef<Set<() => void>>(new Set());
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  const flushUpdates = useCallback(() => {
    if (batchedUpdates.current.size > 0) {
      // Process all batched updates
      batchedUpdates.current.forEach(update => update());
      batchedUpdates.current.clear();
    }
    flushTimeout.current = null;
  }, []);

  const scheduleUpdate = useCallback((updateFn: () => void) => {
    batchedUpdates.current.add(updateFn);
    
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    
    flushTimeout.current = setTimeout(flushUpdates, 16); // ~60fps
  }, [flushUpdates]);

  return { scheduleUpdate };
};
```

### 5. **Infrastructure Modernization**

#### AWS-Native WebSocket Implementation:
```typescript
// Replace EC2-based YJS server with AWS API Gateway WebSocket
const AWS_WEBSOCKET_ENDPOINT = process.env.REACT_APP_WS_ENDPOINT;

// Custom WebSocket provider for AWS API Gateway
class AWSWebSocketProvider extends WebsocketProvider {
  constructor(room: string, doc: Y.Doc, authToken: string) {
    super(`${AWS_WEBSOCKET_ENDPOINT}?room=${room}&token=${authToken}`, room, doc);
  }
}
```

### 6. **Monitoring and Analytics**

#### Connection Health Monitoring:
```typescript
const useConnectionHealth = (provider: ProviderLike) => {
  const [metrics, setMetrics] = useState({
    latency: 0,
    reconnectCount: 0,
    lastSync: null,
    syncErrors: 0
  });

  useEffect(() => {
    const startTime = Date.now();
    
    const handleSync = () => {
      setMetrics(prev => ({
        ...prev,
        latency: Date.now() - startTime,
        lastSync: new Date()
      }));
    };

    const handleError = () => {
      setMetrics(prev => ({
        ...prev,
        syncErrors: prev.syncErrors + 1
      }));
    };

    provider.on('sync', handleSync);
    provider.on('error', handleError);

    return () => {
      provider.off('sync', handleSync);
      provider.off('error', handleError);
    };
  }, [provider]);

  return metrics;
};
```

### 7. **Enhanced Project Management**

#### Clean Project Switching:
```typescript
const useProjectSwitching = () => {
  const activeConnections = useRef<Map<string, WebsocketProvider>>(new Map());
  
  const switchProject = useCallback(async (newProjectId: string) => {
    // Cleanup previous connections
    for (const [projectId, provider] of activeConnections.current) {
      if (projectId !== newProjectId) {
        provider.disconnect();
        provider.destroy();
        activeConnections.current.delete(projectId);
      }
    }
    
    // Clear IndexedDB for previous project
    await clearPreviousProjectData();
    
    // Initialize new project
    const newProvider = await createProvider(newProjectId);
    activeConnections.current.set(newProjectId, newProvider);
    
    return newProvider;
  }, []);

  return { switchProject };
};
```

## Migration Strategy

### Phase 1: Security and Stability
1. Implement JWT authentication for WebSocket connections
2. Add connection health monitoring and error handling
3. Improve project switching cleanup

### Phase 2: Performance and Scalability
1. Implement database persistence for YJS documents
2. Add performance monitoring and optimization
3. Replace hardcoded endpoints with environment configuration

### Phase 3: Infrastructure Modernization
1. Migrate from EC2-based WebSocket to AWS API Gateway
2. Implement load balancing and auto-scaling
3. Add comprehensive monitoring and alerting

### Phase 4: Advanced Features
1. Document versioning and history
2. Advanced collaboration features (presence indicators, cursors)
3. Real-time commenting and suggestions

## Conclusion

The current Lexical editor implementation provides a solid foundation for real-time collaborative editing. However, there are significant opportunities for improvement in security, performance, and infrastructure resilience. The suggested improvements would transform the editor into a production-ready, scalable solution suitable for enterprise use.

The modular architecture makes it possible to implement these improvements incrementally without disrupting the existing functionality, allowing for a gradual migration that minimizes risk while maximizing benefit.