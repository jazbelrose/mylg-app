import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { CAN_REDO_COMMAND, CAN_UNDO_COMMAND, REDO_COMMAND, UNDO_COMMAND, SELECTION_CHANGE_COMMAND, FORMAT_TEXT_COMMAND, FORMAT_ELEMENT_COMMAND, $getSelection, $isRangeSelection, $createParagraphNode, $getNodeByKey, $setSelection, } from "lexical";
import { $isParentElementRTL, $isAtNodeEnd, $setBlocksType, } from "@lexical/selection";
import { $getNearestNodeOfType, mergeRegister } from "@lexical/utils";
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND, $isListNode, ListNode, } from "@lexical/list";
import { $createHeadingNode, $createQuoteNode, $isHeadingNode, } from "@lexical/rich-text";
import { $createCodeNode, $isCodeNode, getDefaultCodeLanguage, getCodeLanguages, } from "@lexical/code";
import { useDropdown } from '../contexts/DropdownContext';
import ImagePlugin from '../plugins/ImagePlugin';
import VectorPlugin from '../plugins/VectorPlugin';
import FigmaPlugin from '../plugins/FigmaPlugin';
import ColorPlugin from "./ColorPlugin";
import FontPlugin from "./FontPlugin";
import { LayoutPlugin } from "./LayoutPlugin";
import SpeechToTextPlugin from "./SpeechToTextPlugin";
const LowPriority = 1;
const supportedBlockTypes = new Set([
    "paragraph",
    "quote",
    "code",
    "h1",
    "h2",
    "ul",
    "ol",
]);
const blockTypeToBlockName = {
    code: "Code Block",
    h1: "Large Heading",
    h2: "Small Heading",
    h3: "Heading",
    h4: "Heading",
    h5: "Heading",
    ol: "Numbered List",
    paragraph: "Normal",
    quote: "Quote",
    ul: "Bulleted List",
};
function Divider() {
    return _jsx("div", { className: "divider" });
}
function Select({ onChange, className, options, value }) {
    return (_jsxs("select", { className: className, onChange: onChange, value: value, children: [_jsx("option", { hidden: true, value: "" }), options.map((option) => (_jsx("option", { value: option, children: option }, option)))] }));
}
function getSelectedNode(selection) {
    const anchor = selection.anchor;
    const focus = selection.focus;
    const anchorNode = selection.anchor.getNode();
    const focusNode = selection.focus.getNode();
    if (anchorNode === focusNode) {
        return anchorNode;
    }
    const isBackward = selection.isBackward();
    if (isBackward) {
        return $isAtNodeEnd(focus) ? anchorNode : focusNode;
    }
    else {
        return $isAtNodeEnd(anchor) ? focusNode : anchorNode;
    }
}
export default function ToolbarPlugin() {
    const [editor] = useLexicalComposerContext();
    const toolbarRef = useRef(null);
    const { activeDropdown, openDropdown, closeDropdown, dropdownRef } = useDropdown();
    const blockDropdownId = "block-dropdown";
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [blockType, setBlockType] = useState("paragraph");
    const [selectedElementKey, setSelectedElementKey] = useState(null);
    const [showBlockOptionsDropDown, setShowBlockOptionsDropDown] = useState(false);
    const [isRTL, setIsRTL] = useState(false);
    const [isBold, setIsBold] = useState(false);
    const [isItalic, setIsItalic] = useState(false);
    const [isUnderline, setIsUnderline] = useState(false);
    const [isStrikethrough, setIsStrikethrough] = useState(false);
    const [isCode, setIsCode] = useState(false);
    const [codeLanguage, setCodeLanguage] = useState("");
    const formatBlock = useCallback((type) => {
        editor.update(() => {
            const selection = $getSelection();
            if (!$isRangeSelection(selection)) {
                return;
            }
            if (["paragraph", "h1", "h2", "quote", "code"].includes(type)) {
                editor.dispatchCommand(REMOVE_LIST_COMMAND);
            }
            switch (type) {
                case "paragraph":
                    $setBlocksType(selection, () => $createParagraphNode());
                    break;
                case "h1":
                    $setBlocksType(selection, () => $createHeadingNode("h1"));
                    break;
                case "h2":
                    $setBlocksType(selection, () => $createHeadingNode("h2"));
                    break;
                case "quote":
                    $setBlocksType(selection, () => $createQuoteNode());
                    break;
                case "code":
                    $setBlocksType(selection, () => $createCodeNode());
                    break;
                case "ul":
                    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND);
                    break;
                case "ol":
                    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND);
                    break;
                default:
                    break;
            }
        });
        setShowBlockOptionsDropDown(false);
        closeDropdown();
    }, [editor, closeDropdown]);
    const handleElementInsert = (elementType) => {
        switch (elementType) {
            case "inline-image":
                break;
            case "gif":
                break;
            case "excalidraw":
                break;
            case "poll":
                break;
            case "columns-layout":
                break;
            case "equation":
                break;
            case "sticky-note":
                break;
            case "collapsible-container":
                break;
            case "tweet":
                break;
            case "youtube-video":
                break;
            case "figma-document":
                break;
            default:
                console.warn("Unknown element type:", elementType);
        }
    };
    const updateToolbar = useCallback(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
            const anchorNode = selection.anchor.getNode();
            const element = anchorNode.getKey() === "root"
                ? anchorNode
                : anchorNode.getTopLevelElementOrThrow();
            const elementKey = element.getKey();
            const elementDOM = editor.getElementByKey(elementKey);
            if (elementDOM !== null) {
                setSelectedElementKey(elementKey);
                if ($isListNode(element)) {
                    const parentList = $getNearestNodeOfType(anchorNode, ListNode);
                    const type = parentList ? parentList.getTag() : element.getTag();
                    setBlockType(type);
                }
                else {
                    const type = $isHeadingNode(element)
                        ? element.getTag()
                        : element.getType();
                    setBlockType(type);
                    if ($isCodeNode(element)) {
                        setCodeLanguage(element.getLanguage() || getDefaultCodeLanguage());
                    }
                }
            }
            setIsBold(selection.hasFormat("bold"));
            setIsItalic(selection.hasFormat("italic"));
            setIsUnderline(selection.hasFormat("underline"));
            setIsStrikethrough(selection.hasFormat("strikethrough"));
            setIsCode(selection.hasFormat("code"));
            setIsRTL($isParentElementRTL(selection));
        }
    }, [editor]);
    useEffect(() => {
        return mergeRegister(editor.registerUpdateListener(({ editorState }) => {
            editorState.read(() => {
                updateToolbar();
            });
        }), editor.registerCommand(SELECTION_CHANGE_COMMAND, (_payload, newEditor) => {
            updateToolbar();
            return false;
        }, LowPriority), editor.registerCommand(CAN_UNDO_COMMAND, (payload) => {
            setCanUndo(payload);
            return false;
        }, LowPriority), editor.registerCommand(CAN_REDO_COMMAND, (payload) => {
            setCanRedo(payload);
            return false;
        }, LowPriority));
    }, [editor, updateToolbar]);
    const codeLanguages = useMemo(() => getCodeLanguages(), []);
    const onCodeLanguageSelect = useCallback((e) => {
        editor.update(() => {
            if (selectedElementKey !== null) {
                const node = $getNodeByKey(selectedElementKey);
                if ($isCodeNode(node)) {
                    node.setLanguage(e.target.value);
                }
            }
        });
    }, [editor, selectedElementKey]);
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowBlockOptionsDropDown(false);
                closeDropdown();
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [closeDropdown]);
    const handleDropdownToggle = () => {
        if (activeDropdown === blockDropdownId) {
            closeDropdown();
        }
        else {
            openDropdown(blockDropdownId);
        }
    };
    const handleDropdownItemClick = (type) => {
        formatBlock(type);
        setShowBlockOptionsDropDown(false);
        closeDropdown();
    };
    return (_jsx(_Fragment, { children: _jsxs("div", { className: "toolbar", ref: toolbarRef, style: { position: "relative" }, children: [_jsx("button", { type: "button", disabled: !canUndo, onClick: () => {
                        editor.dispatchCommand(UNDO_COMMAND);
                    }, className: "toolbar-item spaced", "aria-label": "Undo", children: _jsx("i", { className: "format undo" }) }), _jsx("button", { type: "button", disabled: !canRedo, onClick: () => {
                        editor.dispatchCommand(REDO_COMMAND);
                    }, className: "toolbar-item", "aria-label": "Redo", children: _jsx("i", { className: "format redo" }) }), _jsx(Divider, {}), supportedBlockTypes.has(blockType) && (_jsxs(_Fragment, { children: [_jsxs("button", { type: "button", className: "toolbar-item block-controls", onClick: handleDropdownToggle, "aria-label": "Formatting Options", children: [_jsx("span", { className: "icon block-type " + blockType }), _jsx("span", { className: "text", children: blockTypeToBlockName[blockType] }), _jsx("i", { className: "chevron-down" })] }), activeDropdown === blockDropdownId && (_jsxs("div", { className: "dropdown", ref: dropdownRef, children: [_jsxs("button", { type: "button", className: "item", onClick: () => handleDropdownItemClick("paragraph"), children: [_jsx("span", { className: "icon", children: "\u00B6" }), _jsx("span", { className: "text", children: "Body" }), blockType === "paragraph" && _jsx("span", { className: "active", children: "\u2713" })] }), _jsxs("button", { type: "button", className: "item", onClick: () => formatBlock("h1"), children: [_jsx("span", { className: "icon", children: "H1" }), _jsx("span", { className: "text", children: "Heading" }), blockType === "h1" && _jsx("span", { className: "active", children: "\u2713" })] }), _jsxs("button", { type: "button", className: "item", onClick: () => formatBlock("h2"), children: [_jsx("span", { className: "icon", children: "H2" }), _jsx("span", { className: "text", children: "Subheading" }), blockType === "h2" && _jsx("span", { className: "active", children: "\u2713" })] }), _jsxs("button", { type: "button", className: "item", onClick: () => formatBlock("quote"), children: [_jsx("span", { className: "icon", children: "\u275D" }), _jsx("span", { className: "text", children: "Quote" }), blockType === "quote" && _jsx("span", { className: "active", children: "\u2713" })] }), _jsxs("button", { type: "button", className: "item", onClick: () => formatBlock("ul"), children: [_jsx("span", { className: "icon", children: "\u2022" }), _jsx("span", { className: "text", children: "Bulleted" }), blockType === "ul" && _jsx("span", { className: "active", children: "\u2713" })] }), _jsxs("button", { type: "button", className: "item", onClick: () => formatBlock("ol"), children: [_jsx("span", { className: "icon", children: "1." }), _jsx("span", { className: "text", children: "Numbered" }), blockType === "ol" && _jsx("span", { className: "active", children: "\u2713" })] })] })), _jsx(Divider, {})] })), blockType !== "code" && (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"), className: "toolbar-item spaced " + (isBold ? "active" : ""), "aria-label": "Format Bold", children: _jsx("i", { className: "format bold" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"), className: "toolbar-item spaced " + (isItalic ? "active" : ""), "aria-label": "Format Italics", children: _jsx("i", { className: "format italic" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"), className: "toolbar-item spaced " + (isUnderline ? "active" : ""), "aria-label": "Format Underline", children: _jsx("i", { className: "format underline" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"), className: "toolbar-item spaced " + (isStrikethrough ? "active" : ""), "aria-label": "Format Strikethrough", children: _jsx("i", { className: "format strikethrough" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"), className: "toolbar-item spaced " + (isCode ? "active" : ""), "aria-label": "Insert Code", children: _jsx("i", { className: "format code" }) }), _jsx(Divider, {}), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"), className: "toolbar-item spaced", "aria-label": "Left Align", children: _jsx("i", { className: "format left-align" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center"), className: "toolbar-item spaced", "aria-label": "Center Align", children: _jsx("i", { className: "format center-align" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right"), className: "toolbar-item spaced", "aria-label": "Right Align", children: _jsx("i", { className: "format right-align" }) }), _jsx("button", { type: "button", onClick: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify"), className: "toolbar-item", "aria-label": "Justify Align", children: _jsx("i", { className: "format justify-align" }) }), _jsx(Divider, {}), _jsx(FontPlugin, {}), _jsx(Divider, {}), _jsx(ColorPlugin, {}), _jsx(Divider, {}), _jsx(ImagePlugin, {}), _jsx(VectorPlugin, {}), _jsx(FigmaPlugin, {}), _jsx(LayoutPlugin, {}), _jsx(SpeechToTextPlugin, {})] })), blockType === "code" && (_jsxs(_Fragment, { children: [_jsx(Select, { className: "toolbar-item code-language", onChange: onCodeLanguageSelect, options: codeLanguages, value: codeLanguage }), _jsx("i", { className: "chevron-down inside" })] }))] }) }));
}
