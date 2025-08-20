import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import Modal from "../../../../components/ModalWithStack";
const NewProjectName = ({ projectName, setProjectName }) => {
    const [showModal, setShowModal] = React.useState(false);
    const handleProjectNameClick = () => {
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
    };
    const handleProjectNameChange = (event) => {
        setProjectName(event.target.value);
    };
    const handleSubmit = (event) => {
        event.preventDefault();
        console.log("Project Name Set:", projectName);
        closeModal();
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-item project-name ", onClick: handleProjectNameClick, children: [_jsx("span", { children: projectName || 'Project Name' }), _jsx("span", { children: "+" })] }), _jsx(Modal, { isOpen: showModal, onRequestClose: closeModal, contentLabel: "Project Name Modal", style: {
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
                }, children: _jsxs("form", { onSubmit: handleSubmit, className: "modal-form", children: [_jsx("label", { className: "modal-label", children: "Project Name" }), _jsx("input", { type: "text", value: projectName, onChange: handleProjectNameChange, className: "modal-input" }), _jsx("button", { type: "submit", className: "modal-button primary", style: { padding: "10px 25px", borderRadius: "10px" }, children: "Done" })] }) })] }));
};
export default NewProjectName;
