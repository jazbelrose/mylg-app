import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import './spinner.css'; // Adjust the path if necessary
const Spinner = ({ className = "", style = {} }) => {
    return (_jsx("div", { className: `spinner-container ${className}`, style: style, children: _jsx("div", { className: "spin" }) }));
};
export default Spinner;
