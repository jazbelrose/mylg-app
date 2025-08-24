import React, { useRef, useState, useEffect, CSSProperties } from "react";
import { DecoratorNode, NodeKey } from "lexical";
import { $getNodeByKey, $copyNode } from "lexical";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useLexicalNodeSelection } from "@lexical/react/useLexicalNodeSelection";
import Moveable from "react-moveable";
import { useData } from "../../../../app/contexts/DataProvider";
import { useImageLocks } from "../ImageLockPlugin";
export class ImageNode extends DecoratorNode<JSX.Element> {
    __src: string;
    __altText: string;
    __x: number;
    __y: number;
    __width: number;
    __height: number;
    __clipPath: string;

    constructor(
        src: string,
        altText: string,
        x: number = 0,
        y: number = 0,
        width: number = 300,
        height: number = 200,
        clipPath: string = "none",
        key?: NodeKey
    ) {
        super(key);
        this.__src = src;
        this.__altText = altText;
        this.__x = x;
        this.__y = y;
        this.__width = width;
        this.__height = height;
        this.__clipPath = clipPath;
    }
    static getType() {
        return "image";
    }
    static clone(node: ImageNode): ImageNode {
        return new ImageNode(node.__src, node.__altText, node.__x, node.__y, node.__width, node.__height, node.__clipPath, node.__key);
    }
    // Getters and setters for position and size
    setX(x: number): void {
        const writable = this.getWritable();
        writable.__x = x;
    }
    getX(): number {
        return this.__x;
    }
    setY(y: number): void {
        const writable = this.getWritable();
        writable.__y = y;
    }
    getY(): number {
        return this.__y;
    }
    setWidth(width) {
        const writable = this.getWritable();
        writable.__width = width;
    }
    getWidth() {
        return this.__width;
    }
    setHeight(height) {
        const writable = this.getWritable();
        writable.__height = height;
    }
    getHeight() {
        return this.__height;
    }
    setClipPath(clipPath) {
        const writable = this.getWritable();
        writable.__clipPath = clipPath;
    }
    getClipPath() {
        return this.__clipPath;
    }
    // Create a simple container element
    createDOM() {
        return document.createElement("div");
    }
    // Update the DOM element when the node's properties change
    updateDOM(prevNode, dom) {
        return false;
    }
    // Optional: Define how the node is serialized to JSON
    static importJSON(serializedNode) {
        const { src, altText, x, y, width, height, clipPath } = serializedNode;
        return $createImageNode({ src, altText, x, y, width, height, clipPath });
    }
    exportJSON() {
        return {
            src: this.__src,
            altText: this.__altText,
            x: this.__x,
            y: this.__y,
            width: this.__width,
            height: this.__height,
            clipPath: this.__clipPath,
            type: "image",
            version: 1,
        };
    }
    // Render the node's content
    decorate(): JSX.Element {
        return (
            <MoveableImage
                src={this.__src}
                altText={this.__altText}
                x={this.__x}
                y={this.__y}
                width={this.__width}
                height={this.__height}
                clipPath={this.__clipPath}
                nodeKey={this.__key}
            />
        );
    }
}
interface MoveableImageProps {
    src: string;
    altText: string;
    x: number;
    y: number;
    width: number;
    height: number;
    clipPath: string;
    nodeKey: NodeKey;
}

