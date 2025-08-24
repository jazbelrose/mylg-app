/**
 * ChannelStore - A pub/sub mechanism for isolating WebSocket updates by channel.
 * Each channel has latest value and a set of listener callbacks.
 * Components subscribe to specific channels and only re-render when their channel updates.
 */

type Listener = () => void;

class ChannelStore {
  // Map to store latest values for each channel
  public channels = new Map<string, any>();
  
  // Map to store listeners for each channel
  private listeners = new Map<string, Set<Listener>>();

  /**
   * Get the current value for a channel
   * @param key - Channel key
   * @param fallback - Fallback value if channel doesn't exist
   * @returns Current value or fallback
   */
  get(key: string, fallback: any = null): any {
    return this.channels.get(key) ?? fallback;
  }

  /**
   * Subscribe to a channel for updates
   * @param key - Channel key
   * @param listener - Callback function to call when channel updates
   * @returns Unsubscribe function
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
   * Notify all listeners of a channel that it has been updated
   * @param key - Channel key
   */
  notify(key: string): void {
    const channelListeners = this.listeners.get(key);
    if (channelListeners) {
      channelListeners.forEach(listener => listener());
    }
  }

  /**
   * Set a value for a channel and notify listeners
   * @param key - Channel key
   * @param value - New value
   */
  set(key: string, value: any): void {
    this.channels.set(key, value);
    this.notify(key);
  }

  /**
   * Clear all channels and listeners (for testing/cleanup)
   */
  clear(): void {
    this.channels.clear();
    this.listeners.clear();
  }
}

// Create singleton instance
export const channelStore = new ChannelStore();