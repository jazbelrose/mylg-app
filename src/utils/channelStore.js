import { useSyncExternalStore } from "react";

// Map to hold latest values by channel key
const channels = new Map();
// Map of channel listeners
const listeners = new Map();

function get(key, fallback) {
  return channels.has(key) ? channels.get(key) : fallback;
}

function subscribe(key, fn) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(fn);
  return () => {
    set.delete(fn);
    if (set.size === 0) {
      listeners.delete(key);
    }
  };
}

function notify(key) {
  const set = listeners.get(key);
  if (set) {
    for (const fn of set) {
      try {
        fn();
      } catch (err) {
        // ignore individual listener errors
        console.error(err);
      }
    }
  }
}

export const channelStore = {
  channels,
  get,
  subscribe,
  notify,
};

export function useChannel(key, fallback) {
  return useSyncExternalStore(
    (fn) => channelStore.subscribe(key, fn),
    () => channelStore.get(key, fallback),
    () => channelStore.get(key, fallback)
  );
}

