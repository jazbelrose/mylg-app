import { useCallback, useEffect, useState } from 'react';
import { setWithTTL, getWithTTL } from './storageWithTTL';

const KEY = 'pendingAuthChallenge';
const TTL = 15 * 60 * 1000; // 15 minutes

export default function usePendingAuthChallenge<T = unknown>() {
  const [pending, setPending] = useState<T | null>(() => getWithTTL<T>(KEY));

  const savePending = useCallback((data: T) => {
    setWithTTL(KEY, data, TTL);
    setPending(data);
  }, []);

  const clearPending = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setPending(null);
  }, []);

  useEffect(() => {
    const data = getWithTTL<T>(KEY);
    if (data) setPending(data);
  }, []);

  return { pending, savePending, clearPending };
}