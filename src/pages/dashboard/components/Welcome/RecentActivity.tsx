// app/pages/Dashboard/components/Welcome/RecentActivity.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { slugify } from "../../../../utils/slug";
import { FaProjectDiagram, FaRegCommentDots, FaFileInvoice } from "react-icons/fa";
import "./style.css";

type ActivityType = "project" | "message" | "invoice";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  text: string;
  timestamp: string | number | Date;
  projectTitle?: string;
};

const RecentActivity: React.FC = () => {
  const { fetchRecentActivity } = useData() as {
    fetchRecentActivity: (limit: number) => Promise<ActivityItem[]>;
  };

  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchRecentActivity(10);
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load recent activity", err);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fetchRecentActivity]);

  const formatTimeAgo = (dateInput: ActivityItem["timestamp"]) => {
    const now = new Date().getTime();
    const then = new Date(dateInput).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff <= 0) return "now";
    if (diff < 60) return `${diff}s ago`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderIcon = (type: ActivityType) => {
    switch (type) {
      case "project":
        return <FaProjectDiagram className="activity-icon project" />;
      case "message":
        return <FaRegCommentDots className="activity-icon message" />;
      case "invoice":
        return <FaFileInvoice className="activity-icon invoice" />;
      default:
        return null;
    }
  };

  const linkFor = (item: ActivityItem) => {
    const slug = slugify(item.projectTitle || "");
    if (item.type === "invoice") return `/dashboard/projects/${slug}/budget`;
    return `/dashboard/projects/${slug}`;
  };

  return (
    <div className="recent-activity">
      <h3 className="activity-title">Recent Activity</h3>
      <ul className="activity-list">
        {items.length === 0 && <li className="activity-empty">No recent activity</li>}
        {items.map((item) => (
          <li key={item.id} className={`activity-item ${item.type}`}>
            <Link to={linkFor(item)}>
              {renderIcon(item.type)}
              <span className="activity-text">{item.text}</span>
              <span className="activity-time">{formatTimeAgo(item.timestamp)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentActivity;
