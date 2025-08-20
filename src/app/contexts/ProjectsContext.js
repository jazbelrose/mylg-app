import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import pLimit from '../../utils/pLimit';
import { useAuth } from './AuthContext';
import { 
  fetchProjectsFromApi, 
  fetchProjectById, 
  fetchEvents, 
  updateTimelineEvents as updateTimelineEventsApi, 
  updateProjectFields as updateProjectFieldsApi,
  fetchPendingInvites,
  sendProjectInvite,
  acceptProjectInvite,
  declineProjectInvite,
  cancelProjectInvite,
  GET_PROJECT_MESSAGES_URL,
  apiFetch
} from '../../utils/api';

const ProjectsContext = createContext();

export const useProjects = () => useContext(ProjectsContext);

export const ProjectsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  // Project state
  const [projects, setProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboardActiveProject');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [projectsError, setProjectsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Project invites state
  const [pendingInvites, setPendingInvites] = useState([]);

  // Persist active project
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

  // Helper functions (memoized to prevent re-renders)
  const addIdsToEvents = useCallback((events) => {
    let changed = false;
    const withIds = events.map(ev => {
      if (ev.id) return ev;
      changed = true;
      return { ...ev, id: uuid() };
    });
    return { events: withIds, changed };
  }, []);

  const ensureProjectsHaveEventIds = useCallback(async (items) => {
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
        tasks.push(limit(async () => {
          try {
            await updateTimelineEventsApi(p.projectId, events);
          } catch (err) {
            console.error('Error persisting event ids', err);
          }
          updated[idx] = { ...p, timelineEvents: events };
        }));
      } else {
        updated[idx] = p;
      }
    });

    await Promise.all(tasks);
    return updated;
  }, [addIdsToEvents]);

  // Debounced fetchProjects (memoized)
  const lastFetchRef = useRef(0);
  const fetchProjects = useCallback(async (retryCount = 0) => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000 && retryCount === 0) return;
    lastFetchRef.current = now;

    setIsLoading(true);
    try {
      const dataItems = await fetchProjectsFromApi();
      if (!dataItems) {
        setProjects([]);
        setUserProjects([]);
        return;
      }

      const limit = pLimit(3);
      const withEvents = await Promise.all(
        (Array.isArray(dataItems) ? dataItems : []).map(p =>
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
        const filteredProjects = withIds.filter(project =>
          Array.isArray(project.team) &&
          project.team.some(member => member.userId === userId)
        );
        setUserProjects(filteredProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjectsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, userId, ensureProjectsHaveEventIds]);

  // Fetch single project details (memoized)
  const fetchProjectDetails = useCallback(async (projectId) => {
    if (!projects || !Array.isArray(projects)) {
      console.error("Projects data is not available yet.");
      return;
    }

    let project = projects.find(p => p.projectId === projectId);
    if (!project || !Array.isArray(project.team)) {
      try {
        const fetched = await fetchProjectById(projectId);
        if (fetched) {
          try {
            const events = await fetchEvents(projectId);
            project = { ...fetched, timelineEvents: events };
          } catch (err) {
            console.error('Failed to fetch events for project', err);
            project = { ...fetched, timelineEvents: [] };
          }
        }
      } catch (err) {
        console.error('Failed to fetch project details', err);
      }
    }

    if (project) {
      let patched = { ...project };
      if (!Array.isArray(project.team)) {
        patched = { ...patched, team: [] };
      }

      if (Array.isArray(project.timelineEvents)) {
        const { events, changed } = addIdsToEvents(project.timelineEvents);
        if (changed) {
          patched = { ...patched, timelineEvents: events };
          updateTimelineEventsApi(project.projectId, events).catch(err => {
            console.error('Error persisting event ids', err);
          });
        }
      }

      setActiveProject(patched);
    } else {
      console.error(`Project with projectId: ${projectId} not found`);
      setActiveProject(null);
    }
  }, [projects, addIdsToEvents]);

  // Update timeline events for a project (memoized)
  const updateTimelineEvents = useCallback(async (projectId, events) => {
    const withIds = events.map(ev => ({ ...ev, id: ev.id || uuid() }));
    try {
      await updateTimelineEventsApi(projectId, withIds);
      setActiveProject(prev =>
        prev && prev.projectId === projectId
          ? { ...prev, timelineEvents: withIds }
          : prev
      );
      setProjects(prev =>
        Array.isArray(prev)
          ? prev.map(p =>
              p.projectId === projectId
                ? { ...p, timelineEvents: withIds }
                : p
            )
          : prev
      );
      setUserProjects(prev =>
        Array.isArray(prev)
          ? prev.map(p =>
              p.projectId === projectId
                ? { ...p, timelineEvents: withIds }
                : p
            )
          : prev
      );
    } catch (error) {
      console.error('Error updating timeline events:', error);
    }
  }, []);

  // Generic project field update helper (memoized)
  const updateProjectFields = useCallback(async (projectId, fields) => {
    try {
      await updateProjectFieldsApi(projectId, fields);
      const merge = project => {
        if (!project || project.projectId !== projectId) return project;
        const updated = { ...project };
        Object.entries(fields).forEach(([key, value]) => {
          if (key === 'thumbnails' && Array.isArray(value)) {
            const prevThumbs = Array.isArray(project.thumbnails)
              ? project.thumbnails
              : [];
            updated.thumbnails = Array.from(new Set([...value, ...prevThumbs]));
          } else {
            updated[key] = value;
          }
        });
        return updated;
      };

      setActiveProject(prev => merge(prev));
      setProjects(prev => Array.isArray(prev) ? prev.map(p => merge(p)) : prev);
      setUserProjects(prev => Array.isArray(prev) ? prev.map(p => merge(p)) : prev);
    } catch (error) {
      console.error('Error updating project fields:', error);
    }
  }, []);

  // Project invites handlers (memoized)
  const handleSendInvite = useCallback(async (projectId, recipientUsername) => {
    try {
      await sendProjectInvite(projectId, recipientUsername);
      // Optionally refresh invites or show success message
    } catch (err) {
      console.error('Failed to send invite', err);
    }
  }, []);

  const handleAcceptInvite = useCallback(async (inviteId) => {
    try {
      await acceptProjectInvite(inviteId);
      setPendingInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
      // Refresh projects after accepting invite
      fetchProjects();
    } catch (err) {
      console.error('Failed to accept invite', err);
    }
  }, [fetchProjects]);

  const handleDeclineInvite = useCallback(async (inviteId) => {
    try {
      await declineProjectInvite(inviteId);
      setPendingInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
    } catch (err) {
      console.error('Failed to decline invite', err);
    }
  }, []);

  const handleCancelInvite = useCallback(async (inviteId) => {
    try {
      await cancelProjectInvite(inviteId);
      setPendingInvites(prev => prev.filter(inv => inv.inviteId !== inviteId));
    } catch (err) {
      console.error('Failed to cancel invite', err);
    }
  }, []);

  // Fetch projects when user changes
  useEffect(() => {
    if (!userId) {
      return;
    }
    fetchProjects();
  }, [userId, user?.role, fetchProjects]);

  // Fetch recent activity from projects
  const fetchRecentActivity = useCallback(async (limit = 10) => {
    try {
      const events = [];
      const projectsList = Array.isArray(userProjects) ? userProjects : [];

      for (const project of projectsList) {
        const projectTitle = project.title || 'Project';
        const timeline = Array.isArray(project.timelineEvents)
          ? project.timelineEvents
          : [];

        timeline.forEach(ev => {
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
          const res = await apiFetch(`${GET_PROJECT_MESSAGES_URL}?projectId=${project.projectId}`);
          const msgs = await res.json();
          if (Array.isArray(msgs)) {
            msgs.forEach(m => {
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
  }, [userProjects]);
  useEffect(() => {
    if (!userId) {
      setPendingInvites([]);
      return;
    }

    const loadInvites = async () => {
      try {
        const invites = await fetchPendingInvites(userId);
        setPendingInvites(Array.isArray(invites) ? invites : []);
      } catch (err) {
        console.error('Failed to fetch pending invites', err);
        setPendingInvites([]);
      }
    };

    loadInvites();
  }, [userId]);

  const value = useMemo(() => ({
    // State
    projects: userProjects,
    allProjects: projects,
    setProjects,
    setUserProjects,
    activeProject,
    setActiveProject,
    selectedProjects,
    setSelectedProjects,
    projectsError,
    isLoading,
    setIsLoading,
    pendingInvites,

    // Operations
    fetchProjects,
    fetchProjectDetails,
    updateTimelineEvents,
    updateProjectFields,
    fetchRecentActivity,
    handleSendInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    handleCancelInvite,
  }), [
    userProjects,
    projects,
    setProjects,
    setUserProjects,
    activeProject,
    setActiveProject,
    selectedProjects,
    setSelectedProjects,
    projectsError,
    isLoading,
    setIsLoading,
    pendingInvites,
    fetchProjects,
    fetchProjectDetails,
    updateTimelineEvents,
    updateProjectFields,
    fetchRecentActivity,
    handleSendInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    handleCancelInvite,
  ]);

  return _jsx(ProjectsContext.Provider, { value: value, children: children });
};

export default ProjectsProvider;