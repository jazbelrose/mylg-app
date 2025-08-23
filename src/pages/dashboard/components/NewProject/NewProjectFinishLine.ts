import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import Modal from "../../../../components/ModalWithStack";
const NewProjectFinishline = ({ finishline, setFinishLine }) => {
    const [showFinishLineModal, setShowFinishLineModal] = React.useState(false);
    const handleFinishLineClick = () => {
        setShowFinishLineModal(true);
    };
    const closeFinishLineModal = () => {
        setShowFinishLineModal(false);
    };
    const handleFinishLineChange = (e) => {
        setFinishLine(e.target.value);
    };
    const handleSubmitFinishLine = (e) => {
        e.preventDefault();
        console.log("Finish Line Set:", finishline);
        closeFinishLineModal();
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-item new-project-finish-line", onClick: handleFinishLineClick, children: [_jsx("span", { children: finishline || 'Finish Line' }), _jsx("span", { children: "+" })] }), _jsx(Modal, { isOpen: showFinishLineModal, onRequestClose: closeFinishLineModal, contentLabel: "Finish Line Modal", style: {
                    overlay: {
                        backgroundColor: 'rgba(0, 0, 0, 0.75)'
                    },
                    content: {
                        display: 'flex',
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        color: 'white',
                        width: '300px',
                        height: '400px',
                        margin: 'auto',
                        paddingTop: '50px',
                        borderRadius: '20px'
                    }
                }, children: _jsxs("form", { onSubmit: handleSubmitFinishLine, className: "modal-form", children: [_jsx("label", { className: "modal-label", children: "Finish Line" }), _jsx("input", { type: "date", value: finishline, onChange: handleFinishLineChange, className: "modal-input", placeholder: "Finish Line" }), _jsx("button", { type: "submit", className: "modal-button primary", children: "Set Finish Line" })] }) })] }));
};
export default NewProjectFinishline;
