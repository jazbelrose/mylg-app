import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { THREADS_URL, apiFetch } from '../../utils/api';
import { getWithTTL, setWithTTL, DEFAULT_TTL } from '../../utils/storageWithTTL';

const MessagesContext = createContext();

export const useMessages = () => useContext(MessagesContext);

export const MessagesProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;

  // Message state
  const [projectMessages, setProjectMessages] = useState({});
  const [dmThreads, setDmThreads] = useState(() => {
    const stored = getWithTTL('dmThreads');
    return Array.isArray(stored) ? stored : [];
  });

  // Track last read timestamp for direct message conversations
  const [dmReadStatus, setDmReadStatus] = useState(() => {
    const stored = getWithTTL('dmReadStatus');
    return stored && typeof stored === 'object' ? stored : {};
  });

  // Track IDs of messages deleted locally so we can filter out any
  // server copies that arrive later due to propagation lag.
  const deletedMessageIdsRef = useRef(new Set());

  const markMessageDeleted = useCallback((id) => {
    if (id) deletedMessageIdsRef.current.add(id);
  }, []);

  const clearDeletedMessageId = useCallback((id) => {
    if (id) deletedMessageIdsRef.current.delete(id);
  }, []);

  const toggleReaction = useCallback((msgId, emoji, reactorId, conversationId, conversationType, ws) => {
    if (!msgId || !emoji || !reactorId) return;

    const updateArr = (arr = []) =>
      arr.map(m => {
        const id = m.messageId || m.optimisticId;
        if (id !== msgId) return m;

        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);

        if (users.has(reactorId)) {
          users.delete(reactorId);
        } else {
          users.add(reactorId);
        }

        if (users.size === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = Array.from(users);
        }

        return { ...m, reactions };
      });

    // Update DM threads if applicable
    setDmThreads(prev => {
      const thread = prev.find(t => t.conversationId === conversationId);
      if (!thread) return prev;

      const msgs = Array.isArray(thread.messages) ? thread.messages : [];
      return prev.map(t =>
        t.conversationId === conversationId
          ? { ...t, messages: updateArr(msgs) }
          : t
      );
    });

    // Update project messages if applicable
    setProjectMessages(prev => {
      const updated = {};
      for (const pid of Object.keys(prev)) {
        const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
        updated[pid] = updateArr(msgs);
      }
      return updated;
    });

    // Send websocket message if available
    if (
      ws &&
      ws.readyState === WebSocket.OPEN &&
      conversationId &&
      conversationType
    ) {
      ws.send(
        JSON.stringify({
          action: 'toggleReaction',
          conversationType,
          conversationId,
          messageId: msgId,
          emoji,
          userId: reactorId,
        })
      );
    }
  }, []);

  // Persist dmThreads and dmReadStatus
  useEffect(() => {
    setWithTTL('dmThreads', dmThreads, DEFAULT_TTL);
  }, [dmThreads]);

  useEffect(() => {
    setWithTTL('dmReadStatus', dmReadStatus, DEFAULT_TTL);
  }, [dmReadStatus]);

  // Fetch DM threads when user changes
  useEffect(() => {
    if (!userId) return;

    const fetchThreads = async () => {
      try {
        const res = await apiFetch(`${THREADS_URL}?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        setDmThreads(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch threads', err);
      }
    };

    fetchThreads();
  }, [userId]);

  const value = useMemo(() => ({
    // State
    projectMessages,
    setProjectMessages,
    dmThreads,
    setDmThreads,
    dmReadStatus,
    setDmReadStatus,
    deletedMessageIds: deletedMessageIdsRef.current,

    // Operations
    markMessageDeleted,
    clearDeletedMessageId,
    toggleReaction,
  }), [
    projectMessages,
    setProjectMessages,
    dmThreads,
    setDmThreads,
    dmReadStatus,
    setDmReadStatus,
    markMessageDeleted,
    clearDeletedMessageId,
    toggleReaction,
  ]);

  return _jsx(MessagesContext.Provider, { value: value, children: children });
};

export default MessagesProvider;