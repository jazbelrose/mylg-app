// AuthEventHandler.js
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hub } from 'aws-amplify/utils';
import { useAuth } from './AuthContext';

const AuthEventHandler = () => {
    const navigate = useNavigate();
    const { setIsAuthenticated, setUser } = useAuth();

    useEffect(() => {
        const listener = (data) => {
            switch (data.payload.event) {
                case 'tokenRefresh_failure':
                    // Force logout or prompt re-authentication
                    setIsAuthenticated(false);
                    setUser(null);
                    navigate('/login');
                    break;

                case 'signOut':
                    // Update application state and redirect to login
                    setIsAuthenticated(false);
                    setUser(null);
                    navigate('/login');
                    break;
                // ... other cases
            }
        };

        // Set up the listener
        const hubListener = Hub.listen('auth', listener);

        // Cleanup: use the function returned by Hub.listen when available
        if (typeof hubListener === 'function') {
            return hubListener;
        }

        // Fallback for Amplify versions without unsubscribe support
        return () => Hub.remove('auth', listener);
   }, [navigate, setIsAuthenticated, setUser]);

   return null; // This component does not render anything
};

export default AuthEventHandler;