import React, { useState, useEffect, useRef, Fragment } from "react";
import Modal from "../../../../components/ModalWithStack";
import { GalleryVerticalEnd } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faEyeSlash,
  faEdit,
  faTrash,
  faXmark,
  faImage,
  faPlus,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import ConfirmModal from "../../../../components/ConfirmModal";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import {
  GALLERY_UPLOAD_URL,
  fetchGalleries,
  deleteGallery,
  deleteGalleryFiles,
  updateGallery,
  apiFetch,
  S3_PUBLIC_BASE,
} from "../../../../utils/api";
import { uploadData } from "aws-amplify/storage";
import styles from "./GalleryComponent.module.css";
import { slugify } from "../../../../utils/slug";
import { sha256 } from "../../../../utils/hash";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";

const READY_TIMEOUT_MS = 10000;
const COVER_PAGE_SIZE = 12;

type StringMap = Record<string, string>;

interface ImageObj {
  url?: string;
  [k: string]: any;
}

export interface Gallery {
  // identifiers
  galleryId?: string;
  id?: string;
  slug?: string;
  name?: string;

  // links / sources
  url?: string;
  link?: string;
  svgUrl?: string;
  updatedSvgUrl?: string;
  updatedPdfUrl?: string;
  updatedUrl?: string;
  originalSvgUrl?: string;
  originalPdfUrl?: string;
  originalUrl?: string;

  // auth / config
  password?: string;
  passwordHash?: string;
  passwordEnabled?: boolean;
  passwordTimeout?: number;

  // images
  coverImageUrl?: string;
  pageImageUrls?: string[];
  imageUrls?: string[];
  images?: Array<string | ImageObj>;

  // UI/optimistic
  uploading?: boolean;
  processing?: boolean;
  optimisticId?: string;
  progress?: number;

  // legacy passthrough
  [key: string]: any;
}

interface ProjectLite {
  projectId?: string;
  title?: string;
  // legacy
  gallery?: Gallery[];
  // current
  galleries?: Gallery[];
  [k: string]: any;
}

const getPendingKey = (id: string) => `pendingSlugs-${id}`;
const getRecentKey = (id: string) => `recentlyCreated-${id}`;

export function getUniqueSlug(
  desiredSlug: string,
  galleries: Gallery[] = [],
  legacyGalleries: Gallery[] = [],
  pending: string[] = []
): { slug: string; count: number } {
  const existingSlugs = [...legacyGalleries, ...galleries].map(
    (g) => g.slug || slugify(g.name || "")
  );
  let slug = desiredSlug;
  let count = 0;
  while (existingSlugs.includes(slug) || pending.includes(slug)) {
    count += 1;
    slug = `${desiredSlug}-${count}`;
  }
  return { slug, count };
}

export function getPreviewUrl(galleryItem: Gallery = {}): string | null {
  return (
    galleryItem.coverImageUrl ||
    galleryItem.pageImageUrls?.[0] ||
    galleryItem.imageUrls?.[0] ||
    (Array.isArray(galleryItem.images)
      ? typeof galleryItem.images[0] === "string"
        ? galleryItem.images[0]
        : galleryItem.images[0]?.url
      : null) ||
    galleryItem.url ||
    galleryItem.updatedSvgUrl ||
    galleryItem.updatedPdfUrl ||
    galleryItem.svgUrl ||
    galleryItem.originalSvgUrl ||
    galleryItem.originalPdfUrl ||
    galleryItem.originalUrl ||
    null
  );
}

const getGalleryId = (gallery: Gallery = {}): string =>
  gallery.galleryId || gallery.id || gallery.slug || slugify(gallery.name || "");

