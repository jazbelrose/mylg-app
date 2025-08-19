import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import PDFPreview from './PDFPreview';
const PreviewDrawer = ({ open, onClose, url, onExportGallery, onExportPDF }) => {
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        if (open) {
            window.addEventListener('keydown', onKey);
        }
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);
    return (_jsx(AnimatePresence, { children: open && (_jsx(motion.div, { className: "preview-overlay", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: onClose, children: _jsxs(motion.div, { className: "preview-drawer", initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' }, transition: { type: 'spring', stiffness: 300, damping: 30 }, role: "dialog", "aria-modal": "true", "aria-label": "Preview", onClick: (e) => e.stopPropagation(), children: [_jsx("button", { type: "button", className: "close-btn", onClick: onClose, "aria-label": "Close preview", children: "\u00D7" }), _jsx(PDFPreview, { url: url }), _jsxs("div", { className: "preview-actions", children: [_jsx("button", { type: "button", onClick: onExportGallery, children: "Export to Gallery" }), _jsx("button", { type: "button", onClick: onExportPDF, children: "Export to PDF" })] })] }) })) }));
};
export default PreviewDrawer;
