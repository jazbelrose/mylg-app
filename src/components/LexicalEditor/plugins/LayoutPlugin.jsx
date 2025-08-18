import { useEffect, useState, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import LayoutIcon from "../images/icons/columns.svg?react";

import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getNodeByKey,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
} from 'lexical';

import { useDropdown } from '../contexts/DropdownContext';
import {
  $createLayoutContainerNode,
  $isLayoutContainerNode,
  LayoutContainerNode,
} from './nodes/LayoutContainerNode';
import {
  $createLayoutItemNode,
  $isLayoutItemNode,
  LayoutItemNode,
} from './nodes/LayoutItemNode';

import '../LexicalEditor.css'; // Import the CSS file

// Define commands
export const INSERT_LAYOUT_COMMAND = createCommand();
export const UPDATE_LAYOUT_COMMAND = createCommand();

export function LayoutPlugin() {
  const [editor] = useLexicalComposerContext();
  const { activeDropdown, openDropdown, closeDropdown, dropdownRef } = useDropdown();
  const layoutDropdownId = 'layout-dropdown'; // Unique ID for this dropdown
  const buttonRef = useRef(null); // Ref for the dropdown button

  // State to manage hover for each dropdown item (optional if only using CSS)
  // const [hoveredItem, setHoveredItem] = useState(null); // Not needed with CSS hover

  useEffect(() => {
    if (!editor.hasNodes([LayoutContainerNode, LayoutItemNode])) {
      throw new Error(
        'LayoutPlugin: LayoutContainerNode or LayoutItemNode not registered on editor',
      );
    }

    const $onEscape = (before) => {
      const selection = $getSelection();
      if (
        $isRangeSelection(selection) &&
        selection.isCollapsed() &&
        selection.anchor.offset === 0
      ) {
        const container = $findMatchingParent(
          selection.anchor.getNode(),
          $isLayoutContainerNode,
        );

        if ($isLayoutContainerNode(container)) {
          const parent = container.getParent();
          const child = parent && (before ? parent.getFirstChild() : parent.getLastChild());
          const descendant = before
            ? container.getFirstDescendant()?.getKey()
            : container.getLastDescendant()?.getKey();

          if (parent !== null && child === container && selection.anchor.key === descendant) {
            if (before) {
              container.insertBefore($createParagraphNode());
            } else {
              container.insertAfter($createParagraphNode());
            }
          }
        }
      }

      return false;
    };

    const $fillLayoutItemIfEmpty = (node) => {
      if (node.isEmpty()) {
        node.append($createParagraphNode());
      }
    };

    const $removeIsolatedLayoutItem = (node) => {
      const parent = node.getParent();
      if (!$isLayoutContainerNode(parent)) {
        const children = node.getChildren();
        for (const child of children) {
          node.insertBefore(child);
        }
        node.remove();
        return true;
      }
      return false;
    };

    // Determine if a layout container only contains empty layout items.
    const $isContainerCompletelyEmpty = (container) => {
      const children = container.getChildren();
      return children.every((child) => {
        if (!$isLayoutItemNode(child)) {
          return false;
        }
        return child.getTextContent().trim() === '';
      });
    };

    return mergeRegister(
      editor.registerCommand(
        KEY_ARROW_DOWN_COMMAND,
        () => $onEscape(false),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_RIGHT_COMMAND,
        () => $onEscape(false),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_UP_COMMAND,
        () => $onEscape(true),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_ARROW_LEFT_COMMAND,
        () => $onEscape(true),
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const anchorNode = selection.anchor.getNode();
            const container = $findMatchingParent(anchorNode, $isLayoutContainerNode);

            if ($isLayoutContainerNode(container)) {
              if (container.isEmpty() || $isContainerCompletelyEmpty(container)) {
                container.remove();
                return true;
              }

              const previousSibling = container.getPreviousSibling();
              if (previousSibling) {
                previousSibling.selectEnd();
                return true;
              }
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        () => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && selection.isCollapsed()) {
            const anchorNode = selection.anchor.getNode();
            const container = $findMatchingParent(anchorNode, $isLayoutContainerNode);

            if ($isLayoutContainerNode(container)) {
              if (container.isEmpty() || $isContainerCompletelyEmpty(container)) {
                container.remove();
                return true;
              }

              const nextSibling = container.getNextSibling();
              if (nextSibling) {
                nextSibling.selectStart();
                return true;
              }
            }
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_LAYOUT_COMMAND,
        (template) => {
          editor.update(() => {
            const container = $createLayoutContainerNode(template);
            const itemsCount = getItemsCountFromTemplate(template);

            for (let i = 0; i < itemsCount; i++) {
              container.append(
                $createLayoutItemNode().append($createParagraphNode()),
              );
            }

            $insertNodeToNearestRoot(container);
            container.selectStart();
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        UPDATE_LAYOUT_COMMAND,
        ({ template, nodeKey }) => {
          editor.update(() => {
            const container = $getNodeByKey(nodeKey);

            if (!$isLayoutContainerNode(container)) {
              return;
            }

            const itemsCount = getItemsCountFromTemplate(template);
            const prevItemsCount = getItemsCountFromTemplate(
              container.getTemplateColumns(),
            );

            if (itemsCount > prevItemsCount) {
              for (let i = prevItemsCount; i < itemsCount; i++) {
                container.append(
                  $createLayoutItemNode().append($createParagraphNode()),
                );
              }
            } else if (itemsCount < prevItemsCount) {
              for (let i = prevItemsCount - 1; i >= itemsCount; i--) {
                const layoutItem = container.getChildAtIndex(i);

                if ($isLayoutItemNode(layoutItem)) {
                  layoutItem.remove();
                }
              }
            }

            container.setTemplateColumns(template);
          });

          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerNodeTransform(LayoutItemNode, (node) => {
        const isRemoved = $removeIsolatedLayoutItem(node);

        if (!isRemoved) {
          $fillLayoutItemIfEmpty(node);
        }
      }),
      editor.registerNodeTransform(LayoutContainerNode, (node) => {
        const children = node.getChildren();
        if (!children.every($isLayoutItemNode)) {
          for (const child of children) {
            node.insertBefore(child);
          }
          node.remove();
        } else if (node.isEmpty()) {
          node.remove();
        }
      }),
    );
  }, [editor]);

  // Function to handle layout insertion
  const handleInsertLayout = (template) => {
    editor.dispatchCommand(INSERT_LAYOUT_COMMAND, template);
    closeDropdown(); // Close the dropdown after insertion
  };

  // Toggle dropdown open/close
  const toggleDropdown = () => {
    if (activeDropdown === layoutDropdownId) {
      closeDropdown();
    } else {
      openDropdown(layoutDropdownId, buttonRef.current);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Dropdown Toggle Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Insert Layout"
        onClick={toggleDropdown}
        className="layout-toggle-button"
      >
        <LayoutIcon height={16} color="#777" />
      </button>

      {/* Dropdown Menu */}
      {activeDropdown === layoutDropdownId && (
        <div ref={dropdownRef} className="layout-dropdown">
          <button
            type="button"
            onClick={() => handleInsertLayout('1fr 1fr')}
            className="layout-dropdown-item"
          >
            2 Columns (Equal Width)
          </button>
          <button
            type="button"
            onClick={() => handleInsertLayout('25% 75%')}
            className="layout-dropdown-item"
          >
            2 Columns (25% - 75%)
          </button>
          <button
            type="button"
            onClick={() => handleInsertLayout('1fr 1fr 1fr')}
            className="layout-dropdown-item"
          >
            3 Columns (Equal Width)
          </button>
          <button
            type="button"
            onClick={() => handleInsertLayout('25% 50% 25%')}
            className="layout-dropdown-item"
          >
            3 Columns (25% - 50% - 25%)
          </button>
          <button
            type="button"
            onClick={() => handleInsertLayout('1fr 1fr 1fr 1fr')}
            className="layout-dropdown-item"
          >
            4 Columns (Equal Width)
          </button>
        </div>
      )}
    </div>
  );
}

function getItemsCountFromTemplate(template) {
  return template.trim().split(/\s+/).length;
}
