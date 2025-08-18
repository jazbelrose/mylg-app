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
    if (onChange) onChange({ target: { value: newColor } });
  };

  const handleNoColor = () => {
    handleChange('');
  };

  return (
    <div className="color-picker" ref={pickerRef}>
      <button
        type="button"
        className="color-input"
        style={{ backgroundColor: internalColor || 'transparent' }}
        title={title}
        onClick={() => setOpen(!open)}
      />
      {open && (
        <div className="color-popover">
          <HexAlphaColorPicker color={internalColor} onChange={handleChange} />
          <HexColorInput
            color={internalColor}
            onChange={handleChange}
            prefixed
            alpha
            className="hex-input"
          />
          <button type="button" className="no-color" onClick={handleNoColor}>
            No Color
          </button>
          <div className="color-values">
            <div>{internalColor || 'transparent'}</div>
            {internalColor && <div>{hexToRgba(internalColor)}</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ColorPicker;

