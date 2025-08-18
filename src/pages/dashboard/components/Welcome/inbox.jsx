// app/components/Inbox.jsx
import React, { useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { User, Mail, Check } from "lucide-react";
import { THREADS_URL, READ_STATUS_URL, apiFetch } from "../../../../utils/api";
import { slugify } from "../../../../utils/slug";
import "./style.css";


export default function Inbox({ setActiveView, setDmUserSlug }) {
  const { userId, allUsers, dmThreads, setDmThreads } = useData();
  const { ws } = useSocket();
  const refreshInbox = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await apiFetch(`${THREADS_URL}?userId=${encodeURIComponent(userId)}`);
      const data = await res.json();
      setDmThreads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('❌ inbox refresh failed', err);
    }
  }, [userId, setDmThreads]);

  const inbox = useMemo(
    () => [...dmThreads].sort((a, b) => new Date(b.lastMsgTs) - new Date(a.lastMsgTs)),
    [dmThreads]
  );
  const navigate = useNavigate();
  const handleNavigation = useCallback((view) => {
    setActiveView?.(view);
    const base = '/dashboard';
    const path = view === 'welcome' ? base : `${base}/${view}`;
    navigate(path);
  }, [navigate, setActiveView]);

  /* ───────────────────────────── 1. initial fetch ───────────────────────────── */
  useEffect(() => {
    if (!userId) return;
    refreshInbox();
  }, [userId, refreshInbox]);

  // updates are pushed via SocketContext

  /* ───────────────────────────── 3. helpers ───────────────────────────── */
  const totalUnread = inbox.filter(item => !item.read).length;

  const markReadAndNav = useCallback(async (otherUserId, convId) => {
    // 1) locally mark read
    setDmThreads(prev =>
      prev.map(m =>
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
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          action: "markRead",
          conversationType: "dm",
          conversationId: convId,
          userId,
          read: true
        }));
      }
    } catch (_) {
      console.warn("Failed to persist read flag");
    }

    // 3) navigate to DM view
    const user = allUsers.find(u => u.userId === otherUserId);
    const slug = user ? slugify(`${user.firstName}-${user.lastName}`) : otherUserId;
    setActiveView?.('messages');
    setDmUserSlug?.(slug);
    navigate(`/dashboard/messages/${slug}`);
    refreshInbox();
  }, [userId, navigate, ws, refreshInbox, setActiveView, setDmUserSlug, allUsers]);

  /* ───────────────────────────── 4. render ───────────────────────────── */
  return (
    <div
      className="stat-item left-stat-large message-stat"
      style={{ cursor: "pointer" }}
      onClick={() => handleNavigation('messages')}
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
          {inbox.map(item => {
            const user = allUsers.find(u => u.userId === item.otherUserId) || {};
            const name = user.firstName
              ? `${user.firstName} ${user.lastName ?? ""}`
              : "Unknown";
            const thumb = user.thumbnail;

            return (
              <div
                key={item.conversationId}
                className="unread-dm-item"
                onClick={() => markReadAndNav(item.otherUserId, item.conversationId)}
              >
                {thumb
                  ? <img src={thumb} alt={name} className="dm-avatar" />
                  : <User className="dm-avatar" />}
                <div className="dm-info">
                  <div className="dm-name">{name}</div>
                  <div className="dm-text">{item.snippet}</div>
                </div>
                {item.read
                  ? <Check className="read-indicator read" size={12} />
                  : <span className="read-indicator unread" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
