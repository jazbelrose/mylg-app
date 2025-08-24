import { useSyncExternalStore } from 'react';
import { channelStore } from '../utils/channelStore';

/**
 * React hook that subscribes to a specific channel in the channelStore.
 * Uses useSyncExternalStore to ensure components only re-render when their 
 * subscribed channel updates, not on every WebSocket message.
 * 
 * @param key - The channel key to subscribe to (e.g., "budget:projectId")
 * @param fallback - Default value when channel has no data
 * @returns The latest value for the channel
 */
export function useChannel<T = any>(key: string, fallback: T): T {
  const subscribe = (onStoreChange: () => void) => {
    return channelStore.subscribe(key, onStoreChange);
  };

  const getSnapshot = () => {
    return channelStore.get(key, fallback);
  };

  // For server-side rendering, return the fallback value
  const getServerSnapshot = () => {
    return fallback;
  };

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}