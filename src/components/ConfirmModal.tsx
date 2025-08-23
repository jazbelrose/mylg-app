import React, { useEffect, useState } from 'react';
import Modal from 'react-modal';

import '../pages/dashboard/style.css';
import useModalStack from '../utils/useModalStack';

if (typeof document !== 'undefined') {
  const el = document.getElementById('root');
  if (el) Modal.setAppElement(el);
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  onConfirm: () => void;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmText?: string;
  className?: string;
  overlayClassName?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onRequestClose,
  onConfirm,
  message = 'Are you sure?',
  confirmLabel = 'Yes',
  cancelLabel = 'No',
  confirmText = '',
  className,
  overlayClassName,
}) => {
  useModalStack(isOpen);

  const [text, setText] = useState('');

  useEffect(() => {
    if (isOpen) setText('');
  }, [isOpen, confirmText]);

  const canConfirm = confirmText ? text === confirmText : true;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Confirmation"
      className={className}
      overlayClassName={overlayClassName}
      shouldCloseOnOverlayClick={false}
    >
      <div style={{ textAlign: 'center' }}>
        <p>{message}</p>
        {confirmText && (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Type "${confirmText}" to confirm`}
            className="modal-input"
            style={{ marginTop: '10px', width: '100%' }}
          />
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '20px',
          }}
        >
          <button
            className="modal-button primary"
            onClick={onConfirm}
            disabled={!canConfirm}
          >
            {confirmLabel}
          </button>
          <button className="modal-button secondary" onClick={onRequestClose}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;

