import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import Modal from "../../../../components/ModalWithStack";
const NewProjectBudget = ({ budget, setBudget, style }) => {
    const [showBudgetModal, setShowBudgetModal] = React.useState(false);
    const handleBudgetClick = () => {
        setShowBudgetModal(true);
    };
    const closeBudgetModal = () => {
        setShowBudgetModal(false);
    };
    const handleBudgetChange = (event) => {
        setBudget(event.target.value);
    };
    const handleSubmitBudget = (e) => {
        e.preventDefault();
        console.log("Budget Set:", budget);
        closeBudgetModal();
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-item new-project-budget", onClick: handleBudgetClick, style: style, children: [_jsx("span", { children: budget ? `$${budget}` : 'Budget' }), _jsx("span", { children: "+" })] }), _jsx(Modal, { isOpen: showBudgetModal, onRequestClose: closeBudgetModal, contentLabel: "Budget Modal", style: {
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
                }, children: _jsxs("form", { onSubmit: handleSubmitBudget, className: "modal-form", children: [_jsx("label", { className: "modal-label", children: "Budget" }), _jsxs("div", { className: "currency-input-wrapper", children: [_jsx("span", { className: "currency-prefix", children: "$" }), _jsx("input", { type: "text", value: budget, onChange: handleBudgetChange, className: "modal-input currency-input" })] }), _jsx("button", { type: "submit", className: "modal-button primary", children: "Done" })] }) })] }));
};
export default NewProjectBudget;
