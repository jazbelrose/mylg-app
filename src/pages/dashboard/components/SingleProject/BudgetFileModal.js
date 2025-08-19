import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef } from 'react';
import Modal from '../../../../components/ModalWithStack';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faUpload, faDownload } from '@fortawesome/free-solid-svg-icons';
import templateFile from './budget-template/budget-dynamo-template.csv?url';
import styles from './BudgetFileModal.module.css';
if (typeof document !== 'undefined') {
    Modal.setAppElement('#root');
}
const BudgetFileModal = ({ isOpen, onRequestClose, onFileSelected }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const handleFile = (file) => {
        if (file && onFileSelected) {
            onFileSelected(file);
        }
    };
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        handleFile(file);
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
        const file = e.dataTransfer.files[0];
        handleFile(file);
    };
    return (_jsxs(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Budget File Modal", closeTimeoutMS: 300, className: {
            base: styles.modalContent,
            afterOpen: styles.modalContentAfterOpen,
            beforeClose: styles.modalContentBeforeClose,
        }, overlayClassName: {
            base: styles.modalOverlay,
            afterOpen: styles.modalOverlayAfterOpen,
            beforeClose: styles.modalOverlayBeforeClose,
        }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("div", { className: styles.modalTitle, children: "Budget Files" }), _jsx("button", { className: styles.iconButton, onClick: onRequestClose, "aria-label": "Close", children: _jsx(FontAwesomeIcon, { icon: faXmark }) })] }), _jsxs("div", { className: `${styles.modalContentInner} ${isDragging ? styles.dragging : ''}`, onDragOver: handleDragOver, onDragLeave: handleDragLeave, onDrop: handleDrop, onClick: () => fileInputRef.current?.click(), children: [_jsx("input", { type: "file", accept: ".xlsx,.xls", ref: fileInputRef, onChange: handleFileSelect, className: styles.hiddenInput }), _jsx("p", { children: "Click or drag your budget file here" })] }), _jsxs("div", { className: styles.modalFooter, children: [_jsxs("a", { href: templateFile, download: true, className: styles.iconButton, children: [_jsx(FontAwesomeIcon, { icon: faDownload }), " Template"] }), _jsxs("button", { className: styles.iconButton, onClick: () => fileInputRef.current?.click(), "aria-label": "Upload", children: [_jsx(FontAwesomeIcon, { icon: faUpload }), " Upload"] })] })] }));
};
export default BudgetFileModal;
