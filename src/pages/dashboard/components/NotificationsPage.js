import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useNotifications } from '../../../app/contexts/NotificationContext';
import { useNotificationSocket } from '../../../app/NotificationSocketBridge';
import { useData } from '../../../app/contexts/DataProvider';
import { useLocation } from 'react-router-dom';
import { Check } from 'lucide-react';
import ProjectAvatar from '../../../components/ProjectAvatar';
import NotificationList, { formatNotification } from '../../../components/NotificationList';
import { Select as AntSelect } from 'antd';
import './Notifications.css';
const Notifications = ({ searchQuery = '', showHeader = true, showFilters = true, onNotificationClick, onNavigateToProject }) => {
    const { notifications, removeNotifications } = useNotifications();
    const { emitNotificationRead } = useNotificationSocket();
    const { allUsers, projects } = useData();
    const location = useLocation();
    const [highlightId, setHighlightId] = useState(null);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedProjects, setSelectedProjects] = useState(() => {
        try {
            const stored = JSON.parse(localStorage.getItem('notificationProjectFilter'));
            if (Array.isArray(stored)) {
                return stored.filter((p) => p !== 'ALL');
            }
            return [];
        }
        catch {
            return [];
        }
    });
    const [selectedTypes, setSelectedTypes] = useState(() => {
        try {
            const stored = localStorage.getItem('notificationTypeFilter');
            return stored ? JSON.parse(stored) : ['ALL'];
        }
        catch {
            return ['ALL'];
        }
    });
    useEffect(() => {
        const id = location.state && location.state.highlightId;
        if (!id)
            return;
        const timer = setTimeout(() => setHighlightId(id), 800);
        return () => clearTimeout(timer);
    }, [location.state]);
    useEffect(() => {
        if (!highlightId)
            return;
        const timer = setTimeout(() => setHighlightId(null), 800);
        return () => clearTimeout(timer);
    }, [highlightId]);
    useEffect(() => {
        if (import.meta.env.DEV) {
            console.log("⏰ Notifications render:", notifications);
        }
    }, [notifications]);
    useEffect(() => {
        localStorage.setItem('notificationProjectFilter', JSON.stringify(selectedProjects));
    }, [selectedProjects]);
    useEffect(() => {
        localStorage.setItem('notificationTypeFilter', JSON.stringify(selectedTypes));
    }, [selectedTypes]);
    useEffect(() => {
        setSelectedIds(new Set());
        setSelectMode(false);
    }, [selectedProjects, selectedTypes]);
    const toggleSelectMode = () => {
        setSelectMode((prev) => {
            if (prev)
                setSelectedIds(new Set());
            return !prev;
        });
    };
    const toggleSelected = (id) => {
        setSelectedIds((prev) => {
            const set = new Set(prev);
            if (set.has(id))
                set.delete(id);
            else
                set.add(id);
            return set;
        });
    };
    const handleSelectAll = () => {
        if (selectedIds.size === filteredNotifications.length) {
            setSelectedIds(new Set());
        }
        else {
            setSelectedIds(new Set(filteredNotifications.map(n => n["timestamp#uuid"])));
        }
    };
    const handleDeleteSelected = () => {
        const ids = Array.from(selectedIds);
        removeNotifications(ids);
        setSelectedIds(new Set());
        setSelectMode(false);
    };
    const handleProjectFilterChange = (values) => {
        if (!values || values.length === 0 || values.includes('ALL')) {
            setSelectedProjects([]);
        }
        else {
            setSelectedProjects(values);
        }
    };
    const handleTypeFilterChange = (e) => {
        const values = Array.from(e.target.selectedOptions).map(o => o.value);
        if (values.length === 0 || values.includes('ALL')) {
            setSelectedTypes(['ALL']);
        }
        else {
            setSelectedTypes(values);
        }
    };
    const notificationTypes = Array.from(new Set(notifications.map(n => n.type).filter(Boolean)));
    const projectOptions = [
        { value: 'ALL', label: 'All Projects', searchLabel: 'All Projects' },
        ...projects.map(p => ({
            value: p.projectId,
            label: (_jsxs("div", { className: "project-option", children: [_jsx(ProjectAvatar, { thumb: p.thumbnails?.[0], name: p.title || 'Untitled', className: "dropdown-avatar" }), p.title || 'Untitled'] })),
            searchLabel: p.title || 'Untitled',
        })),
    ];
    const filteredNotifications = notifications.filter((n) => {
        const projectMatch = selectedProjects.length === 0 || selectedProjects.includes(n.projectId);
        const typeMatch = showFilters ? (selectedTypes.includes('ALL') || selectedTypes.includes(n.type)) : true;
        const search = searchQuery.trim().toLowerCase();
        let searchMatch = true;
        if (search) {
            const sender = allUsers.find(u => u.userId === n.senderId) || {};
            const project = projects.find(p => p.projectId === n.projectId);
            const name = project ? project.title || 'Project' : (sender.firstName ? `${sender.firstName} ${sender.lastName ?? ''}` : 'User');
            const message = formatNotification(n.message);
            searchMatch = name.toLowerCase().includes(search) || message.toLowerCase().includes(search);
        }
        return projectMatch && typeMatch && searchMatch;
    });
    return (_jsxs("div", { className: "main-content", children: [" ", _jsxs("div", { className: "notifications", children: [" ", showHeader && (_jsxs("div", { className: "notifications-header", children: [_jsx("div", { className: "notifications-title", children: "Notifications" }), _jsxs("div", { className: "notifications-actions", children: [showFilters && (_jsxs("div", { className: "notifications-filter", children: [_jsx("label", { id: "project-filter-label", className: "notifications-filter-label", children: "Filter by Project" }), _jsx(AntSelect, { "aria-labelledby": "project-filter-label", className: "project-select", mode: "multiple", allowClear: true, showSearch: true, optionFilterProp: "searchLabel", filterOption: (input, option) => (option?.searchLabel ?? '').toLowerCase().includes(input.toLowerCase()), placeholder: "All Projects", value: selectedProjects, onChange: handleProjectFilterChange, options: projectOptions, popupClassName: "project-select-dropdown" })] })), selectMode ? (_jsxs(_Fragment, { children: [_jsx("button", { className: "delete-selected-btn", disabled: selectedIds.size === 0, onClick: handleDeleteSelected, children: "Delete Selected" }), filteredNotifications.length > 0 && (_jsx("button", { className: "select-all-btn", onClick: handleSelectAll, children: selectedIds.size === filteredNotifications.length ? 'Deselect All' : 'Select All' })), _jsx("button", { className: "cancel-select-btn", onClick: toggleSelectMode, children: "Cancel" })] })) : (_jsxs(_Fragment, { children: [filteredNotifications.some(n => !n.read) && (_jsx("button", { className: "mark-all-read-btn", onClick: () => filteredNotifications.forEach(n => !n.read && emitNotificationRead(n["timestamp#uuid"])), children: _jsx(Check, { size: 16 }) })), filteredNotifications.length > 0 && (_jsx("button", { className: "select-mode-btn", onClick: toggleSelectMode, children: "Select" }))] }))] })] })), _jsxs("div", { className: "notifications-feed", children: [" ", showFilters && notificationTypes.length > 0 && (_jsxs("select", { multiple: true, value: selectedTypes, onChange: handleTypeFilterChange, children: [_jsx("option", { value: "ALL", children: "ALL" }), notificationTypes.map(t => (_jsx("option", { value: t, children: t }, t)))] })), _jsx(NotificationList, { notifications: filteredNotifications, selectMode: selectMode, selectedIds: selectedIds, toggleSelected: toggleSelected, highlightId: highlightId, onNotificationClick: onNotificationClick, onNavigateToProject: onNavigateToProject })] })] })] }));
};
export default Notifications;
