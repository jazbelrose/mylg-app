import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { ScrambleButton } from "../../../../components/scramblebutton";
import { User } from "lucide-react";
import { useData } from '../../../../app/contexts/DataProvider';
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import { useNavigate } from 'react-router-dom';
import { isMessageUnread } from '../../../../utils/messageUtils';
import { useAuth } from "../../../../app/contexts/AuthContext";
const WelcomeHeader = () => {
    const { user } = useAuth();
    const { userData } = useData();
    const { notifications } = useNotifications();
    const navigate = useNavigate();
    const userName = userData?.firstName || user?.firstName || user?.email || 'User';
    const userThumbnail = userData?.thumbnail || user?.thumbnail;
    const unreadMessages = (userData?.messages || []).filter(isMessageUnread).length || 0;
    // Slightly smaller defaults for desktop
    const [fontSize, setFontSize] = useState("16px");
    const [buttonPadding, setButtonPadding] = useState("10px 16px");
    const [greeting, setGreeting] = useState("");
    useEffect(() => {
        const updateResponsiveStyles = () => {
            const mobile = window.innerWidth < 768;
            if (mobile) {
                setFontSize("14px");
                setButtonPadding("8px 16px");
            }
            else {
                setFontSize("16px");
                setButtonPadding("10px 16px");
            }
        };
        updateResponsiveStyles();
        window.addEventListener("resize", updateResponsiveStyles);
        return () => window.removeEventListener("resize", updateResponsiveStyles);
    }, []);
    useEffect(() => {
        const now = new Date();
        const hour = now.getHours();
        let greetingText = "Hello";
        if (hour >= 5 && hour < 12) {
            greetingText = "Good Morning";
        }
        else if (hour >= 12 && hour < 18) {
            greetingText = "Good Afternoon";
        }
        else {
            greetingText = "Good Evening";
        }
        setGreeting(greetingText);
    }, []);
    const handleCreateProject = () => {
        navigate('/dashboard/new');
    };
    const handleDashboardHomeClick = () => {
        navigate('/dashboard');
    };
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "welcome-header-desktop", style: {
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 8px',
                marginBottom: '4px',
                width: '100%'
            }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [userThumbnail ? (_jsx("img", { src: userThumbnail, alt: `${userName}'s Thumbnail`, style: {
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                objectFit: 'cover'
                            }, onClick: handleDashboardHomeClick })) : (_jsx(User, { size: 30, color: "white", style: {
                                borderRadius: '50%',
                                backgroundColor: '#333',
                                cursor: 'pointer'
                            }, onClick: handleDashboardHomeClick })), _jsxs("div", { className: "greetings-text", style: { display: 'flex', flexDirection: 'column', gap: '0.2rem' }, children: [_jsxs("span", { className: "greeting-line welcome", style: { color: 'white', padding: '4px 4px' }, children: [greeting, ", ", _jsx("span", { style: { color: '#FA3356' }, children: userName })] }), unreadMessages > 0 && (_jsxs("span", { style: { color: '#bbb', fontSize: '12px' }, children: [unreadMessages, " unread message", unreadMessages !== 1 ? 's' : ''] }))] })] }), _jsx("div", { style: { marginLeft: 'auto' }, children: _jsx(ScrambleButton, { text: "Create a Project", onClick: handleCreateProject, fontSize: fontSize, padding: buttonPadding }) })] }) }));
};
export default WelcomeHeader;
