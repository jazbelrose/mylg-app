import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import React, { useEffect, useState } from "react";

interface AnnotationPluginProps {
    onAddAnnotation?: (annotation: { text: string; selectionText: string }) => void;
}

interface ButtonPosition {
    top: number;
    left: number;
}

const AnnotationPlugin = ({ onAddAnnotation }: AnnotationPluginProps) => {
    const [editor] = useLexicalComposerContext();
    const [buttonPos, setButtonPos] = useState<ButtonPosition | null>(null);
    const [selectionText, setSelectionText] = useState<string>("");
    useEffect(() => {
        const updateButton = () => {
            const selection = $getSelection();
            if ($isRangeSelection(selection) && selection.getTextContent().trim()) {
                const domSel = window.getSelection();
                if (domSel && domSel.rangeCount > 0) {
                    const rect = domSel.getRangeAt(0).getBoundingClientRect();
                    setButtonPos({
                        top: window.scrollY + rect.bottom + 5,
                        left: window.scrollX + rect.right + 5,
                    });
                    setSelectionText(selection.getTextContent());
                    return;
                }
            }
            setButtonPos(null);
        };
        const handleSelectionChange = () => {
            editor.getEditorState().read(updateButton);
        };
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => document.removeEventListener("selectionchange", handleSelectionChange);
    }, [editor]);
    useEffect(() => {
        const handleAnnotationClick = (e: Event) => {
            const { selectionText } = (e as CustomEvent<{ selectionText: string }>).detail || {};
            if (!selectionText)
                return;
            editor.update(() => {
                const root = editor.getRootElement();
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                let found: { node: Node; idx: number } | null = null;
                while (walker.nextNode()) {
                    const node = walker.currentNode as Text;
                    const idx = node.textContent.indexOf(selectionText);
                    if (idx !== -1) {
                        found = { node, idx };
                        break;
                    }
                }
                if (found) {
                    const range = document.createRange();
                    range.setStart(found.node, found.idx);
                    range.setEnd(found.node, found.idx + selectionText.length);
                    const highlight = document.createElement("span");
                    highlight.style.background = "yellow";
                    range.surroundContents(highlight);
                    setTimeout(() => {
                        if (highlight.parentNode) {
                            highlight.replaceWith(...highlight.childNodes);
                        }
                    }, 2000);
                }
            });
        };
        window.addEventListener("annotation-click", handleAnnotationClick as EventListener);
        return () => window.removeEventListener("annotation-click", handleAnnotationClick as EventListener);
    }, [editor]);
    const handleClick = () => {
        const comment = window.prompt("Add comment");
        if (!comment)
            return;
        onAddAnnotation && onAddAnnotation({ text: comment, selectionText });
        setButtonPos(null);
    };
    return buttonPos ? (
        <button
            style={{ position: "absolute", top: buttonPos.top, left: buttonPos.left, zIndex: 50 }}
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => e.preventDefault()}
            onClick={handleClick}
        >
            Add Comment
        </button>
    ) : null;
};
export default AnnotationPlugin;
