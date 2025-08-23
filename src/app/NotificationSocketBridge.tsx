import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
} from 'react';

import { useNotifications } from './contexts/NotificationContext';
import { useSocket } from './contexts/SocketContext';
import { useData } from './contexts/DataProvider';

interface NotificationSocketContextValue {
  emitNotificationRead: (timestampUuid: string) => void;
}

const NotificationSocketContext = createContext<NotificationSocketContextValue>({
  emitNotificationRead: () => {},
});

export const useNotificationSocket = () =>
  useContext(NotificationSocketContext);

interface Props {
  children: React.ReactNode;
}

export default function NotificationSocketBridge({ children }: Props) {
  const { ws } = useSocket();
  const { addNotification, addNotifications, markNotificationRead } =
    useNotifications();
  const { setPendingInvites } = useData();

  // Listen for incoming notification events and update local state.
  useEffect(() => {
    if (!ws) return;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === 'notification') {
          addNotification({ ...data, read: false });
        } else if (data.action === 'notificationsBatch' && Array.isArray(data.items)) {
          addNotifications(data.items.map((n: any) => ({ ...n, read: false })));
        } else if (data.action === 'notificationRead' && data.timestampUuid) {
          markNotificationRead(data.timestampUuid);
        } else if (data.action === 'projectInvite' && data.invite) {
          setPendingInvites((prev) => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.some((i) => i.inviteId === data.invite.inviteId)
              ? arr
              : [...arr, data.invite];
          });
        }
      } catch (err) {
        console.error('Failed to parse WS message:', event.data);
      }
    };

    ws.addEventListener('message', handler);
    return () => ws.removeEventListener('message', handler);
  }, [ws, addNotification, addNotifications, markNotificationRead, setPendingInvites]);

  // Helper to mark as read locally and emit the event to the server.
  const emitNotificationRead = useCallback(
    (timestampUuid: string) => {
      markNotificationRead(timestampUuid);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'notificationRead', timestampUuid }));
      }
    },
    [ws, markNotificationRead],
  );

  return (
    <NotificationSocketContext.Provider value={{ emitNotificationRead }}>
      {children}
    </NotificationSocketContext.Provider>
  );
}

