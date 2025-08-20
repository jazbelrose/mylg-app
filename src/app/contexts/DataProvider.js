import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { useAuth } from './AuthContext';
import { ProjectsProvider, useProjects } from './ProjectsContext';
import { MessagesProvider, useMessages } from './MessagesContext';
import { UIProvider, useUI } from './UIContext';

export const DataProvider = ({ children }) => (
  _jsx(ProjectsProvider, { children: _jsx(MessagesProvider, { children: _jsx(UIProvider, { children: children }) }) })
);

export const useData = () => {
  const auth = useAuth();
  const projects = useProjects();
  const messages = useMessages();
  const ui = useUI();

  const role = (auth.user?.role || '').toLowerCase();
  return {
    ...auth,
    ...projects,
    ...messages,
    ...ui,
    userId: auth.user?.userId,
    userName: auth.user ? `${auth.user.firstName} ` : 'Guest',
    isAdmin: role === 'admin',
    isBuilder: role === 'builder',
    isDesigner: role === 'designer',
    isClient: role === 'client',
  };
};

export default DataProvider;
