import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import pLimit from '../../utils/pLimit';
import { useAuth } from './AuthContext';
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


const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';
  const isDesigner = role === 'designer';
  const isBuilder = role === 'builder';
  const isVendor = role === 'vendor';
  const isClient = role === 'client';
  const userName = user ? `${user.firstName} ` : 'Guest';

  const [allUsers, setAllUsers] = useState([]);
  const [userData, setUserData] = useState(null);
  const [userProjects, setUserProjects] = useState([]);
  const [projects, setProjects] = useState([]);

  // keyed by projectId -> array of messages
  const [projectMessages, setProjectMessages] = useState({});

  const [dmThreads, setDmThreads] = useState(() => {
   const stored = getWithTTL('dmThreads');
   return Array.isArray(stored) ? stored : [];
  });

  const [pendingInvites, setPendingInvites] = useState([]);

  // Track IDs of messages deleted locally so we can filter out any
  // server copies that arrive later due to propagation lag.
  const deletedMessageIdsRef = useRef(new Set());
  const markMessageDeleted = (id) => {
    if (id) deletedMessageIdsRef.current.add(id);
  };
  const clearDeletedMessageId = (id) => {
    if (id) deletedMessageIdsRef.current.delete(id);
  };
  const toggleReaction = (
    msgId,
    emoji,
    reactorId,
    conversationId,
    conversationType,
    ws
  ) => {
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
        reactions[emoji] = Array.from(users);
        return { ...m, reactions };
      });

    setUserData(prev => {
      if (!prev) return prev;
      const msgs = Array.isArray(prev.messages) ? prev.messages : [];
      return { ...prev, messages: updateArr(msgs) };
    });

    setProjectMessages(prev => {
      const updated = {};
      for (const pid of Object.keys(prev)) {
        const msgs = Array.isArray(prev[pid]) ? prev[pid] : [];
        updated[pid] = updateArr(msgs);
      }
      return updated;
  });

  
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
  };



  const [isLoading, setIsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [activeProject, setActiveProject] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboardActiveProject');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projectsViewState, setProjectsViewState] = useState(() => {
    try {
      return localStorage.getItem('dashboardViewState') || 'welcome';
    } catch {
      return 'welcome';
    }
  });
  const [opacity, setOpacity] = useState(0);
  const [settingsUpdated, setSettingsUpdated] = useState(false);

    // Track last read timestamp for direct message conversations
  const [dmReadStatus, setDmReadStatus] = useState(() => {
     const stored = getWithTTL('dmReadStatus');
    return stored && typeof stored === 'object' ? stored : {};
  });

  useEffect(() => {
      setWithTTL('dmReadStatus', dmReadStatus, DEFAULT_TTL);

  }, [dmReadStatus]);

  // Persist dashboard view and active project
  useEffect(() => {
    try {
      localStorage.setItem('dashboardViewState', projectsViewState);
    } catch {
      // ignore persistence errors
    }
  }, [projectsViewState]);

  useEffect(() => {
    try {
      if (activeProject) {
        localStorage.setItem('dashboardActiveProject', JSON.stringify(activeProject));
      } else {
        localStorage.removeItem('dashboardActiveProject');
      }
    } catch {
      // ignore persistence errors
    }
  }, [activeProject]);

  useEffect(() => {
   setWithTTL('dmThreads', dmThreads, DEFAULT_TTL);
  }, [dmThreads]);

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

  useEffect(() => {
    if (!userId) {
      setPendingInvites([]);
      return;
    }
    const loadInvites = async () => {
      try {
        const items = await fetchPendingInvites(userId);
        setPendingInvites(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to fetch invites', err);
      }
    };
    loadInvites();
  }, [userId]);

  const handleSendInvite = async (projectId, recipientUsername) => {
    try {
      await sendProjectInvite(projectId, recipientUsername);
      const items = await fetchPendingInvites(userId);
      setPendingInvites(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error('Failed to send invite', err);
    }
  };

  const handleAcceptInvite = async (inviteId) => {
    try {
      await acceptProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
      fetchProjects();
    } catch (err) {
      console.error('Failed to accept invite', err);
    }
  };

  const handleDeclineInvite = async (inviteId) => {
    try {
      await declineProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
    } catch (err) {
      console.error('Failed to decline invite', err);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    try {
      await cancelProjectInvite(inviteId);
      setPendingInvites((prev) => prev.filter((inv) => inv.inviteId !== inviteId));
    } catch (err) {
      console.error('Failed to cancel invite', err);
    }
  };

  // --- helper to ensure events have ids

    const addIdsToEvents = (events) => {
    let changed = false;
    const withIds = events.map(ev => {
      if (ev.id) return ev;
      changed = true;
      return { ...ev, id: uuid() };
    });
    return { events: withIds, changed };
  };

  const ensureProjectsHaveEventIds = async (items) => {
    const limit = pLimit(3);
    const updated = new Array(items.length);
    const tasks = [];

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
              console.error('Error persisting event ids', err);
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

  // --- Fetch All Users (refetch on login change)
  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const users = await fetchAllUsers();
        const mappedUsers = Array.isArray(users)
          ? users.map(u => ({ ...u, occupation: u.occupation || u.role }))
          : [];
        setAllUsers(mappedUsers);
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
      const mappedUsers = Array.isArray(users)
        ? users.map(u => ({ ...u, occupation: u.occupation || u.role }))
        : [];
      setAllUsers(mappedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch User Profile
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
        ? { ...profile, occupation: profile.occupation || profile.role }
        : null;
      setUserData({
        ...profile,
        messages: profile?.messages || [],
        userId: user?.userId, // <- crucial merge
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
      setLoadingProfile(false);
    }
  };

  // --- Debounced fetchProjects (once per 2s, even if called rapidly)
  const lastFetchRef = useRef(0);
  const fetchProjects = async (retryCount = 0) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000 && retryCount === 0) return;
    lastFetchRef.current = now;

    setIsLoading(true);
    try {
      const dataItems = await fetchProjectsFromApi();
      const limit = pLimit(3);
      const withEvents = await Promise.all(
        (Array.isArray(dataItems) ? dataItems : []).map((p) =>
          limit(async () => {
            try {
              const events = await fetchEvents(p.projectId);
              return { ...p, timelineEvents: events };
            } catch (err) {
              console.error('Failed to fetch events', err);
              return { ...p, timelineEvents: [] };
            }
          })
        )
      );
      const withIds = await ensureProjectsHaveEventIds(withEvents);

      if (!withIds || !Array.isArray(withIds)) {
        console.error('Invalid data received:', dataItems);
        setProjects([]);
        setUserProjects([]);
        return;
      }

      setProjects(withIds);

      // User filtering
      if (isAdmin) {
        setUserProjects(withIds);
      } else {
        const filteredProjects = withIds.filter((project) =>
          Array.isArray(project.team) &&
          project.team.some((member) => member.userId === userId)
        );
        setUserProjects(filteredProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjectsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  
   useEffect(() => {
    if (!userId) {
      return;
    }
    fetchUserProfile();
    fetchProjects();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    fetchProjects();
  }, [userId, user?.role]);

    // --- Fetch single project details
  const fetchProjectDetails = async (projectId) => {
    if (!projects || !Array.isArray(projects)) {
      console.error("Projects data is not available yet.");
      return;
    }
    let project = projects.find((p) => p.projectId === projectId);

    if (!project || !Array.isArray(project.team)) {
      try {
        const fetched = await fetchProjectById(projectId);
        if (fetched) {
          try {
            const events = await fetchEvents(projectId);
            project = { ...fetched, timelineEvents: events };
          } catch (err) {
            console.error('Failed to fetch events', err);
            project = { ...fetched, timelineEvents: [] };
          }
          setProjects((prev) => {
            if (!Array.isArray(prev)) return prev;
            const idx = prev.findIndex((p) => p.projectId === projectId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = project;
              return updated;
            }
            return [...prev, project];
          });
        }
      } catch (err) {
        console.error('Error fetching project details', err);
      }
    } else if (!Array.isArray(project.timelineEvents)) {
      try {
        const events = await fetchEvents(projectId);
        project = { ...project, timelineEvents: events };
      } catch (err) {
        console.error('Failed to fetch events', err);
        project = { ...project, timelineEvents: [] };
      }
    }

    if (project) {
      let patched = project;
      if (!Array.isArray(patched.team)) {
        patched = { ...patched, team: [] };
      }
      if (Array.isArray(project.timelineEvents)) {
        const { events, changed } = addIdsToEvents(project.timelineEvents);
        if (changed) {
          patched = { ...patched, timelineEvents: events };
          updateTimelineEventsApi(project.projectId, events).catch((err) => {
            console.error('Error persisting event ids', err);
          });
        }
      }
      setActiveProject(patched);
    } else {
      console.error(`Project with projectId: ${projectId} not found`);
      setActiveProject(null);
    }
  };

// --- Update timeline events for a project
  const updateTimelineEvents = async (projectId, events) => {
    const withIds = events.map(ev => ({ ...ev, id: ev.id || uuid() }));
    try {
      await updateTimelineEventsApi(projectId, withIds);
      setActiveProject((prev) =>
        prev && prev.projectId === projectId ? { ...prev, timelineEvents: withIds } : prev
      );
      setProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) =>
              p.projectId === projectId ? { ...p, timelineEvents: withIds } : p
            )
          : prev
      );
      setUserProjects((prev) =>
        Array.isArray(prev)
          ? prev.map((p) =>
              p.projectId === projectId ? { ...p, timelineEvents: withIds } : p
            )
          : prev
      );
    } catch (error) {
      console.error('Error updating timeline events:', error);
    }
  };
  

  // --- Generic project field update helper
  const updateProjectFields = async (projectId, fields) => {
    try {
      await updateProjectFieldsApi(projectId, fields);

      const merge = (project) => {
        if (!project || project.projectId !== projectId) return project;
        const updated = { ...project };
        Object.entries(fields).forEach(([key, value]) => {
          if (key === 'thumbnails' && Array.isArray(value)) {
            const prevThumbs = Array.isArray(project.thumbnails)
              ? project.thumbnails
              : [];
            updated.thumbnails = Array.from(
              new Set([...value, ...prevThumbs])
            );
          } else {
            updated[key] = value;
          }
        });
        return updated;
      };

      setActiveProject((prev) => merge(prev));
      setProjects((prev) =>
        Array.isArray(prev) ? prev.map((p) => merge(p)) : prev
      );
      setUserProjects((prev) =>
        Array.isArray(prev) ? prev.map((p) => merge(p)) : prev
      );
    } catch (error) {
      console.error('Error updating project fields:', error);
    }
  };
  const fetchRecentActivity = useCallback(
    async (limit = 10) => {
      try {
        const events = [];
        const projectsList = Array.isArray(userProjects) ? userProjects : [];
        for (const project of projectsList) {
          const projectTitle = project.title || 'Project';
          const timeline = Array.isArray(project.timelineEvents)
            ? project.timelineEvents
            : [];
          timeline.forEach((ev) => {
            const ts = ev.date || ev.timestamp;
            if (!ts) return;
            events.push({
              id: `proj-${project.projectId}-${ev.id || uuid()}`,
              type: 'project',
              projectId: project.projectId,
              projectTitle,
              text: ev.title || 'Project updated',
              timestamp: ts,
            });
          });

          try {
            const res = await apiFetch(
              `${GET_PROJECT_MESSAGES_URL}?projectId=${project.projectId}`
            );
            const msgs = await res.json();
            if (Array.isArray(msgs)) {
              msgs.forEach((m) => {
                if (!m.timestamp) return;
                events.push({
                  id: `msg-${m.messageId || m.optimisticId}`,
                  type: 'message',
                  projectId: project.projectId,
                  projectTitle,
                  text: m.text || m.body || m.content || 'New message',
                  timestamp: m.timestamp,
                });
              });
            }
          } catch (err) {
            console.error('Failed to fetch messages for activity', err);
          }

        }
        events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return events.slice(0, limit);
      } catch (err) {
        console.error('fetchRecentActivity error', err);
        return [];
      }
    },
    [userProjects]
  );

  const value = {
    userName,
    userId,
    user,
    userData,
    setUserData,
    projects: userProjects,
    setProjects,
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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export default DataProvider;
