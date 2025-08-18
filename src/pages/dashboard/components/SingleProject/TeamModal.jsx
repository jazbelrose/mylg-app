import React from 'react';
import Modal from '../../../../components/ModalWithStack';
import { X } from 'lucide-react';
import styles from './TeamModal.module.css';
import { useOnlineStatus } from '../../../../app/contexts/OnlineStatusContext';

export default function TeamModal({ isOpen, onRequestClose, members = [] }) {
  const { onlineUsers } = useOnlineStatus();

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Project Team"
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
        <h3 className={styles.modalTitle}>Project Team</h3>
        <button
          onClick={onRequestClose}
          aria-label="Close"
          className={styles.closeButton}
        >
          <X size={20} />
        </button>
      </div>
      <ul className={styles.teamList}>
        {members.map((m) => (
          <li key={m.userId} className={styles.teamItem}>
            <div className={styles.avatarWrapper}>
              {m.thumbnail ? (
                <img src={m.thumbnail} alt={m.firstName || 'Member'} className={styles.avatar} />
              ) : (
                <div className={styles.avatarPlaceholder} />
              )}
              {onlineUsers.includes(m.userId) && <span className={styles.onlineIndicator} />}
            </div>
            <div className={styles.infoBlock}>
              <span className={styles.name}>{m.firstName} {m.lastName}</span>
              {m.role && <span className={styles.roleTag}>{m.role}</span>}
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}