// ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import SpinnerOverlay from '../../components/SpinnerOverlay';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while authentication is being validated
  if (loading) {
    return (
      <div style={{ 
        position: 'relative',
        height: '100vh',
        width: '100vw'
      }}>
        <SpinnerOverlay />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
