import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
const ProjectHeader = ({ activeProject }) => {
    const navigate = useNavigate();
    const handleDashboardHomeClick = () => {
        navigate('/dashboard');
    };
    return (_jsx("div", { children: _jsx("div", { className: 'project-header new-project-header', children: _jsxs("div", { className: 'header-content', children: [_jsxs("div", { className: 'left-side', children: [_jsx(FontAwesomeIcon, { icon: faArrowLeft, className: "back-icon interactive", onClick: handleDashboardHomeClick, title: "Back to Dashboard", "aria-label": "Back to Dashboard", role: "button", tabIndex: 0 }), _jsx("h2", { children: "Create New Project" })] }), _jsx("div", { className: 'right-side', children: _jsx("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24.41 24.41", className: "custom-icon", style: { width: '20', height: '20', marginRight: "15px", }, onClick: handleDashboardHomeClick }) })] }) }) }));
};
export default ProjectHeader;
