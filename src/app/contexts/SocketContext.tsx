import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import { useAuth } from './AuthContext';
import { useData } from './DataProvider';
import { useDMConversation } from './DMConversationContext';
import { WEBSOCKET_URL } from '../../utils/api';
import { mergeAndDedupeMessages } from '../../utils/messageUtils';
import { createSecureWebSocketConnection, secureWebSocketAuth } from '../../utils/secureWebSocketAuth';
import { logSecurityEvent } from '../../utils/securityUtils';

// Type extensions for WebSocket with custom properties
interface ExtendedWebSocket extends WebSocket {
  keepAliveInterval?: NodeJS.Timeout;
}

interface MessageData {
  timestamp: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  authStatus: string;
  getAuthTokens?: () => Promise<any>;
}

interface SocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  onlineUsers: any[];
  sendMessage: (conversationId: string, text: string, recipientId: string) => void;
  sendProjectMessage: (projectId: string, text: string, senderId: string) => void;
  editProjectMessage: (messageId: string, newText: string, projectId: string) => void;
  deleteProjectMessage: (messageId: string, projectId: string) => void;
  markProjectMessageAsRead: (projectId: string, messageId: string) => void;
  sendProjectUpdate: (projectId: string, updates: any, optimistic?: boolean) => void;
  sendDirectMessage: (recipientId: string, text: string) => void;
  editDirectMessage: (messageId: string, newText: string, conversationId: string) => void;
  deleteDirectMessage: (messageId: string, conversationId: string) => void;
  markDirectMessageAsRead: (conversationId: string, messageId: string) => void;
  generateSessionId: () => string;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
