import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import styles from './FileManager.module.css';
export default function Dropdown({ options, value, onChange, label }) {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef(null);
    const selected = options.find((opt) => opt.value === value);
    useEffect(() => {
        if (open) {
            const currentIndex = options.findIndex((opt) => opt.value === value);
            setHighlightedIndex(currentIndex === -1 ? 0 : currentIndex);
        }
    }, [open, options, value]);
    useEffect(() => {
        if (!open)
            return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex((i) => (i + 1) % options.length);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex((i) => (i - 1 + options.length) % options.length);
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                const opt = options[highlightedIndex];
                if (opt) {
                    onChange(opt.value);
                    setOpen(false);
                }
            }
            else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
            }
        };
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open, options, highlightedIndex, onChange]);
    return (_jsxs("div", { className: styles.dropdown, ref: containerRef, children: [_jsx("button", { type: "button", className: styles.dropdownTrigger, "aria-haspopup": "listbox", "aria-expanded": open, "aria-label": label, onClick: () => setOpen((o) => !o), children: selected ? selected.label : label }), open && (_jsx("ul", { className: styles.dropdownMenu, role: "listbox", children: options.map((opt, idx) => (_jsx("li", { role: "option", "aria-selected": value === opt.value, className: `${styles.dropdownOption} ${idx === highlightedIndex ? styles.dropdownOptionActive : ''} ${value === opt.value ? styles.dropdownOptionSelected : ''}`, onMouseEnter: () => setHighlightedIndex(idx), onMouseDown: (e) => e.preventDefault(), onClick: () => {
                        onChange(opt.value);
                        setOpen(false);
                    }, children: opt.label }, opt.value))) }))] }));
}
