import React from "react";
import { DraggableBlockPlugin as DraggableBlockPluginExperimental } from "@lexical/react/LexicalDraggableBlockPlugin";
import "../LexicalEditor.css";

const DRAGGABLE_BLOCK_MENU_CLASSNAME = "draggable-block-menu";

export type DraggableBlockPluginProps = {
  /** The element that contains (or is) the Lexical editor root */
  anchorElem: HTMLElement | null;
};

const isOnMenu = (element: HTMLElement | null): boolean =>
  !!element?.closest(`.${DRAGGABLE_BLOCK_MENU_CLASSNAME}`);

export default function DraggableBlockPlugin({ anchorElem }: DraggableBlockPluginProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const targetLineRef = React.useRef<HTMLDivElement>(null);

  // Resolve the actual anchor element: prefer the editor container if it exists.
  const resolvedAnchor = React.useMemo<HTMLElement | null>(() => {
    if (!anchorElem) return null;
    const editorContainer = anchorElem.querySelector<HTMLElement>(".editor-container");
    return editorContainer ?? anchorElem;
  }, [anchorElem]);

  // If we don't have a valid anchor, don't render the plugin (prevents runtime errors)
  if (!resolvedAnchor) return null;

  return (
    <DraggableBlockPluginExperimental
      anchorElem={resolvedAnchor}
      menuRef={menuRef}
      targetLineRef={targetLineRef}
      menuComponent={
        <div ref={menuRef} className={`icon ${DRAGGABLE_BLOCK_MENU_CLASSNAME}`}>
          <div className="icon" />
        </div>
      }
      targetLineComponent={<div ref={targetLineRef} className="draggable-block-target-line" />}
      isOnMenu={isOnMenu}
    />
  );
}