// Avoid pulling NotificationContext into this provider. SocketProvider mounts
// inside NotificationProvider, so calling useNotifications here would read the
// default context value before NotificationProvider runs. A separate bridge
// component should consume both contexts instead.
export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { getAuthTokens } = useAuth() as AuthContextType & { getAuthTokens: () => Promise<any> };
    const { setUserData, setDmThreads, userId, setProjects, setUserProjects, setActiveProject, updateProjectFields, setProjectMessages, deletedMessageIds, markMessageDeleted, activeProject, fetchProjects, fetchUserProfile, refreshUsers, } = useData();
    const { activeDmConversationId } = useDMConversation();
    const [ws, setWs] = useState<ExtendedWebSocket | null>(null); // state variable for the WebSocket
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
    const refreshUsersRef = useRef<any>(refreshUsers);
    const fetchUserProfileRef = useRef<any>(fetchUserProfile);
    const collaboratorsUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const wsRef = useRef<ExtendedWebSocket | null>(null);
    const generateSessionId = useCallback(() => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return uuid();
    }, []);
    const sessionIdRef = useRef(sessionStorage.getItem('ws_session_id') || generateSessionId());
    useEffect(() => {
        sessionStorage.setItem('ws_session_id', sessionIdRef.current);
    }, []);
    useEffect(() => {
        wsRef.current = ws;
    }, [ws]);
    useEffect(() => {
        refreshUsersRef.current = refreshUsers;
    }, [refreshUsers]);
    useEffect(() => {
        fetchUserProfileRef.current = fetchUserProfile;
    }, [fetchUserProfile]);
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
    const startReconnect = () => {
        if (reconnectInterval.current || wsRef.current)
            return;
        reconnectInterval.current = setInterval(() => {
            if (!wsRef.current) {
                connectWebSocket();
            }
        }, 5000);
    };
    const stopReconnect = () => {
        if (reconnectInterval.current) {
            clearInterval(reconnectInterval.current);
            reconnectInterval.current = null;
        }
    };
    const connectWebSocket = async () => {
        if (wsRef.current) {
            console.warn('connectWebSocket called but socket already exists');
            return;
        }
        try {
            const tokens = await getAuthTokens();
            if (!tokens || !tokens.idToken) {
                console.error('No ID token, cannot connect WebSocket.');
                startReconnect();
                return;
            }
            const sessionId = sessionIdRef.current;
            if (!sessionId) {
                console.error('No sessionId, cannot connect WebSocket.');
                startReconnect();
                return;
            }
            if (wsRef.current) {
                console.warn('connectWebSocket called but socket already exists');
                return;
            }
            // Establish WebSocket connection with secure authentication
            const socket = await createSecureWebSocketConnection(WEBSOCKET_URL, tokens.idToken, sessionId);
            socket.onopen = () => {
                setIsConnected(true);
                setWs(socket);
                wsRef.current = socket;
                stopReconnect();
                socket.send(JSON.stringify({ action: 'presencePing' }));
                (socket as ExtendedWebSocket).keepAliveInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ action: 'presencePing' }));
                    }
                }, 30000);
            };
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Avoid flooding the console with frequent presence updates
                    if (data.type !== 'onlineUsers') {
                        // Useful for debugging other events
                        // console.log('📥 Incoming WS message:', data);
                    }
                    // Presence updates
                    if (data.type === 'onlineUsers' && Array.isArray(data.users)) {
                        const users = [...data.users];
                        if (userId && !users.includes(userId))
                            users.push(userId);
                        setOnlineUsers(users);
                        return;
                    }
                    // 1) Timeline updates
                    if (data.action === 'timelineUpdated' && data.projectId && Array.isArray(data.events)) {
                        setProjects(prev => prev.map(p => p.projectId === data.projectId ? { ...p, timelineEvents: data.events } : p));
                        setUserProjects(prev => prev.map(p => p.projectId === data.projectId ? { ...p, timelineEvents: data.events } : p));
                        setActiveProject(prev => prev && prev.projectId === data.projectId ? { ...prev, timelineEvents: data.events } : prev);
                        return;
                    }
                    // 2) Project updates
                    if (data.action === 'projectUpdated' && data.projectId && data.fields && typeof data.fields === 'object') {
                        setProjects(prev => prev.map(p => p.projectId === data.projectId ? { ...p, ...data.fields } : p));
                        setUserProjects(prev => prev.map(p => p.projectId === data.projectId ? { ...p, ...data.fields } : p));
                        setActiveProject(prev => prev && prev.projectId === data.projectId ? { ...prev, ...data.fields } : prev);
                        return;
                    }
                    // 2b) Gallery creation complete
                    if (data.action === 'galleryCreated' && data.projectId && data.galleryId && data.name) {
                        fetchProjects();
                        return;
                    }
                    // 3) Notifications are handled in NotificationSocketBridge
                    // 4) Collaborator list updates
                    if (data.type === 'collaborators-updated') {
                        scheduleCollaboratorsRefresh();
                        return;
                    }
                    // 5) DM message handling
                    if (data.conversationType === 'dm') {
                        if (data.action === 'sendMessage' || data.action === 'newMessage') {
                            if (deletedMessageIds.has(data.messageId) ||
                                deletedMessageIds.has(data.optimisticId)) {
                                return;
                            }
                            const isSelf = data.senderId === userId;
                            const viewing = activeDmConversationId === data.conversationId;
                            setUserData(prev => {
                                if (!prev)
                                    return prev;
                                const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                                const merged = mergeAndDedupeMessages(prevMsgs, [{ ...data, read: viewing || isSelf }]);
                                return { ...prev, messages: merged };
                            });
                            setDmThreads(prev => {
                                const idx = prev.findIndex(t => t.conversationId === data.conversationId);
                                if (idx !== -1) {
                                    // Auto-mark as read if user is viewing this conversation
                                    const shouldBeRead = viewing || isSelf;
                                    const updated = [...prev];
                                    updated[idx] = {
                                        ...updated[idx],
                                        snippet: data.text,
                                        lastMsgTs: data.timestamp,
                                        read: shouldBeRead,
                                    };
                                    return updated;
                                }
                                else {
                                    // New thread
                                    return [
                                        ...prev,
                                        {
                                            conversationId: data.conversationId,
                                            snippet: data.text,
                                            lastMsgTs: data.timestamp,
                                            read: viewing || isSelf, // mark as read if sending or viewing
                                            otherUserId: isSelf ? data.recipientId : data.senderId,
                                        }
                                    ];
                                }
                            });
                        }
                        else if (data.action === 'deleteMessage') {
                            // Remove the message from global state and update the thread
                            // preview so every component reflects the deletion instantly.
                            const viewing = activeDmConversationId === data.conversationId;
                            markMessageDeleted(data.messageId || data.optimisticId);
                            setUserData(prev => {
                                if (!prev)
                                    return prev;
                                const prevMsgs = Array.isArray(prev.messages) ? prev.messages : [];
                                const updatedMsgs = prevMsgs.filter(m => !((data.messageId && m.messageId === data.messageId) ||
                                    (data.optimisticId && m.optimisticId === data.optimisticId)));
                                // Determine the new last message snippet for the inbox preview
                                const convoMsgs = updatedMsgs
                                    .filter(m => m.conversationId === data.conversationId)
                                    .sort((a: MessageData, b: MessageData) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                                const lastMsg = convoMsgs[0];
                                const newSnippet = lastMsg?.text || '';
                                const newTs = lastMsg?.timestamp || new Date().toISOString();
                                setDmThreads(prevThreads => prevThreads.map(t => t.conversationId === data.conversationId
                                    ? {
                                        ...t,
                                        snippet: newSnippet,
                                        lastMsgTs: newTs,
                                        // mark as read if the user is currently viewing the thread
                                        read: viewing ? true : t.read,
                                    }
                                    : t));
                                return {
                                    ...prev,
                                    messages: updatedMsgs,
                                };
                            });
                        }
                        else if (data.action === 'editMessage') {
                            const viewing = activeDmConversationId === data.conversationId;
                            setUserData(prev => {
                                if (!prev)
                                    return prev;
                                const msgs = Array.isArray(prev.messages) ? prev.messages : [];
                                return {
                                    ...prev,
                                    messages: msgs.map(m => m.messageId === data.messageId
                                        ? { ...m, text: data.text, edited: true, editedAt: data.editedAt }
                                        : m),
                                };
                            });
                            setDmThreads(prev => prev.map(t => t.conversationId === data.conversationId && t.lastMsgTs === data.timestamp
                                ? { ...t, snippet: data.text, lastMsgTs: data.timestamp }
                                : t));
                        }
                        else if (data.action === 'toggleReaction') {
                            setUserData(prev => {
                                if (!prev)
                                    return prev;
                                const msgs = Array.isArray(prev.messages) ? prev.messages : [];
                                return {
                                    ...prev,
                                    messages: msgs.map(m => m.messageId === data.messageId ? { ...m, reactions: data.reactions } : m),
                                };
                            });
                        }
                        return;
                    }
                    // 6) Project message handling
                    if (data.conversationType === 'project') {
                        const projectId = data.projectId || (data.conversationId || '').replace('project#', '');
                        if (!projectId)
                            return;
                        if (data.action === 'sendMessage' || data.action === 'newMessage') {
                            if (deletedMessageIds.has(data.messageId) ||
                                deletedMessageIds.has(data.optimisticId)) {
                                return;
                            }
                            setProjectMessages(prev => {
                                const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
                                const merged = mergeAndDedupeMessages(msgs, [data]);
                                return { ...prev, [projectId]: merged };
                            });
                        }
                        else if (data.action === 'deleteMessage') {
                            markMessageDeleted(data.messageId || data.optimisticId);
                            setProjectMessages(prev => {
                                const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
                                return {
                                    ...prev,
                                    [projectId]: msgs.filter(m => !((data.messageId && m.messageId === data.messageId) ||
                                        (data.optimisticId && m.optimisticId === data.optimisticId))),
                                };
                            });
                        }
                        else if (data.action === 'editMessage') {
                            setProjectMessages(prev => {
                                const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
                                return {
                                    ...prev,
                                    [projectId]: msgs.map(m => m.messageId === data.messageId
                                        ? { ...m, text: data.text, edited: true, editedAt: data.editedAt }
                                        : m),
                                };
                            });
                        }
                        else if (data.action === 'toggleReaction') {
                            setProjectMessages(prev => {
                                const msgs = Array.isArray(prev[projectId]) ? prev[projectId] : [];
                                return {
                                    ...prev,
                                    [projectId]: msgs.map(m => m.messageId === data.messageId ? { ...m, reactions: data.reactions } : m),
                                };
                            });
                        }
                        return;
                    }
                    // 7) Anything else is unexpected
                    console.warn('⚠️ Unexpected message from server:', data);
                }
                catch (err) {
                    console.error('❌ Failed to parse WS message:', event.data);
                }
            };
            socket.onclose = (event) => {
                // Log close event with code and reason
                console.log('WS close', event.code, event.reason);
                // 1006 = handshake/authorizer/URL issue.
                // 1008 = policy/auth reject.
                // 1011 = server error during connect.
                setIsConnected(false);
                if ((socket as ExtendedWebSocket).keepAliveInterval)
                    clearInterval((socket as ExtendedWebSocket).keepAliveInterval!);
                setWs(null);
                wsRef.current = null;
                startReconnect();
            };
            socket.onerror = (err: Event) => {
                console.error('Socket error:', err);
                logSecurityEvent('websocket_error', { error: (err as any).message || 'Unknown error' });
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close();
                }
                startReconnect();
            };
        }
        catch (error) {
            console.error('Error establishing secure WebSocket connection:', error);
            logSecurityEvent('secure_websocket_connection_error', { error: error.message });
            startReconnect();
        }
    };
    useEffect(() => {
        connectWebSocket();
        return () => {
            stopReconnect();
            const socket = wsRef.current;
            if (socket) {
                if ((socket as ExtendedWebSocket).keepAliveInterval)
                    clearInterval((socket as ExtendedWebSocket).keepAliveInterval!);
                socket.close();
                setWs(null);
                wsRef.current = null;
            }
            if (collaboratorsUpdateTimeout.current) {
                clearTimeout(collaboratorsUpdateTimeout.current);
            }
        };
    }, [getAuthTokens]);
    useEffect(() => {
        if (!ws || !activeProject?.projectId)
            return;
        const payload = JSON.stringify({
            action: 'setActiveConversation',
            conversationId: `project#${activeProject.projectId}`,
        });
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
        }
        else {
            const handleOpen = () => {
                ws.send(payload);
                ws.removeEventListener('open', handleOpen);
            };
            ws.addEventListener('open', handleOpen);
            return () => ws.removeEventListener('open', handleOpen);
        }
    }, [ws, activeProject?.projectId]);
    return (_jsx(SocketContext.Provider, { value: { ws, isConnected, onlineUsers }, children: children }));
};
