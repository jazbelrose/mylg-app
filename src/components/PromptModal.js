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
const PromptModal = ({ isOpen, onRequestClose, onSubmit, message = 'Enter text', defaultValue = '', submitLabel = 'Save', cancelLabel = 'Cancel', className, overlayClassName, }) => {
    useModalStack(isOpen);
    const [value, setValue] = React.useState(defaultValue);
    React.useEffect(() => {
        if (isOpen)
            setValue(defaultValue);
    }, [isOpen, defaultValue]);
    return (_jsx(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Prompt", className: className, overlayClassName: overlayClassName, shouldCloseOnOverlayClick: false, children: _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("p", { children: message }), _jsx("input", { type: "text", value: value, onChange: (e) => setValue(e.target.value), className: "modal-input", style: { marginTop: '10px', width: '100%' } }), _jsxs("div", { style: { display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }, children: [_jsx("button", { className: "modal-button primary", onClick: () => onSubmit(value), children: submitLabel }), _jsx("button", { className: "modal-button secondary", onClick: onRequestClose, children: cancelLabel })] })] }) }));
};
export default PromptModal;
