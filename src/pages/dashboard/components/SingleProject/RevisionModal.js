import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import Modal from "../../../../components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faTrash, faClone, faPlus, faFileCsv, faFileInvoice, faUser, faPen, } from "@fortawesome/free-solid-svg-icons";
import { saveAs } from "file-saver";
import { fetchBudgetItems } from "../../../../utils/api";
import InvoicePreviewModal from "./InvoicePreviewModal";
import ConfirmModal from "../../../../components/ConfirmModal";
import styles from "./RevisionModal.module.css";
if (typeof document !== "undefined") {
    Modal.setAppElement("#root");
}
const RevisionModal = ({ isOpen, onRequestClose, revisions = [], activeRevision, onSwitch, onDuplicate, onCreateNew, onDelete, onSetClient, isAdmin = false, activeProject = null, }) => {
    const [selected, setSelected] = useState(activeRevision);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [previewRevision, setPreviewRevision] = useState(null);
    const handleClose = () => {
        if (previewRevision)
            setPreviewRevision(null);
        if (onRequestClose)
            onRequestClose();
    };
    useEffect(() => {
        setSelected(activeRevision);
    }, [activeRevision]);
    const handleSwitch = () => {
        if (onSwitch && selected != null)
            onSwitch(selected);
    };
    const handleSetClient = () => {
        if (onSetClient && selected != null)
            onSetClient(selected);
        setSelected(activeRevision);
    };
    const confirmDelete = () => {
        if (deleteTarget && onDelete)
            onDelete(deleteTarget);
        setDeleteTarget(null);
    };
    const exportCsv = async (rev) => {
        if (!rev?.budgetId)
            return;
        try {
            const items = await fetchBudgetItems(rev.budgetId, rev.revision);
            if (!Array.isArray(items))
                return;
            const fields = [
                "elementKey",
                "title",
                "category",
                "quantity",
                "itemBudgetedCost",
                "itemFinalCost",
                "vendor",
                "notes",
            ];
            const header = fields.join(",");
            const rows = items.map((it) => fields
                .map((f) => {
                const val = it[f] != null ? String(it[f]) : "";
                return `"${val.replace(/"/g, '""')}"`;
            })
                .join(","));
            const csvContent = [header, ...rows].join("\n");
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `revision-${rev.revision}.csv`);
        }
        catch (err) {
            console.error("CSV export failed", err);
        }
    };
    const exportInvoice = (rev) => {
        setPreviewRevision(rev);
    };
    const selectedLabel = selected != null ? `Rev.${selected}` : "Revision";
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { isOpen: isOpen, onRequestClose: handleClose, contentLabel: "Manage Revisions", closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("div", { className: styles.modalTitle, children: "Manage Revisions" }), _jsx("button", { className: styles.iconButton, onClick: handleClose, "aria-label": "Close", children: _jsx(FontAwesomeIcon, { icon: faXmark }) })] }), _jsx("div", { className: styles.modalList, children: revisions.map((rev) => (_jsxs("div", { className: `${styles.revRow} ${rev.revision === activeRevision ? styles.activeRow : ""}`, children: [_jsxs("label", { className: styles.revLabel, children: [_jsx("input", { type: "radio", name: "revision", value: rev.revision, checked: selected === rev.revision, onChange: () => setSelected(rev.revision) }), _jsx("span", { className: styles.revName, children: `Rev.${rev.revision}` }), rev.clientRevisionId === rev.revision && (_jsxs("span", { className: styles.clientBadge, children: [_jsx(FontAwesomeIcon, { icon: faUser }), " Client Version"] })), isAdmin && rev.revision === activeRevision && (_jsxs("span", { className: styles.editingBadge, children: [_jsx(FontAwesomeIcon, { icon: faPen }), " Editing"] }))] }), isAdmin && (_jsxs("div", { className: styles.revActions, children: [_jsx("button", { className: styles.iconButton, onClick: () => exportCsv(rev), "aria-label": "Export CSV", children: _jsx(FontAwesomeIcon, { icon: faFileCsv }) }), _jsx("button", { className: styles.iconButton, onClick: () => exportInvoice(rev), "aria-label": "Export Invoice", children: _jsx(FontAwesomeIcon, { icon: faFileInvoice }) }), _jsx("button", { className: `${styles.iconButton} ${styles.deleteButton}`, onClick: () => setDeleteTarget(rev), "aria-label": "Delete revision", children: _jsx(FontAwesomeIcon, { icon: faTrash }) })] }))] }, rev.revision))) }), _jsxs("div", { className: styles.modalFooter, children: [isAdmin && (_jsx("button", { className: "modal-button secondary", onClick: handleSwitch, "aria-label": `Edit ${selectedLabel}`, children: `Edit ${selectedLabel}` })), isAdmin && (_jsxs("button", { className: "modal-button", onClick: () => onDuplicate && onDuplicate(selected), children: [_jsx(FontAwesomeIcon, { icon: faClone }), " Duplicate"] })), isAdmin && (_jsx("button", { className: "modal-button", onClick: handleSetClient, "aria-label": `Set ${selectedLabel} as client version`, children: `Set ${selectedLabel} as Client Version` })), _jsxs("button", { className: "modal-button", onClick: () => onCreateNew && onCreateNew(), "aria-label": "New blank revision", children: [_jsx(FontAwesomeIcon, { icon: faPlus }), " New"] })] })] }), _jsx(ConfirmModal, { isOpen: !!deleteTarget, onRequestClose: () => setDeleteTarget(null), onConfirm: confirmDelete, message: `Delete this revision? Type "${activeProject?.title || ''}" to confirm.`, confirmText: activeProject?.title || '', className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                } }), previewRevision && (_jsx(InvoicePreviewModal, { isOpen: !!previewRevision, onRequestClose: () => setPreviewRevision(null), revision: previewRevision, project: activeProject }))] }));
};
export default RevisionModal;
