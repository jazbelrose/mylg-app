import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchAllUsers, fetchUserProfile as fetchUserProfileApi, updateUserProfile } from '../../utils/api';

const UsersContext = createContext();

export const useUsers = () => useContext(UsersContext);

export const UsersProvider = ({ children }) => {
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

  // User state
  const [allUsers, setAllUsers] = useState([]);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

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
        setAllUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      loadUsers();
    }
  }, [userId]);

  const refreshUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const users = await fetchAllUsers();
      const mappedUsers = Array.isArray(users)
        ? users.map(u => ({ ...u, occupation: u.occupation || u.role }))
        : [];
      setAllUsers(mappedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      setAllUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Fetch User Profile
  const fetchUserProfile = useCallback(async () => {
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
      setUserData(null);
    } finally {
      setIsLoading(false);
      setLoadingProfile(false);
    }
  }, [userId, user?.userId]);

  // Fetch user profile when userId changes
  useEffect(() => {
    if (!userId) {
      setUserData(null);
      return;
    }
    fetchUserProfile();
  }, [fetchUserProfile]);

  const value = {
    // User info
    userName,
    userId,
    user,
    userData,
    setUserData,
    allUsers,
    setAllUsers,
    
    // Loading states
    isLoading,
    setIsLoading,
    loadingProfile,
    
    // Role flags
    isAdmin,
    isDesigner,
    isBuilder,
    isVendor,
    isClient,
    
    // Operations
    fetchUserProfile,
    refreshUsers,
    updateUserProfile,
  };

  return _jsx(UsersContext.Provider, { value: value, children: children });
};

export default UsersProvider;