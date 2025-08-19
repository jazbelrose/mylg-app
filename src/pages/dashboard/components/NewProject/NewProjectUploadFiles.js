import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useMemo, useEffect } from 'react';
import Modal from '../../../../components/ModalWithStack';
import styles from './NewProjectUploadFiles.module.css';
const NewProjectUploadFiles = ({ selectedFiles, setSelectedFiles, selectedFileNames, setSelectedFileNames, }) => {
    const [showModal, setShowModal] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const openModal = () => setShowModal(true);
    const closeModal = () => setShowModal(false);
    const addFiles = (files) => {
        if (!files.length)
            return;
        setSelectedFiles((prev) => [...prev, ...files]);
    };
    const handleFileChange = (e) => {
        addFiles(Array.from(e.target.files));
        e.target.value = '';
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
        addFiles(Array.from(e.dataTransfer.files));
    };
    const removeFile = (index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    };
    // Update file names string when selectedFiles changes
    useEffect(() => {
        const names = selectedFiles.map((f) => f.name).join(', ');
        setSelectedFileNames(names);
    }, [selectedFiles, setSelectedFileNames]);
    // Generate preview URLs
    const previews = useMemo(() => selectedFiles.map((file) => ({ file, url: URL.createObjectURL(file) })), [selectedFiles]);
    // Revoke object URLs on cleanup
    useEffect(() => {
        return () => {
            previews.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, [previews]);
    const truncateName = (name, max = 12) => {
        if (name.length <= max)
            return name;
        const extIndex = name.lastIndexOf('.');
        if (extIndex === -1)
            return name.slice(0, max) + '...';
        const base = name.slice(0, extIndex);
        const ext = name.slice(extIndex + 1);
        if (base.length > max)
            return base.slice(0, max) + '(..).' + ext;
        return name;
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-item new-project-uploads", onClick: openModal, children: [selectedFileNames ? _jsx("span", { children: selectedFileNames }) : _jsx("span", { children: "Upload your files" }), _jsx("span", { children: "+" })] }), _jsxs(Modal, { isOpen: showModal, onRequestClose: closeModal, contentLabel: "File Upload Modal", overlayClassName: styles.fileModalOverlay, className: styles.fileModalContent, children: [_jsxs("div", { className: `${styles.modalContentInner} ${isDragging ? styles.dragging : ''}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, children: [isDragging && _jsx("div", { className: styles.dragOverlay, children: "Drop files to upload" }), selectedFiles.length === 0 ? (_jsx("div", { className: styles.emptyMessage, children: "Drag & drop files here or use the button below." })) : (_jsx("ul", { className: styles.fileGrid, children: previews.map((p, index) => (_jsxs("li", { className: styles.fileItem, children: [_jsxs("div", { className: styles.filePreview, children: [p.file.type.startsWith('image/') ? (_jsx("img", { src: p.url, alt: p.file.name, className: styles.previewImage })) : (_jsx("div", { className: styles.previewImage, children: p.file.name.split('.').pop() })), _jsx("button", { type: "button", className: styles.removeButton, onClick: () => removeFile(index), "aria-label": "Remove file", children: "\u00D7" })] }), _jsx("div", { className: styles.fileName, children: truncateName(p.file.name) })] }, index))) }))] }), _jsxs("div", { className: styles.modalFooter, children: [_jsx("input", { type: "file", multiple: true, ref: fileInputRef, onChange: handleFileChange, className: styles.hiddenInput }), _jsx("button", { className: `modal-button secondary ${styles.iconButton}`, onClick: () => fileInputRef.current.click(), children: "Choose Files" }), _jsx("button", { className: `modal-button primary ${styles.iconButton}`, onClick: closeModal, children: "Done" })] })] })] }));
};
export default NewProjectUploadFiles;
