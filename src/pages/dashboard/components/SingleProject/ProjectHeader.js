import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo, } from "react";
import "./ProjectHeader.css";
import Cropper from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import Modal from "../../../../components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen } from "@fortawesome/free-solid-svg-icons";
import { Pipette, Folder, Link2, Settings, Pencil, Image as ImageIcon, Palette, Trash, Paintbrush, PenTool, LayoutDashboard, Coins, Calendar as CalendarIcon, } from "lucide-react";
import { uploadData } from "aws-amplify/storage";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { useAuth } from "../../../../app/contexts/AuthContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { slugify, findProjectBySlug } from "../../../../utils/slug";
import { HexColorPicker, HexColorInput } from "react-colorful";
import styles from "./FinishLineComponent.module.css";
import { POST_PROJECT_TO_USER_URL, S3_PUBLIC_BASE, apiFetch, } from "../../../../utils/api";
import AvatarStack from "../../../../components/AvatarStack";
import TeamModal from "./TeamModal";
import { fetchUserProfilesBatch } from "../../../../utils/api";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
// Cache team member profiles per project so navigating between tabs
// does not trigger a visual flash while data is reloaded.
// The cache is kept in memory for the lifetime of the page and
// refreshed whenever the underlying team array changes.
const teamMembersCache = new Map();
const getBorderColorForCircle = (hex) => {
    const c = (hex || "").replace("#", "");
    if (c.length !== 6)
        return "#fff";
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 200 ? "#000" : "#fff";
};
// Safely parse various date string formats into a Date object (YYYY-MM-DD or native formats)
function safeParse(dateStr) {
    if (!dateStr)
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-").map((p) => parseInt(p, 10));
        return new Date(y, m - 1, d);
    }
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    }
    return null;
}
const ProjectHeader = ({ title, parseStatusToNumber, userId, onProjectDeleted, activeProject, showWelcomeScreen, onActiveProjectChange, onOpenFiles, onOpenQuickLinks, }) => {
    const { user, setActiveProject, updateProjectFields, isAdmin, projects } = useData();
    const [saving, setSaving] = useState(false);
    const { ws } = useSocket();
    const { refreshUser } = useAuth();
    const navigate = useNavigate();
    const { projectSlug } = useParams();
    // Determine if current user is an admin
    const handleKeyDown = (e, action) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            action();
        }
    };
    // Store active project locally for instant UI updates
    const [localActiveProject, setLocalActiveProject] = useState(activeProject || {});
    // Keep local state in sync with incoming activeProject changes
    useEffect(() => {
        setLocalActiveProject(activeProject || {});
        setUpdatedName(activeProject?.title || "");
        setUpdatedStatus(activeProject?.status || "");
        setSelectedColor(activeProject?.color || "#FA3356");
        setSelectedFinishLineDate(activeProject?.finishline || "");
        setSelectedProductionStartDate(activeProject?.productionStart || activeProject?.dateCreated || "");
        setInvoiceBrandName(activeProject?.invoiceBrandName || "");
        setInvoiceBrandAddress(activeProject?.invoiceBrandAddress || "");
        setInvoiceBrandPhone(activeProject?.invoiceBrandPhone || "");
        setClientName(activeProject?.clientName || "");
        setClientAddress(activeProject?.clientAddress || "");
        setClientPhone(activeProject?.clientPhone || "");
    }, [activeProject]);
    // Update URL slug when project title changes locally or via WebSocket
    useEffect(() => {
        if (!localActiveProject?.title || !localActiveProject.projectId)
            return;
        const slug = slugify(localActiveProject.title);
        if (slug !== projectSlug) {
            const project = findProjectBySlug(projects, projectSlug);
            if (project && project.projectId === localActiveProject.projectId) {
                navigate(`/dashboard/projects/${slug}`, { replace: true });
            }
        }
    }, [localActiveProject?.title, localActiveProject?.projectId, projectSlug, projects, navigate]);
    // Derive project initial from localActiveProject so it updates when name changes
    const projectInitial = localActiveProject?.title && localActiveProject.title.length > 0
        ? localActiveProject.title.charAt(0)
        : "";
    // Ensure that displayStatus always ends with a percentage sign
    const displayStatus = localActiveProject?.status &&
        !localActiveProject.status.toString().trim().endsWith("%")
        ? `${localActiveProject.status}%`
        : localActiveProject?.status || "0%";
    const startDate = useMemo(() => safeParse(localActiveProject?.productionStart || localActiveProject?.dateCreated), [localActiveProject?.productionStart, localActiveProject?.dateCreated]);
    const endDate = useMemo(() => safeParse(localActiveProject?.finishline), [localActiveProject?.finishline]);
    const totalHoursForProject = useMemo(() => (localActiveProject?.timelineEvents || []).reduce((sum, ev) => sum + Number(ev.hours || 0), 0), [localActiveProject?.timelineEvents]);
    const rangeLabel = useMemo(() => {
        const totalPart = `Hrs Total: ${totalHoursForProject} hrs`;
        if (!startDate || !endDate)
            return totalPart;
        const opts = { month: "short", day: "numeric" };
        const startStr = startDate.toLocaleDateString(undefined, opts);
        const endStr = endDate.toLocaleDateString(undefined, opts);
        return `${startStr} – ${endStr} | ${totalPart}`;
    }, [startDate, endDate, totalHoursForProject]);
    // --------------------------
    // Modal state declarations
    // --------------------------
    // Edit Name Modal
    const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
    const [updatedName, setUpdatedName] = useState(localActiveProject?.title || "");
    // Edit Status Modal
    const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
    const [updatedStatus, setUpdatedStatus] = useState(localActiveProject?.status || "");
    // Finish Line Modal
    const [isFinishLineModalOpen, setIsFinishLineModalOpen] = useState(false);
    const [selectedFinishLineDate, setSelectedFinishLineDate] = useState(localActiveProject?.finishline || "");
    const [selectedProductionStartDate, setSelectedProductionStartDate,] = useState(localActiveProject?.productionStart ||
        localActiveProject?.dateCreated ||
        "");
    // Invoice Info Modal
    const [isInvoiceInfoModalOpen, setIsInvoiceInfoModalOpen] = useState(false);
    const [invoiceBrandName, setInvoiceBrandName] = useState(localActiveProject?.invoiceBrandName || "");
    const [invoiceBrandAddress, setInvoiceBrandAddress] = useState(localActiveProject?.invoiceBrandAddress || "");
    const [invoiceBrandPhone, setInvoiceBrandPhone] = useState(localActiveProject?.invoiceBrandPhone || "");
    const [clientName, setClientName] = useState(localActiveProject?.clientName || "");
    const [clientAddress, setClientAddress] = useState(localActiveProject?.clientAddress || "");
    const [clientPhone, setClientPhone] = useState(localActiveProject?.clientPhone || "");
    // Delete Confirmation Modal (triggered by trash icon)
    const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
    // Thumbnail Modal
    const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);
    const [thumbnailPreview, setThumbnailPreview] = useState(null);
    const [selectedThumbnailFile, setSelectedThumbnailFile] = useState(null);
    const [isThumbDragging, setIsThumbDragging] = useState(false);
    const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
    const thumbnailInputRef = useRef(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    // Project Settings Modal
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const queueUpdate = async (payload) => {
        if (!activeProject?.projectId)
            return;
        try {
            setSaving(true);
            await enqueueProjectUpdate(updateProjectFields, activeProject.projectId, payload);
        }
        finally {
            setSaving(false);
        }
    };
    // Track if a modal was opened from the settings modal so we can return
    const [returnToSettings, setReturnToSettings] = useState(false);
    // When the thumbnail modal opens, react-easy-crop sometimes calculates a
    // zero-sized container if the modal isn't fully visible yet. Trigger a
    // resize after opening so the cropper can recompute its dimensions.
    useEffect(() => {
        if (isThumbnailModalOpen && thumbnailPreview) {
            const id = setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
            }, 50);
            return () => clearTimeout(id);
        }
        return undefined;
    }, [isThumbnailModalOpen, thumbnailPreview]);
    // Color Picker Modal
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);
    const [selectedColor, setSelectedColor] = useState(localActiveProject?.color || "#FA3356");
    const hexToRgb = (hex) => {
        const cleaned = hex.replace("#", "");
        const bigint = parseInt(cleaned, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `${r}, ${g}, ${b}`;
    };
    const onCropComplete = useCallback((_, cropped) => {
        setCroppedAreaPixels(cropped);
    }, []);
    const createImage = (url) => new Promise((resolve, reject) => {
        const img = new Image();
        img.addEventListener("load", () => resolve(img));
        img.addEventListener("error", (err) => reject(err));
        img.src = url;
    });
    const getCroppedImg = async (imageSrc, cropArea, type = "image/jpeg") => {
        const img = await createImage(imageSrc);
        const canvas = document.createElement("canvas");
        canvas.width = cropArea.width;
        canvas.height = cropArea.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, cropArea.x, cropArea.y, cropArea.width, cropArea.height, 0, 0, cropArea.width, cropArea.height);
        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), type);
        });
    };
    // Pick color from anywhere on the screen using the EyeDropper API
    const pickColorFromScreen = async () => {
        if (window.EyeDropper) {
            try {
                const eyeDropper = new window.EyeDropper();
                const { sRGBHex } = await eyeDropper.open();
                setSelectedColor(sRGBHex);
            }
            catch (err) {
                console.error("EyeDropper cancelled or failed", err);
            }
        }
        else {
            alert("Your browser does not support the EyeDropper API.");
        }
    };
    // --------------------------
    // Team avatars
    // --------------------------
    const projectId = activeProject?.projectId;
    const [teamMembers, setTeamMembers] = useState(() => {
        return projectId && teamMembersCache.has(projectId)
            ? teamMembersCache.get(projectId)
            : [];
    });
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            if (!projectId || !localActiveProject || !Array.isArray(localActiveProject.team)) {
                if (isMounted) {
                    setTeamMembers([]);
                    if (projectId) {
                        teamMembersCache.set(projectId, []);
                    }
                }
                return;
            }
            try {
                const ids = localActiveProject.team.map((m) => m.userId);
                const profiles = await fetchUserProfilesBatch(ids);
                const map = new Map(profiles.map((p) => [p.userId, p]));
                const results = localActiveProject.team.map((member) => {
                    const profile = map.get(member.userId) || {};
                    return {
                        userId: member.userId,
                        firstName: profile.firstName || "",
                        lastName: profile.lastName || "",
                        thumbnail: profile.thumbnail || null,
                    };
                });
                if (isMounted) {
                    setTeamMembers(results);
                    teamMembersCache.set(projectId, results);
                }
            }
            catch {
                if (isMounted) {
                    setTeamMembers([]);
                    teamMembersCache.set(projectId, []);
                }
            }
        };
        load();
        return () => {
            isMounted = false;
        };
    }, [projectId, JSON.stringify(localActiveProject?.team)]);
    useEffect(() => {
        teamMembers.forEach((m) => {
            if (m.thumbnail) {
                const img = new Image();
                img.src = m.thumbnail;
            }
        });
    }, [teamMembers]);
    // --------------------------
    // Modal Handlers
    // --------------------------
    // Edit Name Modal handlers
    const openEditNameModal = (fromSettings = false) => {
        setReturnToSettings(fromSettings);
        setUpdatedName(localActiveProject.title || "");
        setIsEditNameModalOpen(true);
    };
    const closeEditNameModal = () => {
        setIsEditNameModalOpen(false);
        if (returnToSettings) {
            setIsSettingsModalOpen(true);
            setReturnToSettings(false);
        }
    };
    const handleUpdateName = async (e) => {
        e.preventDefault();
        if (updatedName === activeProject.title) {
            closeEditNameModal();
            return;
        }
        try {
            await queueUpdate({
                title: updatedName,
            });
            const updatedProject = { ...activeProject, title: updatedName };
            setLocalActiveProject(updatedProject);
            onActiveProjectChange && onActiveProjectChange(updatedProject);
            const newSlug = slugify(updatedName);
            if (projectSlug !== newSlug) {
                navigate(`/dashboard/projects/${newSlug}`, { replace: true });
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: updatedName || activeProject.title,
                    fields: { title: updatedName },
                    conversationId: `project#${activeProject.projectId}`,
                    username: user?.firstName || "Someone",
                    senderId: user.userId,
                }));
            }
        }
        catch (error) {
            console.error("Failed to update project name:", error);
        }
        finally {
            closeEditNameModal();
        }
    };
    // Edit Status Modal handlers
    const openEditStatusModal = () => {
        setUpdatedStatus(localActiveProject.status || "");
        setIsEditStatusModalOpen(true);
    };
    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (updatedStatus === activeProject.status) {
            setIsEditStatusModalOpen(false);
            return;
        }
        const updatedProject = {
            ...localActiveProject,
            status: updatedStatus,
        };
        setLocalActiveProject(updatedProject);
        onActiveProjectChange && onActiveProjectChange(updatedProject);
        setActiveProject(updatedProject);
        await queueUpdate({
            status: updatedStatus,
        });
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "projectUpdated",
                projectId: activeProject.projectId,
                title: activeProject.title,
                fields: { status: updatedStatus },
                conversationId: `project#${activeProject.projectId}`,
                username: user?.firstName || "Someone",
                senderId: user.userId,
            }));
        }
        setIsEditStatusModalOpen(false);
    };
    // Finish Line Modal handlers
    const openFinishLineModal = () => {
        setSelectedFinishLineDate(localActiveProject.finishline || "");
        setSelectedProductionStartDate(localActiveProject.productionStart ||
            localActiveProject.dateCreated ||
            "");
        setIsFinishLineModalOpen(true);
    };
    const handleUpdateFinishLine = async (e) => {
        e.preventDefault();
        try {
            const updatedProject = {
                ...localActiveProject,
                finishline: selectedFinishLineDate,
                productionStart: selectedProductionStartDate,
            };
            setLocalActiveProject(updatedProject);
            onActiveProjectChange && onActiveProjectChange(updatedProject);
            setActiveProject(updatedProject);
            await queueUpdate({
                finishline: selectedFinishLineDate,
                productionStart: selectedProductionStartDate,
            });
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: activeProject.title,
                    fields: {
                        finishline: selectedFinishLineDate,
                        productionStart: selectedProductionStartDate,
                    },
                    conversationId: `project#${activeProject.projectId}`,
                    username: user?.firstName || "Someone",
                    senderId: user.userId,
                }));
            }
        }
        catch (error) {
            console.error("Failed to update finish line:", error);
        }
        finally {
            setIsFinishLineModalOpen(false);
        }
    };
    // Delete Confirmation Modal handler (triggered by trash icon)
    const openDeleteConfirmationModal = (fromSettings = false) => {
        setReturnToSettings(fromSettings);
        setIsConfirmDeleteModalOpen(true);
    };
    const closeDeleteConfirmationModal = () => {
        setIsConfirmDeleteModalOpen(false);
        if (returnToSettings) {
            setIsSettingsModalOpen(true);
            setReturnToSettings(false);
        }
    };
    const handleDeleteProject = async () => {
        if (!activeProject || !activeProject.projectId) {
            console.error("No active project to delete.");
            return;
        }
        const projectId = activeProject.projectId;
        try {
            const response = await apiFetch(`${POST_PROJECT_TO_USER_URL}?userId=${userId}&projectId=${projectId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok)
                throw new Error("Network response was not ok");
            onProjectDeleted(projectId);
            await refreshUser();
        }
        catch (error) {
            console.error("Error during project deletion:", error.message);
        }
        closeDeleteConfirmationModal();
        showWelcomeScreen();
    };
    // Thumbnail Modal handlers
    const openThumbnailModal = (fromSettings = false) => {
        setReturnToSettings(fromSettings);
        setIsThumbnailModalOpen(true);
    };
    const closeThumbnailModal = () => {
        setIsThumbnailModalOpen(false);
        if (returnToSettings) {
            setIsSettingsModalOpen(true);
            setReturnToSettings(false);
        }
    };
    const handleThumbnailFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedThumbnailFile(file);
            const previewURL = URL.createObjectURL(file);
            if (thumbnailPreview) {
                URL.revokeObjectURL(thumbnailPreview);
            }
            setThumbnailPreview(previewURL);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        }
    };
    const handleThumbDragOver = (e) => {
        e.preventDefault();
        setIsThumbDragging(true);
    };
    const handleThumbDragLeave = (e) => {
        e.preventDefault();
        setIsThumbDragging(false);
    };
    const handleThumbDrop = (e) => {
        e.preventDefault();
        setIsThumbDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedThumbnailFile(file);
            const previewURL = URL.createObjectURL(file);
            if (thumbnailPreview) {
                URL.revokeObjectURL(thumbnailPreview);
            }
            setThumbnailPreview(previewURL);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        }
    };
    const handleRemoveThumbnail = () => {
        if (thumbnailPreview) {
            URL.revokeObjectURL(thumbnailPreview);
        }
        setThumbnailPreview(null);
        setSelectedThumbnailFile(null);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        if (thumbnailInputRef.current) {
            thumbnailInputRef.current.value = "";
        }
    };
    useEffect(() => {
        return () => {
            if (thumbnailPreview) {
                URL.revokeObjectURL(thumbnailPreview);
            }
        };
    }, [thumbnailPreview]);
    const handleUploadThumbnail = async () => {
        if (!selectedThumbnailFile)
            return;
        try {
            setIsThumbnailUploading(true);
            const croppedBlob = croppedAreaPixels
                ? await getCroppedImg(thumbnailPreview, croppedAreaPixels, selectedThumbnailFile.type)
                : selectedThumbnailFile;
            const filename = `project-thumbnails/${activeProject.projectId}/${selectedThumbnailFile.name}`;
            await uploadData({
                key: filename,
                data: croppedBlob,
                options: { accessLevel: "public" },
            });
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const encodedProjectId = encodeURIComponent(activeProject.projectId);
            const encodedFileName = encodeURIComponent(selectedThumbnailFile.name);
            const uploadedURL = `${S3_PUBLIC_BASE}/project-thumbnails/${encodedProjectId}/${encodedFileName}`;
            const updatedLocal = {
                ...localActiveProject,
                thumbnails: Array.from(new Set([uploadedURL, ...(localActiveProject.thumbnails || [])])),
            };
            setLocalActiveProject(updatedLocal);
            onActiveProjectChange && onActiveProjectChange(updatedLocal);
            setActiveProject(updatedLocal);
            await queueUpdate({
                thumbnails: [uploadedURL],
            });
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: activeProject.title,
                    fields: { thumbnails: [uploadedURL] },
                    conversationId: `project#${activeProject.projectId}`,
                    username: user?.firstName || "Someone",
                    senderId: user.userId,
                }));
            }
            closeThumbnailModal();
            console.log("Thumbnail updated successfully");
        }
        catch (error) {
            console.error("Error uploading thumbnail:", error);
        }
        finally {
            setIsThumbnailUploading(false);
        }
    };
    // Color Modal handlers
    const openColorModal = (fromSettings = false) => {
        setReturnToSettings(fromSettings);
        setSelectedColor(localActiveProject?.color || "#FA3356");
        setIsColorModalOpen(true);
    };
    const closeColorModal = () => {
        setIsColorModalOpen(false);
        if (returnToSettings) {
            setIsSettingsModalOpen(true);
            setReturnToSettings(false);
        }
    };
    const handleSaveColor = async () => {
        try {
            const updatedLocal = { ...localActiveProject, color: selectedColor };
            setLocalActiveProject(updatedLocal);
            onActiveProjectChange && onActiveProjectChange(updatedLocal);
            setActiveProject(updatedLocal);
            await queueUpdate({
                color: selectedColor,
            });
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: activeProject.title,
                    fields: { color: selectedColor },
                    conversationId: `project#${activeProject.projectId}`,
                    username: user?.firstName || "Someone",
                    senderId: user.userId,
                }));
            }
        }
        catch (error) {
            console.error("Error updating color:", error);
        }
        finally {
            closeColorModal();
        }
    };
    // Invoice Info Modal handlers
    const openInvoiceInfoModal = (fromSettings = false) => {
        setReturnToSettings(fromSettings);
        setIsInvoiceInfoModalOpen(true);
    };
    const closeInvoiceInfoModal = () => {
        setIsInvoiceInfoModalOpen(false);
        if (returnToSettings) {
            setIsSettingsModalOpen(true);
            setReturnToSettings(false);
        }
    };
    const handleSaveInvoiceInfo = async (e) => {
        e.preventDefault();
        try {
            const fields = {
                invoiceBrandName,
                invoiceBrandAddress,
                invoiceBrandPhone,
                clientName,
                clientAddress,
                clientPhone,
            };
            const updatedLocal = { ...localActiveProject, ...fields };
            setLocalActiveProject(updatedLocal);
            onActiveProjectChange && onActiveProjectChange(updatedLocal);
            setActiveProject(updatedLocal);
            await queueUpdate(fields);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "projectUpdated",
                    projectId: activeProject.projectId,
                    title: activeProject.title,
                    fields,
                    conversationId: `project#${activeProject.projectId}`,
                    username: user?.firstName || "Someone",
                    senderId: user.userId,
                }));
            }
        }
        catch (err) {
            console.error("Error updating invoice info:", err);
        }
        finally {
            closeInvoiceInfoModal();
        }
    };
    // Settings Modal handlers
    const openSettingsModal = () => {
        setReturnToSettings(false);
        setIsSettingsModalOpen(true);
    };
    const openTeamModal = () => setIsTeamModalOpen(true);
    const closeTeamModal = () => setIsTeamModalOpen(false);
    // --------------------------
    // Render
    // --------------------------
    return (_jsxs("div", { children: [saving && _jsx("div", { style: { color: '#FA3356' }, children: "Saving..." }), _jsx("div", { className: "project-header", children: _jsxs("div", { className: "header-content", children: [_jsxs("div", { className: "left-side", children: [_jsx(FontAwesomeIcon, { icon: faArrowLeft, className: "back-icon interactive", onClick: showWelcomeScreen, title: "Back to Projects", "aria-label": "Back to Projects", role: "button", tabIndex: 0, onKeyDown: (e) => handleKeyDown(e, showWelcomeScreen) }), _jsx("div", { onClick: openThumbnailModal, onKeyDown: (e) => handleKeyDown(e, openThumbnailModal), role: "button", tabIndex: 0, title: "Change Project Thumbnail", "aria-label": "Change Project Thumbnail", style: { cursor: "pointer", marginRight: "15px" }, className: "interactive project-logo-wrapper", children: localActiveProject?.thumbnails &&
                                        localActiveProject.thumbnails.length > 0 ? (_jsx("img", { src: localActiveProject.thumbnails[0], alt: "Project Thumbnail", className: "project-logo" })) : (_jsx("svg", { id: "InitialSVG", viewBox: "0 50 300 300", className: "project-logo", children: _jsxs("g", { children: [_jsx("ellipse", { className: "initial-ellipse", cx: "141.79", cy: "192.67", rx: "135", ry: "135" }), _jsx("text", { className: "initial", x: "141.5", y: "185", textAnchor: "middle", dominantBaseline: "central", children: projectInitial.toUpperCase() })] }) })) }), _jsx("div", { className: "single-project-title", children: _jsx("h2", { className: "project-title-heading", children: localActiveProject ? localActiveProject.title : "Summary" }) }), _jsxs("svg", { id: "StatusSVG", viewBox: "0 0 400 400", onClick: openEditStatusModal, onKeyDown: (e) => handleKeyDown(e, openEditStatusModal), role: "button", tabIndex: 0, title: `Status: ${displayStatus} Complete`, "aria-label": `Status: ${displayStatus} Complete`, className: "interactive status-svg", style: { cursor: "pointer" }, children: [_jsx("text", { className: "project-status", transform: `translate(${localActiveProject?.status !== "100%" ? 75 : 56.58} 375.21)`, children: _jsx("tspan", { x: "22.5", y: "-136", children: displayStatus }) }), localActiveProject && (_jsx("ellipse", { cx: "200", cy: "200", rx: "160", ry: "160", fill: "none", stroke: "#fff", strokeWidth: "15", strokeDasharray: `${(parseStatusToNumber(localActiveProject.status) / 100) *
                                                1002}, 1004`, children: parseStatusToNumber(localActiveProject.status) < 100 && (_jsx("animate", { attributeName: "stroke-dasharray", from: "0, 1004", to: `${(parseStatusToNumber(localActiveProject.status) / 100) *
                                                    1002}, 1004`, dur: "1s", begin: "0s", fill: "freeze" }, `status-animation-${localActiveProject.status}`)) }))] }), _jsx(AvatarStack, { members: teamMembers, onClick: openTeamModal }), _jsx("div", { className: "finish-line-header interactive", onClick: openFinishLineModal, onKeyDown: (e) => handleKeyDown(e, openFinishLineModal), role: "button", tabIndex: 0, title: "Production dates", "aria-label": "Production dates", style: { cursor: "pointer" }, children: _jsx("span", { children: rangeLabel }) }), _jsx("div", { onClick: openSettingsModal, onKeyDown: (e) => handleKeyDown(e, openSettingsModal), role: "button", tabIndex: 0, title: "Project settings", "aria-label": "Project settings", className: "interactive", style: { cursor: "pointer", margin: "10px" }, children: _jsx(Settings, { size: 20, className: "settings-icon" }) }), _jsx("div", { onClick: onOpenQuickLinks, onKeyDown: (e) => handleKeyDown(e, onOpenQuickLinks), role: "button", tabIndex: 0, title: "Quick links", "aria-label": "Quick links", className: "interactive", style: { cursor: "pointer" }, children: _jsx(Link2, { size: 20 }) }), _jsx("div", { onClick: onOpenFiles, onKeyDown: (e) => handleKeyDown(e, onOpenFiles), role: "button", tabIndex: 0, title: "Open file manager", "aria-label": "Open file manager", className: "interactive", style: { cursor: "pointer", margin: "10px" }, children: _jsx(Folder, { size: 20 }) }), _jsxs(Modal, { isOpen: isConfirmDeleteModalOpen, onRequestClose: closeDeleteConfirmationModal, contentLabel: "Confirm Delete Project", closeTimeoutMS: 300, className: {
                                        base: styles.modalContent,
                                        afterOpen: styles.modalContentAfterOpen,
                                        beforeClose: styles.modalContentBeforeClose,
                                    }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { fontSize: "1rem", paddingBottom: "20px" }, children: "Are you sure you want to delete this project?" }), _jsxs("div", { style: {
                                                display: "flex",
                                                justifyContent: "center",
                                                gap: "10px",
                                                marginTop: "20px",
                                            }, children: [_jsx("button", { className: "modal-button primary", onClick: handleDeleteProject, style: { borderRadius: "5px" }, children: "Yes" }), _jsx("button", { className: "modal-button secondary", onClick: closeDeleteConfirmationModal, style: { borderRadius: "5px" }, children: "No" })] })] })] }), _jsx("div", { className: "right-side", children: _jsx("div", { className: "project-nav-tabs", style: { padding: "0 10px 10px" }, children: _jsx(ProjectTabs, { projectSlug: projectSlug }) }) })] }) }), _jsxs(Modal, { isOpen: isEditNameModalOpen, onRequestClose: closeEditNameModal, contentLabel: "Edit Project Name", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Edit Project Name" }), _jsxs("form", { onSubmit: handleUpdateName, children: [_jsx("input", { className: "modal-input", style: {
                                    marginBottom: "25px",
                                    height: "45px",
                                    borderRadius: "5px",
                                    fontSize: "1.2rem",
                                }, type: "text", value: updatedName, onChange: (e) => setUpdatedName(e.target.value) }), _jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "10px" }, children: [_jsx("button", { className: "modal-button primary", type: "submit", style: { borderRadius: "5px", padding: "10px 40px" }, children: "Save" }), _jsx("button", { className: "modal-button secondary", type: "button", onClick: closeEditNameModal, style: { borderRadius: "5px", padding: "10px 40px" }, children: "Cancel" })] })] })] }), _jsxs(Modal, { isOpen: isFinishLineModalOpen, onRequestClose: () => setIsFinishLineModalOpen(false), contentLabel: "Finish Line", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Production Start & Finish Line" }), _jsxs("form", { onSubmit: handleUpdateFinishLine, className: styles.form, children: [_jsxs("label", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: ["Production Start", _jsx("input", { type: "date", "aria-label": "Production start date", value: selectedProductionStartDate, onChange: (e) => setSelectedProductionStartDate(e.target.value), className: styles.input })] }), _jsxs("label", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: ["Finish Line", _jsx("input", { type: "date", "aria-label": "Finish line date", value: selectedFinishLineDate, onChange: (e) => setSelectedFinishLineDate(e.target.value), className: styles.input })] }), _jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "10px" }, children: [_jsx("button", { className: "modal-button primary", type: "submit", style: { borderRadius: "5px", padding: "10px 20px" }, children: "Save" }), _jsx("button", { className: "modal-button secondary", type: "button", onClick: () => setIsFinishLineModalOpen(false), style: { borderRadius: "5px", padding: "10px 20px" }, children: "Cancel" })] })] })] }), _jsxs(Modal, { isOpen: isEditStatusModalOpen, onRequestClose: () => setIsEditStatusModalOpen(false), contentLabel: "Edit Status", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Edit Status" }), _jsxs("form", { onSubmit: handleUpdateStatus, children: [_jsxs("div", { style: { marginBottom: "15px" }, children: [_jsx("label", { children: "Status:" }), _jsx("input", { className: "modal-input", style: {
                                            marginLeft: "10px",
                                            height: "35px",
                                            borderRadius: "5px",
                                            fontSize: "1rem",
                                        }, type: "text", value: updatedStatus, onChange: (e) => setUpdatedStatus(e.target.value) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "10px" }, children: [_jsx("button", { className: "modal-button primary", type: "submit", style: { borderRadius: "5px", padding: "10px 20px" }, children: "Save" }), _jsx("button", { className: "modal-button secondary", type: "button", onClick: () => setIsEditStatusModalOpen(false), style: { borderRadius: "5px", padding: "10px 20px" }, children: "Cancel" })] })] })] }), _jsxs(Modal, { isOpen: isThumbnailModalOpen, onRequestClose: closeThumbnailModal, contentLabel: "Change Thumbnail", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Choose a Thumbnail" }), _jsx("div", { style: {
                            marginBottom: "20px",
                            display: "flex",
                            justifyContent: "center",
                        }, children: _jsxs("div", { style: {
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                            }, children: [_jsxs("div", { style: {
                                        width: "150px",
                                        height: "150px",
                                        borderRadius: "20px",
                                        border: thumbnailPreview
                                            ? "none"
                                            : `2px dashed ${isThumbDragging ? "#FA3356" : "#ccc"}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textAlign: "center",
                                        color: "#ccc",
                                        cursor: thumbnailPreview ? "default" : "pointer",
                                        position: "relative",
                                    }, onClick: !thumbnailPreview
                                        ? () => thumbnailInputRef.current?.click()
                                        : undefined, onDragOver: !thumbnailPreview ? handleThumbDragOver : undefined, onDragLeave: !thumbnailPreview ? handleThumbDragLeave : undefined, onDrop: !thumbnailPreview ? handleThumbDrop : undefined, children: [_jsx("input", { type: "file", accept: "image/*", ref: thumbnailInputRef, onChange: handleThumbnailFileChange, style: { display: "none" } }), thumbnailPreview ? (_jsx("div", { style: {
                                                position: "relative",
                                                width: "150px",
                                                height: "150px",
                                            }, children: _jsx(Cropper, { image: thumbnailPreview, crop: crop, zoom: zoom, aspect: 1, onCropChange: setCrop, onZoomChange: (z) => setZoom(z), onCropComplete: onCropComplete, objectFit: "cover" }) })) : (_jsx("span", { style: { width: "100%" }, children: "Click or drag thumbnail here" })), isThumbDragging && (_jsx("div", { style: {
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: "rgba(0,0,0,0.6)",
                                                color: "#fff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                pointerEvents: "none",
                                                borderRadius: "20px",
                                            }, children: "Drop to upload" })), isThumbnailUploading && (_jsx("div", { style: {
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                background: "rgba(0,0,0,0.4)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                borderRadius: "20px",
                                            }, children: _jsxs("div", { className: "dot-loader", children: [_jsx("span", {}), _jsx("span", {}), _jsx("span", {})] }) }))] }), thumbnailPreview && (_jsx("input", { type: "range", min: 1, max: 3, step: 0.1, value: zoom, onChange: (e) => setZoom(parseFloat(e.target.value)), style: { width: "150px", marginTop: "10px" } })), thumbnailPreview && (_jsx("button", { className: "modal-button secondary", type: "button", onClick: handleRemoveThumbnail, style: {
                                        marginTop: "10px",
                                        borderRadius: "5px",
                                        padding: "5px 10px",
                                    }, children: "Remove" }))] }) }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "center",
                            gap: "10px",
                            marginTop: "30px",
                        }, children: [_jsx("button", { className: "modal-button primary", onClick: handleUploadThumbnail, style: { padding: "10px 20px", borderRadius: "5px" }, disabled: isThumbnailUploading, children: "Save" }), _jsx("button", { className: "modal-button secondary", onClick: closeThumbnailModal, style: { padding: "10px 20px", borderRadius: "5px" }, children: "Cancel" })] })] }), _jsxs(Modal, { isOpen: isColorModalOpen, onRequestClose: closeColorModal, contentLabel: "Choose Color", closeTimeoutMS: 300, className: {
                    base: `${styles.modalContent} ${styles.colorModalContent}`,
                    afterOpen: `${styles.modalContentAfterOpen} ${styles.colorModalContent}`,
                    beforeClose: `${styles.modalContentBeforeClose} ${styles.colorModalContent}`,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Project Color" }), _jsx(HexColorPicker, { color: selectedColor, onChange: setSelectedColor, className: styles.colorPicker }), _jsxs("div", { className: styles.hexRgbWrapper, style: { marginTop: "10px" }, children: [_jsx(HexColorInput, { color: selectedColor, onChange: setSelectedColor, prefixed: true, style: {
                                    width: "100px",
                                    padding: "5px",
                                    borderRadius: "5px",
                                    textAlign: "center",
                                    backgroundColor: "#ffffff",
                                    color: "#000000",
                                    border: "1px solid #ccc",
                                } }), _jsxs("div", { style: { marginTop: "5px", fontSize: "0.9rem" }, children: ["RGB: ", hexToRgb(selectedColor)] })] }), _jsx("div", { className: styles.pipetteWrapper, children: _jsx(Pipette, { onClick: pickColorFromScreen, "aria-label": "Pick color from screen", style: {
                                cursor: "pointer",
                                width: "24px",
                                height: "24px",
                            } }) }), _jsxs("div", { style: {
                            display: "flex",
                            justifyContent: "space-around",
                            marginTop: "30px",
                        }, children: [_jsx("button", { className: "modal-button primary", onClick: handleSaveColor, style: { padding: "10px 20px", borderRadius: "5px" }, children: "Save" }), _jsx("button", { className: "modal-button secondary", onClick: closeColorModal, style: { padding: "10px 20px", borderRadius: "5px" }, children: "Cancel" })] })] }), _jsxs(Modal, { isOpen: isInvoiceInfoModalOpen, onRequestClose: closeInvoiceInfoModal, contentLabel: "Invoice Info", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Invoice Info" }), _jsxs("form", { onSubmit: handleSaveInvoiceInfo, className: styles.form, children: [_jsx("input", { className: "modal-input", type: "text", placeholder: "Brand Name", value: invoiceBrandName, onChange: (e) => setInvoiceBrandName(e.target.value), style: { marginBottom: "10px", borderRadius: "5px" } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Brand Address", value: invoiceBrandAddress, onChange: (e) => setInvoiceBrandAddress(e.target.value), style: { marginBottom: "10px", borderRadius: "5px" } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Brand Phone", value: invoiceBrandPhone, onChange: (e) => setInvoiceBrandPhone(e.target.value), style: { marginBottom: "10px", borderRadius: "5px" } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Client Name", value: clientName, onChange: (e) => setClientName(e.target.value), style: { marginBottom: "10px", borderRadius: "5px" } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Client Address", value: clientAddress, onChange: (e) => setClientAddress(e.target.value), style: { marginBottom: "10px", borderRadius: "5px" } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Client Phone", value: clientPhone, onChange: (e) => setClientPhone(e.target.value), style: { marginBottom: "20px", borderRadius: "5px" } }), _jsxs("div", { style: { display: "flex", justifyContent: "center", gap: "10px" }, children: [_jsx("button", { className: "modal-button primary", type: "submit", style: { borderRadius: "5px", padding: "10px 20px" }, children: "Save" }), _jsx("button", { className: "modal-button secondary", type: "button", onClick: closeInvoiceInfoModal, style: { borderRadius: "5px", padding: "10px 20px" }, children: "Cancel" })] })] })] }), _jsxs(Modal, { isOpen: isSettingsModalOpen, onRequestClose: () => setIsSettingsModalOpen(false), contentLabel: "Project Settings", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: styles.modalOverlay, children: [_jsx("h4", { style: { marginBottom: "20px" }, children: "Project Settings" }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: "10px" }, children: [_jsxs("button", { className: "modal-button primary", "aria-label": "Edit project name", onClick: () => {
                                    setIsSettingsModalOpen(false);
                                    openEditNameModal(true);
                                }, style: {
                                    borderRadius: "5px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }, children: [_jsx(Pencil, { size: 20, color: "white", "aria-hidden": "true" }), "Edit Name"] }), _jsxs("button", { className: "modal-button primary", "aria-label": "Edit project thumbnail", onClick: () => {
                                    setIsSettingsModalOpen(false);
                                    openThumbnailModal(true);
                                }, style: {
                                    borderRadius: "5px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }, children: [_jsx(ImageIcon, { size: 20, color: "white", "aria-hidden": "true" }), "Edit Thumbnail"] }), _jsxs("button", { className: "modal-button primary", "aria-label": "Change project color", onClick: () => {
                                    setIsSettingsModalOpen(false);
                                    openColorModal(true);
                                }, style: {
                                    borderRadius: "5px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }, children: [_jsx(Palette, { size: 20, color: "white", "aria-hidden": "true" }), "Change Color"] }), _jsxs("button", { className: "modal-button primary", "aria-label": "Edit invoice info", onClick: () => {
                                    setIsSettingsModalOpen(false);
                                    openInvoiceInfoModal(true);
                                }, style: {
                                    borderRadius: "5px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }, children: [_jsx(FontAwesomeIcon, { icon: faPen, color: "white" }), "Invoice Info"] }), isAdmin && (_jsxs(_Fragment, { children: [_jsx("div", { style: {
                                            borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                                            margin: "8px 0",
                                        } }), _jsxs("button", { className: "modal-button secondary", "aria-label": "Delete project", onClick: () => {
                                            setIsSettingsModalOpen(false);
                                            openDeleteConfirmationModal(true);
                                        }, style: {
                                            borderRadius: "5px",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            background: "#1a1a1a",
                                            border: "1px solid #ffffff",
                                        }, children: [_jsx(Trash, { size: 20, color: "white", "aria-hidden": "true" }), "Delete Project"] })] }))] })] }), _jsx(TeamModal, { isOpen: isTeamModalOpen, onRequestClose: closeTeamModal, members: teamMembers })] }));
};
const ProjectTabs = ({ projectSlug }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const tabRefs = useRef([]);
    const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });
    const [transitionEnabled, setTransitionEnabled] = useState(false);
    const storageKey = `project-tabs-prev:${projectSlug}`;
    const getActiveIndex = useCallback(() => {
        const base = `/dashboard/projects/${projectSlug}`;
        if (location.pathname.startsWith(`${base}/budget`))
            return 1;
        if (location.pathname.startsWith(`${base}/calendar`))
            return 2;
        if (location.pathname.startsWith(`${base}/designer`))
            return 3;
        return 0;
    }, [location.pathname, projectSlug]);
    const getFromIndex = useCallback(() => {
        if (location.state?.fromTab !== undefined) {
            return location.state.fromTab;
        }
        const stored = sessionStorage.getItem(storageKey);
        return stored !== null ? Number(stored) : getActiveIndex();
    }, [location.state, storageKey, getActiveIndex]);
    const updateSlider = useCallback(() => {
        const current = getActiveIndex();
        const el = tabRefs.current[current];
        if (el) {
            setSliderStyle({ width: el.offsetWidth, left: el.offsetLeft });
        }
        sessionStorage.setItem(storageKey, String(current));
    }, [getActiveIndex, storageKey]);
    useLayoutEffect(() => {
        const fromEl = tabRefs.current[getFromIndex()];
        if (fromEl) {
            setSliderStyle({ width: fromEl.offsetWidth, left: fromEl.offsetLeft });
        }
        // Snap to the starting tab without animation
        setTransitionEnabled(false);
    }, [getFromIndex]);
    useEffect(() => {
        // Allow the browser to paint the starting position before animating
        requestAnimationFrame(() => {
            setTransitionEnabled(true);
            updateSlider();
        });
    }, [updateSlider]);
    useEffect(() => {
        window.addEventListener("resize", updateSlider);
        return () => window.removeEventListener("resize", updateSlider);
    }, [updateSlider]);
    const { user } = useData();
    const isAdmin = user?.role === 'admin';
    const isDesigner = user?.role === 'designer';
    const showBudgetTab = isAdmin;
    const showCalendarTab = isAdmin || isDesigner;
    const showEditorTab = isAdmin || isDesigner;
    return (_jsxs("div", { className: "segmented-control with-slider", role: "tablist", "aria-label": "Project navigation", children: [_jsx("span", { className: "tab-slider", style: {
                    width: sliderStyle.width,
                    transform: `translateX(${sliderStyle.left}px)`,
                    transition: transitionEnabled ? undefined : "none",
                }, "aria-hidden": "true" }), _jsxs("button", { type: "button", ref: (el) => (tabRefs.current[0] = el), onClick: () => navigate(`/dashboard/projects/${projectSlug}`, {
                    state: { fromTab: getActiveIndex() },
                }), className: location.pathname === `/dashboard/projects/${projectSlug}`
                    ? "active"
                    : "", "aria-pressed": location.pathname === `/dashboard/projects/${projectSlug}`, children: [_jsx(LayoutDashboard, { size: 16 }), _jsx("span", { children: "Overview" })] }), showBudgetTab && (_jsxs("button", { type: "button", ref: (el) => (tabRefs.current[1] = el), onClick: () => navigate(`/dashboard/projects/${projectSlug}/budget`, {
                    state: { fromTab: getActiveIndex() },
                }), className: location.pathname.startsWith(`/dashboard/projects/${projectSlug}/budget`)
                    ? "active"
                    : "", "aria-pressed": location.pathname.startsWith(`/dashboard/projects/${projectSlug}/budget`), children: [_jsx(Coins, { size: 16 }), _jsx("span", { children: "Budget" })] })), showCalendarTab && (_jsxs("button", { type: "button", ref: (el) => (tabRefs.current[2] = el), onClick: () => navigate(`/dashboard/projects/${projectSlug}/calendar`, {
                    state: { fromTab: getActiveIndex() },
                }), className: location.pathname.startsWith(`/dashboard/projects/${projectSlug}/calendar`)
                    ? "active"
                    : "", "aria-pressed": location.pathname.startsWith(`/dashboard/projects/${projectSlug}/calendar`), children: [_jsx(CalendarIcon, { size: 16 }), _jsx("span", { children: "Calendar" })] })), showEditorTab && (_jsxs("button", { type: "button", ref: (el) => (tabRefs.current[3] = el), onClick: () => navigate(`/dashboard/projects/${projectSlug}/designer`, {
                    state: { fromTab: getActiveIndex() },
                }), className: location.pathname.startsWith(`/dashboard/projects/${projectSlug}/designer`)
                    ? "active"
                    : "", "aria-pressed": location.pathname.startsWith(`/dashboard/projects/${projectSlug}/designer`), children: [_jsx(PenTool, { size: 16 }), _jsx("span", { children: "Editor" })] }))] }));
};
export default React.memo(ProjectHeader);
