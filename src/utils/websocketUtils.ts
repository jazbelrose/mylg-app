interface MessageObject {
  action?: string;
  [key: string]: unknown;
}

export function normalizeMessage(
  message: Record<string, unknown> | null = {},
  defaultAction = 'unknown'
): MessageObject {
  if (!message || typeof message !== 'object') {
    return { action: defaultAction };
  }
  if (!Object.prototype.hasOwnProperty.call(message, 'action')) {
    return { ...message, action: defaultAction } as MessageObject;
  }
  return message as MessageObject;
}