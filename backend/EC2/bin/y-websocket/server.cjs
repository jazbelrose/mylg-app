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

wss.on('connection', (ws, req) => {
  // Extract room ID from URL path (standard y-websocket approach)
  // URL format: /roomId?userId=123 or /roomId (roomId becomes the docName)
  const roomId = (req.url || '').slice(1).split('?')[0] || 'default-room';

  // Reuse or create the Y.Doc for this room
  const doc = getYDoc(roomId);

  // Setup the connection with the shared Y.Doc - pass the doc explicitly
  setupWSConnection(ws, req, { docName: roomId, doc });

  // Add heartbeat
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
});

// Heartbeat mechanism to detect broken connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('💔 Terminating broken connection');
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

  // Validate authentication
  if (!validateUser(userId)) {
    console.log('❌ Authentication failed for user:', userId, 'room:', roomId);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Log with cleaner format - show username (we'll improve this to show actual username later)
  console.log('✅ User authenticated:', userId, 'for room:', roomId);

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