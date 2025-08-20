import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useRef } from 'react';

const MessagesContext = createContext({
  projectMessages: {},
  dmThreads: [],
  dmReadStatus: {},
  markMessageDeleted: () => {},
  clearDeletedMessageId: () => {},
  toggleReaction: () => {},
});

export const MessagesProvider = ({ children }) => {
  const [projectMessages, setProjectMessages] = useState({});
  const [dmThreads, setDmThreads] = useState([]);
  const [dmReadStatus, setDmReadStatus] = useState({});
  const deletedMessageIdsRef = useRef(new Set());

  const markMessageDeleted = (id) => {
    if (id) deletedMessageIdsRef.current.add(id);
  };

  const clearDeletedMessageId = (id) => {
    if (id) deletedMessageIdsRef.current.delete(id);
  };

  const toggleReaction = (msgId, emoji, reactorId) => {
    if (!msgId || !emoji || !reactorId) return;
    const updateArr = (arr = []) =>
      arr.map((m) => {
        const id = m.messageId || m.optimisticId;
        if (id !== msgId) return m;
        const reactions = { ...(m.reactions || {}) };
        const users = new Set(reactions[emoji] || []);
        if (users.has(reactorId)) {
          users.delete(reactorId);
        } else {
          users.add(reactorId);
        }
        reactions[emoji] = Array.from(users);
        return { ...m, reactions };
      });
    setProjectMessages((prev) => {
      const updated = {};
      for (const pid of Object.keys(prev)) {
        const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
        updated[pid] = updateArr(msgs);
      }
      return updated;
    });
  };

  return _jsx(MessagesContext.Provider, {
    value: {
      projectMessages,
      setProjectMessages,
      dmThreads,
      setDmThreads,
      dmReadStatus,
      setDmReadStatus,
      markMessageDeleted,
      clearDeletedMessageId,
      toggleReaction,
    },
    children,
  });
};

export const useMessages = () => useContext(MessagesContext);

