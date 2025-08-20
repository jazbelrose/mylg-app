import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
        if (!email)
            return;
        setLoading(true);
        try {
            await onInvite(email, role);
            toast.success('Invite sent!');
            setEmail('');
            setRole('designer');
            onClose();
        }
        catch (err) {
            console.error('Failed to send invite', err);
            toast.error('Failed to send invite');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Modal, { isOpen: isOpen, onRequestClose: onClose, overlayClassName: styles.overlay, className: styles.content, contentLabel: "Invite User", children: _jsxs("form", { onSubmit: submit, className: "modal-form w-full", children: [_jsx("h2", { style: { marginTop: 0, textAlign: 'center' }, children: "Invite User" }), _jsx("input", { type: "email", autoComplete: "off", value: email, onChange: (e) => setEmail(e.target.value), placeholder: "Email address", className: "modal-input" }), _jsxs("select", { value: role, onChange: (e) => setRole(e.target.value), className: "modal-input mt-2", children: [_jsx("option", { value: "admin", children: "Admin" }), _jsx("option", { value: "designer", children: "Designer" }), _jsx("option", { value: "builder", children: "Builder" }), _jsx("option", { value: "vendor", children: "Vendor" }), _jsx("option", { value: "client", children: "Client" })] }), _jsxs("div", { className: "flex justify-center gap-2 mt-4", children: [_jsxs("button", { type: "submit", disabled: loading || !email, className: "modal-button primary flex items-center justify-center gap-1", children: [loading ? (_jsx(Loader2, { size: 16, className: "animate-spin" })) : (_jsx(UserPlus, { size: 16, className: "mr-1" })), "Send Invite"] }), _jsx("button", { type: "button", onClick: onClose, className: "modal-button secondary", children: "Cancel" })] })] }) }));
}
