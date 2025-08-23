import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import ProjectPageLayout from './components/SingleProject/ProjectPageLayout';
import ProjectHeader from './components/SingleProject/ProjectHeader';
import Timeline from './components/SingleProject/Timeline';
import TimelineChart from './components/SingleProject/TimelineChart';
import ProjectCalendar from './components/SingleProject/ProjectCalendar';
import QuickLinksComponent from './components/SingleProject/QuickLinksComponent';
import FileManagerComponent from './components/SingleProject/FileManager';
import { useData } from '../../app/contexts/DataProvider';
import { useSocket } from '../../app/contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import { findProjectBySlug, slugify } from '../../utils/slug';
const CalendarPage = () => {
    const { projectSlug } = useParams();
    const navigate = useNavigate();
    const { activeProject: initialActiveProject, projects, fetchProjectDetails, setProjects, setSelectedProjects, userId, } = useData();
    const { ws } = useSocket();
    const [activeProject, setActiveProject] = useState(initialActiveProject);
    const [filesOpen, setFilesOpen] = useState(false);
    const quickLinksRef = useRef(null);
    const [timelineMode, setTimelineMode] = useState('overview');
    const [timelineDate, setTimelineDate] = useState(null);
    useEffect(() => {
        setActiveProject(initialActiveProject);
    }, [initialActiveProject]);
    useEffect(() => {
        if (!initialActiveProject)
            return;
        if (slugify(initialActiveProject.title) !== projectSlug) {
            const proj = findProjectBySlug(projects, projectSlug);
            if (proj) {
                fetchProjectDetails(proj.projectId);
            }
            else {
                navigate(`/dashboard/projects/${slugify(initialActiveProject.title)}`);
            }
        }
    }, [projectSlug, projects, initialActiveProject, navigate, fetchProjectDetails]);
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
        setProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
        setSelectedProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
        navigate('/dashboard/projects');
    };
    const handleBack = () => {
        navigate(`/dashboard/projects/${projectSlug}`);
    };
    return (_jsxs(ProjectPageLayout, { projectId: activeProject?.projectId, header: _jsx(ProjectHeader, { activeProject: activeProject, parseStatusToNumber: parseStatusToNumber, userId: userId, onProjectDeleted: handleProjectDeleted, showWelcomeScreen: handleBack, onActiveProjectChange: handleActiveProjectChange, onOpenFiles: () => setFilesOpen(true), onOpenQuickLinks: () => quickLinksRef.current?.openModal() }), children: [_jsx(QuickLinksComponent, { ref: quickLinksRef, hideTrigger: true }), _jsx(FileManagerComponent, { isOpen: filesOpen, onRequestClose: () => setFilesOpen(false), showTrigger: false, folder: "uploads" }), _jsxs("div", { className: "dashboard-layout calendar-layout", style: { paddingBottom: '5px' }, children: [_jsx(ProjectCalendar, { project: activeProject, initialFlashDate: null, onDateSelect: (d) => {
                            setTimelineDate(d);
                        } }), _jsx(TimelineChart, { project: activeProject, mode: timelineMode, selectedDate: timelineDate, onModeChange: setTimelineMode, onDateChange: setTimelineDate })] })] }));
};
export default CalendarPage;
