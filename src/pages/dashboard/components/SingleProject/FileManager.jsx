import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
  useLayoutEffect,
} from 'react';

import Modal from '../../../../components/ModalWithStack';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faTrash, faCheck, faUpload, faXmark, faList, faThLarge } from '@fortawesome/free-solid-svg-icons';
import { uploadData, list } from 'aws-amplify/storage';
import { Folder, FileText, Download, Layout, Upload, PenTool } from 'lucide-react';
import {
  FaFilePdf,
  FaFileExcel,
  FaFileAlt,
  FaDraftingCompass,
  FaCube
} from 'react-icons/fa';
import { SiAdobe, SiSvg, SiHtml5 } from 'react-icons/si';
import { notify, notifyLoading, updateNotification } from '../../../../components/ToastNotifications';
import ConfirmModal from '../../../../components/ConfirmModal';
import { useData } from '../../../../app/contexts/DataProvider';
import {
  API_BASE_URL,
  ZIP_FILES_URL,
  DELETE_FILE_FROM_S3_URL,
  DELETE_PROJECT_MESSAGE_URL,
  EDIT_MESSAGE_URL,
  S3_PUBLIC_BASE,
  apiFetch,
} from '../../../../utils/api';
import Spinner from '../../../../components/preloader-light';
import styles from './FileManager.module.css';
import Dropdown from './Dropdown.jsx';
import pLimit from '../../../../utils/pLimit';
import PDFPreview from './PDFPreview.jsx';


if (typeof document !== 'undefined') {
  Modal.setAppElement('#root');
}

const encodeS3Key = (key = '') =>
  key.split('/').map((segment) => encodeURIComponent(segment)).join('/');

