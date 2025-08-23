import { Briefcase, Calendar } from 'lucide-react';
import { useEffect, useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { useData, type Project } from '../../../../app/contexts/DataProvider';
import { useNotifications } from '../../../../app/contexts/NotificationContext';
import { slugify } from '../../../../utils/slug';

import './style.css';

interface TopBarProps {
  setActiveView: (view: string) => void;
}

type ProjectWithStatus = Project & {
  status?: string | number;
  finishline?: string;
  title?: string;
};

const TopBar: FC<TopBarProps> = ({ setActiveView }) => {
  const { projects, fetchProjectDetails } = useData();
  // notifications currently unused but kept for potential future display
  useNotifications();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (view: string) => {
    setActiveView(view);
    const base = '/dashboard';
    const path = view === 'welcome' ? base : `${base}/${view}`;
    navigate(path);
  };

  const parseStatusToNumber = (status: unknown): number => {
    if (status === undefined || status === null) {
      return 0;
    }
    const str = typeof status === 'string' ? status : String(status);
    const num = parseFloat(str.replace('%', ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const projList = projects as ProjectWithStatus[];
  const totalProjects = projList.length || 1;
  const completedProjects = projList.filter(
    (p) => parseStatusToNumber(p.status) >= 100
  ).length;
  const inProgressProjects = totalProjects - completedProjects;
  const completionRate = (completedProjects / totalProjects) * 100;

  const today = new Date();
  const nextProject = projList
    .filter((p) => p.finishline && new Date(p.finishline) > today)
    .sort(
      (a, b) =>
        new Date(a.finishline || 0).getTime() -
        new Date(b.finishline || 0).getTime()
    )[0];
  const nextDeadlineDisplay = nextProject
    ? new Date(nextProject.finishline!).toLocaleDateString()
    : 'No Upcoming Deadlines';
  const nextProjectTitle = nextProject ? nextProject.title || 'N/A' : 'N/A';

  const goToProject = async () => {
    if (nextProject) {
      await fetchProjectDetails(nextProject.projectId);
      const slug = slugify(nextProject.title || '');
      navigate(`/dashboard/projects/${slug}`);
    }
  };

  return (
    <div className="quick-stats-container-row">
      {isMobile ? (
        <div
          className="stat-item mobile-single-stat"
          onClick={() => handleNavigation('projects')}
        >
          <Briefcase className="single-stat-icon" size={14} />
          <span className="single-stat-text">{totalProjects} Projects</span>
          <span className="single-stat-divider">|</span>
          <span className="single-stat-text">{inProgressProjects} Pending</span>
          <span className="single-stat-divider">|</span>
          <span className="single-stat-text">
            Next: {nextProjectTitle} {nextProject ? nextDeadlineDisplay : ''}
          </span>
        </div>
      ) : (
        <div className="stats-grid">
          <div
            className="stat-item"
            onClick={() => handleNavigation('projects')}
            style={{ cursor: 'pointer' }}
          >
            <div className="stat-item-header">
              <Briefcase className="stat-icon" />
              <div className="stats-header">
                <span className="stats-title">Projects</span>
                <span className="stats-count">{totalProjects}</span>
              </div>
            </div>
            <div className="progress-bar">
              <div
                className="progress-completed"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="progress-text">
              {completedProjects} Completed / {inProgressProjects} Pending
            </div>
          </div>

          <div
            className="stat-item"
            onClick={goToProject}
            style={{
              cursor: nextProject ? 'pointer' : 'default',
              border: '2px solid white',
            }}
          >
            <div className="stat-item-header">
              <Calendar className="stat-icon" />
              <div className="stats-header">
                <span className="stats-title">Next Deadline</span>
                <span className="stats-count">
                  {nextProject ? nextDeadlineDisplay : ''}
                </span>
              </div>
            </div>
            <div className="progress-text">
              {nextProject ? `Project: ${nextProjectTitle}` : 'No Upcoming Deadlines'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopBar;

