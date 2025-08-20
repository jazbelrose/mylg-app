import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationRead as apiMarkNotificationRead, deleteNotification as apiDeleteNotification } from '../../utils/api';
import { getWithTTL, setWithTTL, DEFAULT_TTL } from '../../utils/storageWithTTL';
import { mergeAndDedupeNotifications } from '../../utils/notificationUtils';

interface Notification {
  "timestamp#uuid"?: string;
  timestamp: string;
  read: boolean;
  [key: string]: any;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notif: Notification) => void;
  addNotifications: (items: Notification[]) => void;
  fetchNotifications: () => Promise<void>;
  markNotificationRead: (timestampUuid: string) => Promise<void>;
  removeNotification: (timestampUuid: string) => Promise<void>;
  removeNotifications: (ids: string[]) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

// Avoid using useSocket here. NotificationProvider renders outside of
// SocketProvider (see App.jsx). Accessing SocketContext inside this
// provider would return the default undefined value and lead to bugs.
// Instead, use a bridge component (NotificationSocketBridge) that lives
// inside both providers to wire them together.
export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
    const { user } = useAuth() as any;
    const userId = user?.userId;
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const stored = getWithTTL('notifications');
        return Array.isArray(stored) ? stored : [];
    });

    useEffect(() => {
        setWithTTL('notifications', notifications, DEFAULT_TTL);
    }, [notifications]);

    const addNotification = useCallback((notif: Notification) => {
        if (!notif) return;
        setNotifications((prev) => mergeAndDedupeNotifications(prev as any, [notif]) as Notification[]);
    }, []);

    const addNotifications = useCallback((items: Notification[]) => {
        if (!Array.isArray(items) || !items.length) return;
        setNotifications((prev) => mergeAndDedupeNotifications(prev as any, items) as Notification[]);
    }, []);

    const fetchNotifications = useCallback(async (): Promise<void> => {
        if (!userId) return;
        try {
            const items = await getNotifications(userId);
            setNotifications((prev) => mergeAndDedupeNotifications(prev as any, Array.isArray(items) ? items : []) as Notification[]);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setNotifications([]);
            return;
        }
        fetchNotifications();
    }, [userId, fetchNotifications]);

    const markNotificationRead = useCallback(async (timestampUuid: string): Promise<void> => {
        if (!timestampUuid) return;
        setNotifications((prev) => 
            prev.map((n) => 
                n["timestamp#uuid"] === timestampUuid ? { ...n, read: true } : n
            )
        );
        try {
            await apiMarkNotificationRead(userId, timestampUuid);
        } catch (err) {
            console.error('Error marking notification read:', err);
        }
    }, [userId]);

    const removeNotification = useCallback(async (timestampUuid: string): Promise<void> => {
        if (!timestampUuid) return;
        setNotifications((prev) => 
            prev.filter((n) => n["timestamp#uuid"] !== timestampUuid)
        );
        try {
            await apiDeleteNotification(userId, timestampUuid);
        } catch (err) {
            console.error('Error deleting notification:', err);
        }
    }, [userId]);

    const removeNotifications = useCallback(async (ids: string[] = []): Promise<void> => {
        if (!Array.isArray(ids) || ids.length === 0) return;
        setNotifications((prev) => 
            prev.filter((n) => !ids.includes(n["timestamp#uuid"]))
        );
        try {
            await Promise.all(ids.map((id) => apiDeleteNotification(userId, id)));
        } catch (err) {
            console.error('Error deleting notifications:', err);
        }
    }, [userId]);

    const value: NotificationContextType = { 
        notifications, 
        addNotification, 
        addNotifications, 
        fetchNotifications, 
        markNotificationRead, 
        removeNotification, 
        removeNotifications 
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};