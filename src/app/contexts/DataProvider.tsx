// src/app/contexts/DataProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import { v4 as uuid } from "uuid";
import pLimit from "../../utils/pLimit";
import { useAuth } from "./AuthContext";
import {
  THREADS_URL,
  fetchAllUsers,
  fetchUserProfile as fetchUserProfileApi,
  fetchProjectsFromApi,
  fetchProjectById,
  fetchEvents,
  updateTimelineEvents as updateTimelineEventsApi,
  updateProjectFields as updateProjectFieldsApi,
  updateUserProfile, // <- assumes same name/types
  apiFetch,
  GET_PROJECT_MESSAGES_URL,
} from "../../utils/api";
import { getWithTTL, setWithTTL, DEFAULT_TTL } from "../../utils/storageWithTTL";

// ---------- Domain Models (pragmatic, tighten as needed) ----------
export type Role = "admin" | "designer" | "builder" | "vendor" | "client" | string;

export interface UserLite {
  userId: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  occupation?: string;
  messages?: Message[];
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

export interface Message {
  messageId?: string;
  optimisticId?: string;
  text?: string;
  body?: string;
  content?: string;
  timestamp?: string;      // ISO
  reactions?: Record<string, string[]>; // emoji -> userIds
  [k: string]: unknown;
}

export interface DMThread {
  threadId?: string;
  participants?: string[];
  lastMessageAt?: string;
  [k: string]: unknown;
}

type ProjectMessagesMap = Record<string, Message[]>; // projectId -> messages
type DMReadStatusMap = Record<string, string>;       // threadId -> ISO timestamp

// ---------- Context Shapes ----------
interface AuthDataValue {
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
}

interface ProjectsValue {
  projects: Project[]; // user-visible projects
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setUserProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loadingProfile: boolean;
  activeProject: Project | null;
  setActiveProject: React.Dispatch<React.SetStateAction<Project | null>>;
  selectedProjects: string[];
  setSelectedProjects: React.Dispatch<React.SetStateAction<string[]>>;
  fetchProjectDetails: (projectId: string) => Promise<void>;
  fetchProjects: (retryCount?: number) => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  fetchRecentActivity: (limit?: number) => Promise<
    Array<{
      id: string;
      type: "project" | "message";
      projectId: string;
      projectTitle: string;
      text: string;
      timestamp: string;
    }>
  >;
  opacity: number;
  setOpacity: React.Dispatch<React.SetStateAction<number>>;
  settingsUpdated: boolean;
  toggleSettingsUpdated: () => void;
  dmReadStatus: DMReadStatusMap;
  setDmReadStatus: React.Dispatch<React.SetStateAction<DMReadStatusMap>>;
  projectsError: boolean;
  updateTimelineEvents: (projectId: string, events: TimelineEvent[]) => Promise<void>;
  updateProjectFields: (projectId: string, fields: Partial<Project>) => Promise<void>;
}

interface MessagesValue {
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

// ---------- Contexts + Safe Hooks ----------
const AuthDataContext = createContext<AuthDataValue | undefined>(undefined);
const ProjectsContext = createContext<ProjectsValue | undefined>(undefined);
const MessagesContext = createContext<MessagesValue | undefined>(undefined);

export const useAuthData = (): AuthDataValue => {
  const ctx = useContext(AuthDataContext);
  if (!ctx) throw new Error("useAuthData must be used within DataProvider");
  return ctx;
};

export const useProjects = (): ProjectsValue => {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within DataProvider");
  return ctx;
};

export const useMessages = (): MessagesValue => {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used within DataProvider");
  return ctx;
};

// Backwards-compat merged hook (consider deprecating later)
export const useData = () => ({
  ...useAuthData(),
  ...useProjects(),
  ...useMessages(),
});

// ---------- Provider ----------
export const DataProvider: React.FC<PropsWithChildren> = ({ children }) => {
// useAuth now provides typed user + derived fields directly
const { user, userId, userName, isAdmin, isDesigner, isBuilder, isVendor, isClient } = useAuth();

  const [allUsers, setAllUsers] = useState<UserLite[]>([]);
  const [userData, setUserData] = useState<UserLite | null>(null);

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

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
        users.has(reactorId) ? users.delete(reactorId) : users.add(reactorId);
        reactions[emoji] = Array.from(users);
        return { ...m, reactions };
      });

    setUserData((prev) => {
      if (!prev) return prev;
      const msgs = Array.isArray(prev.messages) ? prev.messages : [];
      return { ...prev, messages: updateArr(msgs) };
    });

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

