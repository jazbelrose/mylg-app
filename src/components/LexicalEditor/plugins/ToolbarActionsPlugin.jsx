import { useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
} from "lexical";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import { $createCodeNode } from "@lexical/code";
import { $setBlocksType } from "@lexical/selection";
import {
  SET_FONT_FAMILY_COMMAND,
  SET_FONT_SIZE_COMMAND,
  SET_TEXT_COLOR_COMMAND,
  SET_BG_COLOR_COMMAND,
  OPEN_IMAGE_COMMAND,
  OPEN_FIGMA_COMMAND,
  TOGGLE_SPEECH_COMMAND,
} from "../commands";

export default function ToolbarActionsPlugin({ registerToolbar }) {
  const [editor] = useLexicalComposerContext();

  const formatBlock = useCallback(
    (type) => {
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
    },
    [editor]
  );

  useEffect(() => {
    if (!registerToolbar) return;
    const actions = {
      onBold: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold"),
      onItalic: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic"),
      onUnderline: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline"),
      onStrikethrough: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough"),
      onCode: () => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code"),
      onParagraph: () => formatBlock("paragraph"),
      onHeading1: () => formatBlock("h1"),
      onHeading2: () => formatBlock("h2"),
      onQuote: () => formatBlock("quote"),
      onUnorderedList: () => formatBlock("ul"),
      onOrderedList: () => formatBlock("ol"),
      onFontChange: (value) => editor.dispatchCommand(SET_FONT_FAMILY_COMMAND, value),
      onFontSizeChange: (value) =>
        editor.dispatchCommand(SET_FONT_SIZE_COMMAND, `${value}px`),
      onFontColorChange: (e) =>
        editor.dispatchCommand(SET_TEXT_COLOR_COMMAND, e.target.value),
      onBgColorChange: (e) =>
        editor.dispatchCommand(SET_BG_COLOR_COMMAND, e.target.value),
      onAlignLeft: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left"),
      onAlignCenter: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center"),
      onAlignRight: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right"),
      onAlignJustify: () => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "justify"),
      onAddImage: () => editor.dispatchCommand(OPEN_IMAGE_COMMAND),
      onFigma: () => editor.dispatchCommand(OPEN_FIGMA_COMMAND),
      onVoice: () => editor.dispatchCommand(TOGGLE_SPEECH_COMMAND),
      onUndo: () => editor.dispatchCommand(UNDO_COMMAND),
      onRedo: () => editor.dispatchCommand(REDO_COMMAND),
    };
    registerToolbar(actions);
  }, [editor, formatBlock, registerToolbar]);

  return null;
}
