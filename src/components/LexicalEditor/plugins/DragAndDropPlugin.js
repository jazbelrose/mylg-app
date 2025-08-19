import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createResizableImageNode } from "./nodes/ResizableImageNode";
import { $insertNodes, $createTextNode, $getSelection, $isRangeSelection } from "lexical";
import { $createLinkNode } from "@lexical/link";
import { uploadData } from "aws-amplify/storage";
import { useData } from "../../../app/contexts/DataProvider";
import SpinnerOverlay from "../../SpinnerOverlay";
import { S3_PUBLIC_BASE } from "../../../utils/api";
const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "svg"];
function DragAndDropPlugin() {
    const [editor] = useLexicalComposerContext();
    const { activeProject } = useData();
    const [url, setURL] = useState("");
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    // Helper function to upload the file.
    const handleFileUpload = async (file) => {
        if (!file || !activeProject?.projectId)
            return null;
        const filename = `projects/${activeProject.projectId}/lexical/${file.name}`;
        try {
            await uploadData({
                key: filename,
                data: file,
                options: { accessLevel: "public" },
            });
            const url = `${S3_PUBLIC_BASE}/${filename}`;
            return url;
        }
        catch (error) {
            console.error("Error uploading file:", error);
            return null;
        }
    };
    const processFile = async (file, url) => {
        setIsLoading(true);
        const src = url || (file ? await handleFileUpload(file) : "");
        if (!src) {
            setIsLoading(false);
            return;
        }
        const extension = file.name.split(".").pop().toLowerCase();
        const isImage = (file.type && file.type.startsWith("image/")) ||
            IMAGE_EXTENSIONS.includes(extension);
        const insertLink = () => {
            editor.update(() => {
                const link = $createLinkNode(src);
                link.append($createTextNode(file.name));
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                    selection.insertNodes([link]);
                }
                else {
                    $insertNodes([link]);
                }
            });
            setIsLoading(false);
        };
        if (isImage) {
            // Delay slightly to account for eventual consistency
            setTimeout(() => {
                const img = new Image();
                img.src = src;
                img.onload = () => {
                    editor.update(() => {
                        const node = $createResizableImageNode({
                            src,
                            altText: "Image",
                            width: 400,
                            height: 300,
                        });
                        const selection = $getSelection();
                        if ($isRangeSelection(selection)) {
                            selection.insertNodes([node]);
                        }
                        else {
                            $insertNodes([node]);
                        }
                    });
                    setIsLoading(false);
                };
                img.onerror = () => {
                    console.error("Failed to load image:", src);
                    insertLink();
                };
            }, 500);
        }
        else {
            insertLink();
        }
        // Reset state
        setFile(null);
        setURL("");
    };
    const onDrop = async (e) => {
        e.preventDefault();
        const range = document.caretRangeFromPoint?.(e.clientX, e.clientY) ||
            (document.caretPositionFromPoint && (() => {
                const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                if (!pos)
                    return null;
                const r = document.createRange();
                r.setStart(pos.offsetNode, pos.offset);
                return r;
            })());
        if (range) {
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            editor.focus();
        }
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles[0]) {
            const selectedFile = droppedFiles[0];
            setFile(selectedFile);
            await processFile(selectedFile, "");
        }
    };
    useEffect(() => {
        const container = editor.getRootElement();
        container.addEventListener("drop", onDrop);
        container.addEventListener("dragover", (e) => e.preventDefault());
        return () => {
            container.removeEventListener("drop", onDrop);
        };
    }, [editor, activeProject]);
    return (_jsx(_Fragment, { children: isLoading && _jsx(SpinnerOverlay, {}) }));
}
// Overlay style with absolute positioning—centered relative to the closest positioned ancestor.
// Make sure that the Lexical editor container (e.g., .editor-container) has position: relative.
export default DragAndDropPlugin;
