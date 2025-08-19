import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import ProjectPageLayout from "./components/SingleProject/ProjectPageLayout";
import ProjectHeader from "./components/SingleProject/ProjectHeader";
import DescriptionComponent from "./components/SingleProject/DescriptionComponent";
import DesignerComponent from "./components/SingleProject/DesignerComponent";
import QuickLinksComponent from "./components/SingleProject/QuickLinksComponent";
import FileManagerComponent from "./components/SingleProject/FileManager";
import { useData } from "../../app/contexts/DataProvider";
import { useSocket } from "../../app/contexts/SocketContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { findProjectBySlug, slugify } from "../../utils/slug";
import PreviewDrawer from "./components/SingleProject/PreviewDrawer";
import UnifiedToolbar from "../../components/UnifiedToolbar";
const DesignerPage = () => {
    const { projectSlug } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { activeProject: initialActiveProject, projects, fetchProjectDetails, setProjects, setSelectedProjects, userId, } = useData();
    const { ws } = useSocket();
    const [activeProject, setActiveProject] = useState(initialActiveProject);
    const [activeTab, setActiveTab] = useState("brief");
    const [previewOpen, setPreviewOpen] = useState(false);
    const [filesOpen, setFilesOpen] = useState(false);
    const [briefToolbarActions, setBriefToolbarActions] = useState({});
    const quickLinksRef = useRef(null);
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
    }, [
        projectSlug,
        projects,
        initialActiveProject,
        navigate,
        fetchProjectDetails,
    ]);
    useEffect(() => {
        if (!ws || !activeProject?.projectId)
            return;
        const payload = JSON.stringify({
            action: "setActiveConversation",
            conversationId: `project#${activeProject.projectId}`,
        });
        const sendWhenReady = () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
            else {
                const onOpen = () => {
                    ws.send(payload);
                    ws.removeEventListener("open", onOpen);
                };
                ws.addEventListener("open", onOpen);
            }
        };
        sendWhenReady();
    }, [ws, activeProject?.projectId]);
    const parseStatusToNumber = (statusString) => {
        if (statusString === undefined || statusString === null) {
            return 0;
        }
        const str = typeof statusString === "string" ? statusString : String(statusString);
        const num = parseFloat(str.replace("%", ""));
        return Number.isNaN(num) ? 0 : num;
    };
    const handleActiveProjectChange = (updatedProject) => {
        setActiveProject(updatedProject);
    };
    const handleProjectDeleted = (deletedProjectId) => {
        setProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
        setSelectedProjects((prev) => prev.filter((p) => p.projectId !== deletedProjectId));
        navigate("/dashboard/projects");
    };
    const handleBack = () => {
        navigate(`/dashboard/projects/${projectSlug}`);
    };
    // Fabric canvas action handlers (to be passed to DesignerComponent and UnifiedToolbar)
    const designerRef = useRef();
    // These handlers call methods on DesignerComponent via ref
    const handleSelectTool = () => designerRef.current?.changeMode('select');
    const handleBrushTool = () => designerRef.current?.changeMode('brush');
    const handleRectTool = () => designerRef.current?.changeMode('rect');
    const handleTextTool = () => designerRef.current?.addText();
    const handleImageTool = () => designerRef.current?.triggerImageUpload();
    const handleColorChange = (e) => designerRef.current?.handleColorChange(e);
    const handleUndo = () => designerRef.current?.handleUndo();
    const handleRedo = () => designerRef.current?.handleRedo();
    const handleCopy = () => designerRef.current?.handleCopy();
    const handlePaste = () => designerRef.current?.handlePaste();
    const handleDelete = () => designerRef.current?.handleDelete();
    const handleClearCanvas = () => designerRef.current?.handleClear();
    const handleSave = () => designerRef.current?.handleSave();
    // Add keyboard shortcuts for Ctrl+S (save)
    useEffect(() => {
        const handleKeyDown = (e) => {
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
    return (_jsx(ProjectPageLayout, { projectId: activeProject?.projectId, header: _jsx(ProjectHeader, { activeProject: activeProject, parseStatusToNumber: parseStatusToNumber, userId: userId, onProjectDeleted: handleProjectDeleted, showWelcomeScreen: handleBack, onActiveProjectChange: handleActiveProjectChange, onOpenFiles: () => setFilesOpen(true), onOpenQuickLinks: () => quickLinksRef.current?.openModal() }), children: _jsx("div", { className: "designer-outer-container", children: _jsxs("div", { className: "designer-scroll-container", children: [_jsx(UnifiedToolbar, { initialMode: activeTab, onModeChange: setActiveTab, onPreview: () => setPreviewOpen(true), ...(activeTab === "brief" ? briefToolbarActions : {}), 
                        // Canvas actions for fabric
                        onSelectTool: handleSelectTool, onFreeDraw: handleBrushTool, onAddRectangle: handleRectTool, onAddText: handleTextTool, onAddImage: handleImageTool, onColorChange: handleColorChange, onUndo: handleUndo, onRedo: handleRedo, onCopy: handleCopy, onPaste: handlePaste, onDelete: handleDelete, onClearCanvas: handleClearCanvas, onSave: handleSave }), _jsx(AnimatePresence, { mode: "wait", children: _jsxs(motion.div, { initial: { x: 100, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -100, opacity: 0 }, transition: { duration: 0.3 }, children: [_jsx(QuickLinksComponent, { ref: quickLinksRef, hideTrigger: true }), _jsx(FileManagerComponent, { isOpen: filesOpen, onRequestClose: () => setFilesOpen(false), showTrigger: false, folder: "uploads" }), _jsx("div", { className: "main-view-container", children: _jsxs(AnimatePresence, { mode: "wait", children: [activeTab === "brief" && (_jsx(motion.div, { initial: { opacity: 0, x: -20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.3 }, children: _jsx("div", { className: "dashboard-layout", style: { paddingBottom: "5px" }, children: _jsx(DescriptionComponent, { activeProject: activeProject, registerToolbar: setBriefToolbarActions }) }) }, "brief")), activeTab === "canvas" && (_jsx(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -20 }, transition: { duration: 0.3 }, children: _jsx("div", { className: "dashboard-layout", style: { paddingBottom: "5px" }, children: _jsx("div", { style: { maxWidth: "1920px", width: "100%" }, children: _jsx("div", { className: "editor-container", style: {
                                                                display: "flex",
                                                                flexDirection: "column",
                                                                overflow: "hidden",
                                                                height: "800px",
                                                            }, children: _jsx(DesignerComponent, { ref: designerRef }) }) }) }) }, "canvas"))] }) }), _jsx(PreviewDrawer, { open: previewOpen, onClose: () => setPreviewOpen(false), url: activeProject?.previewUrl, onExportGallery: () => console.log("Export to Gallery"), onExportPDF: () => console.log("Export to PDF") })] }, location.pathname) })] }) }) }));
};
export default DesignerPage;
