
import { signOut } from 'aws-amplify/auth';
import Cookies from 'js-cookie';

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const useInactivityLogout = () => {


    const { isAuthenticated, setIsAuthenticated, setUser } = useAuth();
    const navigate = useNavigate();
    const INACTIVITY_TIME = 60 * 60 * 1000; // 1 hour in milliseconds


    useEffect(() => {
        let inactivityTimer;

        const handleSignOut = async () => {
            try {
                await signOut();
                setIsAuthenticated(false);
                setUser(null);
                navigate('/login');
                Cookies.remove('myCookie'); // If using cookies
            } catch (error) {
                console.error('Error during sign out:', error);
            }
        };

        const handleInactivity = () => {
            if (isAuthenticated) {
                handleSignOut();
            }
        };

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(handleInactivity, INACTIVITY_TIME);
        };

        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();

        return () => {
            clearTimeout(inactivityTimer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
        };
    }, [isAuthenticated, setIsAuthenticated, setUser, navigate]);

    return null;
};



export default useInactivityLogout;
