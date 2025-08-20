import { useCallback, useEffect, useState } from 'react';
import { setWithTTL, getWithTTL } from './storageWithTTL';

const KEY = 'pendingAuthChallenge';
const TTL = 15 * 60 * 1000; // 15 minutes

interface UsePendingAuthChallengeReturn {
  pending: any;
  savePending: (data: any) => void;
  clearPending: () => void;
}

export default function usePendingAuthChallenge(): UsePendingAuthChallengeReturn {
  const [pending, setPending] = useState<any>(() => getWithTTL(KEY));

  const savePending = useCallback((data: any): void => {
    setWithTTL(KEY, data, TTL);
    setPending(data);
  }, []);

  const clearPending = useCallback((): void => {
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