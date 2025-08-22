import React, { useState, useEffect, useMemo } from 'react';
import SVGThumbnail from './components/AllProjects/SVGThumbnail';
import "./style.css";
import { useData } from '../../app/contexts/DataProvider';
import Spinner from '../../components/preloader-light';
import { useNavigate } from 'react-router-dom';
import { slugify } from '../../utils/slug';

interface Project {
  projectId: string;
  title?: string; // <-- make optional
  description?: string;
  status?: string;
  thumbnails?: string[];
  dateCreated?: string;
  date?: string;
}

type SortOption = 'titleAsc' | 'titleDesc' | 'dateNewest' | 'dateOldest';

const AllProjects: React.FC = () => {
  const { projects, isLoading, fetchProjectDetails, projectsError, fetchProjects } = useData();
  const navigate = useNavigate();
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [sortOption, setSortOption] = useState<SortOption>('titleAsc');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Ensure projects are loaded when this view is displayed
  useEffect(() => {
    if (!isLoading && projects.length === 0 && !projectsError) {
      fetchProjects();
    }
  }, [isLoading, projects.length, projectsError, fetchProjects]);

  const onSelectProject = async (project: Project): Promise<void> => {
    try {
      await fetchProjectDetails(project.projectId);
  const safeTitle = (project.title && project.title.trim()) || `project-${project.projectId.slice(0,6)}`;
  const slug = slugify(safeTitle);
      navigate(`/dashboard/projects/${slug}`);
    }
    catch (err) {
      console.error('Error loading project', err);
    }
  };

  // Preload project thumbnails
  useEffect(() => {
    projects.forEach((p: Project) => {
      if (p.thumbnails && p.thumbnails[0]) {
        const img = new Image();
        img.src = p.thumbnails[0];
      }
    });
  }, [projects]);

  const handleProjectClick = (project: Project): void => {
    onSelectProject(project);
  };

  const handleKeyDown = (e: React.KeyboardEvent, project: Project): void => {
    if (e.key === 'Enter') {
      handleProjectClick(project);
    }
  };

  const statusOptions = useMemo(() => {
    const statuses = projects
      .map((p: Project) => (p.status || '').toLowerCase())
      .filter(Boolean) as string[];
    return Array.from(new Set(statuses));
  }, [projects]);

  const normalizedQuery = filterQuery.trim().toLowerCase();
  const filteredProjects = projects.filter((p: Project) => {
    const title = (p.title || '').toLowerCase();
    const description = (p.description || '').toLowerCase();
    const status = (p.status || '').toLowerCase();
    const matchesQuery = title.includes(normalizedQuery) || description.includes(normalizedQuery);
    const matchesStatus = !statusFilter || status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const sortedProjects = filteredProjects.slice().sort((a: Project, b: Project) => {
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

  let content: React.ReactElement;

  if (isLoading) {
    content = (
      <div 
        className="all-projects-container-welcome" 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          width: "100%",
        }}
      >
        <Spinner />
      </div>
    );
  } else {
    content = (
      <div className={`all-projects-container-welcome ${isSingleProject ? 'single-item' : ''}`}>
        {projectsError ? (
          <div style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}>
            <p style={{ fontSize: "14px", color: "#aaa", textAlign: "center" }}>
              Failed to load projects.
            </p>
          </div>
        ) : projects.length > 0 ? (
          sortedProjects.length > 0 ? (
            sortedProjects.map((project: Project) => (
              <div
                key={project.projectId}
                className={`project-container-welcome ${isSingleProject ? 'single-item' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => handleProjectClick(project)}
                onKeyDown={(e) => handleKeyDown(e, project)}
                aria-label={`Open project ${project.title?.trim() || 'Untitled project'}`}
              >
                {(!imageErrors[project.projectId] && project.thumbnails && project.thumbnails.length > 0) ? (
                  <img
                    src={project.thumbnails[0]}
                    alt={`Thumbnail of ${project.title?.trim() || 'Untitled project'}`}
                    className="project-thumbnail"
                    loading="lazy"
                    decoding="async"
                    onError={() => setImageErrors((prev) => ({
                      ...prev,
                      [project.projectId]: true,
                    }))}
                  />
                ) : (
                  <SVGThumbnail
                    initial={(project.title?.trim()?.charAt(0)?.toUpperCase() || '#')}
                    className="project-thumbnail"
                  />
                )}
                <h6 className="project-title">{project.title?.trim() || 'Untitled project'}</h6>
              </div>
            ))
          ) : (
            <div style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
            }}>
              <p style={{ fontSize: "14px", color: "#aaa", textAlign: "center" }}>
                No matching projects
              </p>
            </div>
          )
        ) : (
          <div style={{
            display: "flex",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
          }}>
            <p style={{ fontSize: "14px", color: "#aaa", textAlign: "center" }}>
              No projects yet!
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="welcome project-view">
      <div className="projects-header">
        <div className="projects-title">Projects</div>
        <div className="project-filter-container">
          <input
            type="text"
            placeholder="Filter projects..."
            className="project-filter-input"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {statusOptions.length > 0 && (
            <select
              className="project-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statusOptions.map((s: string) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <select
            className="project-filter-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            aria-label="Sort projects"
          >
            <option value="titleAsc">Title (A-Z)</option>
            <option value="titleDesc">Title (Z-A)</option>
            <option value="dateNewest">Date (Newest)</option>
            <option value="dateOldest">Date (Oldest)</option>
          </select>
        </div>
      </div>
      {content}
    </div>
  );
};

export default AllProjects;