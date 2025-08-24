// app/components/Inbox.tsx
import React, { useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { User as UserIcon, Mail, Check } from "lucide-react";
import { THREADS_URL, READ_STATUS_URL, apiFetch } from "../../../../utils/api";
import { slugify } from "../../../../utils/slug";
import "./style.css";

type Thread = {
  conversationId: string;
  otherUserId: string;
  lastMsgTs: string; // ISO string
  snippet?: string;
  read?: boolean;
};

type BasicUser = {
  userId: string;
  firstName?: string;
  lastName?: string;
  thumbnail?: string;
};

type InboxProps = {
  setActiveView?: (view: string) => void;
  setDmUserSlug?: (slug: string) => void;
};

export default function Inbox({ setActiveView, setDmUserSlug }: InboxProps) {
  const { userId, allUsers, dmThreads, setDmThreads } = useData() as {
    userId?: string;
    allUsers: BasicUser[];
    dmThreads: Thread[];
    // IMPORTANT: allow functional updates
    setDmThreads: React.Dispatch<React.SetStateAction<Thread[]>>;
  };

  const { ws } = useSocket() as { ws?: WebSocket | null };

  const navigate = useNavigate();

  const refreshInbox = useCallback(async () => {
    if (!userId) return;
    try {
      // ✅ apiFetch already returns parsed JSON — no res.json()
      const data = await apiFetch(
        `${THREADS_URL}?userId=${encodeURIComponent(userId)}`
      );
      // Optional: sanity check in dev
      console.debug("[Inbox] fetched threads:", data);
      setDmThreads(Array.isArray(data) ? (data as Thread[]) : []);
    } catch (err) {
      console.error("❌ inbox refresh failed", err);
      setDmThreads([]); // keep UI consistent on error
    }
  }, [userId, setDmThreads]); // :contentReference[oaicite:1]{index=1}

  const inbox = useMemo<Thread[]>(
    () =>
      [...(dmThreads || [])].sort((a, b) => {
        const ta = Date.parse(a?.lastMsgTs || "");
        const tb = Date.parse(b?.lastMsgTs || "");
        // Fallback to 0 if invalid date
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
      }),
    [dmThreads]
  );

  const handleNavigation = useCallback(
    (view: string) => {
      setActiveView?.(view);
      const base = "/dashboard";
      const path = view === "welcome" ? base : `${base}/${view}`;
      navigate(path);
    },
    [navigate, setActiveView]
  );

  // 1) initial fetch
  useEffect(() => {
    if (!userId) return;
    refreshInbox();
  }, [userId, refreshInbox]);

  // 2) (Updates pushed via SocketContext elsewhere)

  // 3) helpers
  const totalUnread = inbox.filter((item) => !item.read).length;

  const markReadAndNav = useCallback(
    async (otherUserId: string, convId: string) => {
      // 1) locally mark read
      setDmThreads((prev) =>
        prev.map((m) =>
          m.conversationId === convId ? { ...m, read: true } : m
        )
      );

      // 2) persist read flag
      try {
        await apiFetch(READ_STATUS_URL, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, conversationId: convId, read: true }),
        });

        // optional WS broadcast
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              action: "markRead",
              conversationType: "dm",
              conversationId: convId,
              userId,
              read: true,
            })
          );
        }
      } catch {
        console.warn("Failed to persist read flag");
      }

      // 3) navigate to DM view
      const user = allUsers.find((u) => u.userId === otherUserId);
      const slug = user?.firstName
        ? slugify(`${user.firstName}-${user.lastName ?? ""}`)
        : otherUserId;

      setActiveView?.("messages");
      setDmUserSlug?.(slug);
      navigate(`/dashboard/messages/${slug}`);

      // refresh to reflect server truth
      refreshInbox();
    },
    [
      userId,
      ws,
      navigate,
      refreshInbox,
      setActiveView,
      setDmUserSlug,
      allUsers,
      setDmThreads,
    ]
  );

  // 4) render
  return (
    <div
      className="stat-item left-stat-large message-stat"
      style={{ cursor: "pointer" }}
      onClick={() => handleNavigation("messages")}
    >
      <div className="stat-item-header">
        <Mail className="stat-icon" />
        <div className="stats-header">
          <span className="stats-title">DMs</span>
          <span className="stats-count">{totalUnread}</span>
        </div>
      </div>

      {inbox.length === 0 ? (
        <div className="progress-text">No messages</div>
      ) : (
        <div className="unread-dm-list">
          {inbox.map((item) => {
            const user = allUsers.find((u) => u.userId === item.otherUserId);
            const name = user?.firstName
              ? `${user.firstName} ${user.lastName ?? ""}`.trim()
              : "Unknown";
            const thumb = user?.thumbnail;

            return (
              <div
                key={item.conversationId}
                className="unread-dm-item"
                onClick={() =>
                  markReadAndNav(item.otherUserId, item.conversationId)
                }
              >
                {thumb ? (
                  <img src={thumb} alt={name} className="dm-avatar" />
                ) : (
                  <UserIcon className="dm-avatar" />
                )}

                <div className="dm-info">
                  <div className="dm-name">{name}</div>
                  <div className="dm-text">{item.snippet}</div>
                </div>

                {item.read ? (
                  <Check className="read-indicator read" size={12} />
                ) : (
                  <span className="read-indicator unread" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
