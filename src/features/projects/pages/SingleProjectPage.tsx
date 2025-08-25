import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import ProjectHeader from "@/features/projects/components/ProjectHeader/ProjectHeader";
import BudgetOverviewCard from "@/features/budget/components/BudgetOverviewCard";
import GalleryComponent from "@/pages/dashboard/components/SingleProject/GalleryComponent";
import ProjectPageLayout from "@/pages/dashboard/components/SingleProject/ProjectPageLayout";
import Timeline from "@/pages/dashboard/components/SingleProject/Timeline";
import ProjectCalendar from "@/pages/dashboard/components/SingleProject/ProjectCalendar";
import QuickLinksComponent from "@/features/dashboard/components/QuickLinks/QuickLinksComponent";
import LocationComponent from "@/pages/dashboard/components/SingleProject/LocationComponent";
import FileManagerComponent from "@/pages/dashboard/components/SingleProject/FileManager";
import TasksComponent from "@/pages/dashboard/components/SingleProject/TasksComponent";
import { BudgetProvider } from "@/features/budget/context/BudgetProvider";
import { useData } from "@/app/contexts/DataProvider";
import { useSocket } from "@/app/contexts/SocketContext";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { findProjectBySlug, slugify } from "@/utils/slug";

interface Project {
  projectId: string;
  title: string;
  team?: any[];
  [key: string]: any;
}

interface QuickLinksRef {
  openModal: () => void;
}

interface LocationState {
  flashDate?: string;
}

const SingleProject: React.FC = () => {
  const {
    activeProject,
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
  const flashDate = (location.state as LocationState)?.flashDate;

  const { projectSlug } = useParams<{ projectSlug: string }>();
  const [filesOpen, setFilesOpen] = useState<boolean>(false);
  const quickLinksRef = useRef<QuickLinksRef>(null);
  const { ws } = useSocket();

  // Stable helpers
  const noop = useCallback(() => {}, []);

  const currentSlug = useMemo(
    () => (activeProject?.title ? slugify(activeProject.title) : null),
    [activeProject?.title]
  );

  const parseStatusToNumber = useCallback((status: unknown): number => {
    if (status === undefined || status === null) return 0;
    const str = typeof status === "string" ? status : String(status);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  }, []);

  const showWelcome = useCallback(() => {
    navigate("/dashboard");
  }, [navigate]);

  const openCalendarPage = useCallback(() => {
    if (!activeProject) return;
    const slug = slugify(activeProject.title);
    navigate(`/dashboard/projects/${slug}/calendar`);
  }, [activeProject, navigate]);

  const handleProjectDeleted = useCallback(
    (deletedProjectId: string) => {
      setProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
      setSelectedProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
      navigate("/dashboard/projects");
    },
    [navigate, setProjects, setSelectedProjects]
  );

  const handleActiveProjectChange = useCallback(
    (updatedProject: Project) => {
      if (updatedProject?.projectId) {
        // If child edits metadata and wants to "promote" it to active, ensure details are fresh.
        fetchProjectDetails(updatedProject.projectId);
      }
    },
    [fetchProjectDetails]
  );

  // Keep URL and active project in sync with the slug the user visited.
  useEffect(() => {
    if (!projectSlug) return;

    // If we're already viewing the right project, nothing to do.
    if (currentSlug === projectSlug) return;

    // Try to locate the project by slug and load it.
    const proj = findProjectBySlug(projects, projectSlug);
    if (proj) {
      fetchProjectDetails(proj.projectId);
      return;
    }

    // Fallback: if we have some active project, normalize URL to it.
    if (currentSlug) {
      navigate(`/dashboard/projects/${currentSlug}`, { replace: true });
    }
  }, [projectSlug, currentSlug, projects, fetchProjectDetails, navigate]);

  // Ensure team/details are loaded for the current project.
  useEffect(() => {
    if (!activeProject?.projectId) return;
    const hasTeamArray = Array.isArray(activeProject.team);
    if (!hasTeamArray) {
      fetchProjectDetails(activeProject.projectId);
    }
  }, [activeProject?.projectId, activeProject?.team, fetchProjectDetails]);

  // Subscribe this client to live updates for the active project's "conversation".
  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;

    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${activeProject.projectId}`,
    });

    const onOpen = (): void => {
      try {
        ws.send(payload);
      } catch {
        /* no-op */
      }
    };

    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(payload);
      } catch {
        /* no-op */
      }
    } else {
      ws.addEventListener("open", onOpen);
    }

    return () => {
      ws.removeEventListener("open", onOpen);
    };
  }, [ws, activeProject?.projectId]);

  // Render
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
          title={activeProject?.title}
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
          <BudgetProvider projectId={activeProject?.projectId}>
            <div className="overview-layout">
              <QuickLinksComponent ref={quickLinksRef} {...({ hideTrigger: true } as any)} />

            {(FileManagerComponent as any) && (
              <FileManagerComponent
                {...({
                  isOpen: filesOpen,
                  onRequestClose: () => setFilesOpen(false),
                  showTrigger: false,
                  folder: "uploads",
                } as any)}
              />
            )}

              <div className="dashboard-layout budget-calendar-layout">
                <div className="budget-column">
                  <BudgetOverviewCard projectId={activeProject?.projectId} />

                  <GalleryComponent />
                </div>
                <div className="calendar-column">
                  <ProjectCalendar
                    project={activeProject}
                    initialFlashDate={flashDate}
                    showEventList={false}
                    onWrapperClick={openCalendarPage}
                    onDateSelect={noop}
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
          </BudgetProvider>
        </motion.div>
      </AnimatePresence>
    </ProjectPageLayout>
  );
};

export default SingleProject;
