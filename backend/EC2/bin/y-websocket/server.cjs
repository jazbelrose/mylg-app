#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection, setPersistence } = require('./utils.cjs');
const Y = require('yjs');

// Simple JWT validation (replace with actual JWT library in production)
function validateUser(userId) {
  // In production, validate JWT token and extract userId
  // For now, just check if userId is provided and non-empty
  return userId && typeof userId === 'string' && userId.trim().length > 0;
}

// Room access validation (implement your business logic here)
function validateRoomAccess(userId, roomId) {
  // In production, check if user has permission to access this room/project
  // For now, allow access if user is authenticated
  
  // Example business rules you might implement:
  // - Check if user is a member of the project
  // - Check if project is public
  // - Check user permissions/role
  
  return validateUser(userId);
}

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 1234;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});
const wss = new WebSocket.Server({ noServer: true });

// Global cache for Y.Doc instances
const yDocs = new Map();
function getYDoc(roomId) {
  if (!yDocs.has(roomId)) {
    const doc = new Y.Doc();
    yDocs.set(roomId, doc);
  }
  return yDocs.get(roomId);
}

// Room tracking for better isolation and debugging
const roomConnections = new Map(); // roomId -> Set of {ws, userId, userName}

wss.on('connection', (ws, req) => {
  // Extract room ID from URL path (standard y-websocket approach)
  const roomId = (req.url || '').slice(1).split('?')[0] || 'default-room';
  
  // Parse user info from URL parameters  
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  const userName = url.searchParams.get('userName') || userId || 'anonymous';

  // Reuse or create the Y.Doc for this room
  const doc = getYDoc(roomId);

  // Track connection in room
  if (!roomConnections.has(roomId)) {
    roomConnections.set(roomId, new Set());
  }
  const connectionInfo = { ws, userId, userName, roomId };
  roomConnections.get(roomId).add(connectionInfo);

  console.log(`🔗 User ${userName} connected to room: ${roomId} (${roomConnections.get(roomId).size} users in room)`);

  // Setup the connection with the shared Y.Doc - pass the doc explicitly
  setupWSConnection(ws, req, { docName: roomId, doc });

  // Add heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle disconnection
  ws.on('close', () => {
    // Remove from room tracking
    if (roomConnections.has(roomId)) {
      roomConnections.get(roomId).delete(connectionInfo);
      if (roomConnections.get(roomId).size === 0) {
        roomConnections.delete(roomId);
        console.log(`📤 User ${userName} disconnected from room: ${roomId} (room now empty)`);
      } else {
        console.log(`📤 User ${userName} disconnected from room: ${roomId} (${roomConnections.get(roomId).size} users remaining)`);
      }
    }
  });
});

// Heartbeat mechanism to detect broken connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('💔 Terminating broken connection');
      // The close event will handle room cleanup
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping();
  });
}, 30000); // Check every 30 seconds

server.on('upgrade', (req, socket, head) => {
  // Extract room ID from URL path (standard y-websocket approach)
  const roomId = (req.url || '').slice(1).split('?')[0] || 'default-room';
  
  // Parse URL parameters for authentication
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  const userName = url.searchParams.get('userName') || userId || 'anonymous';

  // Validate authentication
  if (!validateUser(userId)) {
    console.log('❌ Authentication failed for user:', userName, 'room:', roomId);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Validate room access
  if (!validateRoomAccess(userId, roomId)) {
    console.log('❌ Room access denied for user:', userName, 'room:', roomId);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  // Log with cleaner format showing username and room
  console.log('✅ User authenticated:', userName, 'for room:', roomId);

  const handleAuth = ws => {
    wss.emit('connection', ws, req);
  };
  wss.handleUpgrade(req, socket, head, handleAuth);
});

server.listen(port, host, () => {
  console.log(`🚀 WebSocket server running at '${host}' on port ${port}`);
  console.log(`📡 Y.js collaborative editing enabled with authentication`);
});

// Clean up heartbeat on server close
wss.on('close', () => {
  clearInterval(heartbeat);
});