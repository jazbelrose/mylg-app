import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { v4 as uuid } from "uuid";
import { useAuth } from "./AuthContext";
import { useData } from "./DataProvider";
import { useDMConversation } from "./DMConversationContext";
import { WEBSOCKET_URL } from "../../utils/api";
import { mergeAndDedupeMessages } from "../../utils/messageUtils";
import { createSecureWebSocketConnection } from "../../utils/secureWebSocketAuth";
import { logSecurityEvent } from "../../utils/securityUtils";
import { channelStore } from "../../utils/channelStore";

// ----- Types -----
interface ExtendedWebSocket extends WebSocket {
  keepAliveInterval?: ReturnType<typeof setInterval>;
}
interface MessageData {
  timestamp: string;
  conversationId?: string;
  messageId?: string;
  optimisticId?: string;
  text?: string;
  [key: string]: unknown;
}

// ===== New Slim Contexts =====
type OnSocketEvent = (fn: (msg: any) => void) => () => void;

const SocketEventsContext = createContext<OnSocketEvent | undefined>(undefined);
const SocketConnContext = createContext<{ ws: WebSocket | null; isConnected: boolean } | undefined>(
  undefined
);
const SocketPresenceContext = createContext<string[] | undefined>(undefined);

// Hooks for new contexts
export const useSocketEvents = (): OnSocketEvent => {
  const ctx = useContext(SocketEventsContext);
  if (!ctx) throw new Error("useSocketEvents must be used within a SocketProvider");
  return ctx;
};
export const useSocketConn = () => {
  const ctx = useContext(SocketConnContext);
  if (!ctx) throw new Error("useSocketConn must be used within a SocketProvider");
  return ctx;
};
export const useSocketPresence = () => {
  const ctx = useContext(SocketPresenceContext);
  if (!ctx) throw new Error("useSocketPresence must be used within a SocketProvider");
  return ctx;
};

