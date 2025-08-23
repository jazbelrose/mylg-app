import React, { useState, useRef, useMemo, useEffect, DragEvent, ChangeEvent } from 'react';
import Modal from '../../../../components/ModalWithStack';
import styles from './NewProjectUploadFiles.module.css';

interface NewProjectUploadFilesProps {
  selectedFiles: File[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  selectedFileNames: string;
  setSelectedFileNames: (names: string) => void;
}

const NewProjectUploadFiles: React.FC<NewProjectUploadFilesProps> = ({
  selectedFiles,
  setSelectedFiles,
  selectedFileNames,
  setSelectedFileNames,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const names = selectedFiles.map(f => f.name).join(', ');
    setSelectedFileNames(names);
  }, [selectedFiles, setSelectedFileNames]);

  const previews = useMemo(
    () => selectedFiles.map(file => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles]
  );

  useEffect(() => {
    return () => {
      previews.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const truncateName = (name: string, max = 12) => {
    if (name.length <= max) return name;
    const extIndex = name.lastIndexOf('.');
    if (extIndex === -1) return name.slice(0, max) + '...';
    const base = name.slice(0, extIndex);
    const ext = name.slice(extIndex + 1);
    if (base.length > max) return base.slice(0, max) + '(..).' + ext;
    return name;
  };

  return (
    <>
      <div className="dashboard-item new-project-uploads" onClick={openModal}>
        {selectedFileNames ? <span>{selectedFileNames}</span> : <span>Upload your files</span>}
        <span>+</span>
      </div>
      <Modal
        isOpen={showModal}
        onRequestClose={closeModal}
        contentLabel="File Upload Modal"
        overlayClassName={styles.fileModalOverlay}
        className={styles.fileModalContent}
      >
        <div
          className={`${styles.modalContentInner} ${isDragging ? styles.dragging : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && <div className={styles.dragOverlay}>Drop files to upload</div>}
          {selectedFiles.length === 0 ? (
            <div className={styles.emptyMessage}>Drag & drop files here or use the button below.</div>
          ) : (
            <ul className={styles.fileGrid}>
              {previews.map((p, index) => (
                <li key={index} className={styles.fileItem}>
                  <div className={styles.filePreview}>
                    {p.file.type.startsWith('image/') ? (
                      <img src={p.url} alt={p.file.name} className={styles.previewImage} />
                    ) : (
                      <div className={styles.previewImage}>{p.file.name.split('.').pop()}</div>
                    )}
                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => removeFile(index)}
                      aria-label="Remove file"
                    >
                      &times;
                    </button>
                  </div>
                  <div className={styles.fileName}>{truncateName(p.file.name)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.modalFooter}>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
          <button
            className={`modal-button secondary ${styles.iconButton}`}
            onClick={() => fileInputRef.current?.click()}
          >
            Choose Files
          </button>
          <button className={`modal-button primary ${styles.iconButton}`} onClick={closeModal}>
            Done
          </button>
        </div>
      </Modal>
    </>
  );
};

export default NewProjectUploadFiles;
