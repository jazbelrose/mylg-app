import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useRef } from 'react';
import pLimit from '../../utils/pLimit';
import { fetchProjectsFromApi, fetchEvents } from '../../utils/api';
import { useAuth } from './AuthContext';

const ProjectsContext = createContext({
  projects: [],
  userProjects: [],
  projectsError: false,
  isLoading: false,
  fetchProjects: async () => {},
});

export const ProjectsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.userId;
  const role = (user?.role || '').toLowerCase();
  const isAdmin = role === 'admin';

  const [projects, setProjects] = useState([]);
  const [userProjects, setUserProjects] = useState([]);
  const [projectsError, setProjectsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  return _jsx(ProjectsContext.Provider, { value: { projects, userProjects, projectsError, isLoading, fetchProjects }, children });
};

export const useProjects = () => useContext(ProjectsContext);

