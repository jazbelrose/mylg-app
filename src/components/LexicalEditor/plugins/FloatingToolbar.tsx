// @ts-nocheck
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// FloatingToolbar.js
import React, { useEffect, useState, useRef } from "react";
import ReactDOM from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $setSelection, $isRangeSelection, FORMAT_TEXT_COMMAND, SELECTION_CHANGE_COMMAND } from "lexical";
import { $isLinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { mergeRegister } from "@lexical/utils";
import BoldIcon from "../images/icons/type-bold.svg";
import ItalicIcon from "../images/icons/type-italic.svg";
import UnderlineIcon from "../images/icons/type-underline.svg";
import StrikeThroughIcon from "../images/icons/type-strikethrough.svg";
import LinkIcon from "../images/icons/link.svg";
import CheckIcon from "../images/icons/check.svg";
import CrossIcon from "../images/icons/cross.svg";
import PenIcon from "../images/icons/pen.svg";
import TrashIcon from "../images/icons/trash.svg";
import { useDropdown } from '../contexts/DropdownContext'; // Import the custom hook
const FloatingToolbar = ({ editorRef }) => {
    const [editor] = useLexicalComposerContext();
    const [position, setPosition] = useState(null);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLinkEditMode, setIsLinkEditMode] = useState(false);
    const [tempLinkUrl, setTempLinkUrl] = useState("");
    const [isSyncingLinkUrl, setIsSyncingLinkUrl] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const inputRef = useRef(null);
    const toolbarRef = useRef(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const LowPriority = 1;
    // Consume Dropdown Context
    const { isDropdownOpen } = useDropdown();
    const updateToolbarState = () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));
            setIsStrikethrough(selection.hasFormat("strikethrough"));
            const node = selection.anchor.getNode();
            const parent = node.getParent();
            if (parent && $isLinkNode(parent)) {
                setIsEditMode(true);
                setLinkUrl(parent.getURL() || "");
                if (!isLinkEditMode) {
                    setIsSyncingLinkUrl(true);
                    setTempLinkUrl(parent.getURL() || "");
                    setTimeout(() => setIsSyncingLinkUrl(false), 0); // Avoid triggering onChange
                }
            }
            else {
                setIsEditMode(false);
                setLinkUrl("");
                if (!isLinkEditMode) {
                    setTempLinkUrl(""); // Clear tempLinkUrl when not editing
                }
            }
        }
        else {
            setIsBold(false);
            setIsItalic(false);
            setIsUnderline(false);
            setIsStrikethrough(false);
            setTempLinkUrl(""); // Clear tempLinkUrl when no selection
        }
    };
    useEffect(() => {
        const updateToolbarPosition = () => {
            const selection = $getSelection();
            // Keep toolbar visible if input is focused or any dropdown is open
            if (isInputFocused || isDropdownOpen) {
                return;
            }
            if (!$isRangeSelection(selection)) {
                setPosition(null);
                return;
            }
            const selectedText = selection?.getTextContent() || "";
            if (selectedText.trim().length === 0) {
                setPosition(null);
                return;
            }
            const nativeSelection = window.getSelection();
            if (nativeSelection.rangeCount === 0) {
                setPosition(null);
                return;
            }
            const range = nativeSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            if (rect.width === 0 && rect.height === 0) {
                setPosition(null);
                return;
            }
            const newPosition = {
                top: window.scrollY + rect.bottom + 5, // Adjust to below the selection
                left: window.scrollX + rect.left + rect.width / 2 - 80, // Center horizontally
            };
            setPosition(newPosition);
        };
        const handleSelectionChange = () => {
            editor.getEditorState().read(() => {
                updateToolbarPosition();
                updateToolbarState();
            });
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, [editor, isEditMode, isLinkEditMode, isInputFocused, isDropdownOpen]);
    useEffect(() => {
        return mergeRegister(editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateToolbarState(); // Centralize state updates
            });
        }), editor.registerCommand(SELECTION_CHANGE_COMMAND, () => {
            updateToolbarState();
            return false;
        }, LowPriority));
    }, [editor]);
    const handleSubmitLink = (url) => {
        if (url.trim()) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.startsWith("http") ? url : `https://${url}`);
        }
        else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        }
        setIsLinkEditMode(false);
        setIsInputFocused(false); // Reset input focus
        setIsEditMode(false); // Reset edit mode
        setLinkUrl("");
    };
    const handleRemoveLink = () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
        setIsLinkEditMode(false);
        setIsInputFocused(false); // Reset input focus
        setIsEditMode(false); // Reset edit mode
        setLinkUrl("");
    };
    const handleCancelEdit = () => {
        setIsLinkEditMode(false);
        setIsInputFocused(false); // Reset input focus
        setIsEditMode(false); // Reset edit mode
        setLinkUrl("");
        setTempLinkUrl(linkUrl); // Revert tempLinkUrl to original linkUrl
    };
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (!entry.isIntersecting) {
                // If the editor is not visible
                console.log("Editor out of view, clearing selection.");
                setPosition(null); // Hide toolbar
                setIsEditMode(false);
                setIsLinkEditMode(false);
                setIsInputFocused(false);
                editor.update(() => {
                    const selection = $getSelection();
                    if (selection) {
                        $setSelection(null); // Clear selection
                    }
                });
            }
        }, { threshold: 0.1 } // Trigger when 10% of the editor is visible
        );
        if (editorRef.current) {
            observer.observe(editorRef.current); // Observe the editor container
        }
        return () => {
            if (editorRef.current) {
                observer.unobserve(editorRef.current); // Cleanup observer
            }
        };
    }, [editor]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (toolbarRef.current &&
                !toolbarRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)) {
                setIsLinkEditMode(false);
                handleCancelEdit();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [toolbarRef, inputRef]); // Dependencies include refs
    // Determine whether to show the toolbar
    if ((!position && !isEditMode && !isLinkEditMode && !isInputFocused) || isDropdownOpen) {
        return null;
    }
    return ReactDOM.createPortal(_jsxs("div", { ref: toolbarRef, className: "floating-toolbar", style: {
            position: "absolute",
            top: `${position ? position.top : 0}px`,
            left: `${position ? position.left : 0}px`,
            zIndex: 1000,
            backgroundColor: "#fff",
            borderRadius: "15px",
            padding: "8px",
            display: "flex",
            gap: "8px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }, children: [_jsx("button", { type: "button", onClick: () => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
                }, "aria-label": "Format Bold", style: formatButtonStyle(isBold), children: _jsx("i", { style: iconStyle(BoldIcon, isBold) }) }), _jsx("button", { type: "button", onClick: () => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
                }, "aria-label": "Format Italic", style: formatButtonStyle(isItalic), children: _jsx("i", { style: iconStyle(ItalicIcon, isItalic) }) }), _jsx("button", { type: "button", onClick: () => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
                }, "aria-label": "Format Underline", style: formatButtonStyle(isUnderline), children: _jsx("i", { style: iconStyle(UnderlineIcon, isUnderline) }) }), _jsx("button", { type: "button", onClick: () => {
                    editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
                }, "aria-label": "Format Strikethrough", style: formatButtonStyle(isStrikethrough), children: _jsx("i", { style: iconStyle(StrikeThroughIcon, isStrikethrough) }) }), isLinkEditMode ? (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [_jsx("input", { ref: inputRef, type: "text", value: tempLinkUrl, onChange: (e) => {
                            setTempLinkUrl(e.target.value); // Update temporary state
                        }, onKeyDown: (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleSubmitLink(tempLinkUrl);
                            }
                            else if (e.key === "Escape") {
                                e.preventDefault();
                                handleCancelEdit();
                            }
                        }, placeholder: "Enter a URL", style: inputStyle, onFocus: () => {
                            setIsInputFocused(true);
                        }, onBlur: (e) => {
                            setTimeout(() => {
                                const relatedTarget = e.relatedTarget;
                                if (toolbarRef.current &&
                                    !toolbarRef.current.contains(relatedTarget)) {
                                    setIsInputFocused(false);
                                }
                            }, 100);
                        } }), _jsx("button", { type: "button", onClick: () => handleSubmitLink(tempLinkUrl), "aria-label": "Submit Link", style: smallButtonStyle, disabled: !tempLinkUrl.trim(), children: _jsx("i", { style: iconStyle(CheckIcon, tempLinkUrl.trim()) }) }), _jsx("button", { type: "button", onClick: handleCancelEdit, "aria-label": "Cancel Link Editing", style: smallButtonStyle, children: _jsx("i", { style: iconStyle(CrossIcon, true) }) })] })) : linkUrl ? (_jsxs("div", { style: {
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 8px",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                }, children: [_jsx("a", { href: linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`, target: "_blank", rel: "noopener noreferrer", style: { textDecoration: "underline", color: "#007bff" }, children: linkUrl }), _jsx("button", { type: "button", onClick: () => {
                            setIsLinkEditMode(true);
                            setTempLinkUrl(linkUrl); // Ensure tempLinkUrl is set to current linkUrl
                        }, "aria-label": "Edit Link", style: smallButtonStyle, children: _jsx("i", { style: iconStyle(PenIcon, true) }) }), _jsx("button", { type: "button", onClick: handleRemoveLink, "aria-label": "Remove Link", style: smallButtonStyle, children: _jsx("i", { style: iconStyle(TrashIcon, true) }) })] })) : (_jsx("button", { type: "button", onMouseDown: (e) => e.preventDefault(), onClick: () => {
                    setIsLinkEditMode(true);
                    setTempLinkUrl(""); // Initialize with empty string for new links
                }, "aria-label": "Insert Link", style: buttonStyle(linkUrl), children: _jsx("i", { style: iconStyle(LinkIcon, linkUrl) }) }))] }), document.body);
};
const formatButtonStyle = (active) => ({
    all: "unset",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    padding: "8px",
    backgroundColor: active
        ? "rgba(223, 232, 250, 0.3)"
        : "transparent",
    transition: "background-color 0.2s ease",
});
const buttonStyle = (active) => ({
    all: "unset",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    padding: "8px",
    backgroundColor: active
        ? "rgba(223, 232, 250, 0.3)"
        : "transparent",
    transition: "background-color 0.2s ease",
});
const smallButtonStyle = {
    all: "unset",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    padding: "4px",
    backgroundColor: "transparent",
    transition: "background-color 0.2s ease",
};
const iconStyle = (icon, active) => ({
    backgroundImage: `url(${icon})`,
    width: "18px",
    height: "18px",
    display: "inline-block",
    backgroundSize: "contain",
    backgroundRepeat: "no-repeat",
    opacity: active ? 1 : 0.5,
    transition: "opacity 0.2s ease",
});
const inputStyle = {
    padding: "6px",
    border: "1px solid #ccc",
    borderRadius: "4px",
    width: "150px",
};
export default FloatingToolbar;
