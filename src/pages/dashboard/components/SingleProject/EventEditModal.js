import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import Modal from '../../../../components/ModalWithStack';
import styles from './CreateLineItemModal.module.css';
const EventEditModal = ({ isOpen, onRequestClose, events: initialEvents = [], defaultDate = '', defaultDescription = '', descOptions = [], onSubmit, }) => {
    const [events, setEvents] = useState([]);
    const [eventInputs, setEventInputs] = useState({
        date: defaultDate,
        hours: '',
        description: defaultDescription,
    });
    const [editingIndex, setEditingIndex] = useState(null);
    const [eventError, setEventError] = useState('');
    useEffect(() => {
        if (isOpen) {
            setEvents(initialEvents.map((ev) => ({ ...ev })));
            setEventInputs({
                date: defaultDate,
                hours: '',
                description: defaultDescription,
            });
            setEditingIndex(null);
            setEventError('');
        }
    }, [isOpen, initialEvents, defaultDate, defaultDescription]);
    const handleEventInputChange = (field, value) => {
        setEventInputs((prev) => ({ ...prev, [field]: value }));
    };
    const handleAddEvent = () => {
        if (!eventInputs.date || !eventInputs.hours) {
            setEventError('Date and hours are required');
            return;
        }
        setEventError('');
        if (editingIndex !== null) {
            setEvents((prev) => prev.map((ev, i) => i === editingIndex
                ? { ...ev, date: eventInputs.date, hours: eventInputs.hours, description: eventInputs.description }
                : ev));
            setEditingIndex(null);
        }
        else {
            setEvents((prev) => [
                ...prev,
                {
                    id: uuid(),
                    date: eventInputs.date,
                    hours: eventInputs.hours,
                    description: eventInputs.description,
                },
            ]);
        }
        setEventInputs({
            date: eventInputs.date,
            hours: '',
            description: defaultDescription,
        });
    };
    const handleEditEvent = (idx) => {
        const ev = events[idx];
        if (ev) {
            setEventInputs({
                date: ev.date,
                hours: ev.hours,
                description: ev.description || defaultDescription,
            });
            setEditingIndex(idx);
        }
    };
    const handleRemoveEvent = (idx) => {
        setEvents((prev) => prev.filter((_, i) => i !== idx));
        if (editingIndex === idx) {
            setEventInputs({
                date: defaultDate,
                hours: '',
                description: defaultDescription,
            });
            setEditingIndex(null);
        }
    };
    const handleSave = () => {
        if (onSubmit)
            onSubmit(events);
        onRequestClose();
    };
    return (_jsxs(Modal, { isOpen: isOpen, onRequestClose: onRequestClose, contentLabel: "Edit Events", className: {
            base: styles.modalContent,
            afterOpen: styles.modalContentAfterOpen,
            beforeClose: styles.modalContentBeforeClose,
        }, overlayClassName: {
            base: styles.modalOverlay,
            afterOpen: styles.modalOverlayAfterOpen,
            beforeClose: styles.modalOverlayBeforeClose,
        }, children: [_jsx("h3", { className: styles.modalTitle, children: "Edit Events" }), _jsxs("div", { className: styles.eventsWrapper, children: [events.map((ev, idx) => (_jsxs("div", { className: styles.eventRow, children: [_jsx("span", { children: ev.date }), _jsxs("span", { children: [ev.hours, " hrs"] }), _jsx("span", { children: ev.description }), _jsxs("div", { className: styles.eventRowActions, children: [_jsx("button", { type: "button", className: styles.editEventButton, onClick: () => handleEditEvent(idx), children: "Edit" }), _jsx("button", { type: "button", className: styles.deleteEventBtn, onClick: () => handleRemoveEvent(idx), children: "Remove" })] })] }, ev.id))), _jsxs("div", { className: styles.calendarFields, children: [_jsxs("label", { className: styles.field, children: ["Event Date", _jsx("input", { type: "date", value: eventInputs.date, onChange: (e) => handleEventInputChange('date', e.target.value) })] }), _jsxs("label", { className: styles.field, children: ["Hours", _jsx("input", { type: "number", value: eventInputs.hours, onChange: (e) => handleEventInputChange('hours', e.target.value) })] }), _jsxs("label", { className: styles.field, children: ["Description", _jsx("input", { type: "text", value: eventInputs.description, onChange: (e) => handleEventInputChange('description', e.target.value), list: "event-desc-options" })] }), _jsx("button", { type: "button", className: `address-button ${styles.addEventButton}`, onClick: handleAddEvent, children: editingIndex !== null ? 'Update' : 'Add Event' })] }), eventError && _jsx("div", { className: styles.eventError, children: eventError }), _jsx("datalist", { id: "event-desc-options", children: descOptions.map((o) => (_jsx("option", { value: o }, o))) })] }), _jsxs("div", { className: styles.modalFooter, children: [_jsx("button", { type: "button", className: "modal-button primary", style: { borderRadius: '5px' }, onClick: handleSave, children: "Save" }), _jsx("button", { type: "button", className: "modal-button secondary", style: { borderRadius: '5px' }, onClick: onRequestClose, children: "Cancel" })] })] }));
};
export default EventEditModal;
