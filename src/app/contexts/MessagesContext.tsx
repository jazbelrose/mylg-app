// src/app/contexts/MessagesContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  PropsWithChildren,
} from "react";
import { useAuth } from "./AuthContext";
import {
  THREADS_URL,
  apiFetch,
} from "../../utils/api";
import { getWithTTL, setWithTTL, DEFAULT_TTL } from "../../utils/storageWithTTL";

// ---------- Domain Models ----------
export interface Message {
  messageId?: string;
  optimisticId?: string;
  text: string;
  body?: string;
  content?: string;
  timestamp: string;      // ISO - required
  reactions?: Record<string, string[]>; // emoji -> userIds
  senderId: string; // Required to match messageUtils type
  conversationId?: string;
  read?: boolean | string | number;
  [k: string]: unknown;
}

export interface DMThread {
  threadId?: string;
  participants?: string[];
  lastMessageAt?: string;
  [k: string]: unknown;
}

type ProjectMessagesMap = Record<string, Message[]>; // projectId -> messages

// ---------- Context Shape ----------
interface MessagesContextValue {
  dmThreads: DMThread[];
  setDmThreads: React.Dispatch<React.SetStateAction<DMThread[]>>;
  projectMessages: ProjectMessagesMap;
  setProjectMessages: React.Dispatch<React.SetStateAction<ProjectMessagesMap>>;
  deletedMessageIds: Set<string>;
  markMessageDeleted: (id?: string) => void;
  clearDeletedMessageId: (id?: string) => void;
  toggleReaction: (
    msgId: string,
    emoji: string,
    reactorId: string,
    conversationId: string,
    conversationType: "dm" | "project",
    ws?: WebSocket
  ) => void;
}

// ---------- Context + Hook ----------
const MessagesContext = createContext<MessagesContextValue | undefined>(undefined);

export const useMessagesContext = (): MessagesContextValue => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessagesContext must be used within MessagesProvider");
  return ctx;
};

// ---------- Provider ----------
export const MessagesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { userId } = useAuth();

  const [projectMessages, setProjectMessages] = useState<ProjectMessagesMap>({});
  const [dmThreads, setDmThreads] = useState<DMThread[]>(() => {
    const stored = getWithTTL("dmThreads");
    return Array.isArray(stored) ? (stored as DMThread[]) : [];
  });

  const deletedMessageIdsRef = useRef<Set<string>>(new Set());
  const markMessageDeleted = (id?: string) => {
    if (id) deletedMessageIdsRef.current.add(id);
  };
  const clearDeletedMessageId = (id?: string) => {
    if (id) deletedMessageIdsRef.current.delete(id);
  };

  const toggleReaction = (
    msgId: string,
    emoji: string,
    reactorId: string,
    conversationId: string,
    conversationType: "dm" | "project",
    ws?: WebSocket
  ) => {
    if (!msgId || !emoji || !reactorId) return;

    const updateArr = (arr: Message[] = []) =>
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

    // Update project messages
    setProjectMessages((prev) => {
      const updated: ProjectMessagesMap = {};
      for (const pid of Object.keys(prev)) {
        const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
        updated[pid] = updateArr(msgs);
      }
      return updated;
    });

    if (ws && ws.readyState === WebSocket.OPEN && conversationId && conversationType) {
      ws.send(
        JSON.stringify({
          action: "toggleReaction",
          conversationType,
          conversationId,
          messageId: msgId,
          emoji,
          userId: reactorId,
        })
      );
    }
  };

  useEffect(() => {
    setWithTTL("dmThreads", dmThreads, DEFAULT_TTL);
  }, [dmThreads]);

  // Load DM threads
  useEffect(() => {
    if (!userId) return;
    const fetchThreads = async () => {
      try {
        const res = await apiFetch(`${THREADS_URL}?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();
        setDmThreads(Array.isArray(data) ? (data as DMThread[]) : []);
      } catch (err) {
        console.error("Failed to fetch threads", err);
      }
    };
    fetchThreads();
  }, [userId]);

  // ---------- Memoized context value ----------
  const value = useMemo<MessagesContextValue>(
    () => ({
      dmThreads,
      setDmThreads,
      projectMessages,
      setProjectMessages,
      deletedMessageIds: deletedMessageIdsRef.current,
      markMessageDeleted,
      clearDeletedMessageId,
      toggleReaction,
    }),
    [dmThreads, projectMessages]
  );

  return (
    <MessagesContext.Provider value={value}>
      {children}
    </MessagesContext.Provider>
  );
};

export default MessagesProvider;