// Secure WebSocket provider for Yjs with authentication
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { createSecureWebSocketConnection } from "./secureWebSocketAuth";
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

// Factory function to create authenticated Yjs WebSocket provider
export const createSecureYjsProvider = async (
  serverUrl: string,
  roomname: string,
  doc: Y.Doc,
  jwtToken: string,
  sessionId: string,
  options: SecureWebsocketProviderOptions = {}
): Promise<WebsocketProvider> => {
  try {
    // Create a custom WebSocket constructor that uses our secure connection
    const SecureWebSocket = function(url: string, protocols?: string | string[]) {
      // Use our secure WebSocket connection method
      return createSecureWebSocketConnection(url, jwtToken, sessionId);
    } as any;

    // Create provider with secure WebSocket
    const provider = new WebsocketProvider(serverUrl, roomname, doc, {
      ...options,
      WebSocketPolyfill: SecureWebSocket
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
};