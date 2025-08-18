// ...existing code from AuthContext.js...
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { fetchAuthSession, getCurrentUser, updateUserAttributes, signOut } from 'aws-amplify/auth';
import { fetchUserProfile as fetchUserProfileApi } from '../../utils/api';
import { secureWebSocketAuth } from '../../utils/secureWebSocketAuth';
import { csrfProtection, logSecurityEvent } from '../../utils/securityUtils';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext({ isAuthenticated: false, user: null, authStatus: 'signedOut' });
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStatus, setAuthStatus] = useState('signedOut');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

    // Debug logging for troubleshooting
    useEffect(() => {
      console.log('[AuthContext] isAuthenticated:', isAuthenticated, 'authStatus:', authStatus, 'user:', user, 'loading:', loading);
    }, [isAuthenticated, authStatus, user, loading]);

  const fetchUserProfile = useCallback(async (userId) => {
    try {
      return await fetchUserProfileApi(userId);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }, []);



  const refreshUser = async (forceRefresh = false) => {
    try {
      const cognitoUser = await getCurrentUser();
      if (!cognitoUser) throw new Error('No current user');

      const session = await fetchAuthSession(forceRefresh ? { forceRefresh: true } : undefined);
      const role = session.tokens?.idToken?.payload?.role;
      const userProfile = await fetchUserProfileApi(session.tokens.idToken.payload.sub);

      setUser({ ...userProfile, cognitoUsername: cognitoUser.username, role });
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  };
  

const validateAndSetUserSession = useCallback(async (label = 'default') => {
  console.log(`[validateAndSetUserSession] Start (${label})`);
  try {
    const session = await fetchAuthSession();
    const { accessToken, idToken } = session.tokens ?? {};
    if (!accessToken || !idToken) {
      setAuthStatus('signedOut');
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    const now = new Date();
    const accessExp = new Date(accessToken.payload.exp * 1000);
    const idExp = new Date(idToken.payload.exp * 1000);
    if (accessExp <= now || idExp <= now) {
      setAuthStatus('signedOut');
      setIsAuthenticated(false);
      setUser(null);
      return;
    }

    // Decode the ID token to access custom claims like role
    let decodedIdToken = null;
    try {
      decodedIdToken = jwtDecode(idToken.toString());
      if (process.env.NODE_ENV === 'development') {
        console.log('[validateAndSetUserSession] Decoded ID token:', decodedIdToken);
      }
    } catch (decodeError) {
      console.error('[validateAndSetUserSession] Failed to decode ID token:', decodeError);
    }

    const cognitoUser = await getCurrentUser();

    // ✅ Get these early and reuse everywhere
    const role = decodedIdToken?.role ?? idToken.payload?.role ?? null;
    const userId = decodedIdToken?.sub || idToken.payload?.sub || cognitoUser?.username || null;

    // Try to fetch profile (unwrap .Item if present)
    let userProfile = null;
    try {
      const { USER_PROFILES_API_URL, apiFetch } = require('../../utils/api');
      const endpoint = `${USER_PROFILES_API_URL}?userId=${encodeURIComponent(userId)}`;
      const rawRes = await apiFetch(endpoint);
      const parsedRes = await rawRes.json();
      userProfile = parsedRes?.Item ?? null;
    } catch (rawErr) {
      console.error(`[validateAndSetUserSession:${label}] profile fetch error:`, rawErr);
    }

    if (!userProfile) {
      console.warn(`[validateAndSetUserSession:${label}] No profile found — keeping signed in for debug`);
      setAuthStatus('signedIn');
      setIsAuthenticated(true);
      // ✅ Always include userId
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
        throw new Error(
          'No session tokens found. The user might not be signed in.'
        );
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
      logSecurityEvent('user_logged_out');
      
    } catch (error) {
      console.error('Error during global sign out:', error);
      logSecurityEvent('logout_error', { error: error.message });
    }
  };



  // Periodically validate the session to catch expiration or missing data
  useEffect(() => {
    validateAndSetUserSession();
    const intervalId = setInterval(validateAndSetUserSession, 1000 * 60 * 45);
    return () => clearInterval(intervalId);
  }, [validateAndSetUserSession]);

  useEffect(() => {
    (async () => {
      try {
        await validateAndSetUserSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [validateAndSetUserSession]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        setIsAuthenticated,
        authStatus,
        setAuthStatus,
        user,
        setUser,
        refreshUser,
        validateAndSetUserSession,
        getCurrentUser,
        getAuthTokens,
        globalSignOut,
        loading,
        updateUserCognitoAttributes: async (userAttributes) => {
          try {
            await getCurrentUser();
            const updateResults = await updateUserAttributes({ userAttributes });
            console.log('User attributes updated successfully', updateResults);
          } catch (error) {
            console.error('Error updating user attributes:', error);
            throw error;
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
