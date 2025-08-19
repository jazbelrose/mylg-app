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

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Budget File Modal"
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
        <div className={styles.modalTitle}>Budget Files</div>
        <button className={styles.iconButton} onClick={onRequestClose} aria-label="Close">
          <FontAwesomeIcon icon={faXmark} />
        </button>
      </div>
      <div
        className={`${styles.modalContentInner} ${isDragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className={styles.hiddenInput}
        />
        <p>Click or drag your budget file here</p>
      </div>
      <div className={styles.modalFooter}>
        <a href={templateFile} download className={styles.iconButton}>
          <FontAwesomeIcon icon={faDownload} /> Template
        </a>
        <button
          className={styles.iconButton}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Upload"
        >
          <FontAwesomeIcon icon={faUpload} /> Upload
        </button>
      </div>
    </Modal>
  );
};

export default BudgetFileModal;