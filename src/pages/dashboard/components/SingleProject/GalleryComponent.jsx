import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../../../components/ModalWithStack';
import { GalleryVerticalEnd } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
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
} from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../../../../components/ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { useData } from '../../../../app/contexts/DataProvider';
import { useSocket } from '../../../../app/contexts/SocketContext';
import {
    GALLERY_UPLOAD_URL,
    fetchGalleries,
    deleteGallery,
    deleteGalleryFiles,
    updateGallery,
    apiFetch,
    S3_PUBLIC_BASE,
} from '../../../../utils/api';
import { uploadData } from 'aws-amplify/storage';
import styles from './GalleryComponent.module.css';
import { slugify } from '../../../../utils/slug';
import { sha256 } from '../../../../utils/hash';
import { enqueueProjectUpdate } from '../../../../utils/requestQueue';


const READY_TIMEOUT_MS = 10000; // how long the "Ready" checkmark stays
const getPendingKey = (id) => `pendingSlugs-${id}`;
const getRecentKey = (id) => `recentlyCreated-${id}`;
const COVER_PAGE_SIZE = 12;

export function getUniqueSlug(desiredSlug, galleries = [], legacyGalleries = [], pending = []) {
    const existingSlugs = [...legacyGalleries, ...galleries]
        .map((g) => g.slug || slugify(g.name || ''));
    let slug = desiredSlug;
    let count = 0;
    while (existingSlugs.includes(slug) || pending.includes(slug)) {
        count += 1;
        slug = `${desiredSlug}-${count}`;
    }
    return { slug, count };
}

