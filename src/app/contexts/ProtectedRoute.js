import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
export default function ProtectedRoute({ children }) {
    const { loading, authStatus } = useAuth();
    if (loading)
        return _jsx("div", { style: { padding: 24 }, children: "Checking session\u2026" });
    if (authStatus !== 'signedIn' && authStatus !== 'incompleteProfile') {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return children;
}
