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
import { BudgetProvider } from './BudgetPage/components/BudgetDataProvider';

type TimelineMode = 'overview' | 'agenda';

type Project = {
  projectId: string;
  title: string;
  // add other fields used by children as needed
};

type QuickLinksRef = {
  openModal: () => void;
};

const CalendarPage: React.FC = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();

  const {
    activeProject: initialActiveProject,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    userId,
  } = useData();

  const { ws } = useSocket();

  const [activeProject, setActiveProject] = useState<Project | null>(
    (initialActiveProject as Project) || null
  );
  const [filesOpen, setFilesOpen] = useState(false);
  const quickLinksRef = useRef<QuickLinksRef | null>(null);
  const [timelineMode, setTimelineMode] = useState<TimelineMode>('overview');
  const [timelineDate, setTimelineDate] = useState<string | null>(null);

  useEffect(() => {
    setActiveProject((initialActiveProject as Project) || null);
  }, [initialActiveProject]);

  useEffect(() => {
    if (!initialActiveProject) return;

    if (slugify((initialActiveProject as Project).title) !== projectSlug) {
      const proj = findProjectBySlug(projects, projectSlug || '');
      if (proj) {
        fetchProjectDetails(proj.projectId);
      } else {
        navigate(`/dashboard/projects/${slugify((initialActiveProject as Project).title)}`);
      }
    }
  }, [projectSlug, projects, initialActiveProject, navigate, fetchProjectDetails]);

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

  const parseStatusToNumber = (statusString?: string | number | null) => {
    if (statusString === undefined || statusString === null) return 0;
    const str = typeof statusString === 'string' ? statusString : String(statusString);
    const num = parseFloat(str.replace('%', ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const handleActiveProjectChange = (updatedProject: Project) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId: string) => {
    setProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev: Project[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    navigate('/dashboard/projects');
  };

  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  return (
    <ProjectPageLayout
      projectId={activeProject?.projectId}
      header={
        <ProjectHeader
          activeProject={activeProject as any}
          parseStatusToNumber={parseStatusToNumber}
          userId={userId}
          onProjectDeleted={handleProjectDeleted}
          showWelcomeScreen={handleBack}
          onActiveProjectChange={handleActiveProjectChange}
          onOpenFiles={() => setFilesOpen(true)}
          onOpenQuickLinks={() => quickLinksRef.current?.openModal()}
        />
      }
    >
      <QuickLinksComponent ref={quickLinksRef as any} hideTrigger />
      <FileManagerComponent
        isOpen={filesOpen}
        onRequestClose={() => setFilesOpen(false)}
        showTrigger={false}
        folder="uploads"
      />

      <div className="dashboard-layout calendar-layout" style={{ paddingBottom: '5px' }}>
        <BudgetProvider projectId={activeProject?.projectId}>
          <ProjectCalendar
            project={activeProject as any}
            initialFlashDate={null}
            onDateSelect={(d: string) => {
              setTimelineDate(d);
            }}
          />
        </BudgetProvider>
        <TimelineChart
          project={activeProject as any}
          mode={timelineMode}
          selectedDate={timelineDate || undefined}
          onModeChange={setTimelineMode}
          onDateChange={setTimelineDate}
        />
      </div>
    </ProjectPageLayout>
  );
};

export default CalendarPage;
