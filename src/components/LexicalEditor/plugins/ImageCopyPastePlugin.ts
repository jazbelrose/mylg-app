// @ts-nocheck
import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister } from "@lexical/utils";
import { $getSelection, $isNodeSelection, $isRangeSelection, $insertNodes, COPY_COMMAND, PASTE_COMMAND, COMMAND_PRIORITY_LOW, } from "lexical";
import { ImageNode, $createImageNode } from "./nodes/ImageNode";
import { ResizableImageNode, $createResizableImageNode } from "./nodes/ResizableImageNode";
export default function ImageCopyPastePlugin() {
    const [editor] = useLexicalComposerContext();
    const clipboardRef = useRef(null);
    useEffect(() => {
        if (!editor.hasNodes([ImageNode, ResizableImageNode])) {
            return;
        }
        return mergeRegister(editor.registerCommand(COPY_COMMAND, (event) => {
            const selection = $getSelection();
            if ($isNodeSelection(selection)) {
                const nodes = selection.getNodes();
                const images = nodes
                    .filter((n) => n instanceof ImageNode || n instanceof ResizableImageNode)
                    .map((n) => ({ type: n.getType(), data: n.exportJSON ? n.exportJSON() : {
                        src: n.__src,
                        altText: n.__altText,
                        width: n.__width,
                        height: n.__height,
                        originalAspectRatio: n.__originalAspectRatio,
                    } }));
                if (images.length > 0) {
                    const json = JSON.stringify(images);
                    if (event && event.clipboardData) {
                        event.preventDefault();
                        event.clipboardData.setData("application/x-lexical-images", json);
                    }
                    clipboardRef.current = json;
                    return true;
                }
            }
            return false;
        }, COMMAND_PRIORITY_LOW), editor.registerCommand(PASTE_COMMAND, (event) => {
            const json = (event && event.clipboardData && event.clipboardData.getData("application/x-lexical-images")) ||
                clipboardRef.current;
            if (json) {
                try {
                    const images = JSON.parse(json);
                    editor.update(() => {
                        const nodes = images
                            .map(({ type, data }) => {
                            if (type === "image") {
                                return $createImageNode(data);
                            }
                            else if (type === "resizable-image") {
                                return $createResizableImageNode(data);
                            }
                            return null;
                        })
                            .filter(Boolean);
                        if (nodes.length > 0) {
                            const selection = $getSelection();
                            if ($isRangeSelection(selection)) {
                                selection.insertNodes(nodes);
                            }
                            else {
                                $insertNodes(nodes);
                            }
                        }
                    });
                    if (event)
                        event.preventDefault();
                    return true;
                }
                catch (e) {
                    console.error("Failed to paste images", e);
                }
            }
            return false;
        }, COMMAND_PRIORITY_LOW));
    }, [editor]);
    return null;
}
