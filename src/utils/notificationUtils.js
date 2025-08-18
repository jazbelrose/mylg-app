export function dedupeNotifications(arr = []) {
  if (!Array.isArray(arr)) return [];
  const map = new Map();
  const unkeyed = [];
  for (const n of arr) {
    const key = n.dedupeId || n["timestamp#uuid"];
    if (!key) {
      unkeyed.push(n);
      continue;
    }
    const existing = map.get(key);
    if (!existing || (!existing["timestamp#uuid"] && n["timestamp#uuid"])) {
      map.set(key, n);
    }
  }
  const result = [...map.values(), ...unkeyed];
  return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

export function mergeAndDedupeNotifications(prev = [], incoming = []) {
  const combined = Array.isArray(prev) ? [...prev] : [];
  const adds = Array.isArray(incoming) ? incoming : [];
  for (const n of adds) {
    combined.push(n);
  }
  return dedupeNotifications(combined);
}