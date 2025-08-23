import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Edit Ballpark", closeTimeoutMS: 300, className: {
            base: styles.modalContent,
            afterOpen: styles.modalContentAfterOpen,
            beforeClose: styles.modalContentBeforeClose,
        }, overlayClassName: {
            base: styles.modalOverlay,
            afterOpen: styles.modalOverlayAfterOpen,
            beforeClose: styles.modalOverlayBeforeClose,
        }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("div", { className: styles.modalTitle, children: "Edit Ballpark" }), _jsx("button", { className: styles.iconButton, onClick: onRequestClose, "aria-label": "Close", children: _jsx(FontAwesomeIcon, { icon: faXmark }) })] }), _jsxs("form", { onSubmit: handleSubmit, style: { width: "100%" }, children: [_jsxs("div", { className: "currency-input-wrapper", children: [_jsx("span", { className: "currency-prefix", children: "$" }), _jsx("input", { type: "number", step: "0.01", value: value, onChange: (e) => setValue(e.target.value), className: "modal-input currency-input", autoFocus: true })] }), _jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }, children: [_jsx("button", { type: "submit", className: "modal-button primary", style: { borderRadius: "5px" }, children: "Save" }), _jsx("button", { type: "button", className: "modal-button secondary", style: { borderRadius: "5px" }, onClick: onRequestClose, children: "Cancel" })] })] })] }));
};
export default EditBallparkModal;
