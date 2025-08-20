import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import pLimit from '../../utils/pLimit';
import {
  fetchProjectsFromApi,
  fetchEvents,
  fetchProjectById,
  updateTimelineEvents as updateTimelineEventsApi,
  updateProjectFields as updateProjectFieldsApi,
} from '../../utils/api';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext({
  projects: [],
  setProjects: () => {},
  userProjects: [],
  setUserProjects: () => {},
  selectedProjects: [],
  setSelectedProjects: () => {},
  activeProject: {},
  setActiveProject: () => {},
  projectsError: false,
  isLoading: false,
  fetchProjects: async () => {},
  fetchProjectDetails: async () => {},
  updateTimelineEvents: async () => {},
  updateProjectFields: async () => {},
});

export const ProjectsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  const [projects, setProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(() => {
    try {
      const stored = localStorage.getItem('dashboardActiveProject');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [projectsError, setProjectsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('dashboardActiveProject', JSON.stringify(activeProject));
    } catch {
      // ignore persistence errors
    }
  }, [activeProject]);

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
      setProjects(withEvents);
      if (isAdmin) {
        setUserProjects(withEvents);
      } else {
        const filtered = withEvents.filter(
          (project) =>
            Array.isArray(project.team) &&
            project.team.some((member) => member.userId === userId)
        );
        setUserProjects(filtered);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjectsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const addIdsToEvents = (events) => {
    let changed = false;
    const withIds = events.map((ev) => {
      if (ev.id) return ev;
      changed = true;
      return { ...ev, id: uuid() };
    });
    return { events: withIds, changed };
  };

  const fetchProjectDetails = async (projectId) => {
    if (!Array.isArray(projects)) return;
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
      setActiveProject({});
    }
  };

  const updateTimelineEvents = async (projectId, events) => {
    const withIds = events.map((ev) => ({ ...ev, id: ev.id || uuid() }));
    try {
      await updateTimelineEventsApi(projectId, withIds);
      setActiveProject((prev) =>
        prev && prev.projectId === projectId
          ? { ...prev, timelineEvents: withIds }
          : prev
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
            updated.thumbnails = Array.from(new Set([...value, ...prevThumbs]));
          } else {
            updated[key] = value;
          }
        });
        return updated;
      };
      setActiveProject((prev) => merge(prev));
      setProjects((prev) => (Array.isArray(prev) ? prev.map((p) => merge(p)) : prev));
      setUserProjects((prev) =>
        Array.isArray(prev) ? prev.map((p) => merge(p)) : prev
      );
    } catch (error) {
      console.error('Error updating project fields:', error);
    }
  };

  return _jsx(ProjectsContext.Provider, {
    value: {
      projects,
      setProjects,
      userProjects,
      setUserProjects,
      selectedProjects,
      setSelectedProjects,
      activeProject,
      setActiveProject,
      projectsError,
      isLoading,
      fetchProjects,
      fetchProjectDetails,
      updateTimelineEvents,
      updateProjectFields,
    },
    children: children,
  });
};

export const useProjects = () => useContext(ProjectsContext);

export default ProjectsContext;
