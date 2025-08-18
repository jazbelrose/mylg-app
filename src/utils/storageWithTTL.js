export const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function setWithTTL(key, data, ttl = DEFAULT_TTL) {
  const record = { ts: Date.now(), ttl, data };
  try {
    localStorage.setItem(key, JSON.stringify(record));
  } catch {
    // ignore write errors
  }
}

export function getWithTTL(key) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;
    const record = JSON.parse(item);
    if (record && typeof record === 'object') {
      const { ts, ttl, data } = record;
      if (ts && ttl && Date.now() - ts > ttl) {
        localStorage.removeItem(key);
        return null;
      }
      return 'data' in record ? data : record;
    }
    return null;
  } catch {
    return null;
  }
}