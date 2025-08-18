import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import Modal from '../../../../components/ModalWithStack';
import styles from './CreateLineItemModal.module.css';

const EventEditModal = ({
  isOpen,
  onRequestClose,
  events: initialEvents = [],
  defaultDate = '',
  defaultDescription = '',
  descOptions = [],
  onSubmit,
}) => {
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
      setEvents((prev) =>
        prev.map((ev, i) =>
          i === editingIndex
            ? { ...ev, date: eventInputs.date, hours: eventInputs.hours, description: eventInputs.description }
            : ev
        )
      );
      setEditingIndex(null);
    } else {
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
    if (onSubmit) onSubmit(events);
    onRequestClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      contentLabel="Edit Events"
      className={{
        base: styles.modalContent,
        afterOpen: styles.modalContentAfterOpen,
        beforeClose: styles.modalContentBeforeClose,
      }}
      overlayClassName={{
        base: styles.modalOverlay,
        afterOpen: styles.modalOverlayAfterOpen,
        beforeClose: styles.modalOverlayBeforeClose,
      }}
    >
      <h3 className={styles.modalTitle}>Edit Events</h3>
      <div className={styles.eventsWrapper}>
        {events.map((ev, idx) => (
          <div key={ev.id} className={styles.eventRow}>
            <span>{ev.date}</span>
            <span>{ev.hours} hrs</span>
            <span>{ev.description}</span>
            <div className={styles.eventRowActions}>
              <button
                type="button"
                className={styles.editEventButton}
                onClick={() => handleEditEvent(idx)}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.deleteEventBtn}
                onClick={() => handleRemoveEvent(idx)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className={styles.calendarFields}>
          <label className={styles.field}>
            Event Date
            <input
              type="date"
              value={eventInputs.date}
              onChange={(e) => handleEventInputChange('date', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Hours
            <input
              type="number"
              value={eventInputs.hours}
              onChange={(e) => handleEventInputChange('hours', e.target.value)}
            />
          </label>
          <label className={styles.field}>
            Description
            <input
              type="text"
              value={eventInputs.description}
              onChange={(e) => handleEventInputChange('description', e.target.value)}
              list="event-desc-options"
            />
          </label>
          <button
            type="button"
            className={`address-button ${styles.addEventButton}`}
            onClick={handleAddEvent}
          >
            {editingIndex !== null ? 'Update' : 'Add Event'}
          </button>
        </div>
        {eventError && <div className={styles.eventError}>{eventError}</div>}
        <datalist id="event-desc-options">
          {descOptions.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      </div>
      <div className={styles.modalFooter}>
        <button type="button" className="modal-button primary" style={{ borderRadius: '5px' }} onClick={handleSave}>
          Save
        </button>
        <button
          type="button"
          className="modal-button secondary"
          style={{ borderRadius: '5px' }}
          onClick={onRequestClose}
        >
          Cancel
        </button>
      </div>
    </Modal>
  );
};

export default EventEditModal;