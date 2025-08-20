import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { HexAlphaColorPicker, HexColorInput } from 'react-colorful';
import { hexToRgba } from '../utils/colorUtils';
import './ColorPicker.css';
const ColorPicker = ({ color = '', onChange, title }) => {
    const [internalColor, setInternalColor] = useState(color || '');
    const [open, setOpen] = useState(false);
    const pickerRef = useRef(null);
    useEffect(() => {
        setInternalColor(color || '');
    }, [color]);
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleChange = (newColor) => {
        setInternalColor(newColor);
        if (onChange)
            onChange({ target: { value: newColor } });
    };
    const handleNoColor = () => {
        handleChange('');
    };
    return (_jsxs("div", { className: "color-picker", ref: pickerRef, children: [_jsx("button", { type: "button", className: "color-input", style: { backgroundColor: internalColor || 'transparent' }, title: title, onClick: () => setOpen(!open) }), open && (_jsxs("div", { className: "color-popover", children: [_jsx(HexAlphaColorPicker, { color: internalColor, onChange: handleChange }), _jsx(HexColorInput, { color: internalColor, onChange: handleChange, prefixed: true, alpha: true, className: "hex-input" }), _jsx("button", { type: "button", className: "no-color", onClick: handleNoColor, children: "No Color" }), _jsxs("div", { className: "color-values", children: [_jsx("div", { children: internalColor || 'transparent' }), internalColor && _jsx("div", { children: hexToRgba(internalColor) })] })] }))] }));
};
export default ColorPicker;
