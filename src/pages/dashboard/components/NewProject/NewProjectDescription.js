import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useCallback } from "react";
import Modal from "../../../../components/ModalWithStack";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
// Basic Lexical theme
const theme = {
    paragraph: "editor-paragraph",
    text: {
        bold: "editor-bold",
        italic: "editor-italic",
        underline: "editor-underline",
        strikethrough: "editor-strikethrough",
        code: "editor-code",
    },
};
const initialConfig = {
    namespace: "MyEditor",
    theme,
    onError: (error) => console.error(error),
};
// Helper to convert Lexical JSON to plain text
const lexicalJSONToPlainText = (lexicalJson) => {
    try {
        const parsed = JSON.parse(lexicalJson);
        if (parsed && parsed.root && parsed.root.children) {
            return parsed.root.children
                .map((child) => child.children?.map((node) => node.text || "").join("") || "")
                .join("\n");
        }
        return "";
    }
    catch (error) {
        console.error("Error parsing Lexical JSON:", error);
        return "";
    }
};
const NewProjectDescription = ({ description, setDescription }) => {
    const [showDescriptionModal, setShowDescriptionModal] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const openDescriptionModal = () => setShowDescriptionModal(true);
    const closeDescriptionModal = () => setShowDescriptionModal(false);
    const handleChange = useCallback((editorState) => {
        editorState.read(() => {
            const json = JSON.stringify(editorState.toJSON());
            setDescription(json);
        });
    }, [setDescription]);
    const previewText = description && description.trim().length > 0
        ? lexicalJSONToPlainText(description) || "Edit Description"
        : "Edit Description";
    return (_jsxs("div", { className: "column-new-project-description", children: [_jsxs("div", { className: "dashboard-item new-project-description", onClick: openDescriptionModal, children: [_jsx("span", { className: "after-input-description", children: previewText }), (!description || !description.trim()) && _jsx("span", { children: "+" })] }), _jsxs(Modal, { isOpen: showDescriptionModal, onRequestClose: closeDescriptionModal, contentLabel: "Project Description Modal", style: {
                    overlay: { backgroundColor: "rgba(0, 0, 0, 0.75)" },
                    content: {
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        backgroundColor: "rgba(0, 0, 0, 0.85)",
                        color: "white",
                        width: "90%", // Responsive width
                        maxWidth: "400px", // Prevent it from being too wide on large screens
                        height: "auto", // Let it expand as needed
                        maxHeight: "90vh", // Prevent overflow on small screens
                        padding: "20px",
                        borderRadius: "10px",
                        display: "flex",
                        flexDirection: "column",
                    },
                }, children: [_jsx(LexicalComposer, { initialConfig: {
                            ...initialConfig,
                            editorState: description && description.trim().length > 0
                                ? description
                                : undefined,
                        }, children: _jsxs("div", { style: { flex: 1, overflow: "auto" }, children: [_jsx(RichTextPlugin, { contentEditable: _jsx(ContentEditable, { className: "editor-input", style: {
                                            minHeight: "200px",
                                            padding: "10px",
                                            fontSize: "14px"
                                        }, autoFocus: true, onFocus: () => setIsFocused(true), onBlur: () => setIsFocused(false) }), placeholder: !isFocused && (_jsx("div", { className: "editor-placeholder", style: {
                                            opacity: 0.5,
                                            position: "absolute",
                                            padding: "10px",
                                            fontSize: "14px",
                                            color: "#ccc"
                                        }, children: "Type your description..." })), ErrorBoundary: LexicalErrorBoundary }), _jsx(OnChangePlugin, { onChange: handleChange })] }) }), _jsx("button", { onClick: closeDescriptionModal, className: "modal-submit-button", style: {
                            marginTop: "20px",
                            padding: "10px 20px",
                            borderRadius: "5px",
                            backgroundColor: "#FA3356",
                            color: "#fff",
                            border: "none",
                            cursor: "pointer",
                            transition: "background-color 0.3s",
                        }, children: "Done" })] })] }));
};
export default NewProjectDescription;