const FileManagerComponent = forwardRef(({
  folder = 'uploads',
  displayName,
  style,
  showTrigger = true,
  isOpen,
  onRequestClose,
}, ref) => {
  // Retrieve activeProject, user info, and admin IDs from context
  const {
    activeProject,
    user,
    isAdmin,
    isBuilder,
    isDesigner,
    projectMessages = {},
    setProjectMessages = () => {},
  } = useData();
    
    
  

  const [folderKey, setFolderKey] = useState(folder);

  const renderedName = displayName || (folderKey.charAt(0).toUpperCase() + folderKey.slice(1));

  const getFolderIcon = (folderKey, size = 24) => {
    switch (folderKey) {
      case 'uploads':
        return <Upload size={size} />;
      case 'invoices':
        return <FileText size={size} />;
      case 'downloads':
        return <Download size={size} />;
      case 'floorplans':
        return <Layout size={size} />;
      default:
        return <PenTool size={size} />;
    }
  };

  const getFileKind = (fileName) => {
    if (!fileName) return '';
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'svg') return 'svg';
    if (['html', 'htm'].includes(ext)) return 'html';
    if (ext === 'txt') return 'text';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
    if (['dwg', 'vwx'].includes(ext)) return 'drawing';
    if (['c4d', 'obj'].includes(ext)) return 'model';
    if (['ai', 'afdesign'].includes(ext)) return 'adobe';
    return ext;
  };

  const canUpload = isAdmin || isBuilder || isDesigner || folder === 'uploads';
  const canDelete = isAdmin || isBuilder || isDesigner;

  const systemFolders = [
    { key: 'uploads', name: 'User Files' },
    { key: 'drawings', name: 'Drawings' },
    { key: 'invoices', name: 'Documents' },
    { key: 'downloads', name: 'Downloads' },
  ];

  // Local state setup – note we use folderKey when accessing the files array
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [localActiveProject, setLocalActiveProject] = useState(activeProject || {});
  const [isFilesModalOpen, setFilesModalOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isImageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(new Set());
   const [isDragging, setIsDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('fileManagerViewMode') || 'grid'
      : 'grid'
  );
  const [sortOption, setSortOption] = useState('name-asc');
  const [filterOption, setFilterOption] = useState('all');
  const uploadQueue = useMemo(() => pLimit(3), []);
  const editQueue = useMemo(() => pLimit(1), []);
  const pendingUpdateRef = useRef(null);
  const updateTimeoutRef = useRef(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    return () => {
      selectedFiles.forEach((f) => {
        if (f.url && f.url.startsWith('blob:')) {
          URL.revokeObjectURL(f.url);
        }
      });
    };
  }, [selectedFiles]);

  useLayoutEffect(() => {
    const y = sessionStorage.getItem('files.scrollY');
    if (y && scrollerRef.current) scrollerRef.current.scrollTop = +y;
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    const onScroll = () =>
      sessionStorage.setItem('files.scrollY', String(el?.scrollTop ?? 0));
    el?.addEventListener('scroll', onScroll);
    return () => el?.removeEventListener('scroll', onScroll);
  }, []);

  const kindOptions = useMemo(() => {
    const kinds = new Set(selectedFiles.map((f) => f.kind));
    return Array.from(kinds).sort();
  }, [selectedFiles]);

  const filterOptionsList = useMemo(
    () => [
      { value: 'all', label: 'All types' },
      ...kindOptions.map((kind) => ({
        value: kind,
        label: kind.charAt(0).toUpperCase() + kind.slice(1),
      })),
    ],
    [kindOptions]
  );

  const sortOptionsList = [
    { value: 'name-asc', label: 'Name (A-Z)' },
    { value: 'name-desc', label: 'Name (Z-A)' },
    { value: 'date-desc', label: 'Newest' },
    { value: 'date-asc', label: 'Oldest' },
    { value: 'kind-asc', label: 'Type (A-Z)' },
    { value: 'kind-desc', label: 'Type (Z-A)' },
  ];

  const sortFiles = useCallback(
    (files) => {
      return [...files].sort((a, b) => {
        switch (sortOption) {
          case 'name-desc':
            return b.fileName.localeCompare(a.fileName);
          case 'date-asc':
            return (a.lastModified || 0) - (b.lastModified || 0);
          case 'date-desc':
            return (b.lastModified || 0) - (a.lastModified || 0);
          case 'kind-asc':
            return (a.kind || '').localeCompare(b.kind || '');
          case 'kind-desc':
            return (b.kind || '').localeCompare(a.kind || '');
          case 'name-asc':
          default:
            return a.fileName.localeCompare(b.fileName);
        }
      });
    },
    [sortOption]
  );

  const displayedFiles = useMemo(() => {
    const filtered = selectedFiles.filter(
      (f) =>
        f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterOption === 'all' || f.kind === filterOption)
    );
    return sortFiles(filtered);
  }, [selectedFiles, searchTerm, filterOption, sortFiles]);

  // API endpoints
  const apiGatewayEndpoint = ZIP_FILES_URL;
  const apiDeleteEndpoint = DELETE_FILE_FROM_S3_URL;
    const getThumbnailUrl = (url, folderKey) => {
    return url.replace(`/${folderKey}/`, `/${folderKey}_thumbnails/`);
  };

  const normalizeFiles = (files = []) =>
    files.map((f) => ({
      ...f,
      lastModified: f.lastModified
        ? new Date(f.lastModified).getTime()
        : 0,
      kind: getFileKind(f.fileName),
    }));

  // Swipe navigation states and handlers
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const SWIPE_THRESHOLD = 50;

  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchMove = (e) => setTouchEndX(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStartX - touchEndX > SWIPE_THRESHOLD) {
      handleNextImage();
    } else if (touchEndX - touchStartX > SWIPE_THRESHOLD) {
      handlePrevImage();
    }
  };

  const openFilesModal = async () => {
    setIsLoading(true);
    setFilesModalOpen(true);
    const files = await fetchS3Files();
    if (!files.length) {
      setSelectedFiles(normalizeFiles(localActiveProject[folderKey] || []));
    }
    setIsLoading(false);
  };

  const closeFilesModal = () => {
    setFilesModalOpen(false);
    if (onRequestClose) onRequestClose();
  };

  useEffect(() => {
    if (typeof isOpen === 'boolean') {
      if (isOpen) openFilesModal();
      else closeFilesModal();
    }
  }, [isOpen]);

  useImperativeHandle(ref, () => ({
    open: openFilesModal,
    close: closeFilesModal,
  }));

  const closeImageModal = () => {
    setImageModalOpen(false);
  };

  const handleNextImage = () => {
    if (!displayedFiles.length || currentIndex === null) return;
    const nextIndex = (currentIndex + 1) % displayedFiles.length;
    setCurrentIndex(nextIndex);
    setSelectedImage(displayedFiles[nextIndex].url);
  };

  const handlePrevImage = () => {
    if (!displayedFiles.length || currentIndex === null) return;
    const prevIndex = (currentIndex - 1 + displayedFiles.length) % displayedFiles.length;
    setCurrentIndex(prevIndex);
    setSelectedImage(displayedFiles[prevIndex].url);
  };

  // Selection logic
  const handleSelectionChange = (url) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === selectedFiles.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(selectedFiles.map(u => u.url)));
    }
  };

  const isSelected = (url) => selectedItems.has(url);

  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const removeReferences = async (urls, messagesList) => {
    let description = localActiveProject.description || '';
    let descChanged = false;

    for (const url of urls) {
      const regex = new RegExp(`<img[^>]*src=["']${escapeRegExp(url)}["'][^>]*>`, 'g');
      if (regex.test(description)) {
        description = description.replace(regex, '');
        descChanged = true;
      }

      const referencing = messagesList.filter(
        (m) =>
          (m.text && m.text.includes(url)) ||
          (m.file?.url && m.file.url.includes(url))
      );

      for (const msg of referencing) {
        if (msg.messageId) {
          try {
            await apiFetch(`${EDIT_MESSAGE_URL}/project/${encodeURIComponent(msg.messageId)}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                content: 'File deleted.',
                editedBy: user.userId,
                projectId: activeProject.projectId,
              }),
            });
            msg.text = 'File deleted.';
            delete msg.file;
            setProjectMessages((prev) => {
              const msgs = Array.isArray(prev[activeProject.projectId]) ? prev[activeProject.projectId] : [];
              return {
                ...prev,
                [activeProject.projectId]: msgs.map((m) =>
                  m.messageId === msg.messageId ? { ...m, text: 'File deleted.', file: undefined } : m
                ),
              };
            });
          } catch (err) {
            console.error('Failed to strip file from message', err);
          }
        }
      }
    }

    if (descChanged) {
      try {
        await apiFetch(`${API_BASE_URL}/editProject?projectId=${activeProject.projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description })
        });
        setLocalActiveProject((prev) => ({ ...prev, description }));
      } catch (err) {
        console.error('Failed to update description', err);
      }
    }
  };

  const handleFileClick = (file, index) => {
    if (isSelectMode) {
      handleSelectionChange(file.url);
    } else {
      const extension = file.fileName.split('.').pop().toLowerCase();
      if (extension === 'html') {
        window.open(file.url, '_blank');
        return;
      }
      setCurrentIndex(index);
      setSelectedImage(file.url);
      setImageModalOpen(true);
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    if (isSelectMode) setSelectedItems(new Set());
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'list' : 'grid';
    setViewMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fileManagerViewMode', newMode);
    }
  };
