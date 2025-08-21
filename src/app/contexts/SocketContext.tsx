import React, { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import { useAuth } from './AuthContext';
import { useData } from './DataProvider';
import type { Message } from './DataProvider';
import { useDMConversation } from './DMConversationContext';
import { WEBSOCKET_URL } from '../../utils/api';
import { mergeAndDedupeMessages } from '../../utils/messageUtils';
import { createSecureWebSocketConnection, secureWebSocketAuth } from '../../utils/secureWebSocketAuth';
import { logSecurityEvent } from '../../utils/securityUtils';

// Types
interface OnlineUser {
  userId: string;
  username?: string;
  [key: string]: any;
}

interface SocketContextType {
  ws: WebSocket | null;
  isConnected: boolean;
  onlineUsers: OnlineUser[];
}

interface SocketProviderProps {
  children: ReactNode;
}

interface WebSocketMessage {
  action: string;
  [key: string]: any;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

// Avoid pulling NotificationContext into this provider. SocketProvider mounts
// inside NotificationProvider, so calling useNotifications here would read the
// default context value before NotificationProvider runs. A separate bridge
// component should consume both contexts instead.
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { getAuthTokens } = useAuth();
  const {
    setUserData,
    setDmThreads,
    userId,
    setProjects,
    setUserProjects,
    setActiveProject,
    updateProjectFields,
    setProjectMessages,
    deletedMessageIds,
    markMessageDeleted,
    activeProject,
    fetchProjects,
    fetchUserProfile,
    refreshUsers,
  } = useData();
  const { activeDmConversationId } = useDMConversation();

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const refreshUsersRef = useRef<typeof refreshUsers>(refreshUsers);
  const fetchUserProfileRef = useRef<typeof fetchUserProfile>(fetchUserProfile);
  const collaboratorsUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const generateSessionId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return uuid();
  }, []);

  const connectWebSocket = useCallback(async (): Promise<void> => {
    try {
      logSecurityEvent('websocket_connection_attempt', { userId });

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const authTokens = await getAuthTokens();
      if (!authTokens) {
        console.warn('No auth tokens available for WebSocket connection');
        return;
      }

      const sessionId = generateSessionId();
      const socket = await createSecureWebSocketConnection(WEBSOCKET_URL, authTokens, sessionId);

      socket.onopen = (): void => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setWs(socket);
        wsRef.current = socket;
        logSecurityEvent('websocket_connected', { userId, sessionId });
      };

      socket.onmessage = (event: MessageEvent): void => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data);
          
          switch (data.action) {
            case 'projectMessage':
              if (data.message && data.projectId) {
                const message = data.message as Message;
                if (!deletedMessageIds.has(message.messageId)) {
                  setProjectMessages(prev => {
                    const projectId = data.projectId;
                    const existingMessages = prev[projectId] || [];
                    // Convert message format if needed for messageUtils compatibility
                    const messageForMerge = {
                      ...message,
                      text: message.content,
                      timestamp: message.createdAt
                    };
                    const updated = mergeAndDedupeMessages([...existingMessages.map(m => ({
                      ...m,
                      text: m.content,
                      timestamp: m.createdAt
                    })), messageForMerge]);
                    // Convert back to original format
                    const convertedBack = updated.map(m => ({
                      ...m,
                      content: m.text || m.content,
                      createdAt: m.timestamp || m.createdAt
                    }));
                    return { ...prev, [projectId]: convertedBack };
                  });
                }
              }
              break;

            case 'dmMessage':
              if (data.message && data.threadId) {
                const message = data.message as Message;
                setDmThreads(prev => {
                  const updated = prev.map(thread => {
                    if (thread.threadId === data.threadId) {
                      const existingMessages = thread.messages || [];
                      const messageForMerge = {
                        ...message,
                        text: message.content,
                        timestamp: message.createdAt
                      };
                      const updatedMessages = mergeAndDedupeMessages([...existingMessages.map(m => ({
                        ...m,
                        text: m.content,
                        timestamp: m.createdAt
                      })), messageForMerge]);
                      const convertedBack = updatedMessages.map(m => ({
                        ...m,
                        content: m.text || m.content,
                        createdAt: m.timestamp || m.createdAt
                      }));
                      return { ...thread, messages: convertedBack, lastMessage: message };
                    }
                    return thread;
                  });
                  return updated;
                });
              }
              break;

            case 'messageDeleted':
              if (data.messageId) {
                markMessageDeleted(data.messageId);
              }
              break;

            case 'projectUpdated':
              if (data.projectId && data.updates) {
                setUserProjects(prev => 
                  prev.map(project => 
                    project.projectId === data.projectId 
                      ? { ...project, ...data.updates }
                      : project
                  )
                );
                
                if (activeProject?.projectId === data.projectId) {
                  setActiveProject(prev => prev ? { ...prev, ...data.updates } : null);
                }
              }
              break;

            case 'onlineUsers':
              if (Array.isArray(data.users)) {
                setOnlineUsers(data.users);
              }
              break;

            case 'userJoined':
              if (data.user) {
                setOnlineUsers(prev => {
                  const exists = prev.some(user => user.userId === data.user.userId);
                  return exists ? prev : [...prev, data.user];
                });
              }
              break;

            case 'userLeft':
              if (data.userId) {
                setOnlineUsers(prev => prev.filter(user => user.userId !== data.userId));
              }
              break;

            case 'collaboratorsUpdate':
              if (data.collaborators && Array.isArray(data.collaborators)) {
                if (collaboratorsUpdateTimeout.current) {
                  clearTimeout(collaboratorsUpdateTimeout.current);
                }
                collaboratorsUpdateTimeout.current = setTimeout(() => {
                  refreshUsersRef.current?.();
                }, 1000);
              }
              break;

            default:
              console.log('Unhandled WebSocket message:', data);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onclose = (event: CloseEvent): void => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setWs(null);
        wsRef.current = null;
        
        logSecurityEvent('websocket_disconnected', { 
          userId, 
          code: event.code, 
          reason: event.reason 
        });

        // Attempt to reconnect if the connection was not closed intentionally
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectInterval.current) {
            clearTimeout(reconnectInterval.current);
          }
          reconnectInterval.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        }
      };

      socket.onerror = (error: Event): void => {
        console.error('WebSocket error:', error);
        logSecurityEvent('websocket_error', { userId, error: String(error) });
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      logSecurityEvent('websocket_connection_failed', { userId, error: String(error) });
    }
  }, [getAuthTokens, userId, generateSessionId, setUserProjects, setActiveProject, activeProject, setProjectMessages, setDmThreads, deletedMessageIds, markMessageDeleted]);

  // Connect when userId is available
  useEffect(() => {
    if (userId) {
      connectWebSocket();
    }

    return (): void => {
      if (reconnectInterval.current) {
        clearTimeout(reconnectInterval.current);
        reconnectInterval.current = null;
      }
      if (collaboratorsUpdateTimeout.current) {
        clearTimeout(collaboratorsUpdateTimeout.current);
        collaboratorsUpdateTimeout.current = null;
      }
      if (wsRef.current) {
        const socket = wsRef.current;
        secureWebSocketAuth.clearAllTokens();
        socket.close();
        setWs(null);
        wsRef.current = null;
      }
    };
  }, [userId, connectWebSocket]);

  // Update refs when functions change
  useEffect(() => {
    refreshUsersRef.current = refreshUsers;
    fetchUserProfileRef.current = fetchUserProfile;
  }, [refreshUsers, fetchUserProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return (): void => {
      if (wsRef.current) {
        const socket = wsRef.current;
        socket.close();
        setWs(null);
        wsRef.current = null;
      }
      if (collaboratorsUpdateTimeout.current) {
        clearTimeout(collaboratorsUpdateTimeout.current);
      }
    };
  }, [getAuthTokens]);

  // Set active conversation when activeProject changes
  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;

    const payload = JSON.stringify({
      action: 'setActiveConversation',
      conversationId: `project#${activeProject.projectId}`,
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      const handleOpen = (): void => {
        ws.send(payload);
        ws.removeEventListener('open', handleOpen);
      };
      ws.addEventListener('open', handleOpen);
      return () => ws.removeEventListener('open', handleOpen);
    }
  }, [ws, activeProject?.projectId]);

  const value: SocketContextType = {
    ws,
    isConnected,
    onlineUsers,
  };

  return React.createElement(SocketContext.Provider, { value }, children);
};