import React, { useState, useEffect } from "react";
import Modal from "../../../../components/ModalWithStack";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import styles from "./EditBallparkModal.module.css";

if (typeof document !== "undefined") {
  Modal.setAppElement("#root");
}

const EditBallparkModal = ({ isOpen, onRequestClose, onSubmit, initialValue }) => {
  const [value, setValue] = useState(initialValue || "");

  useEffect(() => {
    setValue(initialValue || "");
  }, [initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const num = parseFloat(value);
    onSubmit(Number.isNaN(num) ? 0 : num);
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Edit Ballpark"
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
        <div className={styles.modalTitle}>Edit Ballpark</div>
        <button className={styles.iconButton} onClick={onRequestClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <form onSubmit={handleSubmit} style={{ width: "100%" }}>
        <div className="currency-input-wrapper">
          <span className="currency-prefix">$</span>
          <input
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="modal-input currency-input"
            autoFocus
          />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
          <button type="submit" className="modal-button primary" style={{ borderRadius: "5px" }}>
            Save
          </button>
          <button
            type="button"
            className="modal-button secondary"
            style={{ borderRadius: "5px" }}
            onClick={onRequestClose}
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default EditBallparkModal;