import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getNotifications, markNotificationRead as apiMarkNotificationRead, deleteNotification as apiDeleteNotification } from '../../utils/api';
import { getWithTTL, setWithTTL, DEFAULT_TTL } from '../../utils/storageWithTTL';
import { mergeAndDedupeNotifications } from '../../utils/notificationUtils';
const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);
// Avoid using useSocket here. NotificationProvider renders outside of
// SocketProvider (see App.jsx). Accessing SocketContext inside this
// provider would return the default undefined value and lead to bugs.
// Instead, use a bridge component (NotificationSocketBridge) that lives
// inside both providers to wire them together.
export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.userId;
    const [notifications, setNotifications] = useState(() => {
        const stored = getWithTTL('notifications');
        return Array.isArray(stored) ? stored : [];
    });
    useEffect(() => {
        setWithTTL('notifications', notifications, DEFAULT_TTL);
    }, [notifications]);
    const addNotification = useCallback((notif) => {
        if (!notif)
            return;
        setNotifications((prev) => mergeAndDedupeNotifications(prev, [notif]));
    }, []);
    const addNotifications = useCallback((items) => {
        if (!Array.isArray(items) || !items.length)
            return;
        setNotifications((prev) => mergeAndDedupeNotifications(prev, items));
    }, []);
    const fetchNotifications = useCallback(async () => {
        if (!userId)
            return;
        try {
            const items = await getNotifications(userId);
            setNotifications((prev) => mergeAndDedupeNotifications(prev, Array.isArray(items) ? items : []));
        }
        catch (error) {
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
    const markNotificationRead = useCallback(async (timestampUuid) => {
        if (!timestampUuid)
            return;
        setNotifications((prev) => prev.map((n) => n["timestamp#uuid"] === timestampUuid ? { ...n, read: true } : n));
        try {
            await apiMarkNotificationRead(userId, timestampUuid);
        }
        catch (err) {
            console.error('Error marking notification read:', err);
        }
    }, [userId]);
    const removeNotification = useCallback(async (timestampUuid) => {
        if (!timestampUuid)
            return;
        setNotifications((prev) => prev.filter((n) => n["timestamp#uuid"] !== timestampUuid));
        try {
            await apiDeleteNotification(userId, timestampUuid);
        }
        catch (err) {
            console.error('Error deleting notification:', err);
        }
    }, [userId]);
    const removeNotifications = useCallback(async (ids = []) => {
        if (!Array.isArray(ids) || ids.length === 0)
            return;
        setNotifications((prev) => prev.filter((n) => !ids.includes(n["timestamp#uuid"])));
        try {
            await Promise.all(ids.map((id) => apiDeleteNotification(userId, id)));
        }
        catch (err) {
            console.error('Error deleting notifications:', err);
        }
    }, [userId]);
    const value = { notifications, addNotification, addNotifications, fetchNotifications, markNotificationRead, removeNotification, removeNotifications };
    return (_jsx(NotificationContext.Provider, { value: value, children: children }));
};
