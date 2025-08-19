import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
const EditableTextField = ({ id, label, value, onChange, type = 'text' }) => (_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: id, children: label }), _jsx("input", { type: type, id: id, className: "modal-input settings", value: value, onChange: (e) => onChange(e.target.value) })] }));
export default EditableTextField;
