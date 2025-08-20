import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Home, Folder, Bell, MessageSquare, Settings, LogOut, Shield, Users, Plus, } from "lucide-react";
import { useAuth } from "../../../../app/contexts/AuthContext";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import NavBadge from "../../../../components/NavBadge";
import { useNavigate } from "react-router-dom";
import { signOut } from "aws-amplify/auth"; // Import signOut from aws-amplify/auth
import Cookies from "js-cookie"; // Import Cookies
import "./style.css";
const NavigationSidebar = ({ setActiveView, onCreateProject }) => {
    const { isAuthenticated, setIsAuthenticated, setUser } = useAuth();
    const { dmThreads } = useData();
    const { notifications } = useNotifications();
    const navigate = useNavigate();
    const [isMobile, setIsMobile] = useState(false);
    const unreadNotifications = notifications.filter((n) => !n.read).length;
    const unreadMessages = dmThreads.filter((t) => t.read === false).length;
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    const handleNavigation = (view) => {
        setActiveView(view);
        const base = "/dashboard";
        const path = view === "welcome" ? base : `${base}/${view}`;
        navigate(path);
    };
    const handleCreateProject = () => {
        onCreateProject?.();
    };
    const handleSignOut = async () => {
        try {
            await signOut();
            setIsAuthenticated(false);
            setUser(null);
            navigate("/login"); // Redirect to login page
            Cookies.remove("myCookie");
        }
        catch (error) {
            console.error("Error during sign out:", error);
            // Optionally, handle the error (e.g., show an error message)
        }
    };
    return (_jsxs("div", { className: "navigation-sidebar", children: [_jsx("div", { className: "nav-item", onClick: () => handleNavigation("welcome"), children: _jsx(Home, { size: 24, color: "white" }) }), _jsx("div", { className: "nav-item", onClick: () => handleNavigation("projects"), children: _jsx(Folder, { size: 24, color: "white" }) }), _jsx("div", { className: "nav-item", onClick: () => handleNavigation("notifications"), children: _jsxs("div", { className: "nav-icon-wrapper", children: [_jsx(Bell, { size: 24, color: "white" }), _jsx(NavBadge, { count: unreadNotifications, label: "notification", className: "nav-sidebar-badge" })] }) }), _jsx("div", { className: "nav-item", onClick: () => handleNavigation("messages"), children: _jsxs("div", { className: "nav-icon-wrapper", children: [_jsx(MessageSquare, { size: 24, color: "white" }), _jsx(NavBadge, { count: unreadMessages, label: "message", className: "nav-sidebar-badge" })] }) }), isMobile && (_jsx("div", { className: "nav-item mobile-quick-add", onClick: handleCreateProject, title: "Add Project", children: _jsx(Plus, { size: 24, color: "white" }) })), _jsx("div", { className: "nav-item", onClick: () => handleNavigation("collaborators"), children: _jsx(Users, { size: 24, color: "white" }) }), _jsxs("div", { className: "nav-bottom", style: {
                    marginTop: "auto",
                }, children: [_jsx("div", { className: "nav-item", children: _jsx("a", { href: "/terms-and-privacy", target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "none" }, children: _jsx(Shield, { size: 24, color: "white" }) }) }), _jsx("div", { className: "nav-item", onClick: () => handleNavigation("settings"), children: _jsx(Settings, { size: 24, color: "white" }) }), _jsx("div", { className: "nav-item", onClick: handleSignOut, children: _jsx(LogOut, { size: 24, color: "white" }) })] })] }));
};
export default NavigationSidebar;