// ===== Legacy Context (kept for backward compatibility) =====
interface SocketContextValue {
  ws: WebSocket | null;
  isConnected: boolean;
  onlineUsers: string[];
}
const LegacySocketContext = createContext<SocketContextValue | undefined>(undefined);
export const useSocket = (): SocketContextValue => {
  const ctx = useContext(LegacySocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
};

// ===== Provider =====
export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { getAuthTokens } = useAuth() as {
    getAuthTokens: () => Promise<{ idToken?: string } | null>;
  };

  const {
    setUserData,
    setDmThreads,
    userId,
    setProjects,
    setUserProjects,
    setActiveProject,
    updateProjectFields, // retained
    setProjectMessages,
    deletedMessageIds,
    markMessageDeleted,
    activeProject,
    fetchProjects,
    fetchUserProfile,
    refreshUsers,
  } = useData();

  const { activeDmConversationId } = useDMConversation();

  // Core socket state (kept internal; only exposed via slim contexts)
  const [ws, setWs] = useState<ExtendedWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Refs
  const wsRef = useRef<ExtendedWebSocket | null>(null);
  const reconnectInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const collaboratorsUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshUsersRef = useRef(refreshUsers);
  const fetchUserProfileRef = useRef(fetchUserProfile);
  const onlineUsersRef = useRef<string[]>([]);
  const handlersRef = useRef<Set<(msg: any) => void>>(new Set());
  const seenBackendErrorIdsRef = useRef<Set<string>>(new Set());

  // Event subscribe API
  const onSocketEvent = useCallback<OnSocketEvent>((fn) => {
    handlersRef.current.add(fn);
    return () => handlersRef.current.delete(fn);
  }, []);

  // Session id
  const generateSessionId = useCallback((): string => {
    if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
      return (crypto as any).randomUUID();
    }
    return uuid();
  }, []);
  const sessionIdRef = useRef<string>(
    sessionStorage.getItem("ws_session_id") || generateSessionId()
  );
  useEffect(() => {
    sessionStorage.setItem("ws_session_id", sessionIdRef.current);
  }, []);

  // Keep refs fresh
  useEffect(() => {
    wsRef.current = ws;
  }, [ws]);
  useEffect(() => {
    refreshUsersRef.current = refreshUsers;
  }, [refreshUsers]);
  useEffect(() => {
    fetchUserProfileRef.current = fetchUserProfile;
  }, [fetchUserProfile]);

  // Helpers
  const scheduleCollaboratorsRefresh = useCallback(() => {
    if (collaboratorsUpdateTimeout.current) {
      clearTimeout(collaboratorsUpdateTimeout.current);
    }
    collaboratorsUpdateTimeout.current = setTimeout(() => {
      refreshUsersRef.current?.();
      fetchUserProfileRef.current?.();
      collaboratorsUpdateTimeout.current = null;
    }, 1000);
  }, []);

  const startReconnect = useCallback(() => {
    if (reconnectInterval.current || wsRef.current) return;
    reconnectInterval.current = setInterval(() => {
      if (!wsRef.current) void connectWebSocket();
    }, 5000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopReconnect = useCallback(() => {
    if (reconnectInterval.current) {
      clearInterval(reconnectInterval.current);
      reconnectInterval.current = null;
    }
  }, []);

  const arraysShallowEqual = (a: string[], b: string[]) =>
    a.length === b.length && a.every((u, i) => u === b[i]);

  const safeParse = (raw: string) => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };

  // Connect
  const connectWebSocket = useCallback(async () => {
    if (wsRef.current) return;
    try {
      const tokens = await getAuthTokens();
      if (!tokens?.idToken) {
        console.error("No ID token, cannot connect WebSocket.");
        startReconnect();
        return;
      }
      const sessionId = sessionIdRef.current;
      if (!sessionId) {
        console.error("No sessionId, cannot connect WebSocket.");
        startReconnect();
        return;
      }
      if (wsRef.current) return;

      const socket = (await createSecureWebSocketConnection(
        WEBSOCKET_URL,
        tokens.idToken,
        sessionId
      )) as ExtendedWebSocket;

      socket.onopen = () => {
        setIsConnected(true);
        setWs(socket);
        wsRef.current = socket;
        stopReconnect();

        const presence = JSON.stringify({ action: "presencePing" });
        socket.send(presence);
        socket.keepAliveInterval = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send(presence);
        }, 30_000);
      };

      socket.onmessage = (event: MessageEvent<string>) => {
        const data = safeParse(event.data);
        if (!data || typeof data !== "object") {
          console.warn("⚠️ WS non-JSON/empty payload:", event.data);
          return;
        }

        // Dedup noisy API GW generic error
        if ((data as any).message === "Internal server error" && (data as any).requestId) {
          const id = (data as any).requestId as string;
          if (!seenBackendErrorIdsRef.current.has(id)) {
            seenBackendErrorIdsRef.current.add(id);
            console.warn("[WS] Backend error:", id);
          }
          return;
        }

        // Parse incoming messages and update channelStore for specific channels
        if (data && typeof data === 'object' && 'action' in data) {
          const message = data as any;
          
          // Budget updates: channel key "budget:{projectId}"
          if (message.action === 'budgetUpdated' && message.projectId) {
            const channelKey = `budget:${message.projectId}`;
            channelStore.update(channelKey, message);
          }
          
          // Line locking: channel key "lineLock:{projectId}"
          else if ((message.action === 'lineLocked' || message.action === 'lineUnlocked') && message.projectId) {
            const channelKey = `lineLock:${message.projectId}`;
            channelStore.update(channelKey, message);
          }
        }

        // Fan out to subscribers WITHOUT changing provider value
        handlersRef.current.forEach((fn) => {
          try {
            fn(data);
          } catch (e) {
            console.error("WS handler error:", e);
          }
        });

        // Presence (guard array identity)
        if ((data as any).type === "onlineUsers" && Array.isArray((data as any).users)) {
          const users = [...((data as any).users as string[])];
          // Preserve your behavior if you need to force-include current user:
          if (userId && !users.includes(userId)) users.push(userId);
          if (!arraysShallowEqual(users, onlineUsersRef.current)) {
            onlineUsersRef.current = users;
            setOnlineUsers(users);
          }
          return;
        }

        // Timeline updates
        if (
          (data as any).action === "timelineUpdated" &&
          (data as any).projectId &&
          Array.isArray((data as any).events)
        ) {
          const pid = (data as any).projectId as string;
          const evts = (data as any).events;
          setProjects((prev) =>
            prev.map((p) => (p.projectId === pid ? { ...p, timelineEvents: evts } : p))
          );
          setUserProjects((prev) =>
            prev.map((p) => (p.projectId === pid ? { ...p, timelineEvents: evts } : p))
          );
          setActiveProject((prev) =>
            prev && prev.projectId === pid ? { ...prev, timelineEvents: evts } : prev
          );
          return;
        }

        // Project updates
        if (
          (data as any).action === "projectUpdated" &&
          (data as any).projectId &&
          typeof (data as any).fields === "object"
        ) {
          const pid = (data as any).projectId as string;
          const fields = (data as any).fields as Record<string, unknown>;
          setProjects((prev) => prev.map((p) => (p.projectId === pid ? { ...p, ...fields } : p)));
          setUserProjects((prev) => prev.map((p) => (p.projectId === pid ? { ...p, ...fields } : p)));
          setActiveProject((prev) => (prev && prev.projectId === pid ? { ...prev, ...fields } : prev));
          return;
        }

        // Gallery created
        if ((data as any).action === "galleryCreated" && (data as any).projectId) {
          fetchProjects();
          return;
        }

        // Collaborators
        if ((data as any).type === "collaborators-updated") {
          scheduleCollaboratorsRefresh();
          return;
        }

        // ----- DM -----
        if ((data as any).conversationType === "dm") {
          const dm = data as any;

          if (dm.action === "sendMessage" || dm.action === "newMessage") {
            if (deletedMessageIds.has(dm.messageId) || deletedMessageIds.has(dm.optimisticId)) return;

            const isSelf = dm.senderId === userId;
            const viewing = activeDmConversationId === dm.conversationId;

            setUserData((prev: any) => {
              if (!prev) return prev;
              const prevMsgs: MessageData[] = Array.isArray(prev.messages) ? prev.messages : [];
              const merged = mergeAndDedupeMessages(prevMsgs, [{ ...dm, read: viewing || isSelf }]);
              return { ...prev, messages: merged };
            });

            setDmThreads((prev: any[]) => {
              const idx = prev.findIndex((t) => t.conversationId === dm.conversationId);
              const read = viewing || isSelf;
              if (idx !== -1) {
                const updated = [...prev];
                updated[idx] = {
                  ...updated[idx],
                  snippet: dm.text,
                  lastMsgTs: dm.timestamp,
                  read,
                };
                return updated;
              }
              return [
                ...prev,
                {
                  conversationId: dm.conversationId,
                  snippet: dm.text,
                  lastMsgTs: dm.timestamp,
                  read,
                  otherUserId: isSelf ? dm.recipientId : dm.senderId,
                },
              ];
            });
            return;
          }

          if (dm.action === "deleteMessage") {
            const viewing = activeDmConversationId === dm.conversationId;
            markMessageDeleted(dm.messageId || dm.optimisticId);
            setUserData((prev: any) => {
              if (!prev) return prev;
              const prevMsgs: MessageData[] = Array.isArray(prev.messages) ? prev.messages : [];
              const updatedMsgs = prevMsgs.filter(
                (m) =>
                  !((dm.messageId && m.messageId === dm.messageId) ||
                    (dm.optimisticId && m.optimisticId === dm.optimisticId))
              );

              const convoMsgs = updatedMsgs
                .filter((m) => m.conversationId === dm.conversationId)
                .sort(
                  (a, b) =>
                    new Date((b.timestamp as string) || 0).getTime() -
                    new Date((a.timestamp as string) || 0).getTime()
                );
              const lastMsg = convoMsgs[0];
              const newSnippet = (lastMsg?.text as string) || "";
              const newTs = (lastMsg?.timestamp as string) || new Date().toISOString();

              setDmThreads((prevThreads: any[]) =>
                prevThreads.map((t) =>
                  t.conversationId === dm.conversationId
                    ? { ...t, snippet: newSnippet, lastMsgTs: newTs, read: viewing ? true : t.read }
                    : t
                )
              );

              return { ...prev, messages: updatedMsgs };
            });
            return;
          }

          if (dm.action === "editMessage") {
            setUserData((prev: any) => {
              if (!prev) return prev;
              const msgs: MessageData[] = Array.isArray(prev.messages) ? prev.messages : [];
              return {
                ...prev,
                messages: msgs.map((m) =>
                  m.messageId === dm.messageId
                    ? { ...m, text: dm.text, edited: true, editedAt: dm.editedAt }
                    : m
                ),
              };
            });

            setDmThreads((prev: any[]) =>
              prev.map((t) =>
                t.conversationId === dm.conversationId && t.lastMsgTs === dm.timestamp
                  ? { ...t, snippet: dm.text, lastMsgTs: dm.timestamp }
                  : t
              )
            );
            return;
          }

          if (dm.action === "toggleReaction") {
            setUserData((prev: any) => {
              if (!prev) return prev;
              const msgs: MessageData[] = Array.isArray(prev.messages) ? prev.messages : [];
              return {
                ...prev,
                messages: msgs.map((m) => (m.messageId === dm.messageId ? { ...m, reactions: dm.reactions } : m)),
              };
            });
            return;
          }

          return;
        }

        // ----- Project messages -----
        if ((data as any).conversationType === "project") {
          const pd = data as any;
          const projectId = pd.projectId || (pd.conversationId || "").replace("project#", "");
          if (!projectId) return;

          if (pd.action === "sendMessage" || pd.action === "newMessage") {
            if (deletedMessageIds.has(pd.messageId) || deletedMessageIds.has(pd.optimisticId)) return;

            setProjectMessages((prev: Record<string, MessageData[]>) => {
              const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
              const merged = mergeAndDedupeMessages(msgs, [pd]);
              return { ...prev, [projectId]: merged };
            });
            return;
          }

          if (pd.action === "deleteMessage") {
            markMessageDeleted(pd.messageId || pd.optimisticId);
            setProjectMessages((prev: Record<string, MessageData[]>) => {
              const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
              return {
                ...prev,
                [projectId]: msgs.filter(
                  (m) =>
                    !((pd.messageId && m.messageId === pd.messageId) ||
                      (pd.optimisticId && m.optimisticId === pd.optimisticId))
                ),
              };
            });
            return;
          }

          if (pd.action === "editMessage") {
            setProjectMessages((prev: Record<string, MessageData[]>) => {
              const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
              return {
                ...prev,
                [projectId]: msgs.map((m) =>
                  m.messageId === pd.messageId ? { ...m, text: pd.text, edited: true, editedAt: pd.editedAt } : m
                ),
              };
            });
            return;
          }

          if (pd.action === "toggleReaction") {
            setProjectMessages((prev: Record<string, MessageData[]>) => {
              const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
              return {
                ...prev,
                [projectId]: msgs.map((m) => (m.messageId === pd.messageId ? { ...m, reactions: pd.reactions } : m)),
              };
            });
            return;
          }

          return;
        }

        // Unexpected
        console.warn("⚠️ Unexpected message from server:", data);
      };

      socket.onclose = (event: CloseEvent) => {
        console.log("WS close", event.code, event.reason);
        setIsConnected(false);
        if (socket.keepAliveInterval) clearInterval(socket.keepAliveInterval);
        setWs(null);
        wsRef.current = null;
        startReconnect();
      };

      socket.onerror = (err: Event) => {
        console.error("Socket error:", err);
        const msg = (err as any)?.message ?? (err as Error)?.message ?? "Unknown error";
        logSecurityEvent("websocket_error", { error: msg });
        if (socket.readyState === WebSocket.OPEN) socket.close();
        startReconnect();
      };
    } catch (error) {
      const msg = (error as any)?.message ?? (error as Error)?.message ?? "Unknown error";
      console.error("Error establishing secure WebSocket connection:", error);
      logSecurityEvent("secure_websocket_connection_error", { error: msg });
      startReconnect();
    }
  }, [
    getAuthTokens,
    userId,
    activeDmConversationId,
    deletedMessageIds,
    setUserData,
    setDmThreads,
    setProjects,
    setUserProjects,
    setActiveProject,
    fetchProjects,
    scheduleCollaboratorsRefresh,
    setProjectMessages,
    markMessageDeleted,
    startReconnect,
    stopReconnect,
  ]);

  // Mount/unmount
  useEffect(() => {
    void connectWebSocket();
    return () => {
      stopReconnect();
      const socket = wsRef.current;
      if (socket) {
        if (socket.keepAliveInterval) clearInterval(socket.keepAliveInterval);
        socket.close();
        setWs(null);
        wsRef.current = null;
      }
      if (collaboratorsUpdateTimeout.current) {
        clearTimeout(collaboratorsUpdateTimeout.current);
      }
    };
  }, [connectWebSocket, stopReconnect]);

  // Keep server focused on the active project conversation
  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;

    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${activeProject.projectId}`,
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
      return;
    }
    const handleOpen = () => {
      ws.send(payload);
      ws.removeEventListener("open", handleOpen);
    };
    ws.addEventListener("open", handleOpen);
    return () => ws.removeEventListener("open", handleOpen);
  }, [ws, activeProject?.projectId]);

  // ===== Provide split values (each memoized) =====
  const eventsValue = useMemo(() => onSocketEvent, [onSocketEvent]);
  const connValue = useMemo(() => ({ ws, isConnected }), [ws, isConnected]);
  // Presence value is the array itself (identity only changes when it actually changes)
  const presenceValue = onlineUsers;

  // Legacy value preserved for existing consumers
  const legacyValue = useMemo<SocketContextValue>(
    () => ({ ws, isConnected, onlineUsers }),
    [ws, isConnected, onlineUsers]
  );

  return (
    <SocketEventsContext.Provider value={eventsValue}>
      <SocketConnContext.Provider value={connValue}>
        <SocketPresenceContext.Provider value={presenceValue}>
          <LegacySocketContext.Provider value={legacyValue}>
            {children}
          </LegacySocketContext.Provider>
        </SocketPresenceContext.Provider>
      </SocketConnContext.Provider>
    </SocketEventsContext.Provider>
  );
};
