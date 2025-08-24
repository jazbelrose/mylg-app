import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection } from "lexical";
import React, { useEffect, useState } from "react";

const AnnotationPlugin = ({ onAddAnnotation }) => {
  const [editor] = useLexicalComposerContext();
  const [buttonPos, setButtonPos] = useState(null);
  const [selectionText, setSelectionText] = useState("");

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
    const handleAnnotationClick = (e) => {
      const { selectionText } = e.detail || {};
      if (!selectionText) return;
      editor.update(() => {
        const root = editor.getRootElement();
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let found = null;
        while (walker.nextNode()) {
          const node = walker.currentNode;
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
    window.addEventListener("annotation-click", handleAnnotationClick);
    return () => window.removeEventListener("annotation-click", handleAnnotationClick);
  }, [editor]);

  const handleClick = () => {
    const comment = window.prompt("Add comment");
    if (!comment) return;
    onAddAnnotation && onAddAnnotation({ text: comment, selectionText });
    setButtonPos(null);
  };

  return buttonPos ? (
    <button
      style={{ position: "absolute", top: buttonPos.top, left: buttonPos.left, zIndex: 50 }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={handleClick}
    >
      Add Comment
    </button>
  ) : null;
};

export default AnnotationPlugin;