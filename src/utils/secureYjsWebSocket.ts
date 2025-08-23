// Secure WebSocket provider for Yjs with authentication
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { logSecurityEvent } from "./securityUtils";

export interface SecureWebsocketProviderOptions {
  connect?: boolean;
  awareness?: any;
  params?: Record<string, string>;
  protocols?: string[];
  WebSocketPolyfill?: typeof WebSocket;
  resyncInterval?: number;
  maxBackoffTime?: number;
  disableBc?: boolean;
}

// Simple authenticated WebSocket factory
function createAuthenticatedWebSocket(url: string, jwtToken: string, sessionId: string): WebSocket {
  try {
    // Use Sec-WebSocket-Protocol for authentication
    const subprotocols = [jwtToken, sessionId];
    
    logSecurityEvent('secure_websocket_connection_initiated', { 
      url: url,
      sessionId: sessionId?.substring(0, 8) + '...'
    });

    return new WebSocket(url, subprotocols);
  } catch (error) {
    logSecurityEvent('secure_websocket_connection_failed', { 
      error: (error as Error).message,
      url: url 
    });
    throw error;
  }
}

// Factory function to create authenticated Yjs WebSocket provider
export function createSecureYjsProvider(
  serverUrl: string,
  roomname: string,
  doc: Y.Doc,
  jwtToken: string,
  sessionId: string,
  options: SecureWebsocketProviderOptions = {}
): WebsocketProvider {
  try {
    // Create a custom WebSocket constructor that uses our secure connection
    const AuthenticatedWebSocket = function(url: string, protocols?: string | string[]) {
      return createAuthenticatedWebSocket(url, jwtToken, sessionId);
    } as any;

    // Create provider with secure WebSocket
    const provider = new WebsocketProvider(serverUrl, roomname, doc, {
      ...options,
      WebSocketPolyfill: AuthenticatedWebSocket
    });

    logSecurityEvent('secure_yjs_provider_created', {
      serverUrl,
      roomname,
      sessionId: sessionId?.substring(0, 8) + '...'
    });

    return provider;
  } catch (error) {
    logSecurityEvent('secure_yjs_provider_creation_failed', {
      error: (error as Error).message,
      serverUrl,
      roomname
    });
    throw error;
  }
}