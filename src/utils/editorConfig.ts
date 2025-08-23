/**
 * Configuration utility for the collaborative editor
 */

import { YJS_WEBSOCKET_URL } from './api';

export interface EditorConfig {
  websocketUrl: string;
  debounceMs: number;
  retryAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
}

// Get configuration from environment variables with fallbacks
export const getEditorConfig = (): EditorConfig => ({
  websocketUrl: YJS_WEBSOCKET_URL || 'ws://35.165.113.63:1234',
  debounceMs: Number(import.meta.env.VITE_YJS_DEBOUNCE_MS) || 2000,
  retryAttempts: Number(import.meta.env.VITE_YJS_RETRY_ATTEMPTS) || 3,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
});

export class EditorConnectionManager {
  private config: EditorConfig;
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;

  constructor(config?: Partial<EditorConfig>) {
    this.config = { ...getEditorConfig(), ...config };
  }

  getWebSocketUrl(): string {
    return this.config.websocketUrl;
  }

  getDebounceMs(): number {
    return this.config.debounceMs;
  }

  handleConnectionError(error: Error): void {
    console.error('[EditorConnectionManager] Connection error:', error);
    this.scheduleReconnect();
  }

  handleConnectionClose(): void {
    console.warn('[EditorConnectionManager] Connection closed');
    this.scheduleReconnect();
  }

  handleConnectionOpen(): void {
    console.log('[EditorConnectionManager] Connection established');
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.retryAttempts) {
      console.error('[EditorConnectionManager] Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.config.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(`[EditorConnectionManager] Scheduling reconnect #${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      console.log('[EditorConnectionManager] Attempting reconnection...');
      // The actual reconnection will be handled by the WebSocket provider
    }, delay);
  }

  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}