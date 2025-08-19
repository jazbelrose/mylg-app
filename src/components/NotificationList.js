import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { useNotifications } from '../app/contexts/NotificationContext';
import { useNotificationSocket } from '../app/NotificationSocketBridge';
import { useData } from '../app/contexts/DataProvider';
import ProjectAvatar from './ProjectAvatar';
import { Check } from 'lucide-react';
import '../pages/dashboard/components/Notifications.css';
export function formatNotification(msg) {
    try {
        if (msg.startsWith("\ud83d\udce6 Parsed Payload: ")) {
            const payload = JSON.parse(msg.replace("\ud83d\udce6 Parsed Payload: ", ""));
            if (payload.action === 'projectUpdated') {
                return `Project ${payload.projectId} was updated.`;
            }
            if (payload.action === 'timelineUpdated') {
                return `Timeline updated on project ${payload.projectId}.`;
            }
        }
    }
    catch {
        // fallback to raw message
    }
    return msg;
}
function formatTimeAgo(dateString) {
    const now = new Date();
    const then = new Date(dateString);
    const diff = Math.floor((now - then) / 1000);
    if (diff <= 0)
        return 'now';
    if (diff < 60)
        return `${diff}s ago`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1)
        return 'Yesterday';
    if (days < 7)
        return `${days}d ago`;
    return then.toLocaleDateString();
}
const NotificationList = ({ notifications = [], selectMode = false, selectedIds = new Set(), toggleSelected = () => { }, highlightId = null, onNotificationClick, onNavigateToProject, }) => {
    const { removeNotification } = useNotifications();
    const { emitNotificationRead } = useNotificationSocket();
    const { allUsers, projects } = useData();
    if (!notifications.length) {
        return _jsx("p", { className: "no-notifications", children: "No updates yet!" });
    }
    return (_jsx("ul", { className: "notifications-list", children: notifications.map((notif, idx) => {
            const sender = allUsers.find(u => u.userId === notif.senderId) || {};
            const project = projects.find(p => p.projectId === notif.projectId);
            const thumb = project?.thumbnails?.[0] || sender.thumbnail;
            const name = project ? project.title || 'Project' : (sender.firstName ? `${sender.firstName} ${sender.lastName ?? ''}` : 'User');
            const time = formatTimeAgo(notif.timestamp);
            return (_jsxs("li", { className: `notification-item${notif.read ? ' read' : ''}${highlightId === notif['timestamp#uuid'] ? ' notification-highlight' : ''}`, onClick: async () => {
                    if (selectMode) {
                        toggleSelected(notif['timestamp#uuid']);
                        return;
                    }
                    emitNotificationRead(notif['timestamp#uuid']);
                    if (onNotificationClick) {
                        onNotificationClick();
                    }
                    if (notif.projectId && onNavigateToProject) {
                        await onNavigateToProject({ projectId: notif.projectId });
                    }
                }, children: [selectMode && (_jsx("input", { type: "checkbox", className: "notification-select-checkbox", checked: selectedIds.has(notif['timestamp#uuid']), onChange: () => toggleSelected(notif['timestamp#uuid']), onClick: (e) => e.stopPropagation() })), _jsx(ProjectAvatar, { thumb: thumb, name: name, className: "notification-avatar" }), _jsxs("div", { className: "notification-details", children: [_jsxs("div", { className: "notification-title-row", children: [_jsx("span", { className: "notification-title", children: name }), _jsxs("div", { className: "notification-meta", children: [_jsx("span", { className: "notification-time", children: time }), !selectMode && (_jsxs(_Fragment, { children: [!notif.read && (_jsx("button", { className: "notification-mark-read-btn", onClick: (e) => { e.stopPropagation(); emitNotificationRead(notif['timestamp#uuid']); }, "aria-label": "Mark notification as read", children: _jsx(Check, { size: 12 }) })), _jsx("button", { className: "notification-delete-btn", onClick: (e) => { e.stopPropagation(); removeNotification(notif['timestamp#uuid']); }, "aria-label": "Delete notification", children: "\u00D7" })] }))] })] }), _jsx("div", { className: "notification-message", children: formatNotification(notif.message) })] })] }, notif['timestamp#uuid'] || idx));
        }) }));
};
export default NotificationList;