function MoveableImage({ src, altText, x, y, width, height, clipPath, nodeKey }: MoveableImageProps) {
    const [editor] = useLexicalComposerContext();
    const [isSelected, setSelected, clearSelection] = useLexicalNodeSelection(nodeKey);
    const { userName } = useData();
    const { provider, locks } = useImageLocks();
    const lockedBy = locks[nodeKey];
    const isLocked = lockedBy && lockedBy !== userName;
    const ref = useRef<HTMLDivElement>(null);
    const moveableRef = useRef<any>(null);
    const pendingDragEvent = useRef<any>(null);
    const start = useRef<any>({});
    const copyOnDragRef = useRef<boolean>(false);
    const [localFrame, setLocalFrame] = useState<{x: number, y: number, width: number, height: number, clipPath: string} | null>(null);
    const [isFocused, setIsFocused] = useState<boolean>(true);
    const [isCropping, setIsCropping] = useState<boolean>(false);
    const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
    useEffect(() => {
        if (isSelected && pendingDragEvent.current && moveableRef.current) {
            moveableRef.current.dragStart(pendingDragEvent.current);
            pendingDragEvent.current = null;
        }
    }, [isSelected]);
    useEffect(() => {
        const root = editor.getRootElement();
        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);
        root.addEventListener("focusin", handleFocus);
        root.addEventListener("focusout", handleBlur);
        const handleWindowClick = (e) => {
            // Hide context menu on any outside click
            if (contextMenu) {
                setContextMenu(null);
            }
            // Deselect if the click is outside this image
            if (ref.current && !ref.current.contains(e.target)) {
            }
        };
        window.addEventListener("click", handleWindowClick);
        return () => {
            root.removeEventListener("focusin", handleFocus);
            root.removeEventListener("focusout", handleBlur);
            window.removeEventListener("click", handleWindowClick);
        };
    }, [editor, contextMenu]);
    const startEdit = () => {
        if (provider) {
            provider.awareness.setLocalStateField("imageLock", {
                nodeId: nodeKey,
                userName,
            });
        }
    };
    const endEdit = () => {
        if (provider) {
            provider.awareness.setLocalStateField("imageLock", null);
        }
    };
    const frame = localFrame || { x, y, width, height, clipPath };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { ref: ref, draggable: true, onMouseDown: (e) => {
                    editor.focus();
                    // Ensure the image is selected before any drag starts
                    if (!isSelected) {
                        if (!e.shiftKey) {
                        }
                        setSelected(true);
                        pendingDragEvent.current = e.nativeEvent;
                    }
                }, onDragStart: (e) => {
                    copyOnDragRef.current = e.ctrlKey || e.metaKey;
                    e.dataTransfer.setData("lexical-image-drag", nodeKey);
                    e.dataTransfer.setData("lexical-image-copy", copyOnDragRef.current ? "1" : "0");
                    e.dataTransfer.effectAllowed = copyOnDragRef.current ? "copy" : "move";
                }, onClick: (e) => {
                    e.stopPropagation();
                    editor.focus();
                    if (e.shiftKey) {
                        setSelected(!isSelected);
                    }
                    else {
                        setSelected(true);
                    }
                }, onContextMenu: (e) => {
                    e.preventDefault();
                    editor.focus();
                    if (!isSelected) {
                        setSelected(true);
                    }
                    setContextMenu({ x: e.clientX, y: e.clientY });
                }, style: {
                    position: "absolute",
                    left: frame.x,
                    top: frame.y,
                    width: frame.width,
                    height: frame.height,
                    clipPath: frame.clipPath,
                    border: isSelected && (localFrame !== null || isCropping)
                        ? "2px solid blue"
                        : "none",
                    boxShadow: isSelected && (localFrame !== null || isCropping)
                        ? "0 0 0 2px rgba(0,0,255,0.3)"
                        : "none",
                    pointerEvents: isLocked ? "none" : "auto",
                }, children: [lockedBy && lockedBy !== userName && (_jsx("div", { className: "locked-overlay", children: lockedBy })), _jsx("img", { src: src, alt: altText, style: { width: "100%", height: "100%", objectFit: "contain" } })] }), _jsx(Moveable, { ref: moveableRef, target: ref, draggable: true, resizable: true, keepRatio: false, clippable: isCropping, className: localFrame !== null || isCropping ? "" : "moveable-hidden", style: { display: isSelected && !isLocked ? "block" : "none" }, onDragStart: (e) => {
                    copyOnDragRef.current = e?.inputEvent?.ctrlKey || e?.inputEvent?.metaKey;
                    start.current = { x, y };
                    setLocalFrame({ x, y, width, height, clipPath });
                    startEdit();
                }, onDrag: ({ beforeTranslate }) => {
                    const [dx, dy] = beforeTranslate;
                    const newX = start.current.x + dx;
                    const newY = start.current.y + dy;
                    setLocalFrame((f) => ({ ...f, x: newX, y: newY }));
                }, onDragEnd: () => {
                    const finalFrame = localFrame || { x, y };
                    setLocalFrame(null);
                    editor.update(() => {
                        const node = $getNodeByKey(nodeKey);
                        if (!node)
                            return;
                        if (copyOnDragRef.current) {
                            const clone = $copyNode(node);
                            clone.setX(finalFrame.x);
                            clone.setY(finalFrame.y);
                            node.insertAfter(clone);
                        }
                        else {
                            node.setX(finalFrame.x);
                            node.setY(finalFrame.y);
                        }
                    });
                    copyOnDragRef.current = false;
                    endEdit();
                    // keep the image selected after dragging ends
                    setSelected(true);
                }, onResizeStart: () => {
                    start.current = { x, y, width, height };
                    setLocalFrame({ x, y, width, height, clipPath });
                    startEdit();
                }, onResize: ({ width: w, height: h, drag }) => {
                    const [dx, dy] = drag.beforeTranslate;
                    const newX = start.current.x + dx;
                    const newY = start.current.y + dy;
                    setLocalFrame((f) => ({ ...f, x: newX, y: newY, width: w, height: h }));
                }, onResizeEnd: () => {
                    const finalFrame = localFrame || { x, y, width, height };
                    setLocalFrame(null);
                    editor.update(() => {
                        const node = $getNodeByKey(nodeKey);
                        if (!node)
                            return;
                        node.setWidth(finalFrame.width);
                        node.setHeight(finalFrame.height);
                        node.setX(finalFrame.x);
                        node.setY(finalFrame.y);
                    });
                    endEdit();
                    // keep the image selected after resizing ends
                    setSelected(true);
                }, onClip: ({ clipStyle }) => {
                    setLocalFrame((f) => ({ ...(f || { x, y, width, height, clipPath }), clipPath: clipStyle }));
                }, onClipEnd: () => {
                    const finalFrame = localFrame || { x, y, width, height, clipPath };
                    setLocalFrame(null);
                    editor.update(() => {
                        const node = $getNodeByKey(nodeKey);
                        if (!node)
                            return;
                        node.setClipPath(finalFrame.clipPath);
                    });
                    setIsCropping(false);
                    endEdit();
                } }), contextMenu && (_jsxs("ul", { style: {
                    position: "fixed",
                    top: contextMenu.y,
                    left: contextMenu.x,
                    listStyle: "none",
                    margin: 0,
                    padding: "4px",
                    background: "#fff",
                    border: "1px solid #ccc",
                    color: "#000",
                    zIndex: 1000,
                }, children: [_jsx("li", { style: { padding: "4px 8px", cursor: "pointer", color: "#000" }, onClick: () => {
                            editor.update(() => {
                                const node = $getNodeByKey(nodeKey);
                                if (node)
                                    node.remove();
                            });
                            setContextMenu(null);
                        }, children: "Delete" }), _jsx("li", { style: { padding: "4px 8px", cursor: "pointer", color: "#000" }, onClick: () => {
                            setIsCropping(true);
                            setContextMenu(null);
                        }, children: "Crop" }), _jsx("li", { style: { padding: "4px 8px", cursor: "pointer", color: "#000" }, onClick: () => {
                            const parentW = ref.current?.parentElement?.offsetWidth || 0;
                            editor.update(() => {
                                const node = $getNodeByKey(nodeKey);
                                if (!node)
                                    return;
                                node.setX(0);
                            });
                            setContextMenu(null);
                        }, children: "Align Left" }), _jsx("li", { style: { padding: "4px 8px", cursor: "pointer", color: "#000" }, onClick: () => {
                            const parentW = ref.current?.parentElement?.offsetWidth || 0;
                            editor.update(() => {
                                const node = $getNodeByKey(nodeKey);
                                if (!node)
                                    return;
                                node.setX((parentW - node.getWidth()) / 2);
                            });
                            setContextMenu(null);
                        }, children: "Align Center" }), _jsx("li", { style: { padding: "4px 8px", cursor: "pointer", color: "#000" }, onClick: () => {
                            const parentW = ref.current?.parentElement?.offsetWidth || 0;
                            editor.update(() => {
                                const node = $getNodeByKey(nodeKey);
                                if (!node)
                                    return;
                                node.setX(parentW - node.getWidth());
                            });
                            setContextMenu(null);
                        }, children: "Align Right" })] }))] }));
}
// Helper function to create an ImageNode
export function $createImageNode({ 
    src, 
    altText = "", 
    x = 0, 
    y = 0, 
    width = 300, 
    height = 200, 
    clipPath = "none" 
}: {
    src: string;
    altText?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    clipPath?: string;
}): ImageNode {
    return new ImageNode(src, altText, x, y, width, height, clipPath);
}
// Helper function to check if a node is an ImageNode
export function $isImageNode(node: any): node is ImageNode {
    return node instanceof ImageNode;
}
