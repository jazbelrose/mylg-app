interface MessageObject {
  action?: string;
  [key: string]: any;
}

export function normalizeMessage(message: any = {}, defaultAction = 'unknown'): MessageObject {
  if (!message || typeof message !== 'object') {
    return { action: defaultAction };
  }
  if (!Object.prototype.hasOwnProperty.call(message, 'action')) {
    return { ...message, action: defaultAction };
  }
  return message;
}