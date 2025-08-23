#!/usr/bin/env node
const http = require('http');
const WebSocket = require('ws');
const { setupWSConnection, setPersistence } = require('y-websocket/bin/utils');
const { persistence } = require('./store.cjs');

setPersistence(persistence);
console.log('[server] persistence set');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 1234);

const server = http.createServer((req, res) => {
  console.log('[http] %s %s ua=%s ip=%s',
    req.method, req.url, req.headers['user-agent'], req.socket?.remoteAddress);
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('okay');
});

const wss = new WebSocket.Server({ noServer: true });

// Basic JWT validation function
function validateJWT(token) {
  try {
    // Simple validation - check if token exists and has basic JWT structure
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Check for JWT format (three parts separated by dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }
    
    // For now, just check that it's a valid JWT structure
    // In production, you would validate signature and expiration
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    
    // Check if token is not expired (if exp claim exists)
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.log('[auth] Token expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[auth] JWT validation error:', error.message);
    return false;
  }
}

// Authentication middleware
function authenticateWebSocket(request) {
  try {
    // Check for authentication in WebSocket subprotocols
    const protocols = request.headers['sec-websocket-protocol'];
    if (!protocols) {
      console.log('[auth] No WebSocket protocols provided');
      return false;
    }
    
    // Parse protocols array
    const protocolArray = protocols.split(',').map(p => p.trim());
    
    // Look for JWT token in the first protocol
    const jwtToken = protocolArray[0];
    const sessionId = protocolArray[1];
    
    if (!jwtToken || !sessionId) {
      console.log('[auth] Missing JWT token or session ID in protocols');
      return false;
    }
    
    // Validate the JWT token
    if (!validateJWT(jwtToken)) {
      console.log('[auth] Invalid JWT token');
      return false;
    }
    
    console.log('[auth] Authentication successful for session:', sessionId.substring(0, 8) + '...');
    return true;
  } catch (error) {
    console.error('[auth] Authentication error:', error.message);
    return false;
  }
}

function normalizeDocNameFromUrl(reqUrl) {
  // Accept paths like: /yjs/project/<projectId>/<subdoc> (e.g., /yjs/project/9000/description)
  const u = new URL(reqUrl || '/', 'http://local');
  const parts = u.pathname.split('/').filter(Boolean);

  // Minimal guard
  if (parts.length < 4 || parts[0] !== 'yjs' || parts[1] !== 'project') {
    throw new Error(`Bad path: ${u.pathname}. Expected /yjs/project/<id>/<subdoc>`);
  }

  const projectId = decodeURIComponent(parts[2]);
  const subdoc = parts.slice(3).join('/'); // allow deeper nesting if you ever need it
  // Room name that store.cjs understands (it will map to docId="<id>#<subdoc>")
  return `project/${projectId}/${subdoc}`;
}

wss.on('connection', (ws, req) => {
  // Authenticate the WebSocket connection
  if (!authenticateWebSocket(req)) {
    console.error('[ws] rejecting connection: authentication failed');
    ws.close(1008, 'authentication failed');
    return;
  }

  let docName;
  try {
    docName = normalizeDocNameFromUrl(req.url || '/');
  } catch (e) {
    console.error('[ws] rejecting connection: %s', e.message);
    ws.close(1008, 'invalid room');
    return;
  }

  console.log('[ws] connection open url=%s doc=%s ip=%s', req.url, docName, req.socket?.remoteAddress);

  ws.on('close', (code, reason) => {
    console.log('[ws] connection close doc=%s code=%s reason=%s', docName, code, reason);
  });
  ws.on('error', (err) => {
    console.error('[ws] connection error doc=%s err=%s stack=%s', docName, err?.message, err?.stack);
  });

  setupWSConnection(ws, req, { docName });
  console.log('[ws] setupWSConnection done doc=%s', docName);
});

server.on('upgrade', (req, socket, head) => {
  console.log('[upgrade] %s ip=%s ua=%s', req.url, req.socket?.remoteAddress, req.headers['user-agent']);
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

server.listen(port, host, () => {
  console.log(`[server] WebSocket server running at '${host}' on port ${port}`);
});
