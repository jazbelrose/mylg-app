#!/usr/bin/env node

const WebSocket = require('ws');
const http = require('http');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
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
  // Parse room ID from URL; "http://dummy" is just a dummy base URL for parsing
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = url.searchParams.get("room") || "default-room";

  // Reuse or create the Y.Doc for this room
  const doc = getYDoc(roomId);

  // Setup the connection with the shared Y.Doc
  setupWSConnection(ws, req, { doc });

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
  // Parse URL parameters for authentication
  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');
  const roomId = url.searchParams.get('room') || 'default-room';

  // Validate authentication
  if (!validateUser(userId)) {
    console.log('❌ Authentication failed for room:', roomId);
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

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