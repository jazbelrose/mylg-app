import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { ProjectsProvider, useProjects } from './ProjectsContext';
import { MessagesProvider, useMessages } from './MessagesContext';

export const DataProvider = ({ children }) => {
  return _jsx(ProjectsProvider, { children: _jsx(MessagesProvider, { children }) });
};

export const useData = () => ({
  ...useProjects(),
  ...useMessages(),
});

export default DataProvider;
