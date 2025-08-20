import React, { createContext, useState, useContext, useEffect, useCallback, ReactNode } from 'react';
import { fetchAuthSession, getCurrentUser, updateUserAttributes, signOut } from 'aws-amplify/auth';
import { fetchUserProfile as fetchUserProfileApi } from '../../utils/api';
import { secureWebSocketAuth } from '../../utils/secureWebSocketAuth';
import { csrfProtection, logSecurityEvent } from '../../utils/securityUtils';

// Types
export interface User {
  userId: string;
  cognitoUsername: string;
  role?: string;
  firstName?: string;
  email?: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  authStatus: 'signedOut' | 'signedIn' | 'incompleteProfile';
  setUser: (user: User | null) => void;
  refreshUser: (forceRefresh?: boolean) => Promise<void>;
  validateAndSetUserSession: (label?: string) => Promise<void>;
  getCurrentUser: () => Promise<any>;
  getAuthTokens: () => Promise<any>;
  globalSignOut: () => Promise<void>;
  loading: boolean;
  updateUserCognitoAttributes: (userAttributes: Record<string, string>) => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  authStatus: 'signedOut',
  setUser: () => {},
  refreshUser: async () => {},
  validateAndSetUserSession: async () => {},
  getCurrentUser: async () => null,
  getAuthTokens: async () => null,
  globalSignOut: async () => {},
  loading: true,
  updateUserCognitoAttributes: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<'signedOut' | 'signedIn' | 'incompleteProfile'>('signedOut');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Debug logging for troubleshooting
  useEffect(() => {
    console.log('[AuthContext] isAuthenticated:', isAuthenticated, 'authStatus:', authStatus, 'user:', user, 'loading:', loading);
  }, [isAuthenticated, authStatus, user, loading]);

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      return await fetchUserProfileApi(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }, []);

  const refreshUser = async (forceRefresh: boolean = false) => {
    try {
      const cognitoUser = await getCurrentUser();
      console.log('[refreshUser] cognitoUser:', cognitoUser);
      
      if (!cognitoUser) {
        setAuthStatus('signedOut');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const userId = cognitoUser.userId;
      const role = cognitoUser.signInDetails?.loginId?.includes('@') ? 'client' : 'admin';

      // Fetch user profile
      let userProfile;
      try {
        userProfile = await fetchUserProfile(userId);
        console.log('[refreshUser] userProfile:', userProfile);
      } catch (error) {
        console.error('[refreshUser] Error fetching user profile:', error);
        setAuthStatus('signedOut');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      setIsAuthenticated(true);
      setUser({ ...userProfile, userId, cognitoUsername: cognitoUser.username, role });
      
      if (!userProfile.firstName) {
        setAuthStatus('incompleteProfile');
      } else {
        setAuthStatus('signedIn');
      }
    } catch (error) {
      console.error('[refreshUser] Error:', error);
      setAuthStatus('signedOut');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const validateAndSetUserSession = useCallback(async (label: string = 'default') => {
    try {
      logSecurityEvent('user_session_validation_attempt', { label });
      
      const session = await fetchAuthSession();
      if (!session?.tokens) {
        setAuthStatus('signedOut');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const cognitoUser = await getCurrentUser();
      if (!cognitoUser) {
        setAuthStatus('signedOut');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      const userId = cognitoUser.userId;
      const role = cognitoUser.signInDetails?.loginId?.includes('@') ? 'client' : 'admin';

      let userProfile;
      try {
        userProfile = await fetchUserProfile(userId);
      } catch (error) {
        console.error(`[validateAndSetUserSession:${label}] Error fetching user profile:`, error);
        setAuthStatus('incompleteProfile');
        setIsAuthenticated(true);
        setUser({ userId, cognitoUsername: cognitoUser.username, role });
        return;
      }

      if (!userProfile.firstName) {
        setAuthStatus('incompleteProfile');
        setIsAuthenticated(true);
        setUser({ ...userProfile, userId, cognitoUsername: cognitoUser.username, role });
        return;
      }

      setIsAuthenticated(true);
      setAuthStatus('signedIn');
      setUser({ ...userProfile, userId, cognitoUsername: cognitoUser.username, role });
    } catch (error) {
      console.error(`[validateAndSetUserSession:${label}] Error:`, error);
      setAuthStatus('signedOut');
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  const getAuthTokens = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      if (!session?.tokens) {
        throw new Error('No session tokens found. The user might not be signed in.');
      }
      return session.tokens;
    } catch (error) {
      console.error('Error fetching auth session:', error);
      return null;
    }
  }, []);

  const globalSignOut = async () => {
    try {
      await signOut({ global: true });
      setIsAuthenticated(false);
      setUser(null);
      // Security cleanup
      secureWebSocketAuth.clearAllTokens();
      csrfProtection.clearToken();
      logSecurityEvent('user_global_signout', { userId: user?.userId });
    } catch (error) {
      console.error('Error during global sign out:', error);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    authStatus,
    setUser,
    refreshUser,
    validateAndSetUserSession,
    getCurrentUser,
    getAuthTokens,
    globalSignOut,
    loading,
    updateUserCognitoAttributes: async (userAttributes: Record<string, string>) => {
      try {
        await getCurrentUser();
        const updateResults = await updateUserAttributes({ userAttributes });
        console.log('User attributes updated successfully', updateResults);
      } catch (error) {
        console.error('Error updating user attributes:', error);
        throw error;
      }
    },
  };

  return React.createElement(AuthContext.Provider, { value: contextValue }, children);
};

export default AuthProvider;