import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { slugify } from "../../../../utils/slug";
import { FaProjectDiagram, FaRegCommentDots, FaFileInvoice } from "react-icons/fa";
import "./style.css";
const RecentActivity = () => {
    const { fetchRecentActivity } = useData();
    const [items, setItems] = useState([]);
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const data = await fetchRecentActivity(10);
                if (mounted)
                    setItems(data);
            }
            catch (err) {
                console.error("Failed to load recent activity", err);
            }
        };
        load();
        return () => {
            mounted = false;
        };
    }, [fetchRecentActivity]);
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
    const renderIcon = (type) => {
        switch (type) {
            case "project":
                return _jsx(FaProjectDiagram, { className: "activity-icon project" });
            case "message":
                return _jsx(FaRegCommentDots, { className: "activity-icon message" });
            case "invoice":
                return _jsx(FaFileInvoice, { className: "activity-icon invoice" });
            default:
                return null;
        }
    };
    const linkFor = (item) => {
        const slug = slugify(item.projectTitle || "");
        if (item.type === "invoice")
            return `/dashboard/projects/${slug}/budget`;
        return `/dashboard/projects/${slug}`;
    };
    return (_jsxs("div", { className: "recent-activity", children: [_jsx("h3", { className: "activity-title", children: "Recent Activity" }), _jsxs("ul", { className: "activity-list", children: [items.length === 0 && _jsx("li", { className: "activity-empty", children: "No recent activity" }), items.map((item) => (_jsx("li", { className: `activity-item ${item.type}`, children: _jsxs(Link, { to: linkFor(item), children: [renderIcon(item.type), _jsx("span", { className: "activity-text", children: item.text }), _jsx("span", { className: "activity-time", children: formatTimeAgo(item.timestamp) })] }) }, item.id)))] })] }));
};
export default RecentActivity;
