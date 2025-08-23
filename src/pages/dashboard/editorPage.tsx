import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProjectPageLayout from "./components/SingleProject/ProjectPageLayout";
import ProjectHeader from "./components/SingleProject/ProjectHeader";
import DesignerComponent from "./components/SingleProject/DesignerComponent";
import QuickLinksComponent from "./components/SingleProject/QuickLinksComponent";
import FileManagerComponent from "./components/SingleProject/FileManager";
import PreviewDrawer from "./components/SingleProject/PreviewDrawer";
import UnifiedToolbar from "../../components/UnifiedToolbar";
import LexicalEditor from "../../components/LexicalEditor/LexicalEditor";
import { useData } from "../../app/contexts/DataProvider";
import { useAuth } from "../../app/contexts/AuthContext";
import { useSocket } from "../../app/contexts/SocketContext";
import { findProjectBySlug, slugify } from "../../utils/slug";
import { logSecurityEvent } from "../../utils/securityUtils";

// Debounce utility function
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const EditorPage: React.FC = () => {
  const { projectSlug } = useParams<{ projectSlug: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    activeProject: initialActiveProject,
    projects,
    fetchProjectDetails,
    setProjects,
    setSelectedProjects,
    userId,
    updateProjectFields,
  } = useData();

  const { isAuthenticated, authStatus, loading: authLoading } = useAuth();
  const { ws } = useSocket();

  const [activeProject, setActiveProject] = useState(initialActiveProject);
  const [activeTab, setActiveTab] = useState("brief");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const [briefToolbarActions, setBriefToolbarActions] = useState<Record<string, any>>({});
  const quickLinksRef = useRef<any>(null);
  const designerRef = useRef<any>(null);

  // Authentication guard - redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      logSecurityEvent('unauthorized_editor_access_attempt', {
        projectSlug,
        authStatus
      });
      navigate('/auth/signin');
      return;
    }
  }, [isAuthenticated, authLoading, authStatus, navigate, projectSlug]);

  // Don't render anything while authentication is loading
  if (authLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render editor if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Authentication Required</h2>
          <p>You must be logged in to access the editor.</p>
          <button 
            onClick={() => navigate('/auth/signin')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Debounced save function for description changes
  const debouncedSaveDescription = useMemo(
    () => debounce((json: string) => {
      if (activeProject?.projectId) {
        console.log("[EditorPage] Saving description to DB:", json.substring(0, 100) + "...");
        updateProjectFields(activeProject.projectId, { description: json });
      }
    }, 2000), // 2 second debounce
    [activeProject?.projectId, updateProjectFields]
  );

  useEffect(() => {
    setActiveProject(initialActiveProject);
  }, [initialActiveProject]);

  useEffect(() => {
    if (!initialActiveProject) return;
    if (slugify(initialActiveProject.title) !== projectSlug) {
      const proj = findProjectBySlug(projects, projectSlug);
      if (proj) {
        fetchProjectDetails(proj.projectId);
      } else {
        navigate(`/dashboard/projects/${slugify(initialActiveProject.title)}`);
      }
    }
  }, [projectSlug, projects, initialActiveProject, navigate, fetchProjectDetails]);

  useEffect(() => {
    if (!ws || !activeProject?.projectId) return;
    const payload = JSON.stringify({
      action: "setActiveConversation",
      conversationId: `project#${activeProject.projectId}`,
    });
    const sendWhenReady = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      } else {
        const onOpen = () => {
          ws.send(payload);
          ws.removeEventListener("open", onOpen);
        };
        ws.addEventListener("open", onOpen);
      }
    };
    sendWhenReady();
  }, [ws, activeProject?.projectId]);

  const parseStatusToNumber = (statusString: string | number | undefined | null): number => {
    if (statusString === undefined || statusString === null) return 0;
    const str = typeof statusString === "string" ? statusString : String(statusString);
    const num = parseFloat(str.replace("%", ""));
    return Number.isNaN(num) ? 0 : num;
  };

  const handleActiveProjectChange = (updatedProject: any) => {
    setActiveProject(updatedProject);
  };

  const handleProjectDeleted = (deletedProjectId: string) => {
    setProjects((prev: any[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    setSelectedProjects((prev: any[]) => prev.filter((p) => p.projectId !== deletedProjectId));
    navigate("/dashboard/projects");
  };

  const handleBack = () => {
    navigate(`/dashboard/projects/${projectSlug}`);
  };

  const handleSelectTool = () => designerRef.current?.changeMode("select");
  const handleBrushTool = () => designerRef.current?.changeMode("brush");
  const handleRectTool = () => designerRef.current?.changeMode("rect");
  const handleTextTool = () => designerRef.current?.addText();
  const handleImageTool = () => designerRef.current?.triggerImageUpload();
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => designerRef.current?.handleColorChange(e);
  const handleUndo = () => designerRef.current?.handleUndo();
  const handleRedo = () => designerRef.current?.handleRedo();
  const handleCopy = () => designerRef.current?.handleCopy();
  const handlePaste = () => designerRef.current?.handlePaste();
  const handleDelete = () => designerRef.current?.handleDelete();
  const handleClearCanvas = () => designerRef.current?.handleClear();
  const handleSave = () => designerRef.current?.handleSave();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "KeyS") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <ProjectPageLayout
      projectId={activeProject?.projectId}
      header={
        <ProjectHeader
          activeProject={activeProject}
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
      <div className="designer-outer-container">
        <div className="designer-scroll-container">
          <UnifiedToolbar
            initialMode={activeTab}
            onModeChange={setActiveTab}
            onPreview={() => setPreviewOpen(true)}
            {...(activeTab === "brief" ? briefToolbarActions : {})}
            onSelectTool={handleSelectTool}
            onFreeDraw={handleBrushTool}
            onAddRectangle={handleRectTool}
            onAddText={handleTextTool}
            onAddImage={handleImageTool}
            onColorChange={handleColorChange}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDelete={handleDelete}
            onClearCanvas={handleClearCanvas}
            onSave={handleSave}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <QuickLinksComponent ref={quickLinksRef} hideTrigger />
              <FileManagerComponent
                isOpen={filesOpen}
                onRequestClose={() => setFilesOpen(false)}
                showTrigger={false}
                folder="uploads"
              />
              <div className="main-view-container">
                <AnimatePresence mode="wait">
                  {activeTab === "brief" && (
                    <motion.div
                      key="brief"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="dashboard-layout" style={{ paddingBottom: "5px" }}>
                        <LexicalEditor
                          key={activeProject?.projectId}
                          initialContent={activeProject.description || undefined}
                          onChange={debouncedSaveDescription}
                          registerToolbar={setBriefToolbarActions}
                        />
                      </div>
                    </motion.div>
                  )}
                  {activeTab === "canvas" && (
                    <motion.div
                      key="canvas"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="dashboard-layout" style={{ paddingBottom: "5px" }}>
                        <div style={{ maxWidth: "1920px", width: "100%" }}>
                          <div
                            className="editor-container"
                            style={{ display: "flex", flexDirection: "column", overflow: "hidden", height: "800px" }}
                          >
                            <DesignerComponent ref={designerRef} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <PreviewDrawer
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                url={activeProject?.previewUrl}
                onExportGallery={() => console.log("Export to Gallery")}
                onExportPDF={() => console.log("Export to PDF")}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ProjectPageLayout>
  );
};

export default EditorPage;
