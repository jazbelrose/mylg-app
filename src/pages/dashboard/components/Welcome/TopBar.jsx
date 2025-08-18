import React, { useEffect, useState } from "react";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import { Briefcase, Calendar} from "lucide-react";
import "./style.css";

import { useNavigate } from "react-router-dom";
import { slugify } from "../../../../utils/slug";

const TopBar = ({ setActiveView }) => {
  const { projects, userData, fetchProjectDetails } = useData();
  const { notifications } = useNotifications();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNavigation = (view) => {
    setActiveView(view);
    const base = '/dashboard';
    const path = view === 'welcome' ? base : `${base}/${view}`;
    navigate(path);
  };

  const parseStatusToNumber = (statusString) => {
    if (statusString === undefined || statusString === null) {
      return 0;
    }
    const str = typeof statusString === 'string' ? statusString : String(statusString);
    const num = parseFloat(str.replace('%', ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const totalProjects = projects.length || 1;
  const completedProjects = projects.filter(p => parseStatusToNumber(p.status) >= 100).length;
  const inProgressProjects = totalProjects - completedProjects;
  const completionRate = (completedProjects / totalProjects) * 100;


  const today = new Date();
  const nextProject = projects
    .filter(p => p.finishline && new Date(p.finishline) > today)
    .sort((a, b) => new Date(a.finishline) - new Date(b.finishline))[0];

  const nextDeadlineDisplay = nextProject ? new Date(nextProject.finishline).toLocaleDateString() : "No Upcoming Deadlines";
  const nextProjectTitle = nextProject ? nextProject.title : "N/A";

  const goToProject = async () => {
    if (nextProject) {
      await fetchProjectDetails(nextProject.projectId); // ✅ Load project details
      const slug = slugify(nextProject.title);
      navigate(`/dashboard/projects/${slug}`);
    }
  };

  return (
    <div className="quick-stats-container-row">
      {isMobile ? (
        <div className="stat-item mobile-single-stat" onClick={() => handleNavigation('projects')}>
          <Briefcase className="single-stat-icon" size={14} />
          <span className="single-stat-text">{totalProjects} Projects</span>
          <span className="single-stat-divider">|</span>
          <span className="single-stat-text">{inProgressProjects} Pending</span>
          <span className="single-stat-divider">|</span>
          <span className="single-stat-text">Next: {nextProjectTitle} {nextProject ? nextDeadlineDisplay : ''}</span>
        </div>
      ) : (
        <div className="stats-grid">

        {/* Projects */}
        <div className="stat-item" onClick={() => handleNavigation("projects")} style={{ cursor: "pointer" }}>
          <div className="stat-item-header">
            <Briefcase className="stat-icon" />
            <div className="stats-header">
              <span className="stats-title">Projects</span>
              <span className="stats-count">{totalProjects}</span>
            </div>
          </div>
          <div className="progress-bar">
            <div className="progress-completed" style={{ width: `${completionRate}%` }}></div>
          </div>
          <div className="progress-text">
            {completedProjects} Completed / {inProgressProjects} Pending
          </div>
        </div>



        <div
          className="stat-item"
          onClick={goToProject}
          style={{
            cursor: nextProject ? "pointer" : "default",
            border: "2px solid white" // Ensure border is always white and visible
          }}
        >
          <div className="stat-item-header">
            <Calendar className="stat-icon" />
            <div className="stats-header">
              <span className="stats-title">Next Deadline</span>
              <span className="stats-count">
                {nextProject ? nextDeadlineDisplay : ""}
              </span>

            </div>
          </div>
          <div className="progress-text">
            {nextProject ? `Project: ${nextProjectTitle}` : "No Upcoming Deadlines"}
          </div>
        </div>




        </div>
      )}
    </div>
  );
};

export default TopBar;
