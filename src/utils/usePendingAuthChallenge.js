import { useCallback, useEffect, useState } from 'react';
import { setWithTTL, getWithTTL } from './storageWithTTL';

const KEY = 'pendingAuthChallenge';
const TTL = 15 * 60 * 1000; // 15 minutes

export default function usePendingAuthChallenge() {
  const [pending, setPending] = useState(() => getWithTTL(KEY));

  const savePending = useCallback((data) => {
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
    const data = getWithTTL(KEY);
    if (data) setPending(data);
  }, []);

  return { pending, savePending, clearPending };
}