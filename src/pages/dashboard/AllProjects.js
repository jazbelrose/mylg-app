import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useMemo } from 'react';
import SVGThumbnail from './components/AllProjects/SVGThumbnail';
import "./style.css";
import { useData } from '../../app/contexts/DataProvider';
import Spinner from '../../components/preloader-light';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../../utils/slug';
const AllProjects = () => {
    const { projects, isLoading, fetchProjectDetails, projectsError, fetchProjects } = useData();
    const navigate = useNavigate();
    const [filterQuery, setFilterQuery] = useState('');
    const [imageErrors, setImageErrors] = useState({});
    const [sortOption, setSortOption] = useState('titleAsc');
    const [statusFilter, setStatusFilter] = useState('');
    // Ensure projects are loaded when this view is displayed
    useEffect(() => {
        if (!isLoading && projects.length === 0 && !projectsError) {
            fetchProjects();
        }
    }, [isLoading, projects.length, projectsError, fetchProjects]);
    const onSelectProject = async (project) => {
        try {
            await fetchProjectDetails(project.projectId);
            const slug = slugify(project.title);
            navigate(`/dashboard/projects/${slug}`);
        }
        catch (err) {
            console.error('Error loading project', err);
        }
    };
    // Preload project thumbnails
    useEffect(() => {
        projects.forEach((p) => {
            if (p.thumbnails && p.thumbnails[0]) {
                const img = new Image();
                img.src = p.thumbnails[0];
            }
        });
    }, [projects]);
    const handleProjectClick = (project) => {
        onSelectProject(project);
    };
    const statusOptions = useMemo(() => {
        const statuses = projects
            .map((p) => (p.status || '').toLowerCase())
            .filter(Boolean);
        return Array.from(new Set(statuses));
    }, [projects]);
    const normalizedQuery = filterQuery.trim().toLowerCase();
    const filteredProjects = projects.filter((p) => {
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        const status = (p.status || '').toLowerCase();
        const matchesQuery = title.includes(normalizedQuery) || description.includes(normalizedQuery);
        const matchesStatus = !statusFilter || status === statusFilter;
        return matchesQuery && matchesStatus;
    });
    const sortedProjects = filteredProjects.slice().sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const dateA = new Date(a.dateCreated || a.date || 0).getTime();
        const dateB = new Date(b.dateCreated || b.date || 0).getTime();
        switch (sortOption) {
            case 'titleDesc':
                return titleB.localeCompare(titleA);
            case 'dateNewest':
                return dateB - dateA;
            case 'dateOldest':
                return dateA - dateB;
            case 'titleAsc':
            default:
                return titleA.localeCompare(titleB);
        }
    });
    const isSingleProject = sortedProjects.length === 1;
    let content;
    if (isLoading) {
        content = (_jsx("div", { className: "all-projects-container-welcome", style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                width: "100%",
            }, children: _jsx(Spinner, {}) }));
    }
    else {
        content = (_jsx("div", { className: `all-projects-container-welcome ${isSingleProject ? 'single-item' : ''}`, children: projectsError ? (_jsx("div", { style: {
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }, children: _jsx("p", { style: { fontSize: "14px", color: "#aaa", textAlign: "center" }, children: "Failed to load projects." }) })) : projects.length > 0 ? (sortedProjects.length > 0 ? (sortedProjects.map((project) => (_jsxs("div", { className: `project-container-welcome ${isSingleProject ? 'single-item' : ''}`, role: "button", tabIndex: 0, onClick: () => handleProjectClick(project), onKeyDown: (e) => e.key === 'Enter' && handleProjectClick(project), "aria-label": `Open project ${project.title || 'Unknown'}`, children: [(!imageErrors[project.projectId] && project.thumbnails && project.thumbnails.length > 0) ? (_jsx("img", { src: project.thumbnails[0], alt: `Thumbnail of ${project.title || 'Unknown'}`, className: "project-thumbnail", loading: "lazy", decoding: "async", onError: () => setImageErrors((prev) => ({
                            ...prev,
                            [project.projectId]: true,
                        })) })) : (_jsx(SVGThumbnail, { initial: project.title.charAt(0).toUpperCase(), className: "project-thumbnail" })), _jsx("h6", { className: "project-title", children: project.title })] }, project.projectId)))) : (_jsx("div", { style: {
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }, children: _jsx("p", { style: { fontSize: "14px", color: "#aaa", textAlign: "center" }, children: "No matching projects" }) }))) : (_jsx("div", { style: {
                    display: "flex",
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }, children: _jsx("p", { style: { fontSize: "14px", color: "#aaa", textAlign: "center" }, children: "No projects yet!" }) })) }));
    }
    return (_jsxs("div", { className: "welcome project-view", children: [_jsxs("div", { className: "projects-header", children: [_jsx("div", { className: "projects-title", children: "Projects" }), _jsxs("div", { className: "project-filter-container", children: [_jsx("input", { type: "text", placeholder: "Filter projects...", className: "project-filter-input", value: filterQuery, onChange: (e) => setFilterQuery(e.target.value) }), statusOptions.length > 0 && (_jsxs("select", { className: "project-filter-select", value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), "aria-label": "Filter by status", children: [_jsx("option", { value: "", children: "All statuses" }), statusOptions.map((s) => (_jsx("option", { value: s, children: s }, s)))] })), _jsxs("select", { className: "project-filter-select", value: sortOption, onChange: (e) => setSortOption(e.target.value), "aria-label": "Sort projects", children: [_jsx("option", { value: "titleAsc", children: "Title (A-Z)" }), _jsx("option", { value: "titleDesc", children: "Title (Z-A)" }), _jsx("option", { value: "dateNewest", children: "Date (Newest)" }), _jsx("option", { value: "dateOldest", children: "Date (Oldest)" })] })] })] }), content] }));
};
export default AllProjects;
