// @ts-nocheck
import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { addClassNamesToElement } from '@lexical/utils';
import { ElementNode } from 'lexical';
export class LayoutItemNode extends ElementNode {
    static getType() {
        return 'layout-item';
    }
    static clone(node) {
        return new LayoutItemNode(node.__key);
    }
    createDOM(config) {
        const dom = document.createElement('div');
        dom.setAttribute('data-lexical-layout-item', 'true');
        if (typeof config.theme.layoutItem === 'string') {
            addClassNamesToElement(dom, config.theme.layoutItem);
        }
        return dom;
    }
    updateDOM() {
        return false;
    }
    static importDOM() {
        return {
            div: (domNode) => {
                if (!domNode.hasAttribute('data-lexical-layout-item')) {
                    return null;
                }
                return {
                    conversion: $convertLayoutItemElement,
                    priority: 2,
                };
            },
        };
    }
    static importJSON(serializedNode) {
        return $createLayoutItemNode().updateFromJSON(serializedNode);
    }
    isShadowRoot() {
        return true;
    }
    canBeEmpty() {
        return true; // Allow the container to be empty
    }
}
export function $createLayoutItemNode() {
    return new LayoutItemNode();
}
export function $isLayoutItemNode(node) {
    return node instanceof LayoutItemNode;
}
function $convertLayoutItemElement() {
    return { node: $createLayoutItemNode() };
}
// React Component using JSX
const LayoutItem = ({ theme }) => {
    const domNode = React.useRef(null);
    React.useEffect(() => {
        if (domNode.current && typeof theme?.layoutItem === 'string') {
            addClassNamesToElement(domNode.current, theme.layoutItem);
        }
    }, [theme]);
    return _jsx("div", { ref: domNode, "data-lexical-layout-item": "true" });
};
export default LayoutItem;
