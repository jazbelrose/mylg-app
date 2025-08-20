import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import Spinner from './preloader-light';
import './spinner-overlay.css';
const SpinnerOverlay = ({ className = '', style = {}, spinnerStyle = {} }) => (_jsx("div", { className: `spinner-overlay ${className}`, style: style, children: _jsx(Spinner, { style: { position: 'static', ...spinnerStyle } }) }));
export default SpinnerOverlay;
