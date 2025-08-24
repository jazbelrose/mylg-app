import React, { useEffect, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from "lexical";
import { $patchStyleText } from "@lexical/selection";
import { SET_FONT_FAMILY_COMMAND, SET_FONT_SIZE_COMMAND } from "../commands";

const FONT_FAMILIES = [
  "Helvetica Special",
  "Helvetica Black",
  "Helvetica Light",
  "Helvetica Neue",
  "Helvetica Medium",
  "mylg-serif",
];

const FONT_SIZES = [
  "12px",
  "14px",
  "16px",
  "18px",
  "24px",
  "32px",
  "48px",
];

export default function FontPlugin({ showToolbar = true }) {
  const [editor] = useLexicalComposerContext();
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]);
  const [fontSize, setFontSize] = useState("16px");

  // Register commands for font family and size
  useEffect(() => {
    const unregisterFontFamily = editor.registerCommand(
      SET_FONT_FAMILY_COMMAND,
      (family) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, { "font-family": family });
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );

    const unregisterFontSize = editor.registerCommand(
      SET_FONT_SIZE_COMMAND,
      (size) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $patchStyleText(selection, { "font-size": size });
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );

    return () => {
      unregisterFontFamily();
      unregisterFontSize();
    };
  }, [editor]);

  const onFontFamilyChange = (e) => {
    const value = e.target.value;
    setFontFamily(value);
    editor.dispatchCommand(SET_FONT_FAMILY_COMMAND, value);
  };

  const onFontSizeChange = (e) => {
    const value = e.target.value;
    setFontSize(value);
    editor.dispatchCommand(SET_FONT_SIZE_COMMAND, value);
  };

  return (
    showToolbar && (
      <div className="toolbar">
        <select
          className="toolbar-item font-family"
          value={fontFamily}
          onChange={onFontFamilyChange}
          aria-label="Font Family"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          className="toolbar-item font-size"
          value={fontSize}
          onChange={onFontSizeChange}
          aria-label="Font Size"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    )
  );
}