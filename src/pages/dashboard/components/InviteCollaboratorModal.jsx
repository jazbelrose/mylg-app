import React, { useState } from 'react';
import Modal from '../../../components/ModalWithStack';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import styles from './InviteCollaboratorModal.module.css';

export default function InviteCollaboratorModal({ isOpen, onClose, onInvite }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('designer');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await onInvite(email, role);
      toast.success('Invite sent!');
      setEmail('');
      setRole('designer');
      onClose();
    } catch (err) {
      console.error('Failed to send invite', err);
      toast.error('Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      overlayClassName={styles.overlay}
      className={styles.content}
      contentLabel="Invite User"
    >
      <form onSubmit={submit} className="modal-form w-full">
        <h2 style={{ marginTop: 0, textAlign: 'center' }}>Invite User</h2>
        <input
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="modal-input"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="modal-input mt-2"
        >
          <option value="admin">Admin</option>
          <option value="designer">Designer</option>
          <option value="builder">Builder</option>
          <option value="vendor">Vendor</option>
          <option value="client">Client</option>
        </select>
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="submit"
            disabled={loading || !email}
            className="modal-button primary flex items-center justify-center gap-1"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} className="mr-1" />
            )}
            Send Invite
          </button>
          <button type="button" onClick={onClose} className="modal-button secondary">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}