import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import pLimit from '../../utils/pLimit';
// Use the User type from AuthContext
import { useAuth } from './AuthContext';
import type { User } from './AuthContext';
import { 
  THREADS_URL, 
  fetchAllUsers, 
  fetchUserProfile as fetchUserProfileApi, 
  fetchProjectsFromApi, 
  fetchProjectById, 
  fetchEvents, 
  updateTimelineEvents as updateTimelineEventsApi, 
  updateProjectFields as updateProjectFieldsApi, 
  updateUserProfile, 
  apiFetch, 
  fetchPendingInvites, 
  sendProjectInvite, 
  acceptProjectInvite, 
  declineProjectInvite, 
  cancelProjectInvite, 
  GET_PROJECT_MESSAGES_URL,
} from '../../utils/api';
import { getWithTTL, setWithTTL, DEFAULT_TTL } from '../../utils/storageWithTTL';


interface Project {
  projectId: string;
  title: string; // Using title to match existing usage
  name?: string; // Backend might use name
  description?: string;
  ownerId?: string;
  team?: ProjectMember[];
  status?: 'active' | 'archived' | 'deleted';
  createdAt?: string;
  updatedAt?: string;
  thumbnails?: string[];
  dateCreated?: string;
  date?: string;
  [key: string]: any;
}

interface ProjectMember {
  userId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface Message {
  messageId: string;
  projectId?: string;
  threadId?: string;
  senderId: string;
  content: string;
  attachments?: string[];
  createdAt: string;
  updatedAt?: string;
  editedAt?: string;
  [key: string]: any;
}

interface DMThread {
  threadId: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
  [key: string]: any;
}

interface PendingInvite {
  inviteId: string;
  projectId: string;
  projectName: string;
  inviterName: string;
  role: string;
  createdAt: string;
  [key: string]: any;
}

interface DataContextType {
  userName: string;
  userId?: string;
  user: User | null;
  userData: User | null;
  setUserData: (data: User | null) => void;
  projects: Project[];
  setProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  setUserProjects: (projects: Project[] | ((prev: Project[]) => Project[])) => void;
  allUsers: User[];
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  loadingProfile: boolean;
  activeProject: Project | null;
  setActiveProject: (project: Project | null | ((prev: Project | null) => Project | null)) => void;
  selectedProjects: string[];
  setSelectedProjects: (ids: string[] | ((prev: string[]) => string[])) => void;
  fetchProjectDetails: (projectId: string) => Promise<Project | null>;
  fetchProjects: () => Promise<void>;
  fetchUserProfile: (userId: string) => Promise<User | null>;
  fetchRecentActivity: () => Promise<any[]>;
  opacity: number;
  setOpacity: (opacity: number) => void;
  settingsUpdated: boolean;
  toggleSettingsUpdated: () => void;
  dmReadStatus: Record<string, boolean>;
  setDmReadStatus: (status: Record<string, boolean>) => void;
  isAdmin: boolean;
  isDesigner: boolean;
  isBuilder: boolean;
  isVendor: boolean;
  isClient: boolean;
  projectsError: string | null;
  updateTimelineEvents: (projectId: string, events: any[]) => Promise<void>;
  updateProjectFields: (projectId: string, updates: Record<string, any>) => Promise<void>;
  pendingInvites: PendingInvite[];
  setPendingInvites: (invites: PendingInvite[] | ((prev: PendingInvite[]) => PendingInvite[])) => void;
  handleSendInvite: (projectId: string, email: string, role: string) => Promise<void>;
  handleAcceptInvite: (inviteId: string) => Promise<void>;
  handleDeclineInvite: (inviteId: string) => Promise<void>;
  handleCancelInvite: (inviteId: string) => Promise<void>;
  refreshUsers: () => Promise<void>;
  dmThreads: DMThread[];
  setDmThreads: (threads: DMThread[] | ((prev: DMThread[]) => DMThread[])) => void;
  projectMessages: Record<string, Message[]>;
  setProjectMessages: (messages: Record<string, Message[]> | ((prev: Record<string, Message[]>) => Record<string, Message[]>)) => void;
  deletedMessageIds: Set<string>;
  markMessageDeleted: (messageId: string) => void;
  clearDeletedMessageId: (messageId: string) => void;
  toggleReaction: (messageId: string, emoji: string, userId: string) => void;
  updateUserProfile: (userId: string, updates: Record<string, any>) => Promise<void>;
}

interface DataProviderProps {
  children: ReactNode;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const role = (user?.role || '').toLowerCase();
  
  const isAdmin = role === 'admin';
  const isDesigner = role === 'designer';
  const isBuilder = role === 'builder';
  const isVendor = role === 'vendor';
  const isClient = role === 'client';
  
