import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hub } from 'aws-amplify/utils';
import { useAuth } from './AuthContext';

const AuthEventHandler: React.FC = () => {
  const navigate = useNavigate();
  const { setIsAuthenticated, setUser } = useAuth();

  useEffect(() => {
    const listener = (data: { payload: { event: string } }) => {
      switch (data.payload.event) {
        case 'tokenRefresh_failure':
          setIsAuthenticated(false);
          setUser(null);
          navigate('/login');
          break;
        case 'signOut':
          setIsAuthenticated(false);
          setUser(null);
          navigate('/login');
          break;
        default:
          break;
      }
    };

    const hubListener = Hub.listen('auth', listener);

    if (typeof hubListener === 'function') {
      return hubListener;
    }

    return () => Hub.remove('auth', listener);
  }, [navigate, setIsAuthenticated, setUser]);

  return null;
};

export default AuthEventHandler;

