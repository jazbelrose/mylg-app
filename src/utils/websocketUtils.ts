export function normalizeMessage<T extends Record<string, unknown>>(
  message: T | null | undefined = {} as T,
  defaultAction = 'unknown',
): T & { action: string } {
  if (!message || typeof message !== 'object') {
    return { action: defaultAction } as T & { action: string };
  }
  if (!Object.prototype.hasOwnProperty.call(message, 'action')) {
    return { ...(message as T), action: defaultAction };
  }
  return message as T & { action: string };
}
