// @ts-nocheck
import { jsx as _jsx } from "react/jsx-runtime";
import React, { useRef, useEffect } from 'react';
import { DraggableBlockPlugin_EXPERIMENTAL } from '@lexical/react/LexicalDraggableBlockPlugin';
import '../LexicalEditor.css'; // Import the CSS file
const DRAGGABLE_BLOCK_MENU_CLASSNAME = 'draggable-block-menu';
// Function to check if an element is part of the draggable menu
function isOnMenu(element) {
    return !!element.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);
}
// Main plugin component
export default function DraggableBlockPlugin({ anchorElem }) {
    // Create references for the menu and target line
    const menuRef = useRef(null);
    const targetLineRef = useRef(null);
    // Ensure the anchorElem is the editor container
    useEffect(() => {
        if (anchorElem) {
            const editorContainer = anchorElem.querySelector('.editor-container');
            if (editorContainer) {
                anchorElem = editorContainer;
            }
        }
    }, [anchorElem]);
    return (_jsx(DraggableBlockPlugin_EXPERIMENTAL, { anchorElem: anchorElem, menuRef: menuRef, targetLineRef: targetLineRef, menuComponent: _jsx("div", { ref: menuRef, className: "icon draggable-block-menu", children: _jsx("div", { className: "icon" }) }), targetLineComponent: _jsx("div", { ref: targetLineRef, className: "draggable-block-target-line" }), isOnMenu: isOnMenu }));
}