export function getPreviewUrl(galleryItem = {}) {
    return (
        galleryItem.coverImageUrl ||
        galleryItem.pageImageUrls?.[0] ||
        galleryItem.imageUrls?.[0] ||
        (Array.isArray(galleryItem.images)
            ? typeof galleryItem.images[0] === 'string'
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

// Helper to derive a stable identifier for a gallery. Some legacy gallery
// entries may not have an explicit `id` or `galleryId`, so we fall back to the
// slug or a slugified name. This identifier is used for updating gallery state
// and building S3 paths.
const getGalleryId = (gallery = {}) =>
  gallery.galleryId || gallery.id || gallery.slug || slugify(gallery.name || "");

const GalleryComponent = () => {
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
    const [isModalOpen, setModalOpen] = useState(false);
    const [legacyGalleries, setLegacyGalleries] = useState([]);
    const [galleries, setGalleries] = useState([]);
    const [loadingGalleries, setLoadingGalleries] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isModalDragging, setIsModalDragging] = useState(false);
    const [galleryName, setGalleryName] = useState('');
    const [gallerySlug, setGallerySlug] = useState('');
    const [galleryPassword, setGalleryPassword] = useState('');
    // password should be disabled by default when creating a new gallery
    const [galleryPasswordEnabled, setGalleryPasswordEnabled] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [galleryTimeout, setGalleryTimeout] = useState(15);
    const [galleryUrl, setGalleryUrl] = useState('');
    const [editingIndex, setEditingIndex] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
    const [deleteIndex, setDeleteIndex] = useState(null);
    const fileInputRef = useRef(null);
    const coverInputRef = useRef(null);
    const [pendingCover, setPendingCover] = useState(null); // { index, isLegacy, gallery }
    const [coverUploadingIndex, setCoverUploadingIndex] = useState(null);
    const [coverOptions, setCoverOptions] = useState(null); // { index, isLegacy, gallery, urls }
    const [coverPage, setCoverPage] = useState(0);

    useEffect(() => {
      setGallerySlug(galleryName ? slugify(galleryName) : "");
    }, [galleryName]);

    useEffect(() => {
      if (coverOptions) {
        setCoverPage(0);
      }
    }, [coverOptions]);

    const startIndex = coverPage * COVER_PAGE_SIZE;
    const endIndex = startIndex + COVER_PAGE_SIZE;
    const currentCoverUrls = coverOptions?.urls.slice(startIndex, endIndex) || [];
    const totalCoverPages = coverOptions ? Math.ceil(coverOptions.urls.length / COVER_PAGE_SIZE) : 0;

    const queueUpdate = async (payload) => {
      if (!activeProject?.projectId) return;
      try {
        setSaving(true);
        await enqueueProjectUpdate(updateProjectFields, activeProject.projectId, payload);
      } finally {
        setSaving(false);
      }
    };

    const sanitizeGalleries = (list) =>
      Array.isArray(list)
        ? list.filter((g) => g && Object.keys(g).length > 0)
        : [];

    const extractGalleries = (project) => {
      const legacy = sanitizeGalleries(project?.gallery);
      const current = sanitizeGalleries(project?.galleries);
      return { legacy, current };
    };

const loadGalleries = async () => {
  if (!activeProject?.projectId) {
    console.log("[loadGalleries] No active project!");
    setLegacyGalleries([]);
    setGalleries([]);
    setLoadingGalleries(false);
    return;
  }

  setLoadingGalleries(true);

  // Log the active project at the start
  console.log("[loadGalleries] Loading galleries for project:", activeProject);

  const applyLists = (legacyList, currentList) => {
    // Show what’s about to be set in state
    console.log("[loadGalleries] Legacy galleries:", legacyList);
    console.log("[loadGalleries] Current galleries:", currentList);
    const cleanCurrent = sanitizeGalleries(currentList);
    // Combine with any galleries that are still uploading/processing
    const currentSlugs = cleanCurrent.map(g => g.slug);
    const inProgress = galleries.filter(
      g => (g.uploading || g.processing) && !currentSlugs.includes(g.slug)
    );
    const mergedCurrent = [...cleanCurrent, ...inProgress];
    mergedCurrent.forEach(g => {
      if (pendingRef.current.includes(g.slug)) {
        setRecentlyCreated(prev => [...prev, g.slug]);
        setPendingSlugs(prev => prev.filter(s => s !== g.slug));
        setTimeout(() => {
          setRecentlyCreated(prev => prev.filter(s => s !== g.slug));
        }, READY_TIMEOUT_MS);
      }
    });
    setLegacyGalleries(legacyList);
    setGalleries(mergedCurrent);
  };

  try {
    const apiGalleries = await fetchGalleries(activeProject.projectId);
    console.log("[loadGalleries] API returned galleries:", apiGalleries);
    if (Array.isArray(apiGalleries) && apiGalleries.length > 0) {
      applyLists([], apiGalleries);
      return;
    }
  } catch (err) {
    console.error("[loadGalleries] Failed to fetch galleries", err);
  } finally {
    setLoadingGalleries(false);
  }
  const { legacy, current } = extractGalleries(activeProject);
  console.log("[loadGalleries] Falling back to extractGalleries:");
  console.log("  legacy:", legacy);
  console.log("  current:", current);
  applyLists(legacy, current);
};


    useEffect(() => {
      loadGalleries();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [activeProject?.projectId]);

    // Refresh gallery list when the server notifies us of a new gallery
    useEffect(() => {
      if (!ws) return;
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.action === 'galleryCreated' &&
            data.projectId === activeProject?.projectId
          ) {
            loadGalleries();
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };
      ws.addEventListener('message', handleMessage);
      return () => ws.removeEventListener('message', handleMessage);
    }, [ws, activeProject?.projectId, loadGalleries]);

    const openModal = () => {
      loadGalleries();
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

    const startEdit = (index) => {
        const legacyCount = legacyGalleries.length;
        if (index < legacyCount) return; // legacy galleries are read-only
        const idx = index - legacyCount;
        const g = galleries[idx];
        setEditingIndex(idx);
        setShowForm(true);
        setGalleryName(g.name || '');
        setGallerySlug(g.slug || slugify(g.name || ''));
        setGalleryUrl(g.url || g.link || '');
        setGalleryPassword(g.password || '');
        setShowPassword(false);
        setGalleryPasswordEnabled(g.passwordEnabled !== false);
        setGalleryTimeout(Math.round((g.passwordTimeout || 15 * 60 * 1000) / 60000));
        if (!isModalOpen) setModalOpen(true);
    };
    const uploadGalleryFile = async (file, name, slug, password, enabled, timeoutMs, onProgress) => {
        const presignRes = await apiFetch(GALLERY_UPLOAD_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId: activeProject.projectId,
                fileName: file.name,
                galleryName: name || file.name,
                gallerySlug: slug || undefined,
                galleryPassword: password || undefined,
                passwordEnabled: enabled,
                passwordTimeout: timeoutMs,
            }),
        });
        const { uploadUrl, key } = await presignRes.json();

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', isPdf ? 'application/pdf' : 'image/svg+xml');
            xhr.setRequestHeader('x-amz-meta-projectid', activeProject.projectId);
            xhr.setRequestHeader('x-amz-meta-galleryname', name || file.name);
            if (slug) xhr.setRequestHeader('x-amz-meta-galleryslug', slug);
            if (password) xhr.setRequestHeader('x-amz-meta-gallerypassword', password);
            xhr.setRequestHeader('x-amz-meta-passwordenabled', String(enabled));
            xhr.setRequestHeader('x-amz-meta-passwordtimeout', String(timeoutMs));
            xhr.upload.onprogress = (evt) => {
                if (evt.lengthComputable) {
                    const percent = Math.round((evt.loaded / evt.total) * 100);
                    if (typeof onProgress === 'function') onProgress(percent);
                }
            };
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(file);
        });


        // S3 event notification will invoke the Lambda to process the gallery
        // and a WebSocket event will notify the UI when the project is updated.
         return { key };
    };


    const addFile = (file) => {
        if (!file) return;
        const ext = file.name.toLowerCase().split('.').pop();
        const allowed = ['svg', 'pdf'];
        if (!allowed.includes(ext)) {
            toast.error('Only SVG or PDF files are allowed');
            return;
        }
        setSelectedFile(file);
        if (!galleryName) setGalleryName(file.name);
        if (!gallerySlug) setGallerySlug(slugify(file.name));
    };

    const handleFileChange = (e) => {
        const file = e.target.files && e.target.files[0];
        addFile(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        addFile(file);
    };

    const handleModalDragOver = (e) => {
        if (showForm || editingIndex !== null) return;
        e.preventDefault();
        setIsModalDragging(true);
    };

    const handleModalDragLeave = (e) => {
        e.preventDefault();
        setIsModalDragging(false);
    };

    const handleModalDrop = (e) => {
        if (showForm || editingIndex !== null) return;
        e.preventDefault();
        setIsModalDragging(false);
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) {
            setEditingIndex(null);
            setGalleryName('');
            setGallerySlug('');
            setGalleryPassword('');
            setGalleryUrl('');
            setShowPassword(false);
            setGalleryPasswordEnabled(false);
            setGalleryTimeout(15);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setShowForm(true);
            addFile(file);
        }
    };

    const [pendingSlugs, setPendingSlugs] = useState([]);
    const [recentlyCreated, setRecentlyCreated] = useState([]);
    const pendingRef = useRef([]);
    useEffect(() => { pendingRef.current = pendingSlugs; }, [pendingSlugs]);

    useEffect(() => {
        if (!activeProject?.projectId) return;
        if (typeof localStorage === 'undefined') return;
        try {
            const storedPending = JSON.parse(localStorage.getItem(getPendingKey(activeProject.projectId))) || [];
            setPendingSlugs(storedPending);
        } catch {
            setPendingSlugs([]);
        }
        try {
            const storedRecent = JSON.parse(localStorage.getItem(getRecentKey(activeProject.projectId))) || [];
            setRecentlyCreated(storedRecent);
        } catch {
            setRecentlyCreated([]);
        }
    }, [activeProject?.projectId]);

    useEffect(() => {
        if (!activeProject?.projectId) return;
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(getPendingKey(activeProject.projectId), JSON.stringify(pendingSlugs));
    }, [pendingSlugs, activeProject?.projectId]);

    useEffect(() => {
        if (!activeProject?.projectId) return;
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(getRecentKey(activeProject.projectId), JSON.stringify(recentlyCreated));
    }, [recentlyCreated, activeProject?.projectId]);

    const handleUpload = async () => {
        if (!selectedFile || !activeProject?.projectId) return;
        setUploadProgress(0);
        setUploading(true);

        const baseName = galleryName || selectedFile.name;
        const baseSlug = gallerySlug || slugify(baseName);
        const { slug: uniqueSlug, count } = getUniqueSlug(
            baseSlug,
            galleries,
            legacyGalleries,
            pendingSlugs
        );
        const uniqueName = count > 0 ? `${baseName} ${count}` : baseName;

        setGalleryName(uniqueName);
        setGallerySlug(uniqueSlug);

        const optimisticId = Date.now() + '-' + Math.random().toString(36).slice(2);
        const optimisticGallery = {
            name: uniqueName,
            slug: uniqueSlug,
            optimisticId,
            uploading: true,
            processing: false,
            progress: 0,
        };
        setGalleries(prev => [...prev, optimisticGallery]);
        setPendingSlugs(prev => [...prev, optimisticGallery.slug]);

        try {
            await uploadGalleryFile(
                selectedFile,
                uniqueName,
                uniqueSlug,
                galleryPassword,
                galleryPasswordEnabled,
                galleryTimeout * 60 * 1000,
                (pct) => {
                    setGalleries(prev =>
                        prev.map(g =>
                            g.optimisticId === optimisticId ? { ...g, progress: pct } : g
                        )
                    );
                }
            );

            setGalleries(prev =>
                prev.map(g =>
                    g.optimisticId === optimisticId ? { ...g, uploading: false, processing: true, progress: 100 } : g
                )
            );
            // reset fields
            setSelectedFile(null);
            setGalleryName('');
            setGallerySlug('');
            setGalleryPassword('');
            setShowPassword(false);
            setGalleryPasswordEnabled(false);
            setGalleryTimeout(15);
            setShowForm(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (err) {
            if (err.message && err.message.includes('409')) {
                try {
                    const { slug: retrySlug, count: retryCount } = getUniqueSlug(
                        baseSlug,
                        [...galleries, { slug: uniqueSlug }],
                        legacyGalleries,
                        pendingSlugs
                    );
                    const retryName = retryCount > 0 ? `${baseName} ${retryCount}` : baseName;
                    setGallerySlug(retrySlug);
                    setGalleryName(retryName);
                    setPendingSlugs(prev => prev.map(s => (s === uniqueSlug ? retrySlug : s)));
                    setGalleries(prev =>
                        prev.map(g =>
                            g.optimisticId === optimisticId ? { ...g, slug: retrySlug, name: retryName } : g
                        )
                    );
                    await uploadGalleryFile(
                        selectedFile,
                        retryName,
                        retrySlug,
                        galleryPassword,
                        galleryPasswordEnabled,
                        galleryTimeout * 60 * 1000,
                        (pct) => {
                            setGalleries(prev =>
                                prev.map(g =>
                                    g.optimisticId === optimisticId ? { ...g, progress: pct } : g
                                )
                            );
                        }
                    );
                    setGalleries(prev =>
                        prev.map(g =>
                            g.optimisticId === optimisticId ? { ...g, uploading: false, processing: true, progress: 100 } : g
                        )
                    );
                    setSelectedFile(null);
                    setGalleryName('');
                    setGallerySlug('');
                    setGalleryPassword('');
                    setShowPassword(false);
                    setGalleryPasswordEnabled(false);
                    setGalleryTimeout(15);
                    setShowForm(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (err2) {
                    console.error('Gallery upload failed:', err2);
                    setGalleries(prev => prev.filter(g => g.optimisticId !== optimisticId));
                }
            } else {
                console.error('Gallery upload failed:', err);
                setGalleries(prev => prev.filter(g => g.optimisticId !== optimisticId));
            }
        } finally {
            setUploadProgress(0);
            setUploading(false);
        }
    };

    const handleSaveEdit = async () => {
      if (editingIndex === null || !activeProject?.projectId) return;
      const slugCollision = galleries.some(
        (g, idx) =>
          idx !== editingIndex &&
          (g.slug || slugify(g.name || "")) === gallerySlug
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
        url: galleryUrl || original.url,
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

      // If this gallery exists in the new Galleries table, persist changes
      if (original.galleryId) {
        try {
          await updateGallery(original.galleryId, {
            ...updated[editingIndex],
            projectId: activeProject.projectId,
          });
        } catch (err) {
          console.error('Failed to update gallery record', err);
        }
      }

      await queueUpdate({
        galleries: updated,
      });
    };

    const handleDeleteGallery = (index) => {
      const legacyCount = legacyGalleries.length;
      if (index < legacyCount) return; // legacy galleries cannot be deleted
      const idx = index - legacyCount;
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
        await deleteGalleryFiles(
          activeProject.projectId,
          g.galleryId || g.id,
          g.slug
        );
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

    const applyCoverUrl = async (index, isLegacy, galleryItem, url) => {
      if (!url) return;
      const galleryId = getGalleryId(galleryItem);
      if (isLegacy) {
        const updated = legacyGalleries.map((g) =>
          getGalleryId(g) === galleryId ? { ...g, coverImageUrl: url } : g
        );
        try {
          await queueUpdate({
            gallery: updated,
          });
          setLegacyGalleries(updated);
        } catch (err) {
          console.error('Failed to update legacy gallery cover', err);
        }
      } else {
        const updated = galleries.map((g) =>
          getGalleryId(g) === galleryId ? { ...g, coverImageUrl: url } : g
        );
        try {
          await updateGallery(galleryId, {
            coverImageUrl: url,
            projectId: activeProject.projectId,
          });
          setGalleries(updated);
          await queueUpdate({
            galleryUpdate: { id: galleryId, coverImageUrl: url },
            galleries: updated,
          });
        } catch (err) {
          console.error('Failed to update gallery cover', err);
        }
      }
    };

    const handleChangeCover = (index) => {
      const legacyCount = legacyGalleries.length;
      const isLegacy = index < legacyCount;
      const galleryItem = isLegacy
        ? legacyGalleries[index]
        : galleries[index - legacyCount];
      if (!galleryItem) return;

      const possibleUrls = [
        ...(galleryItem.pageImageUrls || []),
        ...(galleryItem.imageUrls || []),
        ...(Array.isArray(galleryItem.images)
          ? galleryItem.images
              .map((img) => (typeof img === 'string' ? img : img?.url))
              .filter(Boolean)
          : []),
      ];
      if (possibleUrls.length > 0) {
        setCoverOptions({ index, isLegacy, gallery: galleryItem, urls: possibleUrls });
      } else {
        setPendingCover({ index, isLegacy, gallery: galleryItem });
        if (coverInputRef.current) coverInputRef.current.value = '';
        coverInputRef.current?.click();
      }
    };

    const chooseCoverUrl = (url) => {
      if (!coverOptions) return;
      applyCoverUrl(coverOptions.index, coverOptions.isLegacy, coverOptions.gallery, url);
      setCoverOptions(null);
    };

    const handleUploadNewCover = () => {
      if (!coverOptions) return;
      setPendingCover({
        index: coverOptions.index,
        isLegacy: coverOptions.isLegacy,
        gallery: coverOptions.gallery,
      });
      if (coverInputRef.current) coverInputRef.current.value = '';
      coverInputRef.current?.click();
      setCoverOptions(null);
    };

    const handleCoverFileChange = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file || !pendingCover || !activeProject?.projectId) return;

      const galleryId = getGalleryId(pendingCover.gallery);
      const key = `projects/${activeProject.projectId}/galleries/${galleryId}/cover/${file.name}`;

      setCoverUploadingIndex(pendingCover.index);
      try {
        await uploadData({
          key,
          data: file,
          options: { accessLevel: 'public' },
        });
        const encodedName = encodeURIComponent(file.name);
        const url = `${S3_PUBLIC_BASE}/projects/${activeProject.projectId}/galleries/${galleryId}/cover/${encodedName}?t=${Date.now()}`;
        await applyCoverUrl(
          pendingCover.index,
          pendingCover.isLegacy,
          pendingCover.gallery,
          url
        );
      } catch (err) {
        console.error('Failed to upload cover image', err);
      } finally {
        setCoverUploadingIndex(null);
        setPendingCover(null);
        if (coverInputRef.current) coverInputRef.current.value = '';
      }
    };

    const combinedGalleries = [...legacyGalleries, ...galleries];
    const legacyCount = legacyGalleries.length;
    const hasGalleries = combinedGalleries.length > 0;

    const handleTriggerClick = async () => {
        if (combinedGalleries.length > 0) {
            const lastGallery = combinedGalleries[combinedGalleries.length - 1];
            const slug = lastGallery.slug || slugify(lastGallery.name || '');
            await fetchProjects(1);
            navigate(`/gallery/${slugify(activeProject.title)}/${slug}`);
        } else {
            openModal();
        }
    };

    const isEditing = editingIndex !== null;
    const isCreating = showForm && !isEditing;
    const editingCombinedIndex = isEditing ? editingIndex + legacyCount : null;
    const displayedGalleries = isEditing
        ? [combinedGalleries[editingCombinedIndex]].filter(Boolean)
        : isCreating
        ? []
        : combinedGalleries;


    return (
        <>
            {saving && (
                <div style={{ color: '#FA3356', marginBottom: '10px' }}>Saving...</div>
            )}
     
            <div
                className={`dashboard-item view-gallery ${styles.galleryTrigger}`}
                onClick={handleTriggerClick}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
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
                        if (e.key === 'Enter' || e.key === ' ') {
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
                                key={galleryItem.slug || idx}
                                src={previewUrl}
                                alt=""
                                className={styles.previewThumbnail}
                            />
                        ) : (
                            <div
                                key={galleryItem.slug || idx}
                                className={`${styles.previewThumbnail} ${styles.previewPlaceholder}`}
                            >
                                <GalleryVerticalEnd size={32} />
                            </div>
                        );
                    })}
                </div>
            )}

            </div>


            {/* Modal to display galleries */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Gallery Modal"
                shouldCloseOnOverlayClick={!isConfirmingDelete}
                style={{ overlay: { pointerEvents: isConfirmingDelete ? 'none' : 'auto' } }}
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
                        !hasGalleries && !showForm && editingIndex === null
                            ? styles.modalInnerEmpty
                            : ''
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
                <>
                {(showForm || editingIndex !== null) && (
                    <div className={styles.editHeader}>
                        {editingIndex !== null && (
                            <button
                                className={styles.iconButton}
                                onClick={() => handleDeleteGallery(editingIndex)}
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
                            setGalleryName('');
                            setGallerySlug('');
                            setGalleryPassword('');
                            setGalleryUrl('');
                            setShowPassword(false);
                            setGalleryPasswordEnabled(false);
                            setGalleryTimeout(15);
                            if (fileInputRef.current) fileInputRef.current.value = '';
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
                            const index = isEditing ? editingCombinedIndex : idx;
                            const slug = galleryItem.slug || slugify(galleryItem.name || '');
                            const isLegacy = index < legacyCount;
                            const isProcessingItem = galleryItem.uploading || galleryItem.processing;
                            const ready = recentlyCreated.includes(slug);
                            const previewUrl = getPreviewUrl(galleryItem);
                            return (
                                <li key={index} className={styles.listItem}>
                                    <div
                                        className={`${styles.listRow} ${editingIndex !== null && index === editingIndex + legacyCount ? styles.activeRow : ''} ${isProcessingItem ? styles.processingRow : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={async () => {
                                            if (isProcessingItem) return;
                                            const useLink = !galleryItem.updatedSvgUrl && !galleryItem.updatedPdfUrl && !galleryItem.url && galleryItem.link;
                                            if (useLink) {
                                                const target = galleryItem.link.startsWith('/') || /^https?:\/\//i.test(galleryItem.link)
                                                    ? galleryItem.link
                                                    : `/${galleryItem.link}`;
                                                window.location.assign(target);
                                            } else {
                                                await fetchProjects(1);
                                                navigate(`/gallery/${slugify(activeProject.title)}/${slug}`);
                                            }
                                            closeModal();
                                        }}
                                        onKeyDown={async (e) => {
                                            if (isProcessingItem) return;
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                const useLink = !galleryItem.updatedSvgUrl && !galleryItem.updatedPdfUrl && !galleryItem.url && galleryItem.link;
                                                if (useLink) {
                                                    const target = galleryItem.link.startsWith('/') || /^https?:\/\//i.test(galleryItem.link)
                                                        ? galleryItem.link
                                                        : `/${galleryItem.link}`;
                                                    window.location.assign(target);
                                                } else {
                                                    await fetchProjects(1);
                                                    navigate(`/gallery/${slugify(activeProject.title)}/${slug}`);
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
                                                <span className={styles.statusMessage}>{`Uploading... ${galleryItem.progress || 0}%`}</span>
                                            )}
                                            {!galleryItem.uploading && galleryItem.processing && (
                                                <span className={styles.statusMessage}>
                                                    Creating gallery
                                                    <span className={`${styles.dotSpinner} ${styles.inlineSpinner}`}>
                                                        <span></span>
                                                        <span></span>
                                                        <span></span>
                                                    </span>
                                                </span>
                                            )}
                                            {!galleryItem.uploading && !galleryItem.processing && ready && (
                                                <span className={styles.statusMessage}>Ready<span className={styles.readyIcon}>✓</span></span>
                                            )}
                                        </div>
                                        {(isAdmin || isBuilder || isDesigner) && !isProcessingItem && (
                                            <div
                                                className={`${styles.actions} ${
                                                    editingIndex !== null && index === editingIndex + legacyCount
                                                        ? styles.hideOnEdit
                                                        : ''
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
                                                            <span></span>
                                                            <span></span>
                                                            <span></span>
                                                        </span>
                                                    ) : (
                                                        <FontAwesomeIcon icon={faImage} />
                                                    )}
                                                </button>
                                                {!isLegacy && (
                                                    <>
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
                                                    </>
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
                    <div className={styles.dropHint}>Drag a SVG or PDF file here to create a new gallery</div>
                )}
                </>
                ) : (
                    <div
                        className={styles.emptyDropArea}
                        onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    >
                        <span className={styles.emptyDropHint}>Drag or click a SVG or PDF file to create a new gallery</span>
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
                            {editingIndex !== null &&
                                galleries[editingIndex]?.svgUrl && (
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
                                        {galleries[editingIndex].svgUrl.split('/').pop()}
                                    </a>
                                )}
                            <div className={styles.passwordRow}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={galleryPassword}
                                    onChange={(e) => setGalleryPassword(e.target.value)}
                                    className="modal-input"
                                />
                                <button
                                    type="button"
                                    className={styles.iconButton}
                                    onClick={() => setShowPassword((p) => !p)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                                <label htmlFor="gallery-timeout" className={`modal-label ${styles.timeoutLabel}`}>
                                    Password Timeout (minutes)
                                </label>
                                <div className={styles.timeoutInputRow}>
                                    <input
                                        id="gallery-timeout"
                                        type="number"
                                        min="1"
                                        value={galleryTimeout}
                                        onChange={(e) => setGalleryTimeout(Number(e.target.value))}
                                        className={`modal-input ${styles.timeoutInput}`}
                                    />
                                    <span className={styles.timeoutUnit}>min</span>
                                </div>
                                <div className={styles.helperText}>How long the password remains valid.</div>
                            </div>
                        </div>
                        {editingIndex === null && (
                            <div className={styles.uploadColumn}>
                                <div
                                    className={`${styles.dragArea} ${isDragging ? styles.dragging : ''}`}
                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    {isDragging && (
                                        <div className={styles.dragOverlay}>Drop file to upload</div>
                                    )}
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
                                                <span></span>
                                                <span></span>
                                                <span></span>
                                            </span>
                                        </>
                                    ) : (
                                        'Upload'
                                    )}
                                </button>
                            </div>
                        )}
                        {editingIndex !== null && (
                            <button
                                className="modal-submit-button uploads"
                                onClick={handleSaveEdit}
                            >
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
                    <button
                        className="modal-submit-button uploads"
                        onClick={closeModal}
                    >
                        Close
                    </button>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                    <div style={{ marginTop: '10px' }}>{`Uploading... ${uploadProgress}%`}</div>
                )}
                {isModalDragging && !showForm && editingIndex === null && (
                    <div className={styles.modalDropHint}>Drop file to create gallery</div>
                )}
                </div>
            </Modal>
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
                <FontAwesomeIcon
                    icon={faImage}
                    className={styles.coverModalIcon}
                    style={{ fontSize: '40px' }}
                />
                <h2>Select Cover Image</h2>
                <div className={styles.coverSelectGrid}>
                    {currentCoverUrls.map((url, i) => (
                        <div
                            key={`${startIndex + i}`}
                            className={styles.coverSelectOption}
                            onClick={() => chooseCoverUrl(url)}
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
                            onClick={() =>
                                setCoverPage((p) =>
                                    Math.min(p + 1, totalCoverPages - 1)
                                )
                            }
                            disabled={coverPage >= totalCoverPages - 1}
                            aria-label="Next"
                        >
                            <FontAwesomeIcon icon={faChevronRight} />
                        </button>
                    </div>
                )}
                <div className={styles.modalActions}>
                    <button className="modal-submit-button uploads" onClick={handleUploadNewCover}>
                        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
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
        </>
    );
};

export default GalleryComponent;
