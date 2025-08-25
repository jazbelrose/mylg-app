import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
  useMemo,
  MouseEvent as ReactMouseEvent,
  FormEvent,
} from "react";
import "./ProjectHeader.css";
import Cropper, { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import Modal from "@/components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPen } from "@fortawesome/free-solid-svg-icons";
import {
  Pipette,
  Folder,
  Link2,
  Settings,
  Pencil,
  Image as ImageIcon,
  Palette,
  Trash,
  PenTool,
  LayoutDashboard,
  Coins,
  Calendar as CalendarIcon,
} from "lucide-react";
import { uploadData } from "aws-amplify/storage";
import { useData } from "@/app/contexts/DataProvider";
import { useSocket } from "@/app/contexts/SocketContext";
import { useAuth } from "@/app/contexts/AuthContext";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { slugify, findProjectBySlug } from "@/utils/slug";
import { HexColorPicker, HexColorInput } from "react-colorful";
import styles from "./FinishLineComponent.module.css";
import {
  POST_PROJECT_TO_USER_URL,
  S3_PUBLIC_BASE,
  apiFetch,
  fetchUserProfilesBatch,
} from "../../../../utils/api";
import AvatarStack from "@/components/AvatarStack";
import TeamModal from "./TeamModal";
import { enqueueProjectUpdate } from "@/utils/requestQueue";

// ---------- Types ----------
type TeamMember = {
  userId: string;
  firstName: string;
  lastName: string;
  thumbnail: string | null;
};

type TimelineEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  description?: string;
  hours?: number | string;
};

type Project = {
  projectId: string;
  title?: string;
  status?: string | number;
  color?: string;
  thumbnails?: string[];
  team?: { userId: string }[];
  productionStart?: string;
  dateCreated?: string;
  finishline?: string;
  invoiceBrandName?: string;
  invoiceBrandAddress?: string;
  invoiceBrandPhone?: string;
  clientName?: string;
  clientAddress?: string;
  clientPhone?: string;
  timelineEvents?: TimelineEvent[];
};

interface ProjectHeaderProps {
  title?: string; // not used directly but kept for parity
  parseStatusToNumber: (status: string | number | undefined) => number;
  userId: string;
  onProjectDeleted: (projectId: string) => void;
  activeProject: Project | null;
  showWelcomeScreen: () => void;
  onActiveProjectChange?: (project: Project) => void;
  onOpenFiles: () => void;
  onOpenQuickLinks: () => void;
}

// Cache team member profiles per project
const teamMembersCache = new Map<string, TeamMember[]>();

