import React, { useEffect } from 'react';
import { $getSelection, KEY_BACKSPACE_COMMAND, COMMAND_PRIORITY_LOW, } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isLayoutItemNode } from './nodes/LayoutItemNode'; // adjust the import as needed
/**
 * Recursively climbs the tree from the given node to find a preceding empty LayoutItemNode.
 */
function findEmptyLayoutItemBefore(node) {
    // Try to check for a previous sibling that is an empty LayoutItemNode.
    let current = node;
    while (current) {
        // Look for previous siblings at the current level.
        let prev = current.getPreviousSibling();
        while (prev) {
            if ($isLayoutItemNode(prev) &&
                (
                // Either no children...
                prev.getChildren().length === 0 ||
                    // ...or its text content is empty.
                    prev.getTextContent().trim() === '')) {
                return prev;
            }
            // Otherwise, move to an earlier sibling.
            prev = prev.getPreviousSibling();
        }
        // If none found at this level, climb one level up.
        current = current.getParent();
        if (current && current.isRoot())
            break;
    }
    return null;
}
const RemoveEmptyLayoutItemsOnBackspacePlugin = () => {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        const removeEmptyLayoutItem = editor.registerCommand(KEY_BACKSPACE_COMMAND, (event) => {
            const selection = $getSelection();
            // Only process if the selection is collapsed.
            if (!selection || !selection.isCollapsed()) {
                return false;
            }
            const anchor = selection.anchor;
            // Only proceed if the caret is at offset 0.
            if (anchor.offset !== 0) {
                return false;
            }
            // Get the node where the caret is located.
            const currentNode = anchor.getNode();
            // Search upward for a preceding empty LayoutItemNode.
            const layoutItem = findEmptyLayoutItemBefore(currentNode);
            if (layoutItem) {
                layoutItem.remove();
                return true;
            }
            return false;
        }, COMMAND_PRIORITY_LOW);
        return () => {
            removeEmptyLayoutItem();
        };
    }, [editor]);
    return null;
};
export default RemoveEmptyLayoutItemsOnBackspacePlugin;
