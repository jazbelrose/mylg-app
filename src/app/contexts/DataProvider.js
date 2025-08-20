import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';
import { useProjects } from './ProjectsContext';
import { useMessages } from './MessagesContext';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.userId;
    
    // Import user-related data from UsersContext
    const { 
        userName, userData, setUserData, allUsers, isLoading: usersLoading, 
        loadingProfile, isAdmin, isDesigner, isBuilder, isVendor, isClient,
        fetchUserProfile, refreshUsers, updateUserProfile 
    } = useUsers();

    // Import project-related data from ProjectsContext for backward compatibility
    const {
        projects, allProjects, activeProject, setActiveProject, selectedProjects, setSelectedProjects,
        projectsError, isLoading: projectsLoading, fetchProjects, fetchProjectDetails,
        updateTimelineEvents, updateProjectFields, pendingInvites,
        fetchRecentActivity: projectsFetchRecentActivity
    } = useProjects();

    // Import message-related data from MessagesContext for backward compatibility  
    const {
        projectMessages, setProjectMessages, dmThreads, setDmThreads, dmReadStatus, setDmReadStatus,
        deletedMessageIds, markMessageDeleted, clearDeletedMessageId, toggleReaction
    } = useMessages();

    // UI state (DataProvider specific)
    const [isLoading, setIsLoading] = useState(false);
    const [opacity, setOpacity] = useState(0);
    const [settingsUpdated, setSettingsUpdated] = useState(false);
    
    // Dashboard view state
    const [projectsViewState, setProjectsViewState] = useState(() => {
        try {
            return localStorage.getItem('dashboardViewState') || 'welcome';
        } catch {
            return 'welcome';
        }
    });

    const toggleSettingsUpdated = () => setSettingsUpdated(prev => !prev);

    // Persist dashboard view state
    useEffect(() => {
        try {
            localStorage.setItem('dashboardViewState', projectsViewState);
        } catch {
            // ignore persistence errors
        }
    }, [projectsViewState]);

    // Combined loading state
    const combinedLoading = usersLoading || projectsLoading || isLoading;

    // Legacy fetchRecentActivity - now delegates to ProjectsContext
    const fetchRecentActivity = async (limit = 10) => {
        try {
            return await projectsFetchRecentActivity(limit);
        } catch (err) {
            console.error('fetchRecentActivity error', err);
            return [];
        }
    };

    const value = useMemo(() => ({
        // User data (from UsersContext)
        userName,
        userId,
        user,
        userData,
        setUserData,
        allUsers,
        loadingProfile,
        isAdmin,
        isDesigner,
        isBuilder,
        isVendor,
        isClient,
        fetchUserProfile,
        refreshUsers,
        updateUserProfile,

        // Project data (from ProjectsContext) - backward compatibility
        projects,
        allProjects,
        activeProject,
        setActiveProject,
        selectedProjects,
        setSelectedProjects,
        projectsError,
        fetchProjects,
        fetchProjectDetails,
        updateTimelineEvents,
        updateProjectFields,
        pendingInvites,

        // Message data (from MessagesContext) - backward compatibility
        projectMessages,
        setProjectMessages,
        dmThreads,
        setDmThreads,
        dmReadStatus,
        setDmReadStatus,
        deletedMessageIds,
        markMessageDeleted,
        clearDeletedMessageId,
        toggleReaction,

        // UI state (DataProvider specific)
        isLoading: combinedLoading,
        setIsLoading,
        opacity,
        setOpacity,
        settingsUpdated,
        toggleSettingsUpdated,
        projectsViewState,
        setProjectsViewState,
        fetchRecentActivity,
    }), [
        userName, userId, user, userData, setUserData, allUsers, loadingProfile,
        isAdmin, isDesigner, isBuilder, isVendor, isClient, fetchUserProfile, refreshUsers, updateUserProfile,
        projects, allProjects, activeProject, setActiveProject, selectedProjects, setSelectedProjects,
        projectsError, fetchProjects, fetchProjectDetails, updateTimelineEvents, updateProjectFields, pendingInvites,
        projectMessages, setProjectMessages, dmThreads, setDmThreads, dmReadStatus, setDmReadStatus,
        deletedMessageIds, markMessageDeleted, clearDeletedMessageId, toggleReaction,
        combinedLoading, setIsLoading, opacity, setOpacity, settingsUpdated, toggleSettingsUpdated,
        projectsViewState, setProjectsViewState, fetchRecentActivity
    ]);

    return _jsx(DataContext.Provider, { value: value, children: children });
};

export default DataProvider;