// Safely parse various date string formats into a Date object (YYYY-MM-DD or native formats)
function safeParse(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
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

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  parseStatusToNumber,
  userId,
  onProjectDeleted,
  activeProject,
  showWelcomeScreen,
  onActiveProjectChange,
  onOpenFiles,
  onOpenQuickLinks,
}) => {
  const { user, setActiveProject, updateProjectFields, isAdmin, projects } =
    useData() as any;
  const [saving, setSaving] = useState(false);
  const { ws } = useSocket() || ({} as any);
  const { refreshUser } = useAuth() as any;
  const navigate = useNavigate();
  const { projectSlug = "" } = useParams();

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Store active project locally for instant UI updates
  const [localActiveProject, setLocalActiveProject] = useState<Project>(
    activeProject || ({} as Project)
  );

  // Keep local state in sync with incoming activeProject changes
  useEffect(() => {
    setLocalActiveProject(activeProject || ({} as Project));
    setUpdatedName(activeProject?.title || "");
    setUpdatedStatus(activeProject?.status?.toString?.() || "");
    setSelectedColor(activeProject?.color || "#FA3356");
    setSelectedFinishLineDate(activeProject?.finishline || "");
    setSelectedProductionStartDate(
      activeProject?.productionStart || activeProject?.dateCreated || ""
    );
    setInvoiceBrandName(activeProject?.invoiceBrandName || "");
    setInvoiceBrandAddress(activeProject?.invoiceBrandAddress || "");
    setInvoiceBrandPhone(activeProject?.invoiceBrandPhone || "");
    setClientName(activeProject?.clientName || "");
    setClientAddress(activeProject?.clientAddress || "");
    setClientPhone(activeProject?.clientPhone || "");
  }, [activeProject]);

  // Update URL slug when project title changes locally or via WebSocket
  useEffect(() => {
    if (!localActiveProject?.title || !localActiveProject.projectId) return;
    const slug = slugify(localActiveProject.title);
    if (slug !== projectSlug) {
      const project = findProjectBySlug(projects, projectSlug);
      if (project && project.projectId === localActiveProject.projectId) {
        navigate(`/dashboard/projects/${slug}`, { replace: true });
      }
    }
  }, [
    localActiveProject?.title,
    localActiveProject?.projectId,
    projectSlug,
    projects,
    navigate,
  ]);

  // Derive project initial
  const projectInitial =
    localActiveProject?.title && localActiveProject.title.length > 0
      ? localActiveProject.title.charAt(0)
      : "";

  // Ensure displayStatus ends with %
  const displayStatus =
    localActiveProject?.status &&
    !localActiveProject.status.toString().trim().endsWith("%")
      ? `${localActiveProject.status}%`
      : (localActiveProject?.status as string) || "0%";

  const startDate = useMemo(
    () =>
      safeParse(
        localActiveProject?.productionStart || localActiveProject?.dateCreated
      ),
    [localActiveProject?.productionStart, localActiveProject?.dateCreated]
  );
  const endDate = useMemo(
    () => safeParse(localActiveProject?.finishline),
    [localActiveProject?.finishline]
  );

  const totalHoursForProject = useMemo(
    () =>
      (localActiveProject?.timelineEvents || []).reduce(
        (sum, ev) => sum + Number(ev.hours || 0),
        0
      ),
    [localActiveProject?.timelineEvents]
  );

  const rangeLabel = useMemo(() => {
    const totalPart = `Hrs Total: ${totalHoursForProject} hrs`;
    if (!startDate || !endDate) return totalPart;
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const startStr = startDate.toLocaleDateString(undefined, opts);
    const endStr = endDate.toLocaleDateString(undefined, opts);
    return `${startStr} – ${endStr} | ${totalPart}`;
  }, [startDate, endDate, totalHoursForProject]);

  // --------------------------
  // Modal state
  // --------------------------
  // Edit Name Modal
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [updatedName, setUpdatedName] = useState(localActiveProject?.title || "");

  // Edit Status Modal
  const [isEditStatusModalOpen, setIsEditStatusModalOpen] = useState(false);
  const [updatedStatus, setUpdatedStatus] = useState(
    localActiveProject?.status?.toString?.() || ""
  );

  // Finish Line Modal
  const [isFinishLineModalOpen, setIsFinishLineModalOpen] = useState(false);
  const [selectedFinishLineDate, setSelectedFinishLineDate] = useState(
    localActiveProject?.finishline || ""
  );
  const [selectedProductionStartDate, setSelectedProductionStartDate] =
    useState(
      localActiveProject?.productionStart ||
        localActiveProject?.dateCreated ||
        ""
    );

  // Invoice Info Modal
  const [isInvoiceInfoModalOpen, setIsInvoiceInfoModalOpen] = useState(false);
  const [invoiceBrandName, setInvoiceBrandName] = useState(
    localActiveProject?.invoiceBrandName || ""
  );
  const [invoiceBrandAddress, setInvoiceBrandAddress] = useState(
    localActiveProject?.invoiceBrandAddress || ""
  );
  const [invoiceBrandPhone, setInvoiceBrandPhone] = useState(
    localActiveProject?.invoiceBrandPhone || ""
  );
  const [clientName, setClientName] = useState(
    localActiveProject?.clientName || ""
  );
  const [clientAddress, setClientAddress] = useState(
    localActiveProject?.clientAddress || ""
  );
  const [clientPhone, setClientPhone] = useState(
    localActiveProject?.clientPhone || ""
  );

  // Delete Confirmation Modal
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] =
    useState(false);

  // Thumbnail Modal
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [selectedThumbnailFile, setSelectedThumbnailFile] =
    useState<File | null>(null);
  const [isThumbDragging, setIsThumbDragging] = useState(false);
  const [isThumbnailUploading, setIsThumbnailUploading] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Project Settings Modal
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const queueUpdate = async (payload: Partial<Project>) => {
    if (!activeProject?.projectId) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateProjectFields, activeProject.projectId, payload);
    } finally {
      setSaving(false);
    }
  };

  // Track if a modal was opened from the settings modal so we can return
  const [returnToSettings, setReturnToSettings] = useState(false);

  // When the thumbnail modal opens, force a resize once so Cropper recalculates
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
  const [selectedColor, setSelectedColor] = useState(
    localActiveProject?.color || "#FA3356"
  );

  const hexToRgb = (hex: string) => {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  const onCropComplete = useCallback((_: Area, cropped: Area) => {
    setCroppedAreaPixels(cropped);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener("load", () => resolve(img));
      img.addEventListener("error", (err) => reject(err));
      img.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    cropArea: Area,
    type = "image/jpeg"
  ): Promise<Blob> => {
    const img = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    );
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob as Blob), type);
    });
  };

  // Pick color from anywhere on the screen using the EyeDropper API
  const pickColorFromScreen = async () => {
    const EyeDropperCtor = (window as any).EyeDropper;
    if (EyeDropperCtor) {
      try {
        const eyeDropper = new EyeDropperCtor();
        const { sRGBHex } = await eyeDropper.open();
        setSelectedColor(sRGBHex);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("EyeDropper cancelled or failed", err);
      }
    } else {
      alert("Your browser does not support the EyeDropper API.");
    }
  };

  // --------------------------
  // Team avatars
  // --------------------------
  const projectId = activeProject?.projectId;
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(
    projectId && teamMembersCache.has(projectId)
      ? (teamMembersCache.get(projectId) as TeamMember[])
      : []
  );
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      if (
        !projectId ||
        !localActiveProject ||
        !Array.isArray(localActiveProject.team)
      ) {
        if (isMounted) {
          setTeamMembers([]);
          if (projectId) teamMembersCache.set(projectId, []);
        }
        return;
      }
      try {
        const ids = localActiveProject.team.map((m) => m.userId);
        const profiles = await fetchUserProfilesBatch(ids);
        const map = new Map(profiles.map((p: any) => [p.userId, p]));
        const results: TeamMember[] = localActiveProject.team.map((member) => {
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
      } catch {
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
  }, [projectId, JSON.stringify(localActiveProject?.team)]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (updatedName === activeProject.title) {
      closeEditNameModal();
      return;
    }
    try {
      await queueUpdate({ title: updatedName });
      const updatedProject = { ...activeProject, title: updatedName };
      setLocalActiveProject(updatedProject);
      onActiveProjectChange?.(updatedProject);

      const newSlug = slugify(updatedName);
      if (projectSlug !== newSlug) {
        navigate(`/dashboard/projects/${newSlug}`, { replace: true });
      }

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: updatedName || activeProject.title,
            fields: { title: updatedName },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update project name:", error);
    } finally {
      closeEditNameModal();
    }
  };

  const openEditStatusModal = () => {
    setUpdatedStatus(localActiveProject.status?.toString?.() || "");
    setIsEditStatusModalOpen(true);
  };
  const handleUpdateStatus = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (updatedStatus === String(activeProject.status ?? "")) {
      setIsEditStatusModalOpen(false);
      return;
    }
    const updatedProject = { ...localActiveProject, status: updatedStatus };
    setLocalActiveProject(updatedProject);
    onActiveProjectChange?.(updatedProject);
    setActiveProject(updatedProject);
    await queueUpdate({ status: updatedStatus });

    if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          action: "projectUpdated",
          projectId: activeProject.projectId,
          title: activeProject.title,
          fields: { status: updatedStatus },
          conversationId: `project#${activeProject.projectId}`,
          username: user?.firstName || "Someone",
          senderId: user.userId,
        })
      );
    }
    setIsEditStatusModalOpen(false);
  };

  const openFinishLineModal = () => {
    setSelectedFinishLineDate(localActiveProject.finishline || "");
    setSelectedProductionStartDate(
      localActiveProject.productionStart || localActiveProject.dateCreated || ""
    );
    setIsFinishLineModalOpen(true);
  };
  const handleUpdateFinishLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    try {
      const updatedProject = {
        ...localActiveProject,
        finishline: selectedFinishLineDate,
        productionStart: selectedProductionStartDate,
      };
      setLocalActiveProject(updatedProject);
      onActiveProjectChange?.(updatedProject);
      setActiveProject(updatedProject);

      await queueUpdate({
        finishline: selectedFinishLineDate,
        productionStart: selectedProductionStartDate,
      });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
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
          })
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to update finish line:", error);
    } finally {
      setIsFinishLineModalOpen(false);
    }
  };

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
    if (!activeProject?.projectId) {
      // eslint-disable-next-line no-console
      console.error("No active project to delete.");
      return;
    }
    const pid = activeProject.projectId;
    try {
      const response = await apiFetch(
        `${POST_PROJECT_TO_USER_URL}?userId=${userId}&projectId=${pid}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) throw new Error("Network response was not ok");
      onProjectDeleted(pid);
      await refreshUser();
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error("Error during project deletion:", error?.message || error);
    }
    closeDeleteConfirmationModal();
    showWelcomeScreen();
  };

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

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedThumbnailFile(file);
      const previewURL = URL.createObjectURL(file);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(previewURL);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };
  const handleThumbDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsThumbDragging(true);
  };
  const handleThumbDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsThumbDragging(false);
  };
  const handleThumbDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsThumbDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedThumbnailFile(file);
      const previewURL = URL.createObjectURL(file);
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(previewURL);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  };
  const handleRemoveThumbnail = () => {
    if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    setThumbnailPreview(null);
    setSelectedThumbnailFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  };

  useEffect(() => {
    return () => {
      if (thumbnailPreview) URL.revokeObjectURL(thumbnailPreview);
    };
  }, [thumbnailPreview]);

  const handleUploadThumbnail = async () => {
    if (!selectedThumbnailFile || !activeProject) return;
    try {
      setIsThumbnailUploading(true);
      const croppedBlob =
        croppedAreaPixels && thumbnailPreview
          ? await getCroppedImg(
              thumbnailPreview,
              croppedAreaPixels,
              selectedThumbnailFile.type
            )
          : selectedThumbnailFile;

      const filename = `project-thumbnails/${activeProject.projectId}/${selectedThumbnailFile.name}`;
      await uploadData({
        key: filename,
        data: croppedBlob,
        options: { accessLevel: "public" },
      });

      // Small delay to let the CDN catch up (as in your original)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const encodedProjectId = encodeURIComponent(activeProject.projectId);
      const encodedFileName = encodeURIComponent(selectedThumbnailFile.name);
      const uploadedURL = `${S3_PUBLIC_BASE}/project-thumbnails/${encodedProjectId}/${encodedFileName}`;

      const updatedLocal: Project = {
        ...localActiveProject,
        thumbnails: Array.from(
          new Set([uploadedURL, ...(localActiveProject.thumbnails || [])])
        ),
      };
      setLocalActiveProject(updatedLocal);
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);

      await queueUpdate({ thumbnails: [uploadedURL] });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields: { thumbnails: [uploadedURL] },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }

      closeThumbnailModal();
      // eslint-disable-next-line no-console
      console.log("Thumbnail updated successfully");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error uploading thumbnail:", error);
    } finally {
      setIsThumbnailUploading(false);
    }
  };

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
    if (!activeProject) return;
    try {
      const updatedLocal = { ...localActiveProject, color: selectedColor };
      setLocalActiveProject(updatedLocal);
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);
      await queueUpdate({ color: selectedColor });

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields: { color: selectedColor },
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Error updating color:", error);
    } finally {
      closeColorModal();
    }
  };

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
  const handleSaveInvoiceInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
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
      onActiveProjectChange?.(updatedLocal);
      setActiveProject(updatedLocal);
      await queueUpdate(fields);

      if (ws && (ws as WebSocket).readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "projectUpdated",
            projectId: activeProject.projectId,
            title: activeProject.title,
            fields,
            conversationId: `project#${activeProject.projectId}`,
            username: user?.firstName || "Someone",
            senderId: user.userId,
          })
        );
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error updating invoice info:", err);
    } finally {
      closeInvoiceInfoModal();
    }
  };

  const openSettingsModal = () => {
    setReturnToSettings(false);
    setIsSettingsModalOpen(true);
  };
  const openTeamModal = () => setIsTeamModalOpen(true);
  const closeTeamModal = () => setIsTeamModalOpen(false);

  // --------------------------
  // Render
  // --------------------------
  return (
    <div>
      {saving && <div style={{ color: "#FA3356" }}>Saving...</div>}

      <div className="project-header">
        <div className="header-content">
          <div className="left-side">
            <FontAwesomeIcon
              icon={faArrowLeft}
              className="back-icon interactive"
              onClick={showWelcomeScreen}
              title="Back to Projects"
              aria-label="Back to Projects"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, showWelcomeScreen)}
            />

            <div
              onClick={() => openThumbnailModal(false)}
              onKeyDown={(e) => handleKeyDown(e, () => openThumbnailModal(false))}
              role="button"
              tabIndex={0}
              title="Change Project Thumbnail"
              aria-label="Change Project Thumbnail"
              style={{ cursor: "pointer", marginRight: "15px" }}
              className="interactive project-logo-wrapper"
            >
              {localActiveProject?.thumbnails &&
              localActiveProject.thumbnails.length > 0 ? (
                <img
                  src={localActiveProject.thumbnails[0]}
                  alt="Project Thumbnail"
                  className="project-logo"
                />
              ) : (
                <svg id="InitialSVG" viewBox="0 50 300 300" className="project-logo">
                  <g>
                    <ellipse
                      className="initial-ellipse"
                      cx="141.79"
                      cy="192.67"
                      rx="135"
                      ry="135"
                    />
                    <text
                      className="initial"
                      x="141.5"
                      y="185"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      {projectInitial.toUpperCase()}
                    </text>
                  </g>
                </svg>
              )}
            </div>

            <div className="single-project-title">
              <h2 className="project-title-heading">
                {localActiveProject ? localActiveProject.title : "Summary"}
              </h2>
            </div>

            <svg
              id="StatusSVG"
              viewBox="0 0 400 400"
              onClick={openEditStatusModal}
              onKeyDown={(e) => handleKeyDown(e, openEditStatusModal)}
              role="button"
              tabIndex={0}
              title={`Status: ${displayStatus} Complete`}
              aria-label={`Status: ${displayStatus} Complete`}
              className="interactive status-svg"
              style={{ cursor: "pointer" }}
            >
              <text
                className="project-status"
                transform={`translate(${
                  localActiveProject?.status !== "100%" ? 75 : 56.58
                } 375.21)`}
              >
                <tspan x="22.5" y="-136">
                  {displayStatus}
                </tspan>
              </text>
              {localActiveProject && (
                <ellipse
                  cx="200"
                  cy="200"
                  rx="160"
                  ry="160"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="15"
                  strokeDasharray={`${
                    (parseStatusToNumber(localActiveProject.status) / 100) * 1002
                  }, 1004`}
                >
                  {parseStatusToNumber(localActiveProject.status) < 100 && (
                    <animate
                      attributeName="stroke-dasharray"
                      from="0, 1004"
                      to={`${
                        (parseStatusToNumber(localActiveProject.status) / 100) *
                        1002
                      }, 1004`}
                      dur="1s"
                      begin="0s"
                      fill="freeze"
                    />
                  )}
                </ellipse>
              )}
            </svg>

            <AvatarStack members={teamMembers} onClick={openTeamModal} />

            <div
              className="finish-line-header interactive"
              onClick={openFinishLineModal}
              onKeyDown={(e) => handleKeyDown(e, openFinishLineModal)}
              role="button"
              tabIndex={0}
              title="Production dates"
              aria-label="Production dates"
              style={{ cursor: "pointer" }}
            >
              <span>{rangeLabel}</span>
            </div>

            <div
              onClick={openSettingsModal}
              onKeyDown={(e) => handleKeyDown(e, openSettingsModal)}
              role="button"
              tabIndex={0}
              title="Project settings"
              aria-label="Project settings"
              className="interactive"
              style={{ cursor: "pointer", margin: "10px" }}
            >
              <Settings size={20} className="settings-icon" />
            </div>

            <div
              onClick={onOpenQuickLinks}
              onKeyDown={(e) => handleKeyDown(e, onOpenQuickLinks)}
              role="button"
              tabIndex={0}
              title="Quick links"
              aria-label="Quick links"
              className="interactive"
              style={{ cursor: "pointer" }}
            >
              <Link2 size={20} />
            </div>

            <div
              onClick={onOpenFiles}
              onKeyDown={(e) => handleKeyDown(e, onOpenFiles)}
              role="button"
              tabIndex={0}
              title="Open file manager"
              aria-label="Open file manager"
              className="interactive"
              style={{ cursor: "pointer", margin: "10px" }}
            >
              <Folder size={20} />
            </div>

            <Modal
              isOpen={isConfirmDeleteModalOpen}
              onRequestClose={closeDeleteConfirmationModal}
              contentLabel="Confirm Delete Project"
              closeTimeoutMS={300}
              className={{
                base: styles.modalContent,
                afterOpen: styles.modalContentAfterOpen,
                beforeClose: styles.modalContentBeforeClose,
              }}
              overlayClassName={styles.modalOverlay}
            >
              <h4 style={{ fontSize: "1rem", paddingBottom: "20px" }}>
                Are you sure you want to delete this project?
              </h4>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
                <button
                  className="modal-button primary"
                  onClick={handleDeleteProject}
                  style={{ borderRadius: "5px" }}
                >
                  Yes
                </button>
                <button
                  className="modal-button secondary"
                  onClick={closeDeleteConfirmationModal}
                  style={{ borderRadius: "5px" }}
                >
                  No
                </button>
              </div>
            </Modal>
          </div>

          <div className="right-side">
            <div className="project-nav-tabs" style={{ padding: "0 10px 10px" }}>
              <ProjectTabs projectSlug={projectSlug} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Name */}
      <Modal
        isOpen={isEditNameModalOpen}
        onRequestClose={closeEditNameModal}
        contentLabel="Edit Project Name"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Edit Project Name</h4>
        <form onSubmit={handleUpdateName}>
          <input
            className="modal-input"
            style={{
              marginBottom: "25px",
              height: "45px",
              borderRadius: "5px",
              fontSize: "1.2rem",
            }}
            type="text"
            value={updatedName}
            onChange={(e) => setUpdatedName(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              className="modal-button primary"
              type="submit"
              style={{ borderRadius: "5px", padding: "10px 40px" }}
            >
              Save
            </button>
            <button
              className="modal-button secondary"
              type="button"
              onClick={closeEditNameModal}
              style={{ borderRadius: "5px", padding: "10px 40px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Finish Line */}
      <Modal
        isOpen={isFinishLineModalOpen}
        onRequestClose={() => setIsFinishLineModalOpen(false)}
        contentLabel="Finish Line"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Production Start & Finish Line</h4>
        <form onSubmit={handleUpdateFinishLine} className={styles.form}>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            Production Start
            <input
              type="date"
              aria-label="Production start date"
              value={selectedProductionStartDate}
              onChange={(e) => setSelectedProductionStartDate(e.target.value)}
              className={styles.input}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            Finish Line
            <input
              type="date"
              aria-label="Finish line date"
              value={selectedFinishLineDate}
              onChange={(e) => setSelectedFinishLineDate(e.target.value)}
              className={styles.input}
            />
          </label>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              className="modal-button primary"
              type="submit"
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Save
            </button>
            <button
              className="modal-button secondary"
              type="button"
              onClick={() => setIsFinishLineModalOpen(false)}
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Status */}
      <Modal
        isOpen={isEditStatusModalOpen}
        onRequestClose={() => setIsEditStatusModalOpen(false)}
        contentLabel="Edit Status"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Edit Status</h4>
        <form onSubmit={handleUpdateStatus}>
          <div style={{ marginBottom: "15px" }}>
            <label>Status:</label>
            <input
              className="modal-input"
              style={{
                marginLeft: "10px",
                height: "35px",
                borderRadius: "5px",
                fontSize: "1rem",
              }}
              type="text"
              value={updatedStatus}
              onChange={(e) => setUpdatedStatus(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              className="modal-button primary"
              type="submit"
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Save
            </button>
            <button
              className="modal-button secondary"
              type="button"
              onClick={() => setIsEditStatusModalOpen(false)}
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Thumbnail */}
      <Modal
        isOpen={isThumbnailModalOpen}
        onRequestClose={closeThumbnailModal}
        contentLabel="Change Thumbnail"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Choose a Thumbnail</h4>

        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
          >
            <div
              style={{
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
              }}
              onClick={
                !thumbnailPreview ? () => thumbnailInputRef.current?.click() : undefined
              }
              onDragOver={!thumbnailPreview ? handleThumbDragOver : undefined}
              onDragLeave={!thumbnailPreview ? handleThumbDragLeave : undefined}
              onDrop={!thumbnailPreview ? handleThumbDrop : undefined}
            >
              <input
                type="file"
                accept="image/*"
                ref={thumbnailInputRef}
                onChange={handleThumbnailFileChange}
                style={{ display: "none" }}
              />

              {thumbnailPreview ? (
                <div style={{ position: "relative", width: 150, height: 150 }}>
                  <Cropper
                    image={thumbnailPreview}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={(z) => setZoom(z)}
                    onCropComplete={onCropComplete}
                    objectFit="cover"
                  />
                </div>
              ) : (
                <span style={{ width: "100%" }}>Click or drag thumbnail here</span>
              )}

              {isThumbDragging && (
                <div
                  style={{
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
                  }}
                >
                  Drop to upload
                </div>
              )}

              {isThumbnailUploading && (
                <div
                  style={{
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
                  }}
                >
                  <div className="dot-loader">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            {thumbnailPreview && (
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: "150px", marginTop: "10px" }}
              />
            )}

            {thumbnailPreview && (
              <button
                className="modal-button secondary"
                type="button"
                onClick={handleRemoveThumbnail}
                style={{ marginTop: "10px", borderRadius: "5px", padding: "5px 10px" }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginTop: "30px",
          }}
        >
          <button
            className="modal-button primary"
            onClick={handleUploadThumbnail}
            style={{ padding: "10px 20px", borderRadius: "5px" }}
            disabled={isThumbnailUploading}
          >
            Save
          </button>
          <button
            className="modal-button secondary"
            onClick={closeThumbnailModal}
            style={{ padding: "10px 20px", borderRadius: "5px" }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Color */}
      <Modal
        isOpen={isColorModalOpen}
        onRequestClose={closeColorModal}
        contentLabel="Choose Color"
        closeTimeoutMS={300}
        className={{
          base: `${styles.modalContent} ${styles.colorModalContent}`,
          afterOpen: `${styles.modalContentAfterOpen} ${styles.colorModalContent}`,
          beforeClose: `${styles.modalContentBeforeClose} ${styles.colorModalContent}`,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Project Color</h4>
        <HexColorPicker
          color={selectedColor}
          onChange={setSelectedColor}
          className={styles.colorPicker}
        />
        <div className={styles.hexRgbWrapper} style={{ marginTop: "10px" }}>
          <HexColorInput
            color={selectedColor}
            onChange={setSelectedColor}
            prefixed
            style={{
              width: "100px",
              padding: "5px",
              borderRadius: "5px",
              textAlign: "center",
              backgroundColor: "#ffffff",
              color: "#000000",
              border: "1px solid #ccc",
            }}
          />
          <div style={{ marginTop: "5px", fontSize: "0.9rem" }}>
            RGB: {hexToRgb(selectedColor)}
          </div>
        </div>

        <div className={styles.pipetteWrapper}>
          <Pipette
            onClick={pickColorFromScreen}
            aria-label="Pick color from screen"
            style={{ cursor: "pointer", width: 24, height: 24 }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            marginTop: "30px",
          }}
        >
          <button
            className="modal-button primary"
            onClick={handleSaveColor}
            style={{ padding: "10px 20px", borderRadius: "5px" }}
          >
            Save
          </button>
          <button
            className="modal-button secondary"
            onClick={closeColorModal}
            style={{ padding: "10px 20px", borderRadius: "5px" }}
          >
            Cancel
          </button>
        </div>
      </Modal>

      {/* Invoice Info */}
      <Modal
        isOpen={isInvoiceInfoModalOpen}
        onRequestClose={closeInvoiceInfoModal}
        contentLabel="Invoice Info"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Invoice Info</h4>
        <form onSubmit={handleSaveInvoiceInfo} className={styles.form}>
          <input
            className="modal-input"
            type="text"
            placeholder="Brand Name"
            value={invoiceBrandName}
            onChange={(e) => setInvoiceBrandName(e.target.value)}
            style={{ marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            className="modal-input"
            type="text"
            placeholder="Brand Address"
            value={invoiceBrandAddress}
            onChange={(e) => setInvoiceBrandAddress(e.target.value)}
            style={{ marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            className="modal-input"
            type="text"
            placeholder="Brand Phone"
            value={invoiceBrandPhone}
            onChange={(e) => setInvoiceBrandPhone(e.target.value)}
            style={{ marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            className="modal-input"
            type="text"
            placeholder="Client Name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            style={{ marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            className="modal-input"
            type="text"
            placeholder="Client Address"
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            style={{ marginBottom: "10px", borderRadius: "5px" }}
          />
          <input
            className="modal-input"
            type="text"
            placeholder="Client Phone"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            style={{ marginBottom: "20px", borderRadius: "5px" }}
          />

          <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
            <button
              className="modal-button primary"
              type="submit"
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Save
            </button>
            <button
              className="modal-button secondary"
              type="button"
              onClick={closeInvoiceInfoModal}
              style={{ borderRadius: "5px", padding: "10px 20px" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* Settings */}
      <Modal
        isOpen={isSettingsModalOpen}
        onRequestClose={() => setIsSettingsModalOpen(false)}
        contentLabel="Project Settings"
        closeTimeoutMS={300}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={styles.modalOverlay}
      >
        <h4 style={{ marginBottom: "20px" }}>Project Settings</h4>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            className="modal-button primary"
            aria-label="Edit project name"
            onClick={() => {
              setIsSettingsModalOpen(false);
              openEditNameModal(true);
            }}
            style={{
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Pencil size={20} color="white" aria-hidden="true" />
            Edit Name
          </button>

          <button
            className="modal-button primary"
            aria-label="Edit project thumbnail"
            onClick={() => {
              setIsSettingsModalOpen(false);
              openThumbnailModal(true);
            }}
            style={{
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ImageIcon size={20} color="white" aria-hidden="true" />
            Edit Thumbnail
          </button>

          <button
            className="modal-button primary"
            aria-label="Change project color"
            onClick={() => {
              setIsSettingsModalOpen(false);
              openColorModal(true);
            }}
            style={{
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Palette size={20} color="white" aria-hidden="true" />
            Change Color
          </button>

          <button
            className="modal-button primary"
            aria-label="Edit invoice info"
            onClick={() => {
              setIsSettingsModalOpen(false);
              openInvoiceInfoModal(true);
            }}
            style={{
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FontAwesomeIcon icon={faPen} color="white" />
            Invoice Info
          </button>

          {isAdmin && (
            <>
              <div
                style={{
                  borderTop: "1px solid rgba(255, 255, 255, 0.2)",
                  margin: "8px 0",
                }}
              />
              <button
                className="modal-button secondary"
                aria-label="Delete project"
                onClick={() => {
                  setIsSettingsModalOpen(false);
                  openDeleteConfirmationModal(true);
                }}
                style={{
                  borderRadius: "5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#1a1a1a",
                  border: "1px solid #ffffff",
                }}
              >
                <Trash size={20} color="white" aria-hidden="true" />
                Delete Project
              </button>
            </>
          )}
        </div>
      </Modal>

      <TeamModal
        isOpen={isTeamModalOpen}
        onRequestClose={closeTeamModal}
        members={teamMembers}
      />
    </div>
  );
};

// -----------------------
// Project Tabs Component
// -----------------------
const ProjectTabs: React.FC<{ projectSlug: string }> = ({ projectSlug }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const tabRefs = useRef<HTMLButtonElement[]>([]);
  const [sliderStyle, setSliderStyle] = useState<{ width: number; left: number }>(
    { width: 0, left: 0 }
  );
  const [transitionEnabled, setTransitionEnabled] = useState(false);
  const storageKey = `project-tabs-prev:${projectSlug}`;

  const getActiveIndex = useCallback(() => {
    const base = `/dashboard/projects/${projectSlug}`;
    if (location.pathname.startsWith(`${base}/budget`)) return 1;
    if (location.pathname.startsWith(`${base}/calendar`)) return 2;
    if (location.pathname.startsWith(`${base}/editor`)) return 3;
    return 0;
  }, [location.pathname, projectSlug]);

  const getFromIndex = useCallback(() => {
    // @ts-expect-error - react-router state shape is app-specific
    if (location.state?.fromTab !== undefined) {
      // @ts-expect-error
      return location.state.fromTab as number;
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
    setTransitionEnabled(false);
  }, [getFromIndex]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setTransitionEnabled(true);
      updateSlider();
    });
  }, [updateSlider]);

  useEffect(() => {
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [updateSlider]);

  const { user } = useData() as any;
  const isAdmin = user?.role === "admin";
  const isDesigner = user?.role === "designer";
  const showBudgetTab = isAdmin;
  const showCalendarTab = isAdmin || isDesigner;
  const showEditorTab = isAdmin || isDesigner;

  return (
    <div
      className="segmented-control with-slider"
      role="tablist"
      aria-label="Project navigation"
    >
      <span
        className="tab-slider"
        style={{
          width: sliderStyle.width,
          transform: `translateX(${sliderStyle.left}px)`,
          transition: transitionEnabled ? undefined : "none",
        }}
        aria-hidden="true"
      />

      <button
        type="button"
        ref={(el) => el && (tabRefs.current[0] = el)}
        onClick={() =>
          navigate(`/dashboard/projects/${projectSlug}`, {
            state: { fromTab: getActiveIndex() },
          })
        }
        className={
          location.pathname === `/dashboard/projects/${projectSlug}` ? "active" : ""
        }
        aria-pressed={location.pathname === `/dashboard/projects/${projectSlug}`}
      >
        <LayoutDashboard size={16} />
        <span>Overview</span>
      </button>

      {showBudgetTab && (
        <button
          type="button"
          ref={(el) => el && (tabRefs.current[1] = el)}
          onClick={() =>
            navigate(`/dashboard/projects/${projectSlug}/budget`, {
              state: { fromTab: getActiveIndex() },
            })
          }
          className={
            location.pathname.startsWith(
              `/dashboard/projects/${projectSlug}/budget`
            )
              ? "active"
              : ""
          }
          aria-pressed={location.pathname.startsWith(
            `/dashboard/projects/${projectSlug}/budget`
          )}
        >
          <Coins size={16} />
          <span>Budget</span>
        </button>
      )}

      {showCalendarTab && (
        <button
          type="button"
          ref={(el) => el && (tabRefs.current[2] = el)}
          onClick={() =>
            navigate(`/dashboard/projects/${projectSlug}/calendar`, {
              state: { fromTab: getActiveIndex() },
            })
          }
          className={
            location.pathname.startsWith(
              `/dashboard/projects/${projectSlug}/calendar`
            )
              ? "active"
              : ""
          }
          aria-pressed={location.pathname.startsWith(
            `/dashboard/projects/${projectSlug}/calendar`
          )}
        >
          <CalendarIcon size={16} />
          <span>Calendar</span>
        </button>
      )}

      {showEditorTab && (
        <button
          type="button"
          ref={(el) => el && (tabRefs.current[3] = el)}
          onClick={() =>
            navigate(`/dashboard/projects/${projectSlug}/editor`, {
              state: { fromTab: getActiveIndex() },
            })
          }
          className={
            location.pathname.startsWith(
              `/dashboard/projects/${projectSlug}/editor`
            )
              ? "active"
              : ""
          }
          aria-pressed={location.pathname.startsWith(
            `/dashboard/projects/${projectSlug}/editor`
          )}
        >
          <PenTool size={16} />
          <span>Editor</span>
        </button>
      )}
    </div>
  );
};

export default React.memo(ProjectHeader);