  const userName = user ? `${user.firstName} ` : 'Guest';
  
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userData, setUserData] = useState<User | null>(null);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMessages, setProjectMessages] = useState<Record<string, Message[]>>({});
  const [dmThreads, setDmThreads] = useState<DMThread[]>(() => {
    const stored = getWithTTL('dmThreads');
    return Array.isArray(stored) ? stored : [];
  });
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [opacity, setOpacity] = useState<number>(1);
  const [settingsUpdated, setSettingsUpdated] = useState<boolean>(false);
  const [dmReadStatus, setDmReadStatus] = useState<Record<string, boolean>>({});
  const [projectsError, setProjectsError] = useState<string | null>(null);
  
  const deletedMessageIdsRef = useRef<Set<string>>(new Set());

  const toggleSettingsUpdated = useCallback(() => {
    setSettingsUpdated(prev => !prev);
  }, []);

  const fetchUserProfile = useCallback(async (targetUserId: string): Promise<User | null> => {
    if (!targetUserId) return null;
    try {
      const profile = await fetchUserProfileApi(targetUserId);
      return profile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  const fetchProjectDetails = useCallback(async (projectId: string): Promise<Project | null> => {
    try {
      setIsLoading(true);
      const project = await fetchProjectById(projectId);
      return project;
    } catch (error) {
      console.error('Error fetching project details:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async (): Promise<void> => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      setProjectsError(null);
      const projects = await fetchProjectsFromApi();
      setUserProjects(projects || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      setProjectsError(error.message || 'Failed to fetch projects');
      setUserProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const refreshUsers = useCallback(async (): Promise<void> => {
    try {
      const users = await fetchAllUsers();
      setAllUsers(users || []);
    } catch (error) {
      console.error('Error refreshing users:', error);
    }
  }, []);

  const updateTimelineEvents = useCallback(async (projectId: string, events: any[]): Promise<void> => {
    try {
      await updateTimelineEventsApi(projectId, events);
    } catch (error) {
      console.error('Error updating timeline events:', error);
      throw error;
    }
  }, []);

  const updateProjectFields = useCallback(async (projectId: string, updates: Record<string, any>): Promise<void> => {
    try {
      await updateProjectFieldsApi(projectId, updates);
    } catch (error) {
      console.error('Error updating project fields:', error);
      throw error;
    }
  }, []);

  const handleSendInvite = useCallback(async (projectId: string, email: string, role: string): Promise<void> => {
    try {
      await sendProjectInvite(projectId, email); // API only takes projectId and email
      // Refresh pending invites after sending
      const invites = await fetchPendingInvites();
      setPendingInvites(invites || []);
    } catch (error) {
      console.error('Error sending invite:', error);
      throw error;
    }
  }, []);

  const handleAcceptInvite = useCallback(async (inviteId: string): Promise<void> => {
    try {
      await acceptProjectInvite(inviteId);
      // Refresh data after accepting
      await fetchProjects();
      const invites = await fetchPendingInvites();
      setPendingInvites(invites || []);
    } catch (error) {
      console.error('Error accepting invite:', error);
      throw error;
    }
  }, [fetchProjects]);

  const handleDeclineInvite = useCallback(async (inviteId: string): Promise<void> => {
    try {
      await declineProjectInvite(inviteId);
      const invites = await fetchPendingInvites();
      setPendingInvites(invites || []);
    } catch (error) {
      console.error('Error declining invite:', error);
      throw error;
    }
  }, []);

  const handleCancelInvite = useCallback(async (inviteId: string): Promise<void> => {
    try {
      await cancelProjectInvite(inviteId);
      const invites = await fetchPendingInvites();
      setPendingInvites(invites || []);
    } catch (error) {
      console.error('Error canceling invite:', error);
      throw error;
    }
  }, []);

  const markMessageDeleted = useCallback((messageId: string): void => {
    deletedMessageIdsRef.current.add(messageId);
  }, []);

  const clearDeletedMessageId = useCallback((messageId: string): void => {
    deletedMessageIdsRef.current.delete(messageId);
  }, []);

  const toggleReaction = useCallback((messageId: string, emoji: string, userId: string): void => {
    // Implementation for toggling reactions
    // This would typically involve API calls to update the message
    console.log('Toggling reaction:', { messageId, emoji, userId });
  }, []);

  const fetchRecentActivity = useCallback(async (): Promise<any[]> => {
    try {
      // Implementation would depend on specific API endpoints
      // For now returning empty array as placeholder
      return [];
    } catch (err) {
      console.error('fetchRecentActivity error', err);
      return [];
    }
  }, [userProjects]);

  const value: DataContextType = {
    userName,
    userId,
    user,
    userData,
    setUserData,
    projects: userProjects,
    setProjects: setUserProjects,
    setUserProjects,
    allUsers,
    isLoading,
    setIsLoading,
    loadingProfile,
    activeProject,
    setActiveProject,
    selectedProjects,
    setSelectedProjects,
    fetchProjectDetails,
    fetchProjects,
    fetchUserProfile,
    fetchRecentActivity,
    opacity,
    setOpacity,
    settingsUpdated,
    toggleSettingsUpdated,
    dmReadStatus,
    setDmReadStatus,
    isAdmin,
    isDesigner,
    isBuilder,
    isVendor,
    isClient,
    projectsError,
    updateTimelineEvents,
    updateProjectFields,
    pendingInvites,
    setPendingInvites,
    handleSendInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    handleCancelInvite,
    refreshUsers,
    dmThreads,
    setDmThreads,
    projectMessages,
    setProjectMessages,
    deletedMessageIds: deletedMessageIdsRef.current,
    markMessageDeleted,
    clearDeletedMessageId,
    toggleReaction,
    updateUserProfile,
  };

  return React.createElement(DataContext.Provider, { value }, children);
};

export default DataProvider;