import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { useData } from "../../../../app/contexts/DataProvider";
import { useNotifications } from "../../../../app/contexts/NotificationContext";
import { Briefcase, Calendar } from "lucide-react";
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
    return (_jsx("div", { className: "quick-stats-container-row", children: isMobile ? (_jsxs("div", { className: "stat-item mobile-single-stat", onClick: () => handleNavigation('projects'), children: [_jsx(Briefcase, { className: "single-stat-icon", size: 14 }), _jsxs("span", { className: "single-stat-text", children: [totalProjects, " Projects"] }), _jsx("span", { className: "single-stat-divider", children: "|" }), _jsxs("span", { className: "single-stat-text", children: [inProgressProjects, " Pending"] }), _jsx("span", { className: "single-stat-divider", children: "|" }), _jsxs("span", { className: "single-stat-text", children: ["Next: ", nextProjectTitle, " ", nextProject ? nextDeadlineDisplay : ''] })] })) : (_jsxs("div", { className: "stats-grid", children: [_jsxs("div", { className: "stat-item", onClick: () => handleNavigation("projects"), style: { cursor: "pointer" }, children: [_jsxs("div", { className: "stat-item-header", children: [_jsx(Briefcase, { className: "stat-icon" }), _jsxs("div", { className: "stats-header", children: [_jsx("span", { className: "stats-title", children: "Projects" }), _jsx("span", { className: "stats-count", children: totalProjects })] })] }), _jsx("div", { className: "progress-bar", children: _jsx("div", { className: "progress-completed", style: { width: `${completionRate}%` } }) }), _jsxs("div", { className: "progress-text", children: [completedProjects, " Completed / ", inProgressProjects, " Pending"] })] }), _jsxs("div", { className: "stat-item", onClick: goToProject, style: {
                        cursor: nextProject ? "pointer" : "default",
                        border: "2px solid white" // Ensure border is always white and visible
                    }, children: [_jsxs("div", { className: "stat-item-header", children: [_jsx(Calendar, { className: "stat-icon" }), _jsxs("div", { className: "stats-header", children: [_jsx("span", { className: "stats-title", children: "Next Deadline" }), _jsx("span", { className: "stats-count", children: nextProject ? nextDeadlineDisplay : "" })] })] }), _jsx("div", { className: "progress-text", children: nextProject ? `Project: ${nextProjectTitle}` : "No Upcoming Deadlines" })] })] })) }));
};
export default TopBar;
