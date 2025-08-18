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
import { useSocket } from "../../app/contexts/SocketContext";
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { findProjectBySlug, slugify } from "../../utils/slug";

const SingleProject = () => {
    const {
        activeProject: initialActiveProject,
        userId,
        projects,
        fetchProjectDetails,
        setProjects,
        setSelectedProjects,
        isAdmin,
        isBuilder,
        isDesigner,
        isClient,
    } = useData();
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
        if (!projectSlug) return;

        const currentSlug = initialActiveProject
            ? slugify(initialActiveProject.title)
            : null;

        if (currentSlug === projectSlug) return;

        const proj = findProjectBySlug(projects, projectSlug);

        if (proj) {
            fetchProjectDetails(proj.projectId);
        } else if (currentSlug) {
            navigate(`/dashboard/projects/${currentSlug}`, { replace: true });
        }
    }, [projectSlug]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!activeProject?.projectId) return;
        if (Array.isArray(activeProject.team)) return;
        fetchProjectDetails(activeProject.projectId);
    }, [activeProject?.projectId, activeProject?.team, fetchProjectDetails]);

    // Ensure this client receives live updates for the active project
    useEffect(() => {
        if (!ws || !activeProject?.projectId) return;

        const payload = JSON.stringify({
            action: 'setActiveConversation',
            conversationId: `project#${activeProject.projectId}`,
        });

        const sendWhenReady = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            } else {
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
        if (!activeProject) return;
        const slug = slugify(activeProject.title);
        navigate(`/dashboard/projects/${slug}/calendar`);
    };

    // The parent router already displays a spinner while this component
    // lazily loads, so triggering another fade-in here leads to a brief
    // double render/flicker when navigating from the dashboard welcome
    // screen. Removing the additional opacity effect keeps the transition
    // smooth.



    return (
        <ProjectPageLayout
            projectId={activeProject?.projectId}
            header={
                <ProjectHeader
                    activeProject={activeProject}
                    parseStatusToNumber={parseStatusToNumber}
                    userId={userId}
                    onProjectDeleted={handleProjectDeleted}
                    showWelcomeScreen={showWelcome}
                    onActiveProjectChange={handleActiveProjectChange}
                    onOpenFiles={() => setFilesOpen(true)}
                    onOpenQuickLinks={() => quickLinksRef.current?.openModal()}
                />
            }
        >
            <AnimatePresence mode="wait">
                <motion.div
                    key={location.pathname}
                    className="column-2"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -100, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <div className="overview-layout">
                        <QuickLinksComponent
                            ref={quickLinksRef}
                            hideTrigger={true}
                        />
                        <FileManagerComponent
                            isOpen={filesOpen}
                            onRequestClose={() => setFilesOpen(false)}
                            showTrigger={false}
                            folder="uploads"
                        />
                        <div className="dashboard-layout budget-calendar-layout">
                            <div className="budget-column">
                                <BudgetComponent activeProject={activeProject} />
                                <GalleryComponent />
                            </div>
                            <div className="calendar-column">
                                <ProjectCalendar
                                    project={activeProject}
                                    initialFlashDate={flashDate}
                                    showEventList={false}
                                    onWrapperClick={openCalendarPage}
                                />
                            </div>
                        </div>
                                                <Timeline
                            activeProject={activeProject}
                            parseStatusToNumber={parseStatusToNumber}
                            onActiveProjectChange={handleActiveProjectChange}
                        />
                        <div className="dashboard-layout timeline-location-row">
                            <div className="location-wrapper">
                                <LocationComponent
                                    activeProject={activeProject}
                                    onActiveProjectChange={handleActiveProjectChange}
                                />
                            </div>
                            <div className="tasks-wrapper">
                                <TasksComponent
                                    projectId={activeProject?.projectId}
                                    userId={userId}
                                    team={activeProject?.team}
                                />
                            </div>
                        </div>

                    </div>
                </motion.div>
            </AnimatePresence>
        </ProjectPageLayout>
    );
};

export default SingleProject;
