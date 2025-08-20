import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import ProjectHeader from "./components/SingleProject/ProjectHeader";
import BudgetComponent from "./components/SingleProject/BudgetComponent";
import GalleryComponent from "./components/SingleProject/GalleryComponent";
import ProjectPageLayout from "./components/SingleProject/ProjectPageLayout";
import Timeline from "./components/SingleProject/Timeline";
import ProjectCalendar from "./components/SingleProject/ProjectCalendar";
import QuickLinksComponent from "./components/SingleProject/QuickLinksComponent";
import LocationComponent from "./components/SingleProject/LocationComponent";
import FileManagerComponent from "./components/SingleProject/FileManager";
import TasksComponent from "./components/SingleProject/TasksComponent";
import { useData } from "../../app/contexts/DataProvider";
import { useProjects } from "../../app/contexts/ProjectsContext";
import { useSocket } from "../../app/contexts/SocketContext";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { findProjectBySlug, slugify } from "../../utils/slug";
const SingleProject = () => {
    const { userId, isAdmin, isBuilder, isDesigner, isClient } = useData();
    const { activeProject: initialActiveProject, projects, fetchProjectDetails, setProjects, setSelectedProjects } = useProjects();
    const navigate = useNavigate();
    const location = useLocation();
    const flashDate = location.state?.flashDate;
    const [activeProject, setActiveProject] = useState(initialActiveProject);
    // Keep local activeProject in sync with context updates (e.g., from WebSocket)
    useEffect(() => {
        setActiveProject(initialActiveProject);
    }, [initialActiveProject]);
    const { projectSlug } = useParams();
    const [filesOpen, setFilesOpen] = useState(false);
    const quickLinksRef = useRef(null);
    const { ws } = useSocket();
    useEffect(() => {
        if (!projectSlug)
            return;
        const currentSlug = initialActiveProject
            ? slugify(initialActiveProject.title)
            : null;
        if (currentSlug === projectSlug)
            return;
        const proj = findProjectBySlug(projects, projectSlug);
        if (proj) {
            fetchProjectDetails(proj.projectId);
        }
        else if (currentSlug) {
            navigate(`/dashboard/projects/${currentSlug}`, { replace: true });
        }
    }, [projectSlug]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!activeProject?.projectId)
            return;
        if (Array.isArray(activeProject.team))
            return;
        fetchProjectDetails(activeProject.projectId);
    }, [activeProject?.projectId, activeProject?.team, fetchProjectDetails]);
    // Ensure this client receives live updates for the active project
    useEffect(() => {
        if (!ws || !activeProject?.projectId)
            return;
        const payload = JSON.stringify({
            action: 'setActiveConversation',
            conversationId: `project#${activeProject.projectId}`,
        });
        const sendWhenReady = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
            else {
                const onOpen = () => {
                    ws.send(payload);
                    ws.removeEventListener('open', onOpen);
                };
                ws.addEventListener('open', onOpen);
            }
        };
        sendWhenReady();
    }, [ws, activeProject?.projectId]);
    const parseStatusToNumber = (statusString) => {
        if (statusString === undefined || statusString === null) {
            return 0;
        }
        const str = typeof statusString === 'string' ? statusString : String(statusString);
        const num = parseFloat(str.replace('%', ''));
        return Number.isNaN(num) ? 0 : num;
    };
    const handleActiveProjectChange = (updatedProject) => {
        setActiveProject(updatedProject);
    };
    const handleProjectDeleted = (deletedProjectId) => {
        setProjects(prev => prev.filter(p => p.projectId !== deletedProjectId));
        setSelectedProjects(prev => prev.filter(p => p.projectId !== deletedProjectId));
        navigate('/dashboard/projects');
    };
    const showWelcome = () => {
        navigate('/dashboard');
    };
    const openCalendarPage = () => {
        if (!activeProject)
            return;
        const slug = slugify(activeProject.title);
        navigate(`/dashboard/projects/${slug}/calendar`);
    };
    // The parent router already displays a spinner while this component
    // lazily loads, so triggering another fade-in here leads to a brief
    // double render/flicker when navigating from the dashboard welcome
    // screen. Removing the additional opacity effect keeps the transition
    // smooth.
    return (_jsx(ProjectPageLayout, { projectId: activeProject?.projectId, header: _jsx(ProjectHeader, { activeProject: activeProject, parseStatusToNumber: parseStatusToNumber, userId: userId, onProjectDeleted: handleProjectDeleted, showWelcomeScreen: showWelcome, onActiveProjectChange: handleActiveProjectChange, onOpenFiles: () => setFilesOpen(true), onOpenQuickLinks: () => quickLinksRef.current?.openModal() }), children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { className: "column-2", initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -100, opacity: 0 }, transition: { duration: 0.3 }, children: _jsxs("div", { className: "overview-layout", children: [_jsx(QuickLinksComponent, { ref: quickLinksRef, hideTrigger: true }), _jsx(FileManagerComponent, { isOpen: filesOpen, onRequestClose: () => setFilesOpen(false), showTrigger: false, folder: "uploads" }), _jsxs("div", { className: "dashboard-layout budget-calendar-layout", children: [_jsxs("div", { className: "budget-column", children: [_jsx(BudgetComponent, { activeProject: activeProject }), _jsx(GalleryComponent, {})] }), _jsx("div", { className: "calendar-column", children: _jsx(ProjectCalendar, { project: activeProject, initialFlashDate: flashDate, showEventList: false, onWrapperClick: openCalendarPage }) })] }), _jsx(Timeline, { activeProject: activeProject, parseStatusToNumber: parseStatusToNumber, onActiveProjectChange: handleActiveProjectChange }), _jsxs("div", { className: "dashboard-layout timeline-location-row", children: [_jsx("div", { className: "location-wrapper", children: _jsx(LocationComponent, { activeProject: activeProject, onActiveProjectChange: handleActiveProjectChange }) }), _jsx("div", { className: "tasks-wrapper", children: _jsx(TasksComponent, { projectId: activeProject?.projectId, userId: userId, team: activeProject?.team }) })] })] }) }, location.pathname) }) }));
};
export default SingleProject;