  const [isLoading, setIsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [activeProject, setActiveProject] = useState<Project | null>(() => {
    try {
      const stored = localStorage.getItem("dashboardActiveProject");
      return stored ? (JSON.parse(stored) as Project) : null;
    } catch {
      return null;
    }
  });

  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [projectsViewState, setProjectsViewState] = useState<string>(() => {
    try {
      return localStorage.getItem("dashboardViewState") || "welcome";
    } catch {
      return "welcome";
    }
  });

  const [opacity, setOpacity] = useState(0);
  const [settingsUpdated, setSettingsUpdated] = useState(false);

  const [dmReadStatus, setDmReadStatus] = useState<DMReadStatusMap>(() => {
    const stored = getWithTTL("dmReadStatus");
    return stored && typeof stored === "object" ? (stored as DMReadStatusMap) : {};
  });

  useEffect(() => {
    setWithTTL("dmReadStatus", dmReadStatus, DEFAULT_TTL);
  }, [dmReadStatus]);

  // Persist UI bits
  useEffect(() => {
    try {
      localStorage.setItem("dashboardViewState", projectsViewState);
    } catch {
      /* ignore */
    }
  }, [projectsViewState]);

  useEffect(() => {
    try {
      if (activeProject) {
        localStorage.setItem("dashboardActiveProject", JSON.stringify(activeProject));
      } else {
        localStorage.removeItem("dashboardActiveProject");
      }
    } catch {
      /* ignore */
    }
  }, [activeProject]);

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

  // Helpers for event IDs
  const addIdsToEvents = (events: TimelineEvent[]) => {
    let changed = false;
    const withIds = events.map((ev) => {
      if (ev.id) return ev;
      changed = true;
      return { ...ev, id: uuid() };
    });
    return { events: withIds, changed };
  };

  const ensureProjectsHaveEventIds = async (items: Project[]) => {
    const limit = pLimit(3) as <T>(fn: () => Promise<T>) => Promise<T>;
    const updated: Project[] = new Array(items.length);
    const tasks: Array<Promise<void>> = [];

    items.forEach((p, idx) => {
      if (!Array.isArray(p.timelineEvents)) {
        updated[idx] = p;
        return;
      }
      const { events, changed } = addIdsToEvents(p.timelineEvents);
      if (changed) {
        tasks.push(
          limit(async () => {
            try {
              await updateTimelineEventsApi(p.projectId, events);
            } catch (err) {
              console.error("Error persisting event ids", err);
            }
            updated[idx] = { ...p, timelineEvents: events };
          })
        );
      } else {
        updated[idx] = p;
      }
    });

    await Promise.all(tasks);
    return updated;
  };

  const toggleSettingsUpdated = () => setSettingsUpdated((prev) => !prev);

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
    setProjectsError(false);
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

  // Projects (debounced-ish)
  const lastFetchRef = useRef(0);
  const fetchProjects = async (retryCount = 0) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000 && retryCount === 0) return;
    lastFetchRef.current = now;

    setIsLoading(true);
    try {
      const dataItems = await fetchProjectsFromApi();
      const limit = pLimit(3) as <T>(fn: () => Promise<T>) => Promise<T>;

      const withEvents = await Promise.all(
        (Array.isArray(dataItems) ? (dataItems as Project[]) : []).map((p) =>
          limit(async () => {
            try {
              const events = await fetchEvents(p.projectId);
              return { ...p, timelineEvents: events as TimelineEvent[] };
            } catch (err) {
              console.error("Failed to fetch events", err);
              return { ...p, timelineEvents: [] as TimelineEvent[] };
            }
          })
        )
      );

      const withIds = await ensureProjectsHaveEventIds(withEvents);
      if (!withIds || !Array.isArray(withIds)) {
        console.error("Invalid data received:", dataItems);
        setProjects([]);
        setUserProjects([]);
        return;
      }

      setProjects(withIds);

      if (isAdmin) {
        setUserProjects(withIds);
      } else {
        const filtered = withIds.filter(
          (project) =>
            Array.isArray(project.team) && project.team.some((m) => m.userId === userId)
        );
        setUserProjects(filtered);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjectsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetchUserProfile();
    fetchProjects();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchProjects();
  }, [userId, user?.role]);

  // Single project details
  const fetchProjectDetails = async (projectId: string) => {
    if (!projects || !Array.isArray(projects)) {
      console.error("Projects data is not available yet.");
      return;
    }
    let project = projects.find((p) => p.projectId === projectId);

    if (!project || !Array.isArray(project.team)) {
      try {
        const fetched = (await fetchProjectById(projectId)) as Project | undefined;
        if (fetched) {
          try {
            const events = (await fetchEvents(projectId)) as TimelineEvent[];
            project = { ...fetched, timelineEvents: events };
          } catch (err) {
            console.error("Failed to fetch events", err);
            project = { ...fetched, timelineEvents: [] };
          }

          setProjects((prev) => {
            if (!Array.isArray(prev)) return prev;
            const idx = prev.findIndex((p) => p.projectId === projectId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = project as Project;
              return updated;
            }
            return [...prev, project as Project];
          });
        }
      } catch (err) {
        console.error("Error fetching project details", err);
      }
    } else if (!Array.isArray(project.timelineEvents)) {
      try {
        const events = (await fetchEvents(projectId)) as TimelineEvent[];
        project = { ...project, timelineEvents: events };
      } catch (err) {
        console.error("Failed to fetch events", err);
        project = { ...project, timelineEvents: [] };
      }
    }

    if (project) {
      let patched: Project = project;
      if (!Array.isArray(patched.team)) {
        patched = { ...patched, team: [] };
      }
      if (Array.isArray(project.timelineEvents)) {
        const { events, changed } = addIdsToEvents(project.timelineEvents);
        if (changed) {
          patched = { ...patched, timelineEvents: events };
          updateTimelineEventsApi(project.projectId, events).catch((err: unknown) => {
            console.error("Error persisting event ids", err);
          });
        }
      }
      setActiveProject(patched);
    } else {
      console.error(`Project with projectId: ${projectId} not found`);
      setActiveProject(null);
    }
  };