const confirmDeletion = () => {
    setIsConfirmingDelete(true);
  };

  const layoutIcon = viewMode === 'grid' ? faList : faThLarge;

  // Delete logic: update the payload field to be dynamic (folderKey)
  const handleDelete = () => {
      if (!(isAdmin || isBuilder || isDesigner)) {
      notify('error', 'Only authorized users can delete files.');
      return;
    }
    confirmDeletion();
  };

  const performDelete = async () => {
    const fileUrlsToDelete = Array.from(selectedItems);
    setDeleting(true);
    setIsConfirmingDelete(false);
    const messages = projectMessages[activeProject.projectId] || [];
    await removeReferences(fileUrlsToDelete, messages);
    const notificationId = notifyLoading('Deleting files...');
    try {
      await apiFetch(apiDeleteEndpoint, {
        method: "POST",
        body: JSON.stringify({
          projectId: activeProject.projectId,
          field: folderKey,
          fileKeys: fileUrlsToDelete,
        }),
        headers: { "Content-Type": "application/json" },
      });

      let remaining;
      setSelectedFiles(prev => {
        remaining = prev.filter((u) => !fileUrlsToDelete.includes(u.url));
        return remaining;
      });

      if (folderKey !== 'uploads') {
        setLocalActiveProject(prev => ({ ...prev, [folderKey]: remaining }));
      }

      scheduleFolderUpdate(
        remaining.map(u => ({ fileName: u.fileName, url: u.url }))
      );
      setSelectedItems(new Set());
      setIsSelectMode(false);
      updateNotification(notificationId, 'success', 'Files deleted successfully');
    } catch (error) {
      console.error('Error during deletion:', error);
      updateNotification(notificationId, 'error', 'Failed to delete selected files. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Bulk download logic remains the same
  const handleBulkDownload = async () => {
    const fileUrls = Array.from(selectedItems);
    if (fileUrls.length === 0) {
      notify('warning', 'No files selected for download.');
      return;
    }

    const notificationId = notifyLoading('Preparing archive...');

    try {
      const zipFileUrl = await getZippedFiles(fileUrls);

      updateNotification(notificationId, 'success', 'Archive ready! Downloading now...');

      initiateDownload(zipFileUrl);

      setSelectedItems(new Set());
      setIsSelectMode(false);
    } catch (error) {
      console.error("Error during bulk download:", error);
      updateNotification(notificationId, 'error', 'Failed to prepare archive. Try again.');
    }
  };

  const initiateDownload = (url) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDeleteSingle = async (url) => {
    setSelectedItems(new Set([url]));
    handleDelete();
  };

  const handleDownloadSingle = (url) => {
    initiateDownload(url);
  };

  const getZippedFiles = async (fileUrls) => {
    try {
      const fileKeys = fileUrls
        .map(url => {
          const matches = url.match(/amazonaws\.com\/(.+)$/);
          return matches ? decodeURIComponent(matches[1]) : null;
        })
        .filter(key => key !== null);
      const response = await apiFetch(apiGatewayEndpoint, {
        method: 'POST',
        body: JSON.stringify({ fileKeys }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to get the zip file.');
      const data = await response.json();
      return data.zipFileUrl;
    } catch (error) {
      console.error('Error getting zipped files:', error);
      throw error;
    }
  };
// Shared upload handler used by file input and drag & drop

const uploadFiles = async (files) => {
    setIsLoading(true);

    if (!files.length) {
      setIsLoading(false);
      return;
    }

    const notificationId = notifyLoading('Uploading files...');

    const placeholders = files.map(file => ({
      fileName: file.name,
      url: URL.createObjectURL(file),
      lastModified: file.lastModified || Date.now(),
      kind: getFileKind(file.name),
    }));

    // Add placeholders immediately so UI reflects pending uploads
    setSelectedFiles(prev => [...prev, ...placeholders]);

    await Promise.all(
      files.map((file, idx) =>
        handleFileUpload(activeProject.projectId, file)
          .then((info) => {
            const oldUrl = placeholders[idx].url;
            placeholders[idx].url = info.url;
            if (oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
          })
          .catch((error) => {
            console.error('Upload failed:', error);
            notify('error', `Upload failed for ${file.name}`);
            const oldUrl = placeholders[idx]?.url;
            if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
            placeholders[idx] = null;
          })
      )
    );

    const completed = placeholders.filter(Boolean);

    let finalFiles;
    setSelectedFiles(prev => {
      const names = new Set(placeholders.map(p => p?.fileName).filter(Boolean));
      finalFiles = [
        ...prev.filter(f => !names.has(f.fileName)),
        ...completed,
      ];
      return finalFiles;
    });

    if (folderKey !== 'uploads') {
      setLocalActiveProject(prev => ({ ...prev, [folderKey]: finalFiles }));
    }

    updateNotification(notificationId, 'success', 'Files uploaded successfully');

    if (folderKey !== 'uploads') {
      const payload = finalFiles.map((f) => ({ fileName: f.fileName, url: f.url }));
      try {
        await updateFolderFiles(activeProject.projectId, payload);
      } catch (error) {
        console.error('Error updating file metadata:', error);
        notify('warning', 'Files uploaded but metadata update failed');
      }
    }

    setIsLoading(false);
  };

  // File upload logic triggered by file input
  const handleFileSelect = async (event) => {
    await uploadFiles(Array.from(event.target.files));
    event.target.value = '';
  };

    const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

 const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    await uploadFiles(Array.from(event.dataTransfer.files));
    if (folderKey === 'uploads') {
      await fetchS3Files();
    }
  };


  const handleFileUpload = (projectId, file) =>
    uploadQueue(async () => {
      const filename = `projects/${projectId}/${folderKey}/${file.name}`;
      setUploadingFiles(prev => new Set([...prev, file.name]));
      try {
        await uploadData({
          key: filename,
          data: file,
          options: { accessLevel: 'public' }
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        const fileUrl = `${S3_PUBLIC_BASE}/${encodeS3Key(filename)}`;
        return { fileName: file.name, url: fileUrl };
      } catch (error) {
        console.error('Error uploading file:', error);
        notify('error', `Error uploading ${file.name}`);
        throw error;
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(file.name);
          return newSet;
        });
      }
    });
  // Update API function for folders other than uploads
  const updateFolderFiles = useCallback(
    (projectId, updatedFiles) =>
      editQueue(async () => {
        const apiUrl = `${API_BASE_URL}/editProject?projectId=${projectId}`;
        const payload = { [folderKey]: updatedFiles };
        const response = await apiFetch(apiUrl, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Failed to update files');
        console.log('Files updated successfully');
      }),
    [folderKey, editQueue]
  );

  const scheduleFolderUpdate = useCallback(
    (filesPayload) => {
      if (folderKey === 'uploads') return;
      pendingUpdateRef.current = filesPayload;
      if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(() => {
        const pending = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
        if (pending) {
          updateFolderFiles(activeProject.projectId, pending).catch((err) =>
            console.error('Error updating files:', err)
          );
        }
      }, 500);
    },
    [folderKey, activeProject?.projectId, updateFolderFiles]
  );

  useEffect(() => () => {
    if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
  }, []);

  // File preview – remains unchanged
  const renderFilePreview = (file) => {
    const extension = file.fileName.split('.').pop().toLowerCase();
    const commonStyle = { display: "flex", flexDirection: "column", alignItems: "center" };

    if (['jpg', 'jpeg', 'png'].includes(extension)) {
      const thumbUrl = getThumbnailUrl(file.url, folderKey);
      return (
        <img
          src={thumbUrl}
          alt={file.fileName}
          className={styles.previewImage}
          onError={(e) => { e.target.src = file.url; }}
          loading="lazy"
        />
      );
    } else if (extension === 'pdf') {
      return <FaFilePdf size={50} color="red" />;
    } else if (extension === 'svg') {
      return <SiSvg size={50} color="purple" />;
    } else if (extension === 'html') {
      return <SiHtml5 size={50} color="orange" />;
    } else if (extension === 'txt') {
      return <FaFileAlt size={50} color="gray" />;
    } else if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FaFileExcel size={50} color="green" />;
    } else if (['dwg', 'vwx'].includes(extension)) {
      return <FaDraftingCompass size={50} color="brown" />;
    } else if (['c4d', 'obj'].includes(extension)) {
      return <FaCube size={50} color="purple" />;
    } else if (['ai', 'afdesign'].includes(extension)) {
      return <SiAdobe size={50} color="orange" />;
    } else {
      return <FaFileAlt size={50} color="blue" />;
    }
  };

  const truncateFileName = (fileName, maxLength = 12) => {
    if (!fileName) return '';
    const parts = fileName.split('.');
    if (parts.length < 2) return fileName;
    const extension = parts.pop();
    const baseName = parts.join('.');
    if (baseName.length <= maxLength) return `${baseName}.${extension}`;
    return `${baseName.substring(0, maxLength)}(..).${extension}`;
  };
  const fetchS3Files = async () => {
    if (!activeProject?.projectId) return [];

    const prefixes =
      folderKey === 'uploads'
        ? ['uploads/', 'lexical/', 'chat_uploads/'].map(
            (dir) => `projects/${activeProject.projectId}/${dir}`
          )
        : [`projects/${activeProject.projectId}/${folderKey}/`];

    try {
      console.debug('[files] fetch', { folderKey });
      setIsLoading(true);
      const lists = await Promise.all(
        prefixes.map((prefix) =>
          list({ prefix, options: { accessLevel: 'public' } })
        )
      );
      const files = lists
        .flatMap((res) => res?.items || [])
        .filter((item) => item.key && !item.key.endsWith('/'))
        .map((item) => {
          const name = item.key.split('/').pop();
          return {
            fileName: name,
            url: `${S3_PUBLIC_BASE}/${encodeS3Key(item.key)}`,
            lastModified: item.lastModified
              ? new Date(item.lastModified).getTime()
              : 0,
            kind: getFileKind(name),
          };
        });
      const merged = Array.from(new Map(files.map((f) => [f.url, f])).values());
      setSelectedFiles(merged);
      return merged;
    } catch (err) {
      console.error('Error listing S3 files:', err);
      notify('warning', 'Could not load files from storage.');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Sync with activeProject changes and folderKey changes
  useEffect(() => {
    setLocalActiveProject(activeProject || {});
  }, [activeProject]);

  // Fetch files from S3 when folder changes; fallback to project state
  useEffect(() => {
    const load = async () => {
      const files = await fetchS3Files();
      if (!files.length) {
        setSelectedFiles(normalizeFiles(activeProject?.[folderKey] || []));
      }
    };
    load();
  }, [activeProject, folderKey]);


   // Close modals with Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key !== 'Escape') return;
      if (isImageModalOpen) {
        closeImageModal();
      } else if (isFilesModalOpen) {
        closeFilesModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFilesModalOpen, isImageModalOpen]);

  // Keyboard navigation for image modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isImageModalOpen) return;
      if (e.key === 'ArrowRight') handleNextImage();
      else if (e.key === 'ArrowLeft') handlePrevImage();
      else if (e.key === 'Escape') closeImageModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, currentIndex, selectedFiles]);

  return (
    <>
      {showTrigger && (
        <div
          className={`dashboard-item files files-shared-style ${styles.fileManager}`}
          onClick={openFilesModal}
          style={style}
        >
          <div className={styles.fileManagerInner}>
            <span className={styles.icon}>{getFolderIcon(folderKey)}</span>
            <span>{renderedName}</span>
          </div>
          <span className={styles.arrow}>&gt;</span>

        </div>
      )}
      <Modal
        isOpen={isFilesModalOpen}
        onRequestClose={closeFilesModal}
        contentLabel="Files Modal"
        shouldCloseOnOverlayClick={!isConfirmingDelete}
        style={{
          overlay: { pointerEvents: isConfirmingDelete ? 'none' : 'auto' },
        }}
        className={{
          base: styles.fileModalContent,
          afterOpen: styles.fileModalContentAfterOpen,
          beforeClose: styles.fileModalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.fileModalOverlay,
          afterOpen: styles.fileModalOverlayAfterOpen,
          beforeClose: styles.fileModalOverlayBeforeClose,
        }}
        closeTimeoutMS={300}
      >
        <div className={styles.modalHeader}>
          <div className={styles.folderTabs}>
            {systemFolders.map((f) => (
              <button
                key={f.key}
                className={`${styles.tabButton} ${folderKey === f.key ? styles.activeTab : ''}`}
                onClick={() => setFolderKey(f.key)}
              >
                {getFolderIcon(f.key, 16)} {f.name}
              </button>
            ))}
          </div>
          <div className={styles.actions}>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            <Dropdown
              label="Filter files"
              options={filterOptionsList}
              value={filterOption}
              onChange={setFilterOption}
            />
            <Dropdown
              label="Sort files"
              options={sortOptionsList}
              value={sortOption}
              onChange={setSortOption}
            />
            <button className={styles.iconButton} onClick={toggleViewMode} aria-label="Toggle view">
              <FontAwesomeIcon icon={layoutIcon} />
            </button>
            <button
              className={styles.iconButton}
              onClick={closeFilesModal}
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>
        <div
          ref={scrollerRef}
          className={`${styles.modalContentInner} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className={styles.dragOverlay}>Drop files to upload</div>
          )}
             {isLoading && (
            <div className={styles.loadingOverlay}>
              <Spinner style={{ position: 'static' }} />
              <div className={styles.loadingMessage}>Loading files…</div>
            </div>
          )}
          {displayedFiles.length === 0 && !isLoading ? (
            <div className={styles.emptyMessage}>
              <Upload size={48} />
              <span>No files yet.</span>
            </div>
          ) : (
            <>
              {isSelectMode && (
                <div>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === selectedFiles.length}
                    onChange={handleSelectAll}
                  />{' '}
                  Select All
                </div>
              )}
              {viewMode === 'grid' ? (
                <ul className={styles.fileGrid}>
                  {displayedFiles.map((file, index) => (
                      <li key={file.url} className={styles.fileItem}>
                        <div
                          onClick={() => {
                            if (isSelectMode) {
                              handleSelectionChange(file.url);
                            } else {
                              handleFileClick(file, index);
                            }
                          }}
                          className={`${styles.filePreview} ${isSelectMode ? styles.clickable : ''}`}
                        >
                          {renderFilePreview(file)}
                          {isSelectMode && (
                            <div
                              className={`${styles.selectionOverlay} ${isSelected(file.url) ? styles.selected : ''}`}
                            >
                              {isSelected(file.url) && (
                                <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} />
                              )}
                            </div>
                          )}
                        </div>
                        <div className={styles.fileName} title={file.fileName}>
                          {truncateFileName(file.fileName)}
                        </div>
                      </li>
                    ))}
                </ul>
              ) : (
                <table className={styles.fileTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedFiles.map((file, index) => (
                        <tr key={file.url}>
                          <td onClick={() => handleFileClick(file, index)}>{file.fileName}</td>
                          <td>
                            <button
                              className={styles.iconButton}
                              onClick={() => handleDownloadSingle(file.url)}
                              aria-label="Download file"
                            >
                              <FontAwesomeIcon icon={faDownload} />
                            </button>
                            {canDelete && (
                              <button
                                className={styles.iconButton}
                                onClick={() => handleDeleteSingle(file.url)}
                                aria-label="Delete file"
                              >
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          {selectedFiles.length === 0 ? (
            <>
              {canUpload && (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className={styles.hiddenInput}
                  />
                  <button
                    className={styles.iconButton}
                    onClick={() => fileInputRef.current.click()}
                    aria-label="Upload files"
                  >
                    <FontAwesomeIcon icon={faUpload} /> Upload
                  </button>
                </>
              )}
            </>
          ) : isSelectMode ? (
            <>
              <button className={styles.iconButton} onClick={handleBulkDownload} aria-label="Download selected">
                <FontAwesomeIcon icon={faDownload} />
              </button>
               {canDelete && (
                <button className={styles.iconButton} onClick={handleDelete} aria-label="Delete selected">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              )}
              <button
                className={styles.iconButton}
                onClick={() => setIsSelectMode(false)}
                aria-label="Cancel selection"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </>
          ) : (
            <>
              {selectedFiles.length > 0 && (
                <button className={styles.iconButton} onClick={toggleSelectMode} aria-label="Select files">
                  <FontAwesomeIcon icon={faCheck} /> Select
                </button>
              )}
               {canUpload && (
                <>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                    className={styles.hiddenInput}
                  />
                  <button
                    className={styles.iconButton}
                    onClick={() => fileInputRef.current.click()}
                    aria-label="Upload files"
                  >
                    <FontAwesomeIcon icon={faUpload} /> Upload
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </Modal>
      <ConfirmModal
        isOpen={isConfirmingDelete}
        onRequestClose={() => setIsConfirmingDelete(false)}
        onConfirm={performDelete}
        message="Are you sure you want to delete the selected files?"
        className={{
          base: styles.confirmContent,
          afterOpen: styles.confirmContentAfterOpen,
          beforeClose: styles.confirmContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.confirmOverlay,
          afterOpen: styles.confirmOverlayAfterOpen,
          beforeClose: styles.confirmOverlayBeforeClose,
        }}
      />

      {/* --- Image Preview Modal --- */}
      <Modal
        isOpen={isImageModalOpen}
        onRequestClose={closeImageModal}
        contentLabel="Image Preview Modal"
        className={{
          base: styles.imageModalContent,
          afterOpen: styles.imageModalContentAfterOpen,
          beforeClose: styles.imageModalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.imageModalOverlay,
          afterOpen: styles.imageModalOverlayAfterOpen,
          beforeClose: styles.imageModalOverlayBeforeClose,
        }}
        closeTimeoutMS={300}

      >
        {selectedImage && displayedFiles[currentIndex] && (
          <div
            className={styles.imageWrapper}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {(() => {
              const ext = displayedFiles[currentIndex].fileName
                .split('.')
                .pop()
                .toLowerCase();
              if (['jpg', 'jpeg', 'png'].includes(ext)) {
                return (
                  <img
                    src={selectedImage}
                    alt="Selected"
                    onError={(e) => {
                      e.target.src = selectedImage;
                    }}
                    className={styles.fullImage}
                  />
                );
              }
              if (ext === 'pdf') {
                return (
                  <PDFPreview
                    url={selectedImage}
                    className={styles.pdfPreview}
                    title={displayedFiles[currentIndex].fileName}
                  />
                );
              }
              return (
                <div className={styles.filePlaceholder}>
                  <div className={styles.placeholderIcon}>
                    {renderFilePreview(displayedFiles[currentIndex])}
                  </div>
                  <div className={styles.imageInfo}>
                    {displayedFiles[currentIndex].fileName}
                  </div>
                </div>
              );
            })()}

            <div className={styles.imageTopBar}>
              <button onClick={closeImageModal} className={styles.iconButton} aria-label="Close image">
                <FontAwesomeIcon icon={faXmark} />

              </button>
              <a href={selectedImage} download className={styles.iconButton} aria-label="Download image">
                <FontAwesomeIcon icon={faDownload} />
              </a>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

export default FileManagerComponent;
