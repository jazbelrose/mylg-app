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
import { WebSocketHealthMonitor, ConnectionHealth } from '../../utils/websocketUtils';

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
  connectionHealth?: ConnectionHealth;
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
    const [connectionHealth, setConnectionHealth] = useState<ConnectionHealth | undefined>(undefined);
    const refreshUsersRef = useRef<any>(refreshUsers);
    const fetchUserProfileRef = useRef<any>(fetchUserProfile);
    const collaboratorsUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
    const wsRef = useRef<ExtendedWebSocket | null>(null);
    const healthMonitorRef = useRef<WebSocketHealthMonitor | null>(null);
    const generateSessionId = useCallback(() => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return uuid();
    }, []);
    const sessionIdRef = useRef(sessionStorage.getItem('ws_session_id') || generateSessionId());
    useEffect(() => {
        // Initialize health monitor
        healthMonitorRef.current = new WebSocketHealthMonitor((health) => {
            setConnectionHealth(health);
        });
        
        return () => {
            healthMonitorRef.current?.destroy();
        };
    }, []);
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
        
        // Use exponential backoff for reconnection attempts
        let retryDelay = 1000; // Start with 1 second
        let retryCount = 0;
        const maxRetries = 10;
        const maxDelay = 30000; // Max 30 seconds
        
        const attempt = () => {
            if (wsRef.current) {
                stopReconnect();
                return;
            }
            
            if (retryCount >= maxRetries) {
                console.error('Max reconnection attempts reached, stopping...');
                stopReconnect();
                return;
            }
            
            console.log(`Reconnection attempt ${retryCount + 1}/${maxRetries} in ${retryDelay}ms`);
            retryCount++;
            
            setTimeout(() => {
                if (!wsRef.current) {
                    connectWebSocket().then(() => {
                        // Reset retry count on successful connection
                        retryCount = 0;
                        retryDelay = 1000;
                    }).catch(() => {
                        // Exponential backoff
                        retryDelay = Math.min(retryDelay * 2, maxDelay);
                        attempt();
                    });
                }
            }, retryDelay);
        };
        
        attempt();
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
            
            console.log('🔗 Attempting WebSocket connection...');
            // Establish WebSocket connection with secure authentication
            const socket = await createSecureWebSocketConnection(WEBSOCKET_URL, tokens.idToken, sessionId);
            
            // Add connection timeout handling
            const connectionTimeout = setTimeout(() => {
                if (socket.readyState === WebSocket.CONNECTING) {
                    console.error('WebSocket connection timeout');
                    socket.close();
                }
            }, 10000); // 10 second timeout
            
            socket.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ WebSocket connected successfully');
                setIsConnected(true);
                setWs(socket);
                wsRef.current = socket;
                stopReconnect();
                
                // Notify health monitor
                healthMonitorRef.current?.onConnect();
                
                // Send initial presence ping
                socket.send(JSON.stringify({ action: 'presencePing' }));
                healthMonitorRef.current?.onPing();
                
                // Set up keep-alive with error handling
                (socket as ExtendedWebSocket).keepAliveInterval = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        try {
                            socket.send(JSON.stringify({ action: 'presencePing' }));
                            healthMonitorRef.current?.onPing();
                        } catch (error) {
                            console.error('Failed to send keep-alive ping:', error);
                            clearInterval((socket as ExtendedWebSocket).keepAliveInterval!);
                        }
                    } else {
                        clearInterval((socket as ExtendedWebSocket).keepAliveInterval!);
                    }
                }, 30000);
            };
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    
                    // Handle pong responses for connection health monitoring
                    if (data.type === 'pong') {
                        console.log('📡 Received pong:', data);
                        healthMonitorRef.current?.onPong();
                        return;
                    }
                    
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
                clearTimeout(connectionTimeout);
                // Log close event with code and reason for debugging
                console.log('🔌 WebSocket closed:', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                    timestamp: new Date().toISOString()
                });
                
                // Handle different close codes appropriately
                const shouldReconnect = event.code !== 1000 && event.code !== 1001; // Don't reconnect on normal/going away
                
                setIsConnected(false);
                if ((socket as ExtendedWebSocket).keepAliveInterval)
                    clearInterval((socket as ExtendedWebSocket).keepAliveInterval!);
                setWs(null);
                wsRef.current = null;
                
                // Notify health monitor
                healthMonitorRef.current?.onDisconnect();
                
                // Only reconnect for abnormal closures
                if (shouldReconnect) {
                    console.log('🔄 Scheduling reconnection due to abnormal closure');
                    startReconnect();
                } else {
                    console.log('⏹️ Normal connection closure, not reconnecting');
                }
            };
            socket.onerror = (err: Event) => {
                clearTimeout(connectionTimeout);
                console.error('Socket error:', {
                    error: err,
                    readyState: socket.readyState,
                    timestamp: new Date().toISOString()
                });
                logSecurityEvent('websocket_error', { error: (err as any).message || 'Unknown error' });
                
                // Don't close if already closing/closed
                if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                    socket.close();
                }
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
    return (_jsx(SocketContext.Provider, { 
        value: { 
            ws, 
            isConnected, 
            onlineUsers, 
            connectionHealth,
            sendMessage: () => {}, // TODO: Implement
            sendProjectMessage: () => {}, // TODO: Implement  
            editProjectMessage: () => {}, // TODO: Implement
            deleteProjectMessage: () => {}, // TODO: Implement
            markProjectMessageAsRead: () => {}, // TODO: Implement
            sendProjectUpdate: () => {}, // TODO: Implement
            sendDirectMessage: () => {}, // TODO: Implement
            editDirectMessage: () => {}, // TODO: Implement
            deleteDirectMessage: () => {}, // TODO: Implement
            markDirectMessageAsRead: () => {}, // TODO: Implement
            generateSessionId
        }, 
        children: children 
    }));
};
