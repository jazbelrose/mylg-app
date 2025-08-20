import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../../app/contexts/DataProvider";
import { slugify } from "../../utils/slug";
import { prefetchBudgetData } from "./components/SingleProject/useBudgetData";
import WelcomeHeader from "./components/Welcome/WelcomeHeader";
import WelcomeWidget from "./components/Welcome/WelcomeWidget";
import NavigationSidebar from "./components/Welcome/NavigationSidebar";
import TopBar from "./components/Welcome/TopBar";
import RecentActivity from "./components/Welcome/RecentActivity";
import NewProjectModal from "./components/NewProjectModal";
import AllProjects from "./AllProjects";
import NotificationsPage from "./components/NotificationsPage";
import Messages from "./components/Messages";
import Settings from "./Settings";
import Collaborators from "./Collaborators";
import SpinnerScreen from "../../components/SpinnerScreen";
import PendingApprovalScreen from "../../components/PendingApprovalScreen";
import AllProjectsCalendar from "./components/Welcome/Calendar/AllProjectsCalendar";
import "./style.css";
const WelcomeScreen = () => {
    const { userData, userName, loadingProfile, dmThreads, allUsers, projects, fetchProjectDetails } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const parsePath = () => {
        const segments = location.pathname.split('/').filter(Boolean);
        const idx = segments.indexOf('dashboard');
        let view = segments[idx + 1] || 'welcome';
        let userSlug = segments[idx + 2] || null;
        if (view === 'welcome') {
            view = segments[idx + 2] || 'welcome';
            userSlug = segments[idx + 3] || null;
        }
        return { view, userSlug };
    };
    const { view: initialView, userSlug: initialDMUserSlug } = parsePath();
    const [activeView, setActiveView] = useState(initialView);
    const [dmUserSlug, setDmUserSlug] = useState(initialDMUserSlug);
    const [isMobile, setIsMobile] = useState(false);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        if (typeof window !== 'undefined') {
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);
    const handleNavigateToProject = async ({ projectId }) => {
        if (!projectId)
            return;
        const hasUnsaved = (typeof window.hasUnsavedChanges === 'function' && window.hasUnsavedChanges()) ||
            window.unsavedChanges === true;
        if (hasUnsaved) {
            const confirmLeave = window.confirm('You have unsaved changes, continue?');
            if (!confirmLeave)
                return;
        }
        const proj = projects.find(p => p.projectId === projectId);
        const slug = proj ? slugify(proj.title) : projectId;
        const path = `/dashboard/projects/${slug}`;
        if (location.pathname !== path) {
            await Promise.all([
                fetchProjectDetails(projectId),
                prefetchBudgetData(projectId),
            ]);
            navigate(path);
        }
    };
    useEffect(() => {
        const { view, userSlug } = parsePath();
        if (view !== activeView) {
            setActiveView(view);
        }
        if (userSlug !== dmUserSlug) {
            setDmUserSlug(userSlug);
        }
    }, [location.pathname]);
    useEffect(() => {
        if (!isMobile && activeView === 'messages' && !dmUserSlug && dmThreads && dmThreads.length > 0) {
            const sorted = [...dmThreads].sort((a, b) => new Date(b.lastMsgTs) - new Date(a.lastMsgTs));
            const lastThread = sorted[0];
            if (lastThread && userData) {
                const otherId = lastThread.otherUserId ||
                    lastThread.conversationId
                        .replace('dm#', '')
                        .split('___')
                        .find((id) => id !== userData.userId);
                if (otherId) {
                    const user = allUsers.find((u) => u.userId === otherId);
                    const slug = user ? slugify(`${user.firstName}-${user.lastName}`) : otherId;
                    setDmUserSlug(slug);
                    navigate(`/dashboard/messages/${slug}`, { replace: true });
                }
            }
        }
    }, [activeView, dmUserSlug, dmThreads, userData, allUsers, navigate]);
    if (loadingProfile)
        return _jsx(SpinnerScreen, {});
    if (userData?.pending)
        return _jsx(PendingApprovalScreen, {});
    // ✅ Hide TopBar and QuickStats in these views
    const isFullWidthView = ["projects", "notifications", "messages", "settings", "collaborators"].includes(activeView);
    const showTopBar = !isFullWidthView;
    const openNewProjectModal = () => setShowNewProjectModal(true);
    const closeNewProjectModal = () => setShowNewProjectModal(false);
    const handleProjectCreated = () => setShowNewProjectModal(false);
    return (_jsxs("div", { className: "dashboard-wrapper welcome-screen no-vertical-center", children: [_jsx(WelcomeHeader, { userName: userName, onCreateProject: openNewProjectModal }), _jsxs("div", { className: "row-layout", children: [_jsx(NavigationSidebar, { setActiveView: setActiveView, onCreateProject: openNewProjectModal }), _jsxs("div", { className: "welcome-screen-details", children: [showTopBar && _jsx(TopBar, { setActiveView: setActiveView }), _jsxs("div", { className: `dashboard-content ${isFullWidthView ? "full-width" : ""}`, children: [!isFullWidthView && (_jsxs("div", { className: "quickstats-sidebar", children: [_jsx(WelcomeWidget, { setActiveView: setActiveView, setDmUserSlug: setDmUserSlug }), _jsx(RecentActivity, {})] })), _jsx("div", { className: "main-content", children: {
                                            welcome: _jsx(AllProjectsCalendar, {}),
                                            projects: _jsx(AllProjects, {}),
                                            notifications: _jsx(NotificationsPage, { onNavigateToProject: handleNavigateToProject }),
                                            messages: _jsx(Messages, { initialUserSlug: dmUserSlug }),
                                            settings: _jsx(Settings, {}),
                                            collaborators: _jsx(Collaborators, {}),
                                        }[activeView] || null })] })] })]}), _jsx(NewProjectModal, { open: showNewProjectModal, onCancel: closeNewProjectModal, onCreated: handleProjectCreated })] }));
};
export default WelcomeScreen;
