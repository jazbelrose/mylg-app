export function normalizeMessage(message = {}, defaultAction = 'unknown') {
  if (!message || typeof message !== 'object') {
    return { action: defaultAction };
  }
  if (!Object.prototype.hasOwnProperty.call(message, 'action')) {
    return { ...message, action: defaultAction };
  }
  return message;
}
