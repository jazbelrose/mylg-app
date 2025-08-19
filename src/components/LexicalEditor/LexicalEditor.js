import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useData } from "../../app/contexts/DataProvider";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import TextStylePlugin from "./plugins/TextStylePlugin";
import DraggableBlockPlugin from "./plugins/DraggableBlockPlugin";
import FloatingToolbar from "./plugins/FloatingToolbar";
import { DropdownProvider } from "./contexts/DropdownContext";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import DragAndDropPlugin from "./plugins/DragAndDropPlugin";
import AutoScrollToBottomPlugin from "./plugins/AutoScrollToBottomPlugin";
import DeleteImagePlugin from "./plugins/DeleteImagePlugin";
import ImageLockPlugin from "./plugins/ImageLockPlugin";
import ImageCopyPastePlugin from "./plugins/ImageCopyPastePlugin";
import YjsSyncPlugin from "./plugins/YjsSyncPlugin";
import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import "./LexicalEditor.css";
import { ListNode, ListItemNode } from "@lexical/list";
import { ParagraphNode } from "lexical";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import { ResizableImageNode } from "./plugins/nodes/ResizableImageNode";
import { SvgNode } from "./plugins/nodes/SvgNode";
import { FigmaEmbedNode } from "./plugins/nodes/FigmaEmbedNode";
import { LayoutContainerNode } from "./plugins/nodes/LayoutContainerNode";
import { LayoutItemNode } from "./plugins/nodes/LayoutItemNode";
import RemoveEmptyLayoutItemsOnBackspacePlugin from "./plugins/BackspacePlugin";
import ColorPlugin from "./plugins/ColorPlugin";
import FontPlugin from "./plugins/FontPlugin";
import ImagePlugin from "./plugins/ImagePlugin";
import FigmaPlugin from "./plugins/FigmaPlugin";
import SpeechToTextPlugin from "./plugins/SpeechToTextPlugin";
import ToolbarActionsPlugin from "./plugins/ToolbarActionsPlugin";
const LexicalEditor = ({ onChange, initialContent, registerToolbar }) => {
    const { userName, activeProject } = useData();
    const editorRef = useRef(null);
    const editorContainerRef = useRef(null);
    const contentRef = useRef(null);
    const providerRef = useRef(null);
    const persistenceRef = useRef(null);
    const initialContentRef = useRef(initialContent);
    const hasScrolledToBottom = useRef(false);
    // Memoize the project ID so it isn’t recalculated unnecessarily.
    const projectId = useMemo(() => {
        if (activeProject && typeof activeProject === "object") {
            return activeProject.projectId;
        }
        return activeProject || "default-project";
    }, [activeProject]);
    useEffect(() => {
        if (persistenceRef.current) {
            persistenceRef.current
                .destroy()
                .then(() => {
                console.log("IndexedDB cleared for project:", projectId);
            })
                .catch((err) => {
                console.error("Error clearing IndexedDB:", err);
            });
        }
    }, [projectId]);
    // If needed, you can set up the anchor element for plugins (like draggable blocks)
    useEffect(() => {
        if (editorContainerRef.current) {
            // You might set an anchor element here if required.
        }
    }, []);
    useEffect(() => {
        hasScrolledToBottom.current = false;
    }, [projectId]);
    const [, setYjsProvider] = useState(null);
    const getProvider = useCallback((id, yjsDocMap) => {
        if (providerRef.current) {
            return providerRef.current;
        }
        let doc = yjsDocMap.get(id);
        if (!doc) {
            doc = new Y.Doc();
            yjsDocMap.set(id, doc);
        }
        // Ensure doc exists before proceeding
        if (!doc) {
            doc = new Y.Doc();
            yjsDocMap.set(id, doc);
        }
        // Create and store the persistence instance.
        persistenceRef.current = new IndexeddbPersistence(id, doc);
        persistenceRef.current.on("synced", () => {
            console.log("IndexedDB synced for project:", id);
        });
        const provider = new WebsocketProvider("ws://35.165.113.63:1234", id, doc);
        const sharedType = doc.getText("lexical");
        // Attach extra properties to the provider instance.
        provider.doc = doc;
        provider.sharedType = sharedType;
        providerRef.current = provider;
        setYjsProvider(provider);
        return provider;
    }, []);
    // Memoize the LexicalComposer configuration so it’s only created once.
    const initialConfig = useMemo(() => ({
        namespace: "MyEditor",
        theme: {
            paragraph: "editor-paragraph",
            text: {
                bold: "editor-bold",
                italic: "editor-italic",
                underline: "editor-underline",
                strikethrough: "editor-strikethrough",
                code: "editor-code",
                color: "editor-text-color",
                backgroundColor: "editor-bg-color",
            },
            quote: "editor-quote",
            heading: {
                h1: "editor-heading-h1",
                h2: "editor-heading-h2",
            },
            list: {
                nested: { listitem: "editor-nested-listitem" },
                ol: "editor-list-ol",
                ul: "editor-list-ul",
                listitem: "editor-listitem",
            },
            alignment: {
                left: "editor-align-left",
                center: "editor-align-center",
                right: "editor-align-right",
                justify: "editor-align-justify",
            },
            link: "editor-link",
        },
        nodes: [
            ParagraphNode,
            ListNode,
            ListItemNode,
            LinkNode,
            HeadingNode,
            QuoteNode,
            AutoLinkNode,
            ResizableImageNode,
            SvgNode,
            FigmaEmbedNode,
            LayoutContainerNode,
            LayoutItemNode,
        ],
        onError: (error) => console.error("Lexical Editor Error:", error),
        editorState: null,
    }), []);
    return (_jsx("div", { ref: editorRef, style: { maxWidth: "1920px", width: "100%", height: "100vh", minHeight: "800px" }, children: _jsx(LexicalComposer, { initialConfig: initialConfig, children: _jsx(DropdownProvider, { children: _jsx(ImageLockPlugin, { provider: providerRef.current, children: _jsxs("div", { className: "editor-container", ref: editorContainerRef, style: {
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            height: "100%",
                        }, children: [_jsx(ToolbarActionsPlugin, { registerToolbar: registerToolbar }), _jsx(ColorPlugin, { showToolbar: false }), _jsx(FontPlugin, { showToolbar: false }), _jsx(ImagePlugin, { showToolbarButton: false }), _jsx(FigmaPlugin, { showToolbarButton: false }), _jsx(SpeechToTextPlugin, { showToolbarButton: false }), _jsx(FloatingToolbar, { editorRef: editorRef }), _jsxs("div", { className: "content-container", ref: contentRef, style: {
                                    flex: 1,
                                    overflowY: "auto", // enables vertical scrolling with the mouse
                                    WebkitOverflowScrolling: "touch", // smooth scrolling on mobile devices
                                }, children: [_jsx(RichTextPlugin, { contentEditable: _jsx(ContentEditable, { className: "editor-input", style: { position: "relative", minHeight: "100%" } }), ErrorBoundary: LexicalErrorBoundary }), _jsx(CollaborationPlugin, { id: projectId, providerFactory: getProvider, initialEditorState: initialContentRef.current, shouldBootstrap: true, username: userName }), _jsx(RemoveEmptyLayoutItemsOnBackspacePlugin, {}), providerRef.current && (_jsx(YjsSyncPlugin, { provider: providerRef.current })), _jsx(ListPlugin, {}), _jsx(LinkPlugin, {}), _jsx(ClickableLinkPlugin, {}), _jsx(TextStylePlugin, {}), editorContainerRef.current && (_jsx(DraggableBlockPlugin, { anchorElem: editorContainerRef.current })), _jsx(DragAndDropPlugin, {}), _jsx(ImageCopyPastePlugin, {}), _jsx(DeleteImagePlugin, {}), _jsx(AutoScrollToBottomPlugin, { contentRef: contentRef }), _jsx(OnChangePlugin, { onChange: useCallback((editorState) => {
                                            editorState.read(() => {
                                                const json = JSON.stringify(editorState.toJSON());
                                                console.log("[Editor State] Updated:", json);
                                                onChange(json);
                                            });
                                        }, [onChange]) })] })] }) }) }) }) }));
};
export default LexicalEditor;
