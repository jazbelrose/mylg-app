import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../../../components/ModalWithStack';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import ConfirmModal from '../../../../components/ConfirmModal';
import styles from './CreateLineItemModal.module.css';
import { parseBudget, formatUSD } from '../../../../utils/budgetUtils';
const CATEGORY_OPTIONS = [
    'AUDIO-VISUAL',
    'CLIENT-SERVICES-VIP',
    'CONTINGENCY-MISC',
    'DECOR',
    'DESIGN',
    'FABRICATION',
    'FOOD-BEVERAGE',
    'GRAPHICS',
    'INSTALLATION-MATERIALS',
    'LABOR',
    'LIGHTING',
    'MERCH-SWAG',
    'PARKING-FUEL-TOLLS',
    'PERMITS-INSURANCE',
    'PRODUCTION-MGMT',
    'RENTALS',
    'STORAGE',
    'TECH-INTERACTIVES',
    'TRAVEL',
    'TRUCKING',
    'VENUE-LOCATION-FEES',
    'WAREHOUSE',
];
if (typeof document !== 'undefined') {
    Modal.setAppElement('#root');
}
const PAYMENT_TYPE_OPTIONS = ['CREDIT CARD', 'CHECK', 'WIRE', 'ACH', 'CASH'];
const PAYMENT_TERMS_OPTIONS = ['NET 15', 'NET 30', 'NET 60', 'DUE ON RECEIPT'];
const PAYMENT_STATUS_OPTIONS = ['PAID', 'PARTIAL', 'UNPAID'];
const UNIT_OPTIONS = [
    'Each',
    'Hrs',
    'Days',
    'EA',
    'PCS',
    'Box',
    'LF',
    'SQFT',
    'KG',
];
const TOOLTIP_TEXT = {
    itemBudgetedCost: 'Budgeted Cost will be disabled if Actual or Reconciled Cost is entered.',
    itemActualCost: 'Overrides Budgeted Cost. This will be disabled if Reconciled Cost is entered.',
    itemReconciledCost: 'Overrides both Budgeted and Actual Costs when entered.',
    itemMarkUp: 'Markup will auto-adjust to keep Final Cost unchanged when you override costs. You can then modify Markup as needed.',
};
const fields = [
    { name: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
    { name: 'elementKey', label: 'Element Key' },
    { name: 'elementId', label: 'Element ID' },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'unit', label: 'Unit', type: 'select', options: UNIT_OPTIONS },
    { name: 'itemBudgetedCost', label: 'Budgeted Cost', type: 'currency' },
    { name: 'itemActualCost', label: 'Actual Cost', type: 'currency' },
    { name: 'itemReconciledCost', label: 'Reconciled Cost', type: 'currency' },
    { name: 'itemMarkUp', label: 'Markup', type: 'percent' },
    { name: 'itemFinalCost', label: 'Final Cost', type: 'currency' },
    { name: 'paymentType', label: 'Payment Type', type: 'select', options: PAYMENT_TYPE_OPTIONS },
    { name: 'paymentTerms', label: 'Payment Terms', type: 'select', options: PAYMENT_TERMS_OPTIONS },
    { name: 'paymentStatus', label: 'Payment Status', type: 'select', options: PAYMENT_STATUS_OPTIONS },
    { name: 'startDate', label: 'Start Date', type: 'date' },
    { name: 'endDate', label: 'End Date', type: 'date' },
    { name: 'areaGroup', label: 'Area Group' },
    { name: 'invoiceGroup', label: 'Invoice Group' },
    { name: 'poNumber', label: 'PO Number' },
    { name: 'vendor', label: 'Vendor' },
    { name: 'vendorInvoiceNumber', label: 'Vendor Invoice #' },
    { name: 'client', label: 'Client' },
    { name: 'amountPaid', label: 'Amount Paid', type: 'currency' },
    { name: 'balanceDue', label: 'Balance Due', type: 'currency' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
];
const initialState = fields.reduce((acc, f) => {
    if (f.name === 'quantity') {
        acc[f.name] = 1;
    }
    else if (f.name === 'unit') {
        acc[f.name] = 'Each';
    }
    else {
        acc[f.name] = '';
    }
    return acc;
}, {});
const CreateLineItemModal = ({ isOpen, onRequestClose, onSubmit, defaultElementKey = '', budgetItems = [], areaGroupOptions = [], invoiceGroupOptions = [], clientOptions = [], defaultStartDate = '', defaultEndDate = '', initialData = null, title = 'Create Line Item', submitLabel, revision = 1, }) => {
    const [item, setItem] = useState({
        ...initialState,
        elementKey: defaultElementKey,
    });
    const [initialItemString, setInitialItemString] = useState('');
    const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
    const autosaveTimer = useRef(null);
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const formatted = { ...initialState, ...initialData };
                if (formatted.itemMarkUp || formatted.itemMarkUp === 0) {
                    const num = parseFloat(formatted.itemMarkUp);
                    if (!Number.isNaN(num)) {
                        const percent = num < 1 ? num * 100 : num;
                        formatted.itemMarkUp = `${parseFloat(percent)}%`;
                    }
                }
                setItem(() => formatted);
                setInitialItemString(JSON.stringify(formatted));
            }
            else {
                const defaultItem = {
                    ...initialState,
                    elementKey: defaultElementKey,
                    startDate: defaultStartDate || '',
                    endDate: defaultEndDate || '',
                };
                setItem(() => defaultItem);
                setInitialItemString(JSON.stringify(defaultItem));
            }
        }
    }, [isOpen]);
    const getNextElementId = (category) => {
        let max = 0;
        budgetItems.forEach((it) => {
            if (it.category === category && typeof it.elementId === 'string') {
                const match = it.elementId.match(/-(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > max)
                        max = num;
                }
            }
        });
        return `${category}-${String(max + 1).padStart(4, '0')}`;
    };
    const computeFinalCost = (data) => {
        const budgeted = parseBudget(data.itemBudgetedCost);
        const actual = parseBudget(data.itemActualCost);
        const reconciled = parseBudget(data.itemReconciledCost);
        const mark = parseFloat(String(data.itemMarkUp).replace(/%/g, ''));
        const markupNum = Number.isNaN(mark) ? 0 : mark / 100;
        const baseCost = reconciled || actual || budgeted;
        const qty = parseFloat(data.quantity) || 0;
        const final = baseCost * (1 + markupNum) * (qty || 1);
        return baseCost ? formatUSD(final) : '';
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setItem((prev) => {
            let updated = { ...prev, [name]: value };
            if (name === 'category' && value) {
                updated.elementId = getNextElementId(value);
            }
            if ([
                'itemBudgetedCost',
                'itemActualCost',
                'itemReconciledCost',
                'itemMarkUp',
            ].includes(name)) {
                const prevFinal = parseBudget(prev.itemFinalCost);
                let budgeted = parseBudget(updated.itemBudgetedCost);
                let actual = parseBudget(updated.itemActualCost);
                let reconciled = parseBudget(updated.itemReconciledCost);
                if (name === 'itemBudgetedCost')
                    budgeted = parseBudget(value);
                if (name === 'itemActualCost')
                    actual = parseBudget(value);
                if (name === 'itemReconciledCost')
                    reconciled = parseBudget(value);
                if ((name === 'itemActualCost' || name === 'itemReconciledCost') &&
                    prevFinal) {
                    const base = reconciled || actual || budgeted;
                    if (base) {
                        const qty = parseFloat(prev.quantity) || 1;
                        const newMarkup = ((prevFinal / (base * qty) - 1) * 100).toFixed(2);
                        updated.itemMarkUp = `${parseFloat(newMarkup)}%`;
                    }
                }
                updated.itemFinalCost = computeFinalCost(updated);
            }
            if (name === 'quantity') {
                updated.itemFinalCost = computeFinalCost(updated);
            }
            return updated;
        });
    };
    const handleBlur = (e) => {
        const { name, value } = e.target;
        if ([
            'itemBudgetedCost',
            'itemFinalCost',
            'itemActualCost',
            'itemReconciledCost',
            'amountPaid',
            'balanceDue',
        ].includes(name)) {
            setItem((prev) => {
                const updated = { ...prev, [name]: value ? formatUSD(parseBudget(value)) : '' };
                if ([
                    'itemBudgetedCost',
                    'itemActualCost',
                    'itemReconciledCost',
                    'itemFinalCost',
                ].includes(name)) {
                    const prevFinal = parseBudget(prev.itemFinalCost);
                    const budgeted = parseBudget(updated.itemBudgetedCost);
                    const actual = parseBudget(updated.itemActualCost);
                    const reconciled = parseBudget(updated.itemReconciledCost);
                    if ((name === 'itemActualCost' || name === 'itemReconciledCost') && prevFinal) {
                        const base = reconciled || actual || budgeted;
                        if (base) {
                            const qty = parseFloat(prev.quantity) || 1;
                            const newMarkup = ((prevFinal / (base * qty) - 1) * 100).toFixed(2);
                            updated.itemMarkUp = `${parseFloat(newMarkup)}%`;
                        }
                    }
                    updated.itemFinalCost = computeFinalCost(updated);
                }
                return updated;
            });
        }
        else if (name === 'itemMarkUp') {
            if (value === '') {
                setItem((prev) => ({ ...prev, [name]: '' }));
            }
            else {
                const num = parseFloat(String(value).replace(/%/g, ''));
                if (!Number.isNaN(num)) {
                    setItem((prev) => {
                        const updated = { ...prev, [name]: `${num}%` };
                        const budgeted = parseBudget(updated.itemBudgetedCost);
                        const actual = parseBudget(updated.itemActualCost);
                        const reconciled = parseBudget(updated.itemReconciledCost);
                        const markupNum = num / 100;
                        const baseCost = reconciled || actual || budgeted;
                        const qty = parseFloat(updated.quantity) || 0;
                        const final = baseCost * (1 + markupNum) * (qty || 1);
                        updated.itemFinalCost = baseCost ? formatUSD(final) : '';
                        return updated;
                    });
                }
            }
        }
    };
    const submitItem = async () => {
        const data = { ...item };
        [
            'itemBudgetedCost',
            'itemFinalCost',
            'itemActualCost',
            'itemReconciledCost',
            'amountPaid',
            'balanceDue',
        ].forEach((field) => {
            data[field] = data[field] ? parseBudget(data[field]) : 0;
        });
        data.quantity = data.quantity ? parseFloat(data.quantity) : 0;
        if (data.areaGroup)
            data.areaGroup = data.areaGroup.trim().toUpperCase();
        if (data.invoiceGroup)
            data.invoiceGroup = data.invoiceGroup.trim().toUpperCase();
        if (data.itemMarkUp !== '') {
            const num = parseFloat(String(data.itemMarkUp).replace(/%/g, ''));
            data.itemMarkUp = Number.isNaN(num) ? 0 : num / 100;
        }
        else {
            data.itemMarkUp = 0;
        }
        data.revision = revision;
        if (onSubmit) {
            return await onSubmit(data);
        }
        return null;
    };
    const persistItem = async () => {
        const result = await submitItem();
        const savedItem = result?.budgetItemId
            ? { ...item, budgetItemId: result.budgetItemId }
            : item;
        if (result?.budgetItemId && !item.budgetItemId) {
            setItem(savedItem);
        }
        setInitialItemString(JSON.stringify(savedItem));
        return result;
    };
    const handleClose = async () => {
        if (autosaveTimer.current) {
            clearTimeout(autosaveTimer.current);
            autosaveTimer.current = null;
        }
        if (JSON.stringify(item) !== initialItemString) {
            if (initialData) {
                setShowUnsavedConfirm(true);
            }
            else {
                await persistItem();
                onRequestClose();
            }
        }
        else {
            onRequestClose();
        }
    };
    const confirmSave = async () => {
        await persistItem();
        setShowUnsavedConfirm(false);
        onRequestClose();
    };
    const discardChanges = () => {
        setShowUnsavedConfirm(false);
        onRequestClose();
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        await persistItem();
    };
    useEffect(() => {
        if (!isOpen || initialItemString === '')
            return;
        const current = JSON.stringify(item);
        if (current === initialItemString)
            return;
        if (autosaveTimer.current)
            clearTimeout(autosaveTimer.current);
        autosaveTimer.current = setTimeout(() => {
            persistItem();
        }, 1000);
        return () => {
            if (autosaveTimer.current)
                clearTimeout(autosaveTimer.current);
        };
    }, [item, isOpen, initialItemString]);
    useEffect(() => {
        if (!isOpen)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                persistItem();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, item]);
    return (_jsxs(_Fragment, { children: [_jsx("style", { children: `
        .${styles.modalContent} {
          font-size: 12px !important;
          padding: 16px !important;
        }
        .${styles.form} label {
          margin-bottom: 4px !important;
        }
        .${styles.form} input,
        .${styles.form} textarea,
        .${styles.form} select {
          font-size: 11px !important;
          padding: 2px 6px !important;
        }
        .${styles.fieldDivider} {
          margin: 6px 0 !important;
        }
        .${styles.modalFooter} {
          margin-top: 10px !important;
        }
        .${styles.shortcutHint} {
          font-size: 10px !important;
        }
      ` }), _jsxs(Modal, { isOpen: isOpen, onRequestClose: handleClose, contentLabel: title, closeTimeoutMS: 300, className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                }, children: [_jsxs("div", { className: styles.modalHeader, children: [_jsx("div", { className: styles.modalTitle, children: title }), _jsxs("span", { className: styles.revisionLabel, children: ["Rev.", revision] }), _jsx("button", { className: styles.iconButton, onClick: handleClose, "aria-label": "Close", children: _jsx(FontAwesomeIcon, { icon: faXmark }) })] }), _jsxs("form", { className: styles.form, onSubmit: handleSubmit, children: [fields.map((f) => (_jsxs(React.Fragment, { children: [_jsxs("label", { className: `${styles.field} ${TOOLTIP_TEXT[f.name] ? styles.tooltipLabel : ''}`, title: TOOLTIP_TEXT[f.name] || undefined, children: [_jsx("span", { children: f.label }), f.type === 'select' ? (f.name === 'paymentStatus' ? (_jsxs("span", { className: styles.paymentStatusContainer, children: [_jsxs("select", { name: f.name, value: item[f.name], onChange: handleChange, disabled: f.name === 'elementKey' || f.name === 'elementId', children: [_jsx("option", { hidden: true, value: "" }), f.options.map((o) => (_jsx("option", { value: o, children: o }, o)))] }), item[f.name] && (_jsx("span", { className: `${styles.statusDot} ${item[f.name].trim().toUpperCase() === 'PAID'
                                                            ? styles.paid
                                                            : item[f.name].trim().toUpperCase() === 'PARTIAL'
                                                                ? styles.partial
                                                                : styles.unpaid}` }))] })) : (_jsxs("select", { name: f.name, value: item[f.name], onChange: handleChange, disabled: f.name === 'elementKey' || f.name === 'elementId', children: [_jsx("option", { hidden: true, value: "" }), f.options.map((o) => (_jsx("option", { value: o, children: o }, o)))] }))) : f.type === 'number' || f.type === 'date' ? (_jsx("input", { type: f.type, name: f.name, value: item[f.name], onChange: handleChange, disabled: f.name === 'elementKey' ||
                                                    f.name === 'elementId' ||
                                                    (f.name === 'itemBudgetedCost' && (item.itemActualCost || item.itemReconciledCost)) ||
                                                    (f.name === 'itemActualCost' && item.itemReconciledCost) })) : f.type === 'textarea' ? (_jsx("textarea", { name: f.name, value: item[f.name], onChange: handleChange, className: f.name === 'description' ? styles.descriptionInput : undefined, disabled: f.name === 'elementKey' ||
                                                    f.name === 'elementId' ||
                                                    (f.name === 'itemBudgetedCost' && (item.itemActualCost || item.itemReconciledCost)) ||
                                                    (f.name === 'itemActualCost' && item.itemReconciledCost) })) : (_jsx("input", { type: "text", name: f.name, value: item[f.name], onChange: handleChange, onBlur: ['currency', 'percent'].includes(f.type) ? handleBlur : undefined, placeholder: f.type === 'currency' ? '$0.00' : f.type === 'percent' ? '0%' : '', disabled: f.name === 'elementKey' ||
                                                    f.name === 'elementId' ||
                                                    (f.name === 'itemBudgetedCost' && (item.itemActualCost || item.itemReconciledCost)) ||
                                                    (f.name === 'itemActualCost' && item.itemReconciledCost), list: f.name === 'areaGroup'
                                                    ? 'area-group-options'
                                                    : f.name === 'invoiceGroup'
                                                        ? 'invoice-group-options'
                                                        : f.name === 'client'
                                                            ? 'client-options'
                                                            : undefined }))] }), ['description', 'itemFinalCost', 'paymentStatus', 'endDate', 'invoiceGroup', 'vendorInvoiceNumber'].includes(f.name) && (_jsx("hr", { className: styles.fieldDivider }))] }, f.name))), _jsx("datalist", { id: "area-group-options", children: areaGroupOptions.map((o) => (_jsx("option", { value: o }, o))) }), _jsx("datalist", { id: "invoice-group-options", children: invoiceGroupOptions.map((o) => (_jsx("option", { value: o }, o))) }), _jsx("datalist", { id: "client-options", children: clientOptions.map((o) => (_jsx("option", { value: o }, o))) }), _jsxs("div", { className: styles.modalFooter, children: [_jsx("button", { type: "submit", className: "modal-button primary", style: { borderRadius: '5px' }, children: submitLabel || (title === 'Edit Item' ? 'Save' : 'Create') }), _jsx("button", { type: "button", className: "modal-button secondary", style: { borderRadius: '5px' }, onClick: handleClose, children: "Cancel" })] }), _jsx("div", { className: styles.shortcutHint, children: "Press \u2318+Enter / Ctrl+Enter to save." })] })] }), _jsx(ConfirmModal, { isOpen: showUnsavedConfirm, onRequestClose: discardChanges, onConfirm: confirmSave, message: "You have unsaved changes, do you want to save this line item?", confirmLabel: "Yes", cancelLabel: "No", className: {
                    base: styles.modalContent,
                    afterOpen: styles.modalContentAfterOpen,
                    beforeClose: styles.modalContentBeforeClose,
                }, overlayClassName: {
                    base: styles.modalOverlay,
                    afterOpen: styles.modalOverlayAfterOpen,
                    beforeClose: styles.modalOverlayBeforeClose,
                } })] }));
};
export default CreateLineItemModal;
