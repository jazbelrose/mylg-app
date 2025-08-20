import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import ReactModal from "react-modal";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $insertNodes, $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from "lexical";
import { SiFigma } from "react-icons/si";
import { $createFigmaEmbedNode } from "./nodes/FigmaEmbedNode";
import { OPEN_FIGMA_COMMAND } from "../commands";
if (typeof document !== 'undefined') {
    ReactModal.setAppElement("#root");
}
export default function FigmaPlugin({ showToolbarButton = true }) {
    const [editor] = useLexicalComposerContext();
    const [isOpen, setIsOpen] = useState(false);
    const [url, setURL] = useState("");
    useEffect(() => {
        return editor.registerCommand(OPEN_FIGMA_COMMAND, () => {
            setIsOpen(true);
            return true;
        }, COMMAND_PRIORITY_EDITOR);
    }, [editor]);
    const onAdd = () => {
        if (!url.trim())
            return;
        editor.update(() => {
            const node = $createFigmaEmbedNode({ url });
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
                selection.insertNodes([node]);
            }
            else {
                $insertNodes([node]);
            }
        });
        setURL("");
        setIsOpen(false);
    };
    return (_jsxs("div", { style: { display: "inline-block" }, children: [showToolbarButton && (_jsx("button", { "aria-label": "Add Figma Document", onClick: () => setIsOpen(true), className: "toolbar-item", style: { background: "none", border: "none", cursor: "pointer" }, children: _jsx(SiFigma, { size: 18, color: "#777" }) })), _jsxs(ReactModal, { isOpen: isOpen, onRequestClose: () => setIsOpen(false), style: {
                    overlay: {
                        backgroundColor: "rgba(0,0,0,0.6)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000,
                    },
                    content: {
                        background: "#0c0c0c",
                        padding: "20px",
                        borderRadius: "10px",
                        width: "400px",
                        maxWidth: "90%",
                        border: "1px solid white",
                        boxShadow: "0 4px 12px rgba(250,51,86,0.3)",
                        inset: "unset",
                        color: "white",
                    },
                }, children: [_jsx("div", { style: { marginBottom: "15px" }, children: _jsx("input", { type: "text", value: url, onChange: (e) => setURL(e.target.value), placeholder: "Figma file URL", style: {
                                width: "100%",
                                padding: "10px",
                                border: "1px solid white",
                                borderRadius: "5px",
                                background: "#1b1b1b",
                                color: "white",
                                marginBottom: "10px",
                            } }) }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between" }, children: [_jsx("button", { onClick: onAdd, disabled: !url.trim(), style: {
                                    flex: 1,
                                    padding: "10px",
                                    background: url.trim() ? "#FA3356" : "#555",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "5px",
                                    cursor: url.trim() ? "pointer" : "not-allowed",
                                    marginRight: "10px",
                                }, children: "Add" }), _jsx("button", { onClick: () => setIsOpen(false), style: {
                                    flex: 1,
                                    padding: "10px",
                                    background: "transparent",
                                    border: "1px solid white",
                                    borderRadius: "5px",
                                    color: "white",
                                    cursor: "pointer",
                                }, children: "Cancel" })] })] })] }));
}
