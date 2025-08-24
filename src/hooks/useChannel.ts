import { useSyncExternalStore } from 'react';
import { channelStore } from '../utils/channelStore';

/**
 * React hook to subscribe to a specific channel in the channelStore.
 * Components will only re-render when their subscribed channel updates.
 * 
 * @param key - Channel key to subscribe to (e.g., "budget:123")
 * @param fallback - Fallback value if channel doesn't exist
 * @returns Current value of the channel
 */
export function useChannel<T = any>(key: string, fallback: T = null as T): T {
  return useSyncExternalStore(
    // Subscribe function - called when component mounts/key changes
    (callback) => channelStore.subscribe(key, callback),
    
    // Get current snapshot - called during render
    () => channelStore.get(key, fallback),
    
    // Get server snapshot - same as client for this use case
    () => channelStore.get(key, fallback)
  );
}