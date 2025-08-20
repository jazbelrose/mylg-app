import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from 'react';
import { Bold, Italic, Underline, Strikethrough, Code, Heading1, Heading2, Quote, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify, Square, Circle, Pencil, Type, Image as ImageIcon, MousePointer, ClipboardCopy, ClipboardPaste, Trash2, Eraser, Eye, Save, Undo2, Redo2, Figma, Mic, FileText, Paintbrush, } from 'lucide-react';
import { motion } from 'framer-motion';
import './UnifiedToolbar.css';
import ColorPicker from './ColorPicker';
const UnifiedToolbar = ({ onBold, onItalic, onUnderline, onStrikethrough, onCode, onParagraph, onHeading1, onHeading2, onQuote, onUnorderedList, onOrderedList, onFontChange, onFontSizeChange, onFontColorChange, onBgColorChange, onAlignLeft, onAlignCenter, onAlignRight, onAlignJustify, onAddRectangle, onAddCircle, onFreeDraw, onSelectTool, onAddText, onAddImage, onColorChange, onFigma, onVoice, onCopy, onPaste, onDelete, onClearCanvas, onPreview, onSave, onUndo, onRedo, initialMode = 'brief', onModeChange, theme = 'dark', orientation = 'horizontal', }) => {
    const [mode, setMode] = useState(initialMode);
    const [fontColor, setFontColor] = useState('');
    const [bgColor, setBgColor] = useState('');
    const handleFontColorChange = (e) => {
        const value = e.target.value;
        setFontColor(value);
        if (onFontColorChange)
            onFontColorChange(e);
    };
    const handleBgColorChange = (e) => {
        const value = e.target.value;
        setBgColor(value);
        if (onBgColorChange)
            onBgColorChange(e);
    };
    const handleBlockChange = (value) => {
        switch (value) {
            case 'body':
                onParagraph && onParagraph();
                break;
            case 'heading':
                onHeading1 && onHeading1();
                break;
            case 'subheading':
                onHeading2 && onHeading2();
                break;
            case 'quote':
                onQuote && onQuote();
                break;
            case 'bulleted':
                onUnorderedList && onUnorderedList();
                break;
            case 'numbered':
                onOrderedList && onOrderedList();
                break;
            default:
                break;
        }
    };
    const handleModeChange = (newMode) => {
        setMode(newMode);
        if (onModeChange)
            onModeChange(newMode);
    };
    const modes = [
        { key: 'brief', label: 'Brief', icon: FileText },
        { key: 'canvas', label: 'Canvas', icon: Paintbrush },
    ];
    const tabRefs = useRef({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0 });
    useEffect(() => {
        const node = tabRefs.current[mode];
        if (node) {
            setIndicator({ left: node.offsetLeft, width: node.offsetWidth });
        }
    }, [mode]);
    return (_jsxs("div", { className: `unified-toolbar ${theme} ${orientation}`, children: [_jsx("div", { className: "toolbar-group mode-switcher", children: _jsxs("div", { className: "segmented-control motion", role: "tablist", "aria-label": "Editor mode", children: [_jsx(motion.span, { className: "segmented-active", initial: false, animate: { x: indicator.left, width: indicator.width }, transition: { type: 'tween', duration: 0.2 }, style: { opacity: indicator.width ? 1 : 0 } }), modes.map(({ key, label, icon: Icon }) => (_jsxs("button", { type: "button", role: "tab", ref: (el) => (tabRefs.current[key] = el), onClick: () => handleModeChange(key), className: mode === key ? 'active' : '', "aria-selected": mode === key, children: [_jsx(Icon, { size: 16 }), _jsx("span", { children: label })] }, key)))] }) }), mode === 'brief' && (_jsxs("div", { className: "toolbar-group mode-actions brief-actions", children: [_jsxs("select", { onChange: (e) => handleBlockChange(e.target.value), title: "Block format", children: [_jsx("option", { value: "body", children: "Body" }), _jsx("option", { value: "heading", children: "Heading" }), _jsx("option", { value: "subheading", children: "Subheading" }), _jsx("option", { value: "quote", children: "Quote" }), _jsx("option", { value: "bulleted", children: "Bulleted" }), _jsx("option", { value: "numbered", children: "Numbered" })] }), _jsxs("select", { onChange: (e) => onFontChange && onFontChange(e.target.value), title: "Font", children: [_jsx("option", { value: "Arial", children: "Arial" }), _jsx("option", { value: "Times New Roman", children: "Times New Roman" }), _jsx("option", { value: "Courier New", children: "Courier New" })] }), _jsxs("select", { onChange: (e) => onFontSizeChange && onFontSizeChange(e.target.value), title: "Font size", children: [_jsx("option", { value: "12", children: "12" }), _jsx("option", { value: "14", children: "14" }), _jsx("option", { value: "16", children: "16" }), _jsx("option", { value: "18", children: "18" }), _jsx("option", { value: "24", children: "24" }), _jsx("option", { value: "32", children: "32" })] }), _jsx(ColorPicker, { color: fontColor, onChange: handleFontColorChange, title: "Font color" }), _jsx(ColorPicker, { color: bgColor, onChange: handleBgColorChange, title: "Background color" }), _jsx("button", { type: "button", onClick: onBold, title: "Bold", children: _jsx(Bold, { size: 16 }) }), _jsx("button", { type: "button", onClick: onItalic, title: "Italic", children: _jsx(Italic, { size: 16 }) }), _jsx("button", { type: "button", onClick: onUnderline, title: "Underline", children: _jsx(Underline, { size: 16 }) }), _jsx("button", { type: "button", onClick: onStrikethrough, title: "Strikethrough", children: _jsx(Strikethrough, { size: 16 }) }), _jsx("button", { type: "button", onClick: onCode, title: "Code", children: _jsx(Code, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAlignLeft, title: "Align left", children: _jsx(AlignLeft, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAlignCenter, title: "Align center", children: _jsx(AlignCenter, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAlignRight, title: "Align right", children: _jsx(AlignRight, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAlignJustify, title: "Justify", children: _jsx(AlignJustify, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAddImage, title: "Add image", children: _jsx(ImageIcon, { size: 16 }) }), _jsx("button", { type: "button", onClick: onFigma, title: "Figma", children: _jsx(Figma, { size: 16 }) }), _jsx("button", { type: "button", onClick: onVoice, title: "Voice", children: _jsx(Mic, { size: 16 }) })] })), mode === 'canvas' && (_jsxs("div", { className: "toolbar-group mode-actions canvas-actions", children: [_jsx("button", { type: "button", onClick: onSelectTool, title: "Select tool", children: _jsx(MousePointer, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAddRectangle, title: "Add rectangle", children: _jsx(Square, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAddCircle, title: "Add circle", children: _jsx(Circle, { size: 16 }) }), _jsx("button", { type: "button", onClick: onFreeDraw, title: "Free draw", children: _jsx(Pencil, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAddText, title: "Add text", children: _jsx(Type, { size: 16 }) }), _jsx("button", { type: "button", onClick: onAddImage, title: "Add image", children: _jsx(ImageIcon, { size: 16 }) }), _jsx("input", { type: "color", onChange: onColorChange, title: "Color", className: "color-input" }), _jsx("button", { type: "button", onClick: onCopy, title: "Copy", children: _jsx(ClipboardCopy, { size: 16 }) }), _jsx("button", { type: "button", onClick: onPaste, title: "Paste", children: _jsx(ClipboardPaste, { size: 16 }) }), _jsx("button", { type: "button", onClick: onDelete, title: "Delete selected", children: _jsx(Trash2, { size: 16 }) }), _jsx("button", { type: "button", onClick: onClearCanvas, title: "Clear canvas", children: _jsx(Eraser, { size: 16 }) })] })), _jsxs("div", { className: "toolbar-group global-actions", children: [_jsx("button", { type: "button", onClick: onPreview, title: "Preview", children: _jsx(Eye, { size: 16 }) }), _jsx("button", { type: "button", onClick: onSave, title: "Save", children: _jsx(Save, { size: 16 }) }), _jsx("button", { type: "button", onClick: onUndo, title: "Undo", children: _jsx(Undo2, { size: 16 }) }), _jsx("button", { type: "button", onClick: onRedo, title: "Redo", children: _jsx(Redo2, { size: 16 }) })] })] }));
};
export default UnifiedToolbar;
