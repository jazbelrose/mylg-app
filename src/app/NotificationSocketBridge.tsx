import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useNotifications } from './contexts/NotificationContext';
import { useSocket } from './contexts/SocketContext';
import { useData } from './contexts/DataProvider';

// Types
interface NotificationSocketContextType {
  emitNotificationRead: (timestampUuid: string) => void;
}

interface NotificationSocketBridgeProps {
  children: ReactNode;
}

interface WebSocketMessage {
  action: string;
  [key: string]: any;
}

interface NotificationData {
  action: 'notification';
  timestampUuid?: string;
  title?: string;
  message?: string;
  read?: boolean;
  [key: string]: any;
}

interface NotificationsBatchData {
  action: 'notificationsBatch';
  items: NotificationData[];
}

interface NotificationReadData {
  action: 'notificationRead';
  timestampUuid: string;
}

interface ProjectInviteData {
  action: 'projectInvite';
  invite: {
    inviteId: string;
    [key: string]: any;
  };
}

// This bridge sits inside both NotificationProvider and SocketProvider so it can
// access both contexts without creating a circular dependency. Components can
// use the exported hook to mark a notification as read and broadcast the event.
// Calling one context inside the other's provider would read its default value,
// so this component wires them together after both providers have mounted.
const NotificationSocketContext = createContext<NotificationSocketContextType>({
  emitNotificationRead: () => {},
});

export const useNotificationSocket = (): NotificationSocketContextType => useContext(NotificationSocketContext);

export default function NotificationSocketBridge({ children }: NotificationSocketBridgeProps): React.ReactElement {
  const { ws } = useSocket();
  const { addNotification, addNotifications, markNotificationRead } = useNotifications();
  const { setPendingInvites } = useData();

  // Listen for incoming notification events and update local state.
  useEffect(() => {
    if (!ws) return;

    const handler = (event: MessageEvent): void => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        if (data.action === 'notification') {
          addNotification({ 
            ...data, 
            read: false,
            timestamp: data.timestamp || new Date().toISOString()
          });
        } else if (data.action === 'notificationsBatch' && Array.isArray(data.items)) {
          addNotifications(data.items.map(n => ({ 
            ...n, 
            read: false,
            timestamp: n.timestamp || new Date().toISOString()
          })));
        } else if (data.action === 'notificationRead' && data.timestampUuid) {
          markNotificationRead(data.timestampUuid);
        } else if (data.action === 'projectInvite' && data.invite) {
          setPendingInvites(prev => {
            const arr = Array.isArray(prev) ? prev : [];
            return arr.some(i => i.inviteId === data.invite.inviteId)
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
  const emitNotificationRead = useCallback((timestampUuid: string): void => {
    markNotificationRead(timestampUuid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: 'notificationRead', timestampUuid }));
    }
  }, [ws, markNotificationRead]);

  return React.createElement(NotificationSocketContext.Provider, { value: { emitNotificationRead } }, children);
}