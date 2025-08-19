import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import Modal from 'react-modal';
import '../pages/dashboard/style.css';
import useModalStack from '../utils/useModalStack';
if (typeof document !== 'undefined') {
    const el = document.getElementById('root');
    if (el)
        Modal.setAppElement(el);
}
const ConfirmModal = ({ isOpen, onRequestClose, onConfirm, message = 'Are you sure?', confirmLabel = 'Yes', cancelLabel = 'No', confirmText = '', className, overlayClassName, }) => {
    useModalStack(isOpen);
    const [text, setText] = React.useState('');
    React.useEffect(() => {
        if (isOpen)
            setText('');
    }, [isOpen, confirmText]);
    const canConfirm = confirmText ? text === confirmText : true;
    return (_jsx(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Confirmation", className: className, overlayClassName: overlayClassName, shouldCloseOnOverlayClick: false, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("p", { children: message }), confirmText && (_jsx("input", { type: "text", value: text, onChange: (e) => setText(e.target.value), placeholder: `Type \"${confirmText}\" to confirm`, className: "modal-input", style: { marginTop: '10px', width: '100%' } })), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }, children: [_jsx("button", { className: "modal-button primary", onClick: onConfirm, disabled: !canConfirm, children: confirmLabel }), _jsx("button", { className: "modal-button secondary", onClick: onRequestClose, children: cancelLabel })] })] }) }));
};
export default ConfirmModal;
