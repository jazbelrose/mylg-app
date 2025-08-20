import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import Modal from '../../../../components/ModalWithStack';
import { X } from 'lucide-react';
import styles from './TeamModal.module.css';
import { useOnlineStatus } from '../../../../app/contexts/OnlineStatusContext';
export default function TeamModal({ isOpen, onRequestClose, members = [] }) {
    const { onlineUsers } = useOnlineStatus();
    return (_jsxs(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Project Team", closeTimeoutMS: 300, className: {
            base: styles.modalContent,
            afterOpen: styles.modalContentAfterOpen,
            beforeClose: styles.modalContentBeforeClose,
        }, overlayClassName: {
            base: styles.modalOverlay,
            afterOpen: styles.modalOverlayAfterOpen,
            beforeClose: styles.modalOverlayBeforeClose,
        }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("h3", { className: styles.modalTitle, children: "Project Team" }), _jsx("button", { onClick: onRequestClose, "aria-label": "Close", className: styles.closeButton, children: _jsx(X, { size: 20 }) })] }), _jsx("ul", { className: styles.teamList, children: members.map((m) => (_jsxs("li", { className: styles.teamItem, children: [_jsxs("div", { className: styles.avatarWrapper, children: [m.thumbnail ? (_jsx("img", { src: m.thumbnail, alt: m.firstName || 'Member', className: styles.avatar })) : (_jsx("div", { className: styles.avatarPlaceholder })), onlineUsers.includes(m.userId) && _jsx("span", { className: styles.onlineIndicator })] }), _jsxs("div", { className: styles.infoBlock, children: [_jsxs("span", { className: styles.name, children: [m.firstName, " ", m.lastName] }), m.role && _jsx("span", { className: styles.roleTag, children: m.role })] })] }, m.userId))) })] }));
}
