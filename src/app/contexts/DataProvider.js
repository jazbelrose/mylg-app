import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useUsers } from './UsersContext';

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

    // UI state
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

    // Legacy fetchRecentActivity - placeholder since projects moved to ProjectsContext
    const fetchRecentActivity = async (limit = 10) => {
        try {
            // Components using this should get activity from ProjectsContext instead
            return [];
        } catch (err) {
            console.error('fetchRecentActivity error', err);
            return [];
        }
    };

    const value = {
        userName,
        userId,
        user,
        userData,
        setUserData,
        allUsers,
        isLoading,
        setIsLoading,
        loadingProfile,
        opacity,
        setOpacity,
        settingsUpdated,
        toggleSettingsUpdated,
        projectsViewState,
        setProjectsViewState,
        isAdmin,
        isDesigner,
        isBuilder,
        isVendor,
        isClient,
        fetchUserProfile,
        fetchRecentActivity,
        refreshUsers,
        updateUserProfile,
    };

    return _jsx(DataContext.Provider, { value: value, children: children });
};

export default DataProvider;