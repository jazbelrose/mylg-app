// @ts-nocheck
import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isNodeSelection, KEY_DELETE_COMMAND, KEY_BACKSPACE_COMMAND, COMMAND_PRIORITY_LOW, } from "lexical";
import { ImageNode } from "./nodes/ImageNode";
import { ResizableImageNode } from "./nodes/ResizableImageNode";
export default function DeleteImagePlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        const removeSelectedImage = () => {
            const selection = $getSelection();
            if ($isNodeSelection(selection)) {
                const nodes = selection.getNodes();
                for (const node of nodes) {
                    if (node instanceof ImageNode || node instanceof ResizableImageNode) {
                        node.remove();
                        return true;
                    }
                }
            }
            return false;
        };
        const unregisterDelete = editor.registerCommand(KEY_DELETE_COMMAND, removeSelectedImage, COMMAND_PRIORITY_LOW);
        const unregisterBackspace = editor.registerCommand(KEY_BACKSPACE_COMMAND, removeSelectedImage, COMMAND_PRIORITY_LOW);
        return () => {
            unregisterDelete();
            unregisterBackspace();
        };
    }, [editor]);
    return null;
}
