export function isMessageUnread(msg) {
  const val = msg && Object.prototype.hasOwnProperty.call(msg, 'read') ? msg.read : undefined;
  return val === false || val === 'false' || val === undefined || val === 0 || val === '0';
}

// Determine if a message is unread based on last read timestamps for conversations
export function isMessageUnreadByStatus(msg, readStatus = {}) {
  if (!msg || !msg.conversationId) return false;
  const lastRead = readStatus[msg.conversationId];
  return !lastRead || new Date(msg.timestamp) > new Date(lastRead);
}

// Deduplicate an array of messages using a Map keyed by `messageId` when
// available, otherwise `optimisticId`. This is a simpler approach that avoids
// the nested searches and timestamp heuristics previously used.
export function dedupeById(arr = []) {
  if (!Array.isArray(arr)) return [];

  const map = new Map();
  const unkeyed = [];

 for (const msg of arr) {
    const key = msg.optimisticId || msg.messageId;
    if (!key) {
      // message has no stable identifier; keep as-is
      unkeyed.push(msg);
      continue;
    }


    const existing = map.get(key);
    // Replace optimistic entry when a server version arrives
    if (!existing || (!existing.messageId && msg.messageId)) {
      map.set(key, msg);
    }
  }

  // Preserve insertion order of keyed items and append unkeyed ones
  return [...map.values(), ...unkeyed];
}

// Merge previous and incoming messages, removing optimistic duplicates if the
// server copy is present. Dedupe by messageId and optimisticId.
export function mergeAndDedupeMessages(prevMsgs = [], incomingMsgs = []) {
  const combined = Array.isArray(prevMsgs) ? [...prevMsgs] : [];
  const adds = Array.isArray(incomingMsgs) ? incomingMsgs : [];

  for (const msg of adds) {
    combined.push(msg);
  }

  return dedupeById(combined);
}