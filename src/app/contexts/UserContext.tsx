// src/app/contexts/UserContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  PropsWithChildren,
} from "react";
import { useAuth } from "./AuthContext";
import {
  fetchAllUsers,
  fetchUserProfile as fetchUserProfileApi,
  updateUserProfile,
} from "../../utils/api";

// ---------- Domain Models ----------
export type Role = "admin" | "designer" | "builder" | "vendor" | "client" | string;

export interface UserLite {
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  occupation?: string;
  messages?: Message[];
}

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

export interface TeamMember {
  userId: string;
  role?: Role;
  [k: string]: unknown;
}

export interface TimelineEvent {
  id?: string;
  title?: string;
  date?: string;        // ISO string
  timestamp?: string;   // ISO string
  [k: string]: unknown;
}

export interface Project {
  projectId: string;
  title?: string;
  team?: TeamMember[];
  timelineEvents?: TimelineEvent[];
  thumbnails?: string[];
  [k: string]: unknown;
}

export interface DMThread {
  threadId?: string;
  participants?: string[];
  lastMessageAt?: string;
  [k: string]: unknown;
}

// ---------- Context Shape ----------
interface UserContextValue {
  user?: UserLite | null;
  userId?: string;
  userName: string;
  allUsers: UserLite[];
  userData: UserLite | null;
  setUserData: React.Dispatch<React.SetStateAction<UserLite | null>>;
  refreshUsers: () => Promise<void>;
  updateUserProfile: typeof updateUserProfile;
  isAdmin: boolean;
  isDesigner: boolean;
  isBuilder: boolean;
  isVendor: boolean;
  isClient: boolean;
  fetchUserProfile: () => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingProfile: boolean;
}

// ---------- Context + Hook ----------
const UserContext = createContext<UserContextValue | undefined>(undefined);

export const useUserContext = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUserContext must be used within UserProvider");
  return ctx;
};

// ---------- Provider ----------
export const UserProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // useAuth now provides typed user + derived fields directly
  const { user, userId, userName, isAdmin, isDesigner, isBuilder, isVendor, isClient } = useAuth();

  const [allUsers, setAllUsers] = useState<UserLite[]>([]);
  const [userData, setUserData] = useState<UserLite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Users
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const users = await fetchAllUsers();
        const mapped = Array.isArray(users)
          ? (users as UserLite[]).map((u) => ({ ...u, occupation: u.occupation || u.role }))
          : [];
        setAllUsers(mapped);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, [userId]);

  const refreshUsers = async () => {
    setIsLoading(true);
    try {
      const users = await fetchAllUsers();
      const mapped = Array.isArray(users)
        ? (users as UserLite[]).map((u) => ({ ...u, occupation: u.occupation || u.role }))
        : [];
      setAllUsers(mapped);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Profile
  const fetchUserProfile = async () => {
    if (!userId) {
      setUserData(null);
      return;
    }
    setIsLoading(true);
    setLoadingProfile(true);
    try {
      const profile = await fetchUserProfileApi(userId);
      const mappedProfile = profile
        ? ({ ...profile, occupation: (profile as UserLite).occupation || (profile as UserLite).role } as UserLite)
        : null;

      setUserData({
        ...(mappedProfile ?? ({} as UserLite)),
        messages: (mappedProfile as UserLite | null)?.messages || [],
        userId: user?.userId,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchUserProfile();
  }, [userId]);

  // ---------- Memoized context value ----------
  const value = useMemo<UserContextValue>(
    () => ({
      user,
      userId,
      userName,
      allUsers,
      userData,
      setUserData,
      refreshUsers,
      updateUserProfile,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
      fetchUserProfile,
      isLoading,
      setIsLoading,
      loadingProfile,
    }),
    [
      user,
      userId,
      userName,
      allUsers,
      userData,
      isAdmin,
      isDesigner,
      isBuilder,
      isVendor,
      isClient,
      isLoading,
      loadingProfile,
    ]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;