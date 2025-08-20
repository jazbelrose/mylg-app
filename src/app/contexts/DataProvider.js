import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllUsers, fetchUserProfile as fetchUserProfileApi, updateUserProfile, GET_PROJECT_MESSAGES_URL, apiFetch } from '../../utils/api';

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.userId;
    const role = (user?.role || '').toLowerCase();
    
    // Role-based flags (derived from auth)
    const isAdmin = role === 'admin';
    const isDesigner = role === 'designer';
    const isBuilder = role === 'builder';
    const isVendor = role === 'vendor';
    const isClient = role === 'client';
    const userName = user ? `${user.firstName} ` : 'Guest';

    // User profile state
    const [allUsers, setAllUsers] = useState([]);
    const [userData, setUserData] = useState(null);
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
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

    // Fetch user profile when userId changes
    useEffect(() => {
        if (!userId) {
            return;
        }
        fetchUserProfile();
    }, [userId]);

    // Fetch recent activity from projects (placeholder for now - projects moved to ProjectsContext)
    const fetchRecentActivity = useCallback(async (limit = 10) => {
        try {
            // This would typically fetch from projects, but since projects are now in ProjectsContext
            // this is a placeholder that returns empty array
            // Components using this should get activity from ProjectsContext instead
            return [];
        } catch (err) {
            console.error('fetchRecentActivity error', err);
            return [];
        }
    }, []);

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