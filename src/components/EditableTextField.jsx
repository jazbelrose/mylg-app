import React from 'react';

const EditableTextField = ({ id, label, value, onChange, type = 'text' }) => (
  <div className="form-group">
    <label htmlFor={id}>{label}</label>
    <input
      type={type}
      id={id}
      className="modal-input settings"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

export default EditableTextField;