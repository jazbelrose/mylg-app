import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading, authStatus } = useAuth();

  if (loading) {
    return <div style={{ padding: 24 }}>Checking session…</div>;
  }

  if (authStatus !== 'signedIn' && authStatus !== 'incompleteProfile') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

