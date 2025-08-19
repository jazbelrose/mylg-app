import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children }) {
  const { loading, authStatus } = useAuth();

  if (loading) return <div style={{ padding: 24 }}>Checking session…</div>;

  if (authStatus !== 'signedIn' && authStatus !== 'incompleteProfile') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
