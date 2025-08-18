import React, { useState, useEffect } from "react";
import Modal from "../../../../components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faXmark,
  faTrash,
  faClone,
  faPlus,
  faFileCsv,
  faFileInvoice,
  faUser,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { saveAs } from "file-saver";
import { fetchBudgetItems } from "../../../../utils/api";
import InvoicePreviewModal from "./InvoicePreviewModal";
import ConfirmModal from "../../../../components/ConfirmModal";
import styles from "./RevisionModal.module.css";

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const RevisionModal = ({
  isOpen,
  onRequestClose,
  revisions = [],
  activeRevision,
  onSwitch,
  onDuplicate,
  onCreateNew,
  onDelete,
  onSetClient,
  isAdmin = false,
  activeProject = null,
}) => {
  const [selected, setSelected] = useState(activeRevision);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewRevision, setPreviewRevision] = useState(null);

  const handleClose = () => {
    if (previewRevision) setPreviewRevision(null);
    if (onRequestClose) onRequestClose();
  };
  
  useEffect(() => {
    setSelected(activeRevision);
  }, [activeRevision]);

  const handleSwitch = () => {
    if (onSwitch && selected != null) onSwitch(selected);
  };

  const handleSetClient = () => {
    if (onSetClient && selected != null) onSetClient(selected);
    setSelected(activeRevision);
  };

  const confirmDelete = () => {
    if (deleteTarget && onDelete) onDelete(deleteTarget);
    setDeleteTarget(null);
  };

  const exportCsv = async (rev) => {
    if (!rev?.budgetId) return;
    try {
      const items = await fetchBudgetItems(rev.budgetId, rev.revision);
      if (!Array.isArray(items)) return;
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
      const rows = items.map((it) =>
        fields
          .map((f) => {
            const val = it[f] != null ? String(it[f]) : "";
            return `"${val.replace(/"/g, '""')}"`;
          })
          .join(",")
      );
      const csvContent = [header, ...rows].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `revision-${rev.revision}.csv`);
    } catch (err) {
      console.error("CSV export failed", err);
    }
  };

  const exportInvoice = (rev) => {
    setPreviewRevision(rev);
  };

  const selectedLabel = selected != null ? `Rev.${selected}` : "Revision";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onRequestClose={handleClose}
        contentLabel="Manage Revisions"
        closeTimeoutMS={300}
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
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Manage Revisions</div>
          <button className={styles.iconButton} onClick={handleClose} aria-label="Close">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
        <div className={styles.modalList}>
          {revisions.map((rev) => (
            <div
              key={rev.revision}
              className={`${styles.revRow} ${
                rev.revision === activeRevision ? styles.activeRow : ""
              }`}
            >
              <label className={styles.revLabel}>
                <input
                  type="radio"
                  name="revision"
                  value={rev.revision}
                  checked={selected === rev.revision}
                  onChange={() => setSelected(rev.revision)}
                />
                <span className={styles.revName}>{`Rev.${rev.revision}`}</span>
                {rev.clientRevisionId === rev.revision && (
                  <span className={styles.clientBadge}>
                    <FontAwesomeIcon icon={faUser} /> Client Version
                  </span>
                )}
                {isAdmin && rev.revision === activeRevision && (
                  <span className={styles.editingBadge}>
                    <FontAwesomeIcon icon={faPen} /> Editing
                  </span>
                )}
              </label>
              {isAdmin && (
                <div className={styles.revActions}>
                  <button
                    className={styles.iconButton}
                    onClick={() => exportCsv(rev)}
                    aria-label="Export CSV"
                  >
                    <FontAwesomeIcon icon={faFileCsv} />
                  </button>
                  <button
                    className={styles.iconButton}
                    onClick={() => exportInvoice(rev)}
                    aria-label="Export Invoice"
                  >
                    <FontAwesomeIcon icon={faFileInvoice} />
                  </button>
                  <button
                    className={`${styles.iconButton} ${styles.deleteButton}`}
                    onClick={() => setDeleteTarget(rev)}
                    aria-label="Delete revision"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={styles.modalFooter}>
          {isAdmin && (
            <button
              className="modal-button secondary"
              onClick={handleSwitch}
              aria-label={`Edit ${selectedLabel}`}
            >
              {`Edit ${selectedLabel}`}
            </button>
          )}
          {isAdmin && (
            <button
              className="modal-button"
              onClick={() => onDuplicate && onDuplicate(selected)}
            >
              <FontAwesomeIcon icon={faClone} /> Duplicate
            </button>
          )}
          {isAdmin && (
            <button
              className="modal-button"
              onClick={handleSetClient}
              aria-label={`Set ${selectedLabel} as client version`}
            >
              {`Set ${selectedLabel} as Client Version`}
            </button>
          )}
          <button
            className="modal-button"
            onClick={() => onCreateNew && onCreateNew()}
            aria-label="New blank revision"
          >
            <FontAwesomeIcon icon={faPlus} /> New
          </button>
        </div>
      </Modal>
      <ConfirmModal
        isOpen={!!deleteTarget}
        onRequestClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        message={`Delete this revision? Type "${activeProject?.title || ''}" to confirm.`}
        confirmText={activeProject?.title || ''}
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
      {previewRevision && (
        <InvoicePreviewModal
          isOpen={!!previewRevision}
          onRequestClose={() => setPreviewRevision(null)}
          revision={previewRevision}
          project={activeProject}
        />
      )}
    </>
  );
};

export default RevisionModal;