import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { LayoutGrid, FileDown } from 'lucide-react';
import styles from './LayoutPdfButtons.module.css';
const LayoutPdfButtons = ({ useMasonryLayout = false, onToggleLayout = () => { }, downloadUrl = '', isPdf = true, className = '', }) => (_jsxs("div", { className: `${styles.container} ${className}`.trim(), children: [_jsxs("button", { type: "button", onClick: onToggleLayout, className: styles.actionButton, children: [_jsx(LayoutGrid, { size: 16 }), _jsx("span", { children: useMasonryLayout ? 'Grid Layout' : 'Masonry Layout' })] }), downloadUrl && (_jsxs("a", { href: downloadUrl, download: true, className: styles.actionButton, children: [_jsx(FileDown, { size: 16 }), _jsx("span", { children: isPdf ? 'Download PDF' : 'Download SVG' })] }))] }));
export default LayoutPdfButtons;
