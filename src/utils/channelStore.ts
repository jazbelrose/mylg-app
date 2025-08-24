/**
 * channelStore - A lightweight pub/sub store for WebSocket channel-based updates.
 * 
 * Provides a way to isolate WebSocket updates by "channel" to reduce unnecessary 
 * component re-renders. Each channel has a latest value and a set of listeners.
 */

type Listener = () => void;

class ChannelStore {
  // Map to hold latest values for each channel
  public channels = new Map<string, unknown>();
  
  // Map to hold listeners for each channel
  private listeners = new Map<string, Set<Listener>>();

  /**
   * Get the latest value for a channel, with optional fallback
   */
  get<T>(key: string, fallback: T): T {
    return this.channels.has(key) ? (this.channels.get(key) as T) : fallback;
  }

  /**
   * Subscribe to updates for a specific channel
   * Returns an unsubscribe function
   */
  subscribe(key: string, listener: Listener): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    const channelListeners = this.listeners.get(key)!;
    channelListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      channelListeners.delete(listener);
      if (channelListeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Update a channel value and notify all listeners
   */
  update(key: string, value: unknown): void {
    this.channels.set(key, value);
    this.notify(key);
  }

  /**
   * Notify all listeners of a channel that it has been updated
   */
  notify(key: string): void {
    const channelListeners = this.listeners.get(key);
    if (channelListeners) {
      channelListeners.forEach(listener => {
        try {
          listener();
        } catch (error) {
          console.error(`Error in channel listener for key "${key}":`, error);
        }
      });
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.channels.clear();
    this.listeners.clear();
  }

  /**
   * Get debug info about current channels and listener counts
   */
  debug(): { channels: string[], listenerCounts: Record<string, number> } {
    const channels = Array.from(this.channels.keys());
    const listenerCounts: Record<string, number> = {};
    
    this.listeners.forEach((listeners, key) => {
      listenerCounts[key] = listeners.size;
    });
    
    return { channels, listenerCounts };
  }
}

// Export a singleton instance
export const channelStore = new ChannelStore();

// Also export the class for testing
export { ChannelStore };