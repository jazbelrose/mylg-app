interface NotificationItem {
  dedupeId?: string;
  'timestamp#uuid'?: string;
  timestamp: string;
  [key: string]: any;
}

export function dedupeNotifications(arr: NotificationItem[] = []): NotificationItem[] {
  if (!Array.isArray(arr)) return [];
  
  const map = new Map<string, NotificationItem>();
  const unkeyed: NotificationItem[] = [];
  
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
  return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function mergeAndDedupeNotifications(
  prev: NotificationItem[] = [], 
  incoming: NotificationItem[] = []
): NotificationItem[] {
  const combined = Array.isArray(prev) ? [...prev] : [];
  const adds = Array.isArray(incoming) ? incoming : [];
  
  for (const n of adds) {
    combined.push(n);
  }
  
  return dedupeNotifications(combined);
}