/** Util: throttle project update through queued updater */
const useQueuedUpdate = (
  projectId?: string,
  updateProjectFields?: (id: string, payload: any) => Promise<void>
) => {
  const [saving, setSaving] = useState(false);
  const queueUpdate = async (payload: any) => {
    if (!projectId || !updateProjectFields) return;
    try {
      setSaving(true);
      await enqueueProjectUpdate(updateProjectFields, projectId, payload);
    } finally {
      setSaving(false);
    }
  };
  return { queueUpdate, saving };
};

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const GalleryComponent: React.FC = () => {
  const {
    activeProject,
    updateProjectFields,
    isAdmin,
    isBuilder,
    isDesigner,
    fetchProjects,
  } = useData();
  const { ws } = useSocket() || {};
  const navigate = useNavigate();

  const { queueUpdate, saving } = useQueuedUpdate(
    activeProject?.projectId,
    updateProjectFields
  );

  const [isModalOpen, setModalOpen] = useState(false);
  const [legacyGalleries, setLegacyGalleries] = useState<Gallery[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loadingGalleries, setLoadingGalleries] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isModalDragging, setIsModalDragging] = useState(false);

  const [galleryName, setGalleryName] = useState("");
  const [gallerySlug, setGallerySlug] = useState("");
  const [galleryPassword, setGalleryPassword] = useState("");
  const [galleryPasswordEnabled, setGalleryPasswordEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [galleryTimeout, setGalleryTimeout] = useState<number>(15);
  const [galleryUrl, setGalleryUrl] = useState("");

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingCover, setPendingCover] = useState<{
    index: number;
    isLegacy: boolean;
    gallery: Gallery;
  } | null>(null);
  const [coverUploadingIndex, setCoverUploadingIndex] = useState<number | null>(null);
  const [coverOptions, setCoverOptions] = useState<{
    index: number;
    isLegacy: boolean;
    gallery: Gallery;
    urls: string[];
  } | null>(null);

  const [coverPage, setCoverPage] = useState(0);
  const startIndex = coverPage * COVER_PAGE_SIZE;
  const endIndex = startIndex + COVER_PAGE_SIZE;
  const currentCoverUrls = coverOptions?.urls.slice(startIndex, endIndex) || [];
  const totalCoverPages = coverOptions
    ? Math.ceil(coverOptions.urls.length / COVER_PAGE_SIZE)
    : 0;

  // Pending/Recent (localStorage)
  const [pendingSlugs, setPendingSlugs] = useState<string[]>([]);
  const [recentlyCreated, setRecentlyCreated] = useState<string[]>([]);
  const pendingRef = useRef<string[]>([]);
  useEffect(() => {
    pendingRef.current = pendingSlugs;
  }, [pendingSlugs]);

  useEffect(() => {
    setGallerySlug(galleryName ? slugify(galleryName) : "");
  }, [galleryName]);

  useEffect(() => {
    if (coverOptions) setCoverPage(0);
  }, [coverOptions]);

  // Helpers
  const sanitizeGalleries = (list: unknown): Gallery[] =>
    Array.isArray(list) ? (list as Gallery[]).filter((g) => g && Object.keys(g).length > 0) : [];

  const extractGalleries = (project?: ProjectLite) => {
    const legacy = sanitizeGalleries(project?.gallery);
    const current = sanitizeGalleries(project?.galleries);
    return { legacy, current };
  };

  const applyLists = (legacyList: Gallery[], currentList: Gallery[]) => {
    const cleanCurrent = sanitizeGalleries(currentList);
    const currentSlugs = cleanCurrent.map((g) => g.slug);
    const inProgress = galleries.filter(
      (g) => (g.uploading || g.processing) && !currentSlugs.includes(g.slug)
    );
    const mergedCurrent = [...cleanCurrent, ...inProgress];

    mergedCurrent.forEach((g) => {
      if (g.slug && pendingRef.current.includes(g.slug)) {
        setRecentlyCreated((prev) => [...prev, g.slug!]);
        setPendingSlugs((prev) => prev.filter((s) => s !== g.slug));
        setTimeout(() => {
          setRecentlyCreated((prev) => prev.filter((s) => s !== g.slug));
        }, READY_TIMEOUT_MS);
      }
    });

    setLegacyGalleries(legacyList);
    setGalleries(mergedCurrent);
  };

  const loadGalleries = async () => {
    if (!activeProject?.projectId) {
      setLegacyGalleries([]);
      setGalleries([]);
      setLoadingGalleries(false);
      return;
    }
    setLoadingGalleries(true);

    try {
      const apiGals = await fetchGalleries(activeProject.projectId);
      if (Array.isArray(apiGals) && apiGals.length > 0) {
        applyLists([], apiGals as Gallery[]);
        return;
      }
    } catch (err) {
      // fall back
    } finally {
      setLoadingGalleries(false);
    }

    const { legacy, current } = extractGalleries(activeProject as ProjectLite);
    applyLists(legacy, current);
  };

  useEffect(() => {
    void loadGalleries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject?.projectId]);

  // WS refresh
  useEffect(() => {
    if (!ws) return;
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.action === "galleryCreated" && data.projectId === activeProject?.projectId) {
          void loadGalleries();
        }
      } catch {
        // ignore
      }
    };
    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws, activeProject?.projectId]);

  // LocalStorage bootstrap/persist
  useEffect(() => {
    if (!activeProject?.projectId || typeof localStorage === "undefined") return;
    try {
      const storedPending = JSON.parse(
        localStorage.getItem(getPendingKey(activeProject.projectId)) || "[]"
      );
      setPendingSlugs(storedPending);
    } catch {
      setPendingSlugs([]);
    }
    try {
      const storedRecent = JSON.parse(
        localStorage.getItem(getRecentKey(activeProject.projectId)) || "[]"
      );
      setRecentlyCreated(storedRecent);
    } catch {
      setRecentlyCreated([]);
    }
  }, [activeProject?.projectId]);

  useEffect(() => {
    if (!activeProject?.projectId || typeof localStorage === "undefined") return;
    localStorage.setItem(getPendingKey(activeProject.projectId), JSON.stringify(pendingSlugs));
  }, [pendingSlugs, activeProject?.projectId]);

  useEffect(() => {
    if (!activeProject?.projectId || typeof localStorage === "undefined") return;
    localStorage.setItem(getRecentKey(activeProject.projectId), JSON.stringify(recentlyCreated));
  }, [recentlyCreated, activeProject?.projectId]);

  // File add / drag
  const addFile = (file: File | null) => {
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    const allowed = ["svg", "pdf"];
    if (!ext || !allowed.includes(ext)) {
      toast.error("Only SVG or PDF files are allowed");
      return;
    }
    setSelectedFile(file);
    if (!galleryName) setGalleryName(file.name);
    if (!gallerySlug) setGallerySlug(slugify(file.name));
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0] || null;
    addFile(file);
  };

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    addFile(file);
  };

  const handleModalDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (showForm || editingIndex !== null) return;
    e.preventDefault();
    setIsModalDragging(true);
  };
  const handleModalDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setIsModalDragging(false);
  };
  const handleModalDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (showForm || editingIndex !== null) return;
    e.preventDefault();
    setIsModalDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    if (file) {
      setEditingIndex(null);
      setGalleryName("");
      setGallerySlug("");
      setGalleryPassword("");
      setGalleryUrl("");
      setShowPassword(false);
      setGalleryPasswordEnabled(false);
      setGalleryTimeout(15);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(true);
      addFile(file);
    }
  };

  // Modal open/close
  const openModal = () => {
    void loadGalleries();
    setShowForm(false);
    setModalOpen(true);
  };
  const closeModal = () => {
    setEditingIndex(null);
    setGalleryName("");
    setGallerySlug("");
    setGalleryPassword("");
    setGalleryUrl("");
    setShowPassword(false);
    setShowForm(false);
    setModalOpen(false);
  };

  // Edit
  const startEdit = (combinedIndex: number) => {
    const legacyCount = legacyGalleries.length;
    if (combinedIndex < legacyCount) return; // read-only
    const idx = combinedIndex - legacyCount;
    const g = galleries[idx];
    setEditingIndex(idx);
    setShowForm(true);
    setGalleryName(g?.name || "");
    setGallerySlug(g?.slug || slugify(g?.name || ""));
    setGalleryUrl(g?.url || g?.link || "");
    setGalleryPassword(g?.password || "");
    setShowPassword(false);
    setGalleryPasswordEnabled(g?.passwordEnabled !== false);
    setGalleryTimeout(Math.round(((g?.passwordTimeout || 15 * 60 * 1000) as number) / 60000));
    if (!isModalOpen) setModalOpen(true);
  };

  // Upload gallery (presigned PUT)
  const uploadGalleryFile = async (
    file: File,
    name: string,
    slug: string,
    password: string,
    enabled: boolean,
    timeoutMs: number,
    onProgress?: (pct: number) => void
  ): Promise<{ key: string }> => {
    const presignRes = await apiFetch(GALLERY_UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: activeProject?.projectId,
        fileName: file.name,
        galleryName: name || file.name,
        gallerySlug: slug || undefined,
        galleryPassword: password || undefined,
        passwordEnabled: enabled,
        passwordTimeout: timeoutMs,
      }),
    });

    const { uploadUrl, key } = (await presignRes.json()) as { uploadUrl: string; key: string };
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", isPdf ? "application/pdf" : "image/svg+xml");
      if (activeProject?.projectId) xhr.setRequestHeader("x-amz-meta-projectid", activeProject.projectId);
      xhr.setRequestHeader("x-amz-meta-galleryname", name || file.name);
      if (slug) xhr.setRequestHeader("x-amz-meta-galleryslug", slug);
      if (password) xhr.setRequestHeader("x-amz-meta-gallerypassword", password);
      xhr.setRequestHeader("x-amz-meta-passwordenabled", String(enabled));
      xhr.setRequestHeader("x-amz-meta-passwordtimeout", String(timeoutMs));
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed with status ${xhr.status}`)));
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(file);
    });

    return { key };
  };

  const handleUpload = async () => {
    if (!selectedFile || !activeProject?.projectId) return;

    setUploadProgress(0);
    setUploading(true);

    const baseName = galleryName || selectedFile.name;
    const baseSlug = gallerySlug || slugify(baseName);
    const { slug: uniqueSlug, count } = getUniqueSlug(baseSlug, galleries, legacyGalleries, pendingSlugs);
    const uniqueName = count > 0 ? `${baseName} ${count}` : baseName;
    setGalleryName(uniqueName);
    setGallerySlug(uniqueSlug);

    const optimisticId = Date.now() + "-" + Math.random().toString(36).slice(2);
    const optimisticGallery: Gallery = {
      name: uniqueName,
      slug: uniqueSlug,
      optimisticId,
      uploading: true,
      processing: false,
      progress: 0,
    };

    setGalleries((prev) => [...prev, optimisticGallery]);
    setPendingSlugs((prev) => [...prev, optimisticGallery.slug!]);

    const doReset = () => {
      setSelectedFile(null);
      setGalleryName("");
      setGallerySlug("");
      setGalleryPassword("");
      setShowPassword(false);
      setGalleryPasswordEnabled(false);
      setGalleryTimeout(15);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const tryUpload = async (name: string, slug: string) => {
      await uploadGalleryFile(
        selectedFile,
        name,
        slug,
        galleryPassword,
        galleryPasswordEnabled,
        galleryTimeout * 60 * 1000,
        (pct) =>
          setGalleries((prev) =>
            prev.map((g) => (g.optimisticId === optimisticId ? { ...g, progress: pct } : g))
          )
      );
      setGalleries((prev) =>
        prev.map((g) =>
          g.optimisticId === optimisticId
            ? { ...g, uploading: false, processing: true, progress: 100 }
            : g
        )
      );
      doReset();
    };

    try {
      await tryUpload(uniqueName, uniqueSlug);
    } catch (err: any) {
      if (String(err?.message || "").includes("409")) {
        try {
          const { slug: retrySlug, count: retryCount } = getUniqueSlug(
            baseSlug,
            [...galleries, { slug: uniqueSlug } as Gallery],
            legacyGalleries,
            pendingSlugs
          );
          const retryName = retryCount > 0 ? `${baseName} ${retryCount}` : baseName;
          setGallerySlug(retrySlug);
          setGalleryName(retryName);
          setPendingSlugs((prev) => prev.map((s) => (s === uniqueSlug ? retrySlug : s)));
          setGalleries((prev) =>
            prev.map((g) =>
              g.optimisticId === optimisticId ? { ...g, slug: retrySlug, name: retryName } : g
            )
          );
          await tryUpload(retryName, retrySlug);
        } catch (err2) {
          console.error("Gallery upload failed:", err2);
          setGalleries((prev) => prev.filter((g) => g.optimisticId !== optimisticId));
        }
      } else {
        console.error("Gallery upload failed:", err);
        setGalleries((prev) => prev.filter((g) => g.optimisticId !== optimisticId));
      }
    } finally {
      setUploadProgress(0);
      setUploading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !activeProject?.projectId) return;

    const slugCollision = galleries.some(
      (g, idx) => idx !== editingIndex && (g.slug || slugify(g.name || "")) === gallerySlug
    );
    if (slugCollision) {
      toast.error("Slug already exists");
      return;
    }
    if (galleryUrl && !/^https?:\/\//i.test(galleryUrl)) {
      toast.error("URL must start with http or https");
      return;
    }

    const updated = [...galleries];
    const original = updated[editingIndex];
    const passwordHash = galleryPassword ? await sha256(galleryPassword) : "";

    updated[editingIndex] = {
      ...original,
      name: galleryName,
      slug: gallerySlug,
      url: galleryUrl || original?.url,
      password: galleryPassword,
      passwordHash,
      passwordEnabled: galleryPasswordEnabled,
      passwordTimeout: galleryTimeout * 60 * 1000,
    };
    setGalleries(updated);

    setEditingIndex(null);
    setGalleryName("");
    setGallerySlug("");
    setGalleryUrl("");
    setGalleryPassword("");
    setShowPassword(false);
    setGalleryPasswordEnabled(false);
    setGalleryTimeout(15);
    setShowForm(false);

    if (original?.galleryId) {
      try {
        await updateGallery(original.galleryId, {
          ...updated[editingIndex],
          projectId: activeProject.projectId,
        });
      } catch (err) {
        console.error("Failed to update gallery record", err);
      }
    }
    await queueUpdate({ galleries: updated });
  };

  const handleDeleteGallery = (combinedIndex: number) => {
    const legacyCount = legacyGalleries.length;
    if (combinedIndex < legacyCount) return; // can't delete legacy
    const idx = combinedIndex - legacyCount;
    const g = galleries[idx];
    if (!g) return;
    setDeleteIndex(idx);
    setIsConfirmingDelete(true);
  };

  const confirmDeleteGallery = async () => {
    if (deleteIndex === null || !activeProject?.projectId) {
      setIsConfirmingDelete(false);
      return;
    }
    const index = deleteIndex;
    const g = galleries[index];
    setDeleteIndex(null);

    const toastId = toast.loading("Deleting gallery...");
    try {
      await deleteGallery(g.galleryId || g.id, activeProject.projectId);
      await deleteGalleryFiles(activeProject.projectId, g.galleryId || g.id, g.slug);
      const updated = galleries.filter((_, i) => i !== index);
      setGalleries(updated);
      toast.update(toastId, {
        render: "Gallery deleted",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });
    } catch (err) {
      console.error("Delete gallery failed:", err);
      toast.update(toastId, {
        render: "Delete failed",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    } finally {
      setIsConfirmingDelete(false);
    }
  };

  // Cover handling
  const applyCoverUrl = async (
    index: number,
    isLegacy: boolean,
    galleryItem: Gallery,
    url?: string
  ) => {
    if (!url) return;
    const galleryId = getGalleryId(galleryItem);

    if (isLegacy) {
      const updated = legacyGalleries.map((g) =>
        getGalleryId(g) === galleryId ? { ...g, coverImageUrl: url } : g
      );
      try {
        await queueUpdate({ gallery: updated });
        setLegacyGalleries(updated);
      } catch (err) {
        console.error("Failed to update legacy gallery cover", err);
      }
    } else {
      const updated = galleries.map((g) =>
        getGalleryId(g) === galleryId ? { ...g, coverImageUrl: url } : g
      );
      try {
        await updateGallery(galleryId, {
          coverImageUrl: url,
          projectId: activeProject?.projectId,
        });
        setGalleries(updated);
        await queueUpdate({
          galleryUpdate: { id: galleryId, coverImageUrl: url },
          galleries: updated,
        });
      } catch (err) {
        console.error("Failed to update gallery cover", err);
      }
    }
  };

  const handleChangeCover = (combinedIndex: number) => {
    const legacyCount = legacyGalleries.length;
    const isLegacy = combinedIndex < legacyCount;
    const galleryItem = isLegacy
      ? legacyGalleries[combinedIndex]
      : galleries[combinedIndex - legacyCount];
    if (!galleryItem) return;

    const possibleUrls = [
      ...(galleryItem.pageImageUrls || []),
      ...(galleryItem.imageUrls || []),
      ...(Array.isArray(galleryItem.images)
        ? galleryItem.images
            .map((img) => (typeof img === "string" ? img : img?.url))
            .filter(Boolean) as string[]
        : []),
    ];

    if (possibleUrls.length > 0) {
      setCoverOptions({ index: combinedIndex, isLegacy, gallery: galleryItem, urls: possibleUrls });
    } else {
      setPendingCover({ index: combinedIndex, isLegacy, gallery: galleryItem });
      if (coverInputRef.current) coverInputRef.current.value = "";
      coverInputRef.current?.click();
    }
  };

  const chooseCoverUrl = (url: string) => {
    if (!coverOptions) return;
    void applyCoverUrl(coverOptions.index, coverOptions.isLegacy, coverOptions.gallery, url);
    setCoverOptions(null);
  };

  const handleUploadNewCover = () => {
    if (!coverOptions) return;
    setPendingCover({
      index: coverOptions.index,
      isLegacy: coverOptions.isLegacy,
      gallery: coverOptions.gallery,
    });
    if (coverInputRef.current) coverInputRef.current.value = "";
    coverInputRef.current?.click();
    setCoverOptions(null);
  };

  const handleCoverFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0] || null;
    if (!file || !pendingCover || !activeProject?.projectId) return;

    const galleryId = getGalleryId(pendingCover.gallery);
    const key = `projects/${activeProject.projectId}/galleries/${galleryId}/cover/${file.name}`;
    setCoverUploadingIndex(pendingCover.index);

    try {
      await uploadData({
        key,
        data: file,
        options: { accessLevel: "public" as any },
      });
      const encodedName = encodeURIComponent(file.name);
      const url = `${S3_PUBLIC_BASE}/projects/${activeProject.projectId}/galleries/${galleryId}/cover/${encodedName}?t=${Date.now()}`;
      await applyCoverUrl(pendingCover.index, pendingCover.isLegacy, pendingCover.gallery, url);
    } catch (err) {
      console.error("Failed to upload cover image", err);
    } finally {
      setCoverUploadingIndex(null);
      setPendingCover(null);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Compose view
  const combinedGalleries = [...legacyGalleries, ...galleries];
  const legacyCount = legacyGalleries.length;
  const hasGalleries = combinedGalleries.length > 0;

  const handleTriggerClick = async () => {
    if (combinedGalleries.length > 0) {
      const lastGallery = combinedGalleries[combinedGalleries.length - 1];
      const slug = lastGallery.slug || slugify(lastGallery.name || "");
      await fetchProjects(1);
      navigate(`/gallery/${slugify(activeProject?.title || "")}/${slug}`);
    } else {
      openModal();
    }
  };

  const isEditing = editingIndex !== null;
  const isCreating = showForm && !isEditing;
  const editingCombinedIndex = isEditing ? (editingIndex as number) + legacyCount : null;
  const displayedGalleries = isEditing
    ? [combinedGalleries[editingCombinedIndex as number]].filter(Boolean) as Gallery[]
    : isCreating
    ? []
    : combinedGalleries;

  return (
    <Fragment>
      {saving && <div style={{ color: "#FA3356", marginBottom: "10px" }}>Saving...</div>}

      <div
        className={`dashboard-item view-gallery ${styles.galleryTrigger}`}
        onClick={handleTriggerClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleTriggerClick();
          }
        }}
      >
        <div className={styles.topRow}>
          <GalleryVerticalEnd size={26} className={styles.triggerIcon} />
          <span>Galleries</span>
        </div>

        {combinedGalleries.length > 0 && (
          <div
            className={`${styles.thumbnailRow} ${styles.galleryCover}`}
            onClick={(e) => {
              e.stopPropagation();
              openModal();
            }}
            role="button"
            tabIndex={0}
            aria-label="Edit galleries"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                openModal();
              }
            }}
          >
            {combinedGalleries.map((galleryItem, idx) => {
              const previewUrl = getPreviewUrl(galleryItem);
              return previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className={styles.previewThumbnail}
                  key={galleryItem.slug || idx}
                />
              ) : (
                <div
                  className={`${styles.previewThumbnail} ${styles.previewPlaceholder}`}
                  key={galleryItem.slug || idx}
                >
                  <GalleryVerticalEnd size={32} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Gallery Modal"
        shouldCloseOnOverlayClick={!isConfirmingDelete}
        style={{ overlay: { pointerEvents: isConfirmingDelete ? "none" : "auto" } }}
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
        closeTimeoutMS={300}
      >
        <div
          className={`${styles.modalInner} ${
            !hasGalleries && !showForm && editingIndex === null ? styles.modalInnerEmpty : ""
          }`}
          onDragOver={handleModalDragOver}
          onDragLeave={handleModalDragLeave}
          onDrop={handleModalDrop}
        >
          <input
            type="file"
            accept=".svg,.pdf"
            onChange={handleFileChange}
            ref={fileInputRef}
            className={styles.hiddenInput}
          />
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverFileChange}
            ref={coverInputRef}
            className={styles.hiddenInput}
          />

          {hasGalleries || showForm || editingIndex !== null ? (
            <Fragment>
              {(showForm || editingIndex !== null) && (
                <div className={styles.editHeader}>
                  {editingIndex !== null && (
                    <button
                      className={styles.iconButton}
                      onClick={() => handleDeleteGallery((editingIndex as number) + legacyCount)}
                      aria-label="Delete gallery"
                      title="Delete gallery"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  )}
                  <button
                    className={styles.iconButton}
                    onClick={() => {
                      setEditingIndex(null);
                      setShowForm(false);
                    }}
                    aria-label="Close edit mode"
                    title="Close"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )}

              {(isAdmin || isBuilder || isDesigner) && !(showForm || editingIndex !== null) && (
                <button
                  className={`modal-submit-button uploads ${styles.newButton}`}
                  onClick={() => {
                    setEditingIndex(null);
                    setGalleryName("");
                    setGallerySlug("");
                    setGalleryPassword("");
                    setGalleryUrl("");
                    setShowPassword(false);
                    setGalleryPasswordEnabled(false);
                    setGalleryTimeout(15);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    setShowForm(true);
                  }}
                >
                  New Gallery
                </button>
              )}

              {displayedGalleries.length > 0 && (
                <div className={styles.listContainer}>
                  <ul className={styles.galleryList}>
                    {displayedGalleries.map((galleryItem, idx) => {
                      const index = isEditing ? (editingCombinedIndex as number) : idx;
                      const slug = galleryItem.slug || slugify(galleryItem.name || "");
                      const isLegacy = index < legacyCount;
                      const isProcessingItem = galleryItem.uploading || galleryItem.processing;
                      const ready = recentlyCreated.includes(slug);
                      const previewUrl = getPreviewUrl(galleryItem);

                      return (
                        <li key={`${slug}-${idx}`} className={styles.listItem}>
                          <div
                            className={`${styles.listRow} ${
                              editingIndex !== null && index === (editingIndex as number) + legacyCount
                                ? styles.activeRow
                                : ""
                            } ${isProcessingItem ? styles.processingRow : ""}`}
                            role="button"
                            tabIndex={0}
                            onClick={async () => {
                              if (isProcessingItem) return;
                              const useLink =
                                !galleryItem.updatedSvgUrl &&
                                !galleryItem.updatedPdfUrl &&
                                !galleryItem.url &&
                                galleryItem.link;
                              if (useLink && galleryItem.link) {
                                const target =
                                  galleryItem.link.startsWith("/") ||
                                  /^https?:\/\//i.test(galleryItem.link)
                                    ? galleryItem.link
                                    : `/${galleryItem.link}`;
                                window.location.assign(target);
                              } else {
                                await fetchProjects(1);
                                navigate(`/gallery/${slugify(activeProject?.title || "")}/${slug}`);
                              }
                              closeModal();
                            }}
                            onKeyDown={async (e) => {
                              if (isProcessingItem) return;
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                const useLink =
                                  !galleryItem.updatedSvgUrl &&
                                  !galleryItem.updatedPdfUrl &&
                                  !galleryItem.url &&
                                  galleryItem.link;
                                if (useLink && galleryItem.link) {
                                  const target =
                                    galleryItem.link.startsWith("/") ||
                                    /^https?:\/\//i.test(galleryItem.link)
                                      ? galleryItem.link
                                      : `/${galleryItem.link}`;
                                  window.location.assign(target);
                                } else {
                                  await fetchProjects(1);
                                  navigate(
                                    `/gallery/${slugify(activeProject?.title || "")}/${slug}`
                                  );
                                }
                                closeModal();
                              }
                            }}
                          >
                            {previewUrl ? (
                              <img
                                src={previewUrl}
                                className={`${styles.thumbnail} ${styles.listThumbnail}`}
                                alt=""
                              />
                            ) : (
                              <GalleryVerticalEnd
                                size={40}
                                className={`${styles.thumbnail} ${styles.listThumbnail}`}
                              />
                            )}

                            <div className={styles.listInfo}>
                              <span className={styles.listLink}>{galleryItem.name}</span>
                              <span className={styles.slugLabel}>{slug}</span>

                              {galleryItem.uploading && (
                                <span className={styles.statusMessage}>
                                  Uploading... {galleryItem.progress || 0}%
                                </span>
                              )}
                              {!galleryItem.uploading && galleryItem.processing && (
                                <span className={styles.statusMessage}>
                                  Creating gallery
                                  <span className={`${styles.dotSpinner} ${styles.inlineSpinner}`}>
                                    <span />
                                    <span />
                                    <span />
                                  </span>
                                </span>
                              )}
                              {!galleryItem.uploading && !galleryItem.processing && ready && (
                                <span className={styles.statusMessage}>
                                  Ready <span className={styles.readyIcon}>✓</span>
                                </span>
                              )}
                            </div>

                            {(isAdmin || isBuilder || isDesigner) && !isProcessingItem && (
                              <div
                                className={`${styles.actions} ${
                                  editingIndex !== null &&
                                  index === (editingIndex as number) + legacyCount
                                    ? styles.hideOnEdit
                                    : ""
                                }`}
                              >
                                <button
                                  className={styles.iconButton}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleChangeCover(index);
                                  }}
                                  aria-label={`Change cover for ${galleryItem.name} gallery`}
                                  disabled={coverUploadingIndex === index}
                                >
                                  {coverUploadingIndex === index ? (
                                    <span className={styles.dotSpinner}>
                                      <span />
                                      <span />
                                      <span />
                                    </span>
                                  ) : (
                                    <FontAwesomeIcon icon={faImage} />
                                  )}
                                </button>

                                {!isLegacy && (
                                  <Fragment>
                                    <button
                                      className={styles.iconButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEdit(index);
                                      }}
                                      aria-label={`Edit ${galleryItem.name} gallery`}
                                    >
                                      <FontAwesomeIcon icon={faEdit} />
                                    </button>
                                    <button
                                      className={styles.iconButton}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteGallery(index);
                                      }}
                                      aria-label={`Delete ${galleryItem.name} gallery`}
                                    >
                                      <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                  </Fragment>
                                )}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {(isAdmin || isBuilder || isDesigner) && hasGalleries && !showForm && editingIndex === null && (
                <div className={styles.dropHint}>
                  Drag a SVG or PDF file here to create a new gallery
                </div>
              )}
            </Fragment>
          ) : (
            <div
              className={styles.emptyDropArea}
              onClick={() => fileInputRef.current?.click()}
            >
              <span className={styles.emptyDropHint}>
                Drag or click a SVG or PDF file to create a new gallery
              </span>
            </div>
          )}

          {(showForm || editingIndex !== null) && (
            <div className={styles.modalActions}>
              <div className={styles.formColumn}>
                <input
                  type="text"
                  placeholder="Gallery Name"
                  value={galleryName}
                  onChange={(e) => setGalleryName(e.target.value)}
                  className="modal-input"
                />
                <input
                  type="text"
                  placeholder="Slug"
                  value={gallerySlug}
                  onChange={(e) => setGallerySlug(e.target.value)}
                  className="modal-input"
                />

                {editingIndex !== null && galleries[editingIndex]?.svgUrl && (
                  <a
                    href={galleries[editingIndex].svgUrl}
                    download
                    className={styles.originalLink}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 2L3 9h3v8h6v-6h2v6h6V9h3z" />
                    </svg>
                    {galleries[editingIndex].svgUrl.split("/").pop()}
                  </a>
                )}

                <div className={styles.passwordRow}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={galleryPassword}
                    onChange={(e) => setGalleryPassword(e.target.value)}
                    className="modal-input"
                  />
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                  <label className={styles.enableLabel}>
                    <input
                      type="checkbox"
                      checked={galleryPasswordEnabled}
                      onChange={(e) => setGalleryPasswordEnabled(e.target.checked)}
                    />
                    Enable
                  </label>
                </div>

                <div className={styles.timeoutGroup}>
                  <label
                    htmlFor="gallery-timeout"
                    className={`modal-label ${styles.timeoutLabel}`}
                  >
                    Password Timeout (minutes)
                  </label>
                  <div className={styles.timeoutInputRow}>
                    <input
                      id="gallery-timeout"
                      type="number"
                      min={1}
                      value={galleryTimeout}
                      onChange={(e) => setGalleryTimeout(Number(e.target.value))}
                      className={`modal-input ${styles.timeoutInput}`}
                    />
                    <span className={styles.timeoutUnit}>min</span>
                  </div>
                  <div className={styles.helperText}>How long the password remains valid.</div>
                </div>
              </div>

              {editingIndex === null ? (
                <div className={styles.uploadColumn}>
                  <div
                    className={`${styles.dragArea} ${isDragging ? styles.dragging : ""}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {isDragging && <div className={styles.dragOverlay}>Drop file to upload</div>}
                    {selectedFile ? (
                      <span>{selectedFile.name}</span>
                    ) : (
                      <span>Click or drag a SVG or PDF file here</span>
                    )}
                  </div>

                  <button
                    className="modal-submit-button uploads"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        Uploading
                        <span className={`${styles.dotSpinner} ${styles.inlineSpinner}`}>
                          <span />
                          <span />
                          <span />
                        </span>
                      </>
                    ) : (
                      "Upload"
                    )}
                  </button>
                </div>
              ) : (
                <button className="modal-submit-button uploads" onClick={handleSaveEdit}>
                  Save
                </button>
              )}

              <button
                className="modal-submit-button uploads"
                onClick={() => {
                  setEditingIndex(null);
                  setShowForm(false);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <div className={styles.modalActions}>
            <button className="modal-submit-button uploads" onClick={closeModal}>
              Close
            </button>
          </div>

          {uploadProgress > 0 && uploadProgress < 100 && (
            <div style={{ marginTop: "10px" }}>Uploading... {uploadProgress}%</div>
          )}

          {isModalDragging && !showForm && editingIndex === null && (
            <div className={styles.modalDropHint}>Drop file to create gallery</div>
          )}
        </div>
      </Modal>

      {/* Cover selection modal */}
      <Modal
        isOpen={!!coverOptions}
        onRequestClose={() => setCoverOptions(null)}
        contentLabel="Select Cover Image"
        className={{
          base: `${styles.modalContent} ${styles.coverModal}`,
          afterOpen: `${styles.modalContentAfterOpen} ${styles.coverModal}`,
          beforeClose: `${styles.modalContentBeforeClose} ${styles.coverModal}`,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      >
        <FontAwesomeIcon icon={faImage} className={styles.coverModalIcon} style={{ fontSize: 40 }} />
        <h2>Select Cover Image</h2>

        <div className={styles.coverSelectGrid}>
          {currentCoverUrls.map((url, i) => (
            <div
              className={styles.coverSelectOption}
              onClick={() => chooseCoverUrl(url)}
              key={`${startIndex + i}`}
            >
              <img src={url} alt={`Cover option ${startIndex + i + 1}`} />
            </div>
          ))}
        </div>

        {totalCoverPages > 1 && (
          <div className={styles.coverPagination}>
            <button
              className={styles.iconButton}
              onClick={() => setCoverPage((p) => Math.max(p - 1, 0))}
              disabled={coverPage === 0}
              aria-label="Previous"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              className={styles.iconButton}
              onClick={() => setCoverPage((p) => Math.min(p + 1, totalCoverPages - 1))}
              disabled={coverPage >= totalCoverPages - 1}
              aria-label="Next"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}

        <div className={styles.modalActions}>
          <button className="modal-submit-button uploads" onClick={handleUploadNewCover}>
            <FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} />
            Upload New
          </button>
          <button className="modal-submit-button" onClick={() => setCoverOptions(null)}>
            Cancel
          </button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={isConfirmingDelete}
        onRequestClose={() => {
          setIsConfirmingDelete(false);
          setDeleteIndex(null);
        }}
        onConfirm={confirmDeleteGallery}
        message="Delete this gallery?"
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      />
    </Fragment>
  );
};

export default GalleryComponent;
