import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught error:', error, info);
    }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { style: { padding: 24 }, children: [_jsx("h2", { children: "Something went wrong." }), _jsx("pre", { style: { whiteSpace: 'pre-wrap' }, children: String(this.state.error?.message || this.state.error) })] }));
        }
        return this.props.children;
    }
}
