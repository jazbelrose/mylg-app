import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
  KeyboardEvent,
} from "react";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import { useNotificationSocket } from "../../../../app/NotificationSocketBridge";
import { Bell, FileText, ChevronRight } from "lucide-react";
import ProjectAvatar from "../../../../components/ProjectAvatar";
import { useNavigate } from "react-router-dom";
import { slugify } from "../../../../utils/slug";
import Inbox from "./inbox";
import "./style.css";

// ---- Types ---------------------------------------------------------------

interface LeftSideBarProps {
  setActiveView: (view: string) => void;
  setDmUserSlug: (slug: string) => void;
}

type UUIDKey = "timestamp#uuid";

interface NotificationItem {
  timestamp: string; // ISO
  read: boolean;
  message: string;
  senderId?: string;
  projectId?: string;
  [key in UUIDKey]: string;
}

interface ProjectLike {
  projectId: string;
  title?: string;
  thumbnails?: string[];
}

interface UserLike {
  userId: string;
  firstName?: string;
  lastName?: string;
  thumbnail?: string | null;
}

interface UseData {
  userData: {
    invoices?: Array<{ status?: string }>;
  } | null;
  allUsers: UserLike[];
  projects: ProjectLike[];
  fetchProjectDetails: (projectId: string) => Promise<ProjectLike | void>;
}

// ---- Component -----------------------------------------------------------