  // Update timeline
  const updateTimelineEvents = async (projectId: string, events: TimelineEvent[]) => {
    const withIds = events.map((ev) => ({ ...ev, id: ev.id || uuid() }));
    try {
      await updateTimelineEventsApi(projectId, withIds);
      setActiveProject((prev) =>
        prev && prev.projectId === projectId ? { ...prev, timelineEvents: withIds } : prev
      );
      setProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p.projectId === projectId ? { ...p, timelineEvents: withIds } : p))
          : prev
      );
      setUserProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p.projectId === projectId ? { ...p, timelineEvents: withIds } : p))
          : prev
      );
    } catch (error) {
      console.error("Error updating timeline events:", error);
    }
  };

  // Generic project field update
  const updateProjectFields = async (projectId: string, fields: Partial<Project>) => {
    try {
      await updateProjectFieldsApi(projectId, fields);
      const merge = (project?: Project | null) => {
        if (!project || project.projectId !== projectId) return project;
        const updated: Project = { ...project };
        Object.entries(fields).forEach(([key, value]) => {
          if (key === "thumbnails" && Array.isArray(value)) {
            const prevThumbs = Array.isArray(project.thumbnails) ? project.thumbnails : [];
            updated.thumbnails = Array.from(new Set([...(value as string[]), ...prevThumbs]));
          } else {
            // @ts-expect-error dynamic assignment is ok for flexible Project shape
            updated[key] = value as never;
          }
        });
        return updated;
      };

      setActiveProject((prev) => merge(prev) ?? prev);
      setProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)!) : prev));
      setUserProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)!) : prev));
    } catch (error) {
      console.error("Error updating project fields:", error);
    }
  };

  // Recent activity
  const fetchRecentActivity = useCallback<ProjectsValue["fetchRecentActivity"]>(
    async (limit = 10) => {
      try {
        const events: Awaited<ReturnType<ProjectsValue["fetchRecentActivity"]>> = [];
        const projectsList = Array.isArray(userProjects) ? userProjects : [];

        for (const project of projectsList) {
          const projectTitle = project.title || "Project";
          const timeline = Array.isArray(project.timelineEvents) ? project.timelineEvents : [];
          timeline.forEach((ev) => {
            const ts = (ev.date || ev.timestamp) as string | undefined;
            if (!ts) return;
            events.push({
              id: `proj-${project.projectId}-${ev.id || uuid()}`,
              type: "project",
              projectId: project.projectId,
              projectTitle,
              text: ev.title || "Project updated",
              timestamp: ts,
            });
          });

          try {
            const res = await apiFetch(
              `${GET_PROJECT_MESSAGES_URL}?projectId=${project.projectId}`
            );
            const msgs = (await res.json()) as Message[];
            if (Array.isArray(msgs)) {
              msgs.forEach((m) => {
                if (!m.timestamp) return;
                events.push({
                  id: `msg-${m.messageId || m.optimisticId}`,
                  type: "message",
                  projectId: project.projectId,
                  projectTitle,
                  text: m.text || m.body || m.content || "New message",
                  timestamp: m.timestamp,
                });
              });
            }
          } catch (err) {
            console.error("Failed to fetch messages for activity", err);
          }
        }

        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return events.slice(0, limit);
      } catch (err) {
        console.error("fetchRecentActivity error", err);
        return [];
      }
    },
    [userProjects]
  );

  // ---------- Memoized context values ----------
  const authValue = useMemo<AuthDataValue>(
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
    ]
  );

  const projectsValue = useMemo<ProjectsValue>(
    () => ({
      projects: userProjects,
      setProjects,
      setUserProjects,
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
      projectsError,
      updateTimelineEvents,
      updateProjectFields,
    }),
    [
      userProjects,
      isLoading,
      loadingProfile,
      activeProject,
      selectedProjects,
      fetchProjectDetails,
      fetchProjects,
      fetchUserProfile,
      fetchRecentActivity,
      opacity,
      settingsUpdated,
      dmReadStatus,
      projectsError,
    ]
  );

  const messagesValue = useMemo<MessagesValue>(
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
    <AuthDataContext.Provider value={authValue}>
      <ProjectsContext.Provider value={projectsValue}>
        <MessagesContext.Provider value={messagesValue}>
          {children}
        </MessagesContext.Provider>
      </ProjectsContext.Provider>
    </AuthDataContext.Provider>
  );
};

export default DataProvider;
