import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useRef, useState } from "react";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import { useNotificationSocket } from "../../../../app/NotificationSocketBridge";
import { Bell, FileText, ChevronRight } from "lucide-react";
import ProjectAvatar from "../../../../components/ProjectAvatar";
import { useNavigate } from "react-router-dom";
import { slugify } from "../../../../utils/slug";
import Inbox from "./inbox";
import "./style.css";
import { isMessageUnread } from "../../../../utils/messageUtils";
const LeftSideBar = ({ setActiveView, setDmUserSlug }) => {
    const { userData, allUsers, projects, fetchProjectDetails } = useData();
    const { notifications, removeNotification } = useNotifications();
    const { emitNotificationRead } = useNotificationSocket();
    const navigate = useNavigate();
    const notifListRef = useRef(null);
    const topSentinelRef = useRef(null);
    const prevCountRef = useRef(notifications.length);
    const [newCount, setNewCount] = useState(0);
    const [showNewNotice, setShowNewNotice] = useState(false);
    const [isAtTop, setIsAtTop] = useState(true);
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const unreadMessages = userData?.messages?.filter(isMessageUnread).length || 0;
    const invoicesDue = userData?.invoices?.filter(i => i.status === "due").length || 0;
    useEffect(() => {
        const list = notifListRef.current;
        const sentinel = topSentinelRef.current;
        if (!list || !sentinel)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            setIsAtTop(entry.isIntersecting);
            if (entry.isIntersecting) {
                setNewCount(0);
                setShowNewNotice(false);
            }
        }, { root: list });
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        const diff = notifications.length - prevCountRef.current;
        prevCountRef.current = notifications.length;
        if (diff > 0) {
            if (isAtTop) {
                notifListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            }
            else {
                setNewCount(prev => prev + diff);
                setShowNewNotice(true);
            }
        }
    }, [notifications, isAtTop]);
    const scrollToTop = () => {
        const ul = notifListRef.current;
        if (ul) {
            ul.scrollTo({ top: 0, behavior: "smooth" });
        }
        setNewCount(0);
        setShowNewNotice(false);
    };
    const handleNavigation = (view, highlightId = null) => {
        setActiveView(view);
        const base = "/dashboard";
        const path = view === "welcome" ? base : `${base}/${view}`;
        const opts = highlightId ? { state: { highlightId } } : undefined;
        navigate(path, opts);
    };
    const formatNotification = (msg) => {
        try {
            if (msg.startsWith("\uD83D\uDCE6 Parsed Payload: ")) {
                const payload = JSON.parse(msg.replace("\uD83D\uDCE6 Parsed Payload: ", ""));
                if (payload.action === "projectUpdated")
                    return `Project ${payload.projectId} was updated.`;
                if (payload.action === "timelineUpdated")
                    return `Timeline updated on project ${payload.projectId}.`;
            }
        }
        catch {
            return msg;
        }
        return msg;
    };
    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const then = new Date(dateString);
        const diff = Math.floor((now - then) / 1000);
        if (diff <= 0)
            return "now";
        if (diff < 60)
            return `${diff}s ago`;
        const minutes = Math.floor(diff / 60);
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };
    return (_jsx("div", { className: "quick-stats-container-column", children: _jsxs("div", { className: "left-sidebar-grid", children: [_jsxs("div", { className: "row-items", children: [_jsxs("div", { className: "stat-item left-stat-large", onClick: () => handleNavigation("notifications"), style: { cursor: "pointer" }, children: [_jsxs("div", { className: "stat-item-header", children: [_jsxs("div", { className: "notification-icon-wrapper", children: [_jsx(Bell, { className: "stat-icon" }), unreadNotifications > 0 && _jsx("span", { className: "notification-badge" })] }), _jsxs("div", { className: "stats-header", children: [_jsx("span", { className: "stats-title", children: "Notifications" }), _jsx("span", { className: "stats-count", children: unreadNotifications })] })] }), notifications.length === 0 ? (_jsx("div", { className: "progress-text", children: "No notifications" })) : (_jsxs(_Fragment, { children: [_jsxs("ul", { className: "notification-preview-list", ref: notifListRef, children: [_jsx("li", { ref: topSentinelRef, style: { listStyle: "none", height: 1, margin: 0, padding: 0 } }), sortedNotifications.map((notif, idx) => {
                                                    const sender = allUsers.find(u => u.userId === notif.senderId) || {};
                                                    const project = projects.find(p => p.projectId === notif.projectId);
                                                    const thumb = project?.thumbnails?.[0] || sender.thumbnail;
                                                    const name = project
                                                        ? project.title || "Project"
                                                        : sender.firstName
                                                            ? `${sender.firstName} ${sender.lastName ?? ""}`
                                                            : "User";
                                                    const time = formatTimeAgo(notif.timestamp);
                                                    return (_jsxs("li", { className: `notification-preview-item unread-dm-item${notif.read ? " read" : ""}`, onClick: async (e) => {
                                                            e.stopPropagation();
                                                            emitNotificationRead(notif["timestamp#uuid"]);
                                                            if (notif.projectId) {
                                                                await fetchProjectDetails(notif.projectId);
                                                                const proj = projects.find(p => p.projectId === notif.projectId);
                                                                const slug = proj ? slugify(proj.title) : notif.projectId;
                                                                navigate(`/dashboard/projects/${slug}`);
                                                            }
                                                            else {
                                                                handleNavigation("notifications", notif["timestamp#uuid"]);
                                                            }
                                                        }, children: [_jsx(ProjectAvatar, { thumb: thumb, name: name, className: "dm-avatar" }), _jsxs("div", { className: "notification-content", children: [_jsxs("div", { className: "notification-header", children: [_jsx("span", { className: "notification-user", children: name }), _jsx("span", { className: "notification-time", children: time }), _jsx("button", { className: "notification-delete-btn", onClick: (e) => { e.stopPropagation(); removeNotification(notif["timestamp#uuid"]); }, children: "\u00D7" })] }), _jsx("div", { className: "dm-text", children: formatNotification(notif.message) })] }), _jsx(ChevronRight, { className: "notification-arrow", size: 14 })] }, notif["timestamp#uuid"] || idx));
                                                })] }), showNewNotice && (_jsxs("div", { className: "new-notification-banner", onClick: scrollToTop, children: [newCount, " new notification", newCount > 1 ? "s" : "", " \u2013 tap to scroll up"] }))] }))] }), _jsx(Inbox, { setActiveView: setActiveView, setDmUserSlug: setDmUserSlug })] }), _jsxs("div", { className: "stat-item left-stat-small", children: [_jsxs("div", { className: "stat-item-header", children: [_jsx(FileText, { className: "stat-icon" }), _jsxs("div", { className: "stats-header", children: [_jsx("span", { className: "stats-title", children: "Invoices Due" }), _jsx("span", { className: "stats-count", children: invoicesDue })] })] }), _jsxs("div", { className: "progress-text", children: [invoicesDue, " Due Invoices"] })] })] }) }));
};
export default LeftSideBar;