const LeftSideBar: React.FC<LeftSideBarProps> = ({ setActiveView, setDmUserSlug }) => {
  const { userData, allUsers, projects, fetchProjectDetails } = useData() as UseData;
  const { notifications, removeNotification } = useNotifications() as {
    notifications: NotificationItem[];
    removeNotification: (id: string) => void;
  };
  const { emitNotificationRead } = useNotificationSocket();
  const navigate = useNavigate();

  const notifListRef = useRef<HTMLUListElement | null>(null);
  const topSentinelRef = useRef<HTMLLIElement | null>(null);
  const prevCountRef = useRef<number>(notifications.length);

  const [newCount, setNewCount] = useState<number>(0);
  const [showNewNotice, setShowNewNotice] = useState<boolean>(false);
  const [isAtTop, setIsAtTop] = useState<boolean>(true);

  // Derived data (memoized)
  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [notifications]
  );

  const invoicesDue = userData?.invoices?.filter((i) => i.status === "due").length || 0;

  // IntersectionObserver for "at top?"
  useEffect(() => {
    const list = notifListRef.current;
    const sentinel = topSentinelRef.current;
    if (!list || !sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAtTop(entry.isIntersecting);
        if (entry.isIntersecting) {
          setNewCount(0);
          setShowNewNotice(false);
        }
      },
      { root: list }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // New notifications banner logic
  useEffect(() => {
    const diff = notifications.length - prevCountRef.current;
    prevCountRef.current = notifications.length;

    if (diff > 0) {
      if (isAtTop) {
        notifListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setNewCount((prev) => prev + diff);
        setShowNewNotice(true);
      }
    }
  }, [notifications, isAtTop]);

  const scrollToTop = useCallback(() => {
    const ul = notifListRef.current;
    if (ul) ul.scrollTo({ top: 0, behavior: "smooth" });
    setNewCount(0);
    setShowNewNotice(false);
  }, []);

  const handleNavigation = (view: string, highlightId: string | null = null) => {
    setActiveView(view);
    const base = "/dashboard";
    const path = view === "welcome" ? base : `${base}/${view}`;
    const opts = highlightId ? { state: { highlightId } } : undefined;
    navigate(path, opts);
  };

  const onRowKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (e.currentTarget as HTMLLIElement).click();
    }
  };

  const formatNotification = (msg: string) => {
    try {
      if (msg.startsWith("📦 Parsed Payload: ")) {
        const payload = JSON.parse(msg.replace("📦 Parsed Payload: ", ""));
        if (payload.action === "projectUpdated") return `Project ${payload.projectId} was updated.`;
        if (payload.action === "timelineUpdated") return `Timeline updated on project ${payload.projectId}.`;
      }
    } catch {
      /* ignore parse errors */
    }
    return msg;
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diff = Math.floor((Number(now) - Number(then)) / 1000);
    if (diff <= 0) return "now";
    if (diff < 60) return `${diff}s ago`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="quick-stats-container-column">
      <div className="left-sidebar-grid">
        {/* Notifications card */}
        <div
          className="row-items"
        >
          <div
            className="stat-item left-stat-large"
            onClick={() => handleNavigation("notifications")}
            style={{ cursor: "pointer" }}
          >
            <div className="stat-item-header">
              <div className="notification-icon-wrapper">
                <Bell className="stat-icon" />
                {unreadNotifications > 0 && <span className="notification-badge" />}
              </div>
              <div className="stats-header">
                <span className="stats-title">Notifications</span>
                <span className="stats-count">{unreadNotifications}</span>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="progress-text">No notifications</div>
            ) : (
              <>
                <ul className="notification-preview-list" ref={notifListRef}>
                  <li
                    ref={topSentinelRef}
                    style={{ listStyle: "none", height: 1, margin: 0, padding: 0 }}
                  />
                  {sortedNotifications.map((notif) => {
                    const sender: UserLike | undefined = allUsers.find(
                      (u) => u.userId === notif.senderId
                    );
                    const project: ProjectLike | undefined = projects.find(
                      (p) => p.projectId === notif.projectId
                    );
                    const thumb = project?.thumbnails?.[0] || sender?.thumbnail || null;
                    const name = project
                      ? project.title || "Project"
                      : sender?.firstName
                      ? `${sender.firstName} ${sender.lastName ?? ""}`.trim()
                      : "User";
                    const time = formatTimeAgo(notif.timestamp);

                    const handleClick = async (e: React.MouseEvent) => {
                      e.stopPropagation();
                      emitNotificationRead(notif["timestamp#uuid"]);

                      if (notif.projectId) {
                        const details = (await fetchProjectDetails(notif.projectId)) as
                          | ProjectLike
                          | void;
                        const derivedTitle =
                          details?.title ||
                          projects.find((p) => p.projectId === notif.projectId)?.title ||
                          notif.projectId;
                        const slug = slugify(derivedTitle);
                        navigate(`/dashboard/projects/${slug}`);
                      } else {
                        handleNavigation("notifications", notif["timestamp#uuid"]);
                      }
                    };

                    return (
                      <li
                        key={notif["timestamp#uuid"]}
                        className={`notification-preview-item unread-dm-item${
                          notif.read ? " read" : ""
                        }`}
                        onClick={handleClick}
                        role="button"
                        tabIndex={0}
                        onKeyDown={onRowKeyDown}
                      >
                        <ProjectAvatar
                          thumb={thumb || undefined}
                          name={name}
                          className="dm-avatar"
                        />
                        <div className="notification-content">
                          <div className="notification-header">
                            <span className="notification-user">{name}</span>
                            <span className="notification-time">{time}</span>
                            <button
                              className="notification-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notif["timestamp#uuid"]);
                              }}
                              aria-label="Delete notification"
                            >
                              ×
                            </button>
                          </div>
                          <div className="dm-text">{formatNotification(notif.message)}</div>
                        </div>
                        <ChevronRight
                          className="notification-arrow"
                          size={14}
                          aria-hidden="true"
                        />
                      </li>
                    );
                  })}
                </ul>

                {showNewNotice && (
                  <div
                    className="new-notification-banner"
                    onClick={scrollToTop}
                    aria-live="polite"
                  >
                    {newCount} new notification{newCount === 1 ? "" : "s"} — tap to
                    scroll up
                  </div>
                )}
              </>
            )}
          </div>

          {/* Inbox block remains unchanged */}
          <Inbox setActiveView={setActiveView} setDmUserSlug={setDmUserSlug} />
        </div>

        {/* Invoices card */}
        <div className="stat-item left-stat-small">
          <div className="stat-item-header">
            <FileText className="stat-icon" />
            <div className="stats-header">
              <span className="stats-title">Invoices Due</span>
              <span className="stats-count">{invoicesDue}</span>
            </div>
          </div>
          <div className="progress-text">{invoicesDue} Due Invoices</div>
        </div>
      </div>
    </div>
  );
};

export default LeftSideBar;
