import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        // Update state so the next render shows the fallback UI
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        // You can log the error to an error reporting service
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return _jsx("h1", { children: "Something went wrong." });
        }
        return this.props.children;
    }
}
export default ErrorBoundary;
