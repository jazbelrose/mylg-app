import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useRef, useState, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Canvas, PencilBrush, Rect, IText, Image } from 'fabric';
import { useData } from '../../../../app/contexts/DataProvider';
import { EDIT_PROJECT_URL, apiFetch } from '../../../../utils/api';
import { notify } from '../../../../components/ToastNotifications';
import SpinnerOverlay from '../../../../components/SpinnerOverlay';
// ...existing code...
import styles from './DesignerComponent.module.css';
import { StaticCanvas } from 'fabric';

interface DesignerComponentProps {
  style?: React.CSSProperties;
  [key: string]: any;
}

interface CanvasObject {
  id: string;
  name: string;
  obj: any;
}

interface DesignerRef {
  changeMode: (mode: string) => void;
  addText: () => void;
  triggerImageUpload: () => void;
  handleColorChange: (color: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleCopy: () => void;
  handlePaste: () => void;
  handleDelete: () => void;
  handleClear: () => void;
  handleSave: () => void;
}
const fabric = { Canvas, PencilBrush, Rect, IText, Image };
const TOOL_MODES = {
    SELECT: 'select',
    BRUSH: 'brush',
    RECT: 'rect',
    TEXT: 'text',
    IMAGE: 'image',
};
if (!(StaticCanvas.prototype as any)._defensivePatched) {
    // Patch clearContext
    const origClearContext = StaticCanvas.prototype.clearContext;
    StaticCanvas.prototype.clearContext = function (ctx) {
        if (!ctx || typeof ctx.clearRect !== 'function')
            return;
        return origClearContext.call(this, ctx);
    };
    // Patch getContext (which can be called with undefined canvas)
    const origGetContext = StaticCanvas.prototype.getContext;
    StaticCanvas.prototype.getContext = function () {
        // Defensive: bail if this.lowerCanvasEl is undefined/null/disposed
        if (!this.lowerCanvasEl || typeof this.lowerCanvasEl.getContext !== 'function')
            return undefined;
        return origGetContext.call(this);
    };
    (StaticCanvas.prototype as any)._defensivePatched = true;
}
const DesignerComponent = forwardRef<DesignerRef, DesignerComponentProps>((props, ref) => {
    // ...existing code...
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<string>(TOOL_MODES.SELECT);
    const [objects, setObjects] = useState<CanvasObject[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [color, setColor] = useState<string>('#ffffff');
    const [loadingCanvas, setLoadingCanvas] = useState<boolean>(false);
    const [canvasReady, setCanvasReady] = useState<boolean>(false);
    const [isDirty, setIsDirty] = useState<boolean>(false);
    const history = useRef<{ stack: any[], index: number }>({ stack: [], index: -1 });
    const clipboard = useRef<any>(null);
    const fabricCanvasRef = useRef<any>(null);
    const isRestoringHistory = useRef<boolean>(false);
    const isInitialLoad = useRef<boolean>(true);
    const { activeProject, setActiveProject } = useData();
    const saveCanvas = useCallback(async (showToast = false) => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas || !activeProject?.projectId) {
            if (showToast)
                notify('error', 'No active project to save');
            return;
        }
        try {
            const canvasJson = JSON.stringify(fabricCanvas.toJSON());
            console.log('Saving canvas:', { projectId: activeProject.projectId, dataLength: canvasJson.length });
            const apiUrl = `${EDIT_PROJECT_URL}?projectId=${activeProject.projectId}`;
            const res = await apiFetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canvasJson }),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Save failed with status ${res.status}: ${errorText}`);
            }
            const responseData = await res.json();
            console.log('Save successful:', responseData);
            setActiveProject((prev) => (prev ? { ...prev, canvasJson } : prev));
            setIsDirty(false);
            if (showToast)
                notify('success', 'Canvas saved successfully');
        }
        catch (err) {
            console.error('Failed to save canvas:', err);
            if (showToast)
                notify('error', `Failed to save canvas: ${err.message}`);
        }
    }, [activeProject, setActiveProject]);
    const markDirty = useCallback(() => {
        if (isInitialLoad.current)
            return;
        setIsDirty(true);
    }, []);
    const applyCanvasMode = useCallback((nextMode) => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        fabricCanvas.isDrawingMode = nextMode === TOOL_MODES.BRUSH;
        fabricCanvas.selection = nextMode === TOOL_MODES.SELECT;
        fabricCanvas.skipTargetFind = nextMode !== TOOL_MODES.SELECT;
        if (nextMode === TOOL_MODES.BRUSH) {
            if (!fabricCanvas.freeDrawingBrush) {
                fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
            }
            fabricCanvas.freeDrawingBrush.color = color;
            fabricCanvas.freeDrawingBrush.width = 2;
        }
    }, [color]);
    const changeMode = useCallback((nextMode) => {
        setMode(nextMode);
        applyCanvasMode(nextMode);
    }, [applyCanvasMode]);
    const handleColorChange = useCallback((e) => {
        const newColor = e.target.value;
        setColor(newColor);
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        if (fabricCanvas.isDrawingMode && fabricCanvas.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.color = newColor;
        }
        const active = fabricCanvas.getActiveObject();
        if (active) {
            if (active.type === 'i-text') {
                active.set({ fill: newColor });
            }
            else {
                active.set({ stroke: newColor });
                if (active.type === 'rect') {
                    active.set({ fill: newColor });
                }
            }
            fabricCanvas.requestRenderAll();
            markDirty();
        }
    }, [markDirty]);
    const handleSave = useCallback(() => {
        saveCanvas(true);
    }, [saveCanvas]);
    // Save on page unload if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (!isDirty)
                return;
            // Try to save synchronously
            if (fabricCanvasRef.current && activeProject?.projectId) {
                const canvasJson = JSON.stringify(fabricCanvasRef.current.toJSON());
                navigator.sendBeacon(`${EDIT_PROJECT_URL}?projectId=${activeProject.projectId}`, JSON.stringify({ canvasJson }));
            }
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, activeProject?.projectId]);
    const saveHistory = () => {
        if (isRestoringHistory.current)
            return;
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        const json = fabricCanvas.toJSON();
        // Avoid pushing empty canvas as initial state repeatedly
        const isEmptyCanvas = json.objects.length === 0;
        const h = history.current;
        if (h.stack.length === 0 || !isEmptyCanvas) {
            h.stack = h.stack.slice(0, h.index + 1);
            h.stack.push(json);
            h.index++;
        }
    };
    const loadHistory = useCallback((index) => {
        const fabricCanvas = fabricCanvasRef.current;
        const h = history.current;
        if (!fabricCanvas || index < 0 || index >= h.stack.length)
            return;
        isRestoringHistory.current = true;
        fabricCanvas.loadFromJSON(h.stack[index], () => {
            // Ensure the canvas visually updates after history changes.
            fabricCanvas.renderAll();
            fabricCanvas.requestRenderAll();
            updateObjects();
            isRestoringHistory.current = false;
        });
        h.index = index;
    }, []);
    const updateObjects = () => {
        const fabricCanvas = fabricCanvasRef.current;
        if (fabricCanvas) {
            const objs = fabricCanvas.getObjects();
            const active = fabricCanvas.getActiveObject();
            setSelectedId(active ? (active.id || objs.indexOf(active)) : null);
            setObjects(objs.map((obj, i) => ({
                id: obj.id || i,
                name: obj.name || `${obj.type}-${i}`,
                visible: obj.visible,
                locked: obj.lockMovementX && obj.lockMovementY,
                obj,
            })));
        }
    };
    const handleClear = useCallback(() => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        fabricCanvas.getObjects().forEach((obj) => fabricCanvas.remove(obj));
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
        saveHistory();
        updateObjects();
    }, []);
    useLayoutEffect(() => {
        if (!containerRef.current)
            return;
        // Create a canvas element dynamically so React doesn't track it. This
        // prevents React DOM reconciliation errors when Fabric manipulates the
        // element (e.g., wrapping it or moving it in the DOM tree).
        const canvasEl = document.createElement('canvas');
        canvasEl.style.width = '100%';
        canvasEl.style.height = '100%';
        canvasEl.style.pointerEvents = 'auto';
        const container = containerRef.current; // Capture the ref value
        container.appendChild(canvasEl);
        canvasRef.current = canvasEl;
        const { clientWidth, clientHeight } = container;
        const fabricCanvas = new fabric.Canvas(canvasEl, {
            width: clientWidth,
            height: clientHeight,
            selection: true,
        });
        fabricCanvasRef.current = fabricCanvas;
        fabricCanvas.on('mouse:down', () => {
            // Just for debug, optional.
            // console.log('Canvas mouse down');
        });
        fabricCanvas.on('object:added', saveHistory);
        fabricCanvas.on('object:added', updateObjects);
        fabricCanvas.on('object:added', markDirty);
        fabricCanvas.on('object:modified', saveHistory);
        fabricCanvas.on('object:modified', updateObjects);
        fabricCanvas.on('object:modified', markDirty);
        fabricCanvas.on('object:removed', saveHistory);
        fabricCanvas.on('object:removed', updateObjects);
        fabricCanvas.on('object:removed', markDirty);
        fabricCanvas.on('selection:created', updateObjects);
        fabricCanvas.on('selection:updated', updateObjects);
        fabricCanvas.on('selection:cleared', () => setSelectedId(null));
        fabricCanvas.on('path:created', () => {
            changeMode(TOOL_MODES.SELECT);
        });
        applyCanvasMode(mode);
        setCanvasReady(true);
        const handleResize = () => {
            if (container) {
                fabricCanvas.setWidth(container.clientWidth);
                fabricCanvas.setHeight(container.clientHeight);
                fabricCanvas.renderAll();
            }
        };
        window.addEventListener('resize', handleResize);
        const handleWheel = (e) => {
            e.preventDefault();
            const delta = e.deltaY;
            let zoom = fabricCanvas.getZoom();
            zoom *= 0.999 ** delta;
            zoom = Math.min(3, Math.max(0.5, zoom));
            fabricCanvas.zoomToPoint({ x: e.offsetX, y: e.offsetY } as any, zoom);
            e.stopPropagation();
        };
        canvasEl.addEventListener('wheel', handleWheel, { passive: false });
        // ---- CLEANUP ----
        return () => {
            window.removeEventListener('resize', handleResize);
            canvasEl.removeEventListener('wheel', handleWheel);
            const fabricCanvas = fabricCanvasRef.current;
            if (fabricCanvas) {
                try {
                    fabricCanvas.off();
                    fabricCanvas.dispose();
                }
                catch (e) { }
            }
            if (container && container.contains(canvasEl)) {
                container.removeChild(canvasEl);
            }
            fabricCanvasRef.current = null;
            canvasRef.current = null;
        };
        // eslint-disable-next-line
    }, []);
    useEffect(() => {
        if (!canvasReady)
            return;
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        const loadCanvas = async () => {
            setLoadingCanvas(true);
            try {
                let jsonString = null;
                // Always fetch fresh data from API
                if (activeProject?.projectId) {
                    console.log('Loading canvas from API for project:', activeProject.projectId);
                    const apiUrl = `${EDIT_PROJECT_URL}?projectId=${activeProject.projectId}`;
                    const res = await apiFetch(apiUrl);
                    if (res.ok) {
                        const data = await res.json();
                        jsonString = data.canvasJson;
                        console.log('Loaded canvas data:', {
                            hasData: !!jsonString,
                            dataLength: jsonString?.length,
                            firstChars: jsonString?.substring(0, 100)
                        });
                        setActiveProject((prev) => prev ? { ...prev, canvasJson: jsonString } : prev);
                    }
                    else {
                        console.error('Failed to load from API:', res.status, res.statusText);
                        notify('error', `Failed to load canvas: ${res.status} ${res.statusText}`);
                    }
                }
                if (jsonString) {
                    let json;
                    try {
                        json = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
                    }
                    catch (e) {
                        console.error('Failed to parse canvas JSON:', e);
                        fabricCanvas.clear();
                        fabricCanvas.renderAll();
                        saveHistory();
                        return;
                    }
                    if (json && Array.isArray(json.objects)) {
                        console.log('Loading canvas with', json.objects.length, 'objects');
                        isRestoringHistory.current = true;
                        await new Promise((resolve) => {
                            fabricCanvas.loadFromJSON(json, () => {
                                fabricCanvas.renderAll();
                                fabricCanvas.requestRenderAll();
                                console.log('Canvas loaded and rendered successfully');
                                resolve(undefined);
                            });
                        });
                        isRestoringHistory.current = false;
                        updateObjects();
                        saveHistory();
                    }
                    else {
                        console.log('Empty or invalid canvas data, clearing canvas');
                        fabricCanvas.clear();
                        fabricCanvas.renderAll();
                        saveHistory();
                    }
                }
                else {
                    console.log('No canvas data found, starting with blank canvas');
                    fabricCanvas.clear();
                    fabricCanvas.renderAll();
                    saveHistory();
                }
            }
            catch (err) {
                console.error('Failed to load canvas:', err);
                notify('error', `Failed to load canvas: ${err.message}`);
                fabricCanvas.clear();
                fabricCanvas.renderAll();
            }
            finally {
                setLoadingCanvas(false);
                isInitialLoad.current = false;
            }
        };
        loadCanvas();
    }, [canvasReady, activeProject?.projectId, setActiveProject]);
    useEffect(() => {
        applyCanvasMode(mode);
    }, [mode, color, applyCanvasMode]);
    const handleMouseDown = (e) => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        if (mode === TOOL_MODES.RECT) {
            const pointer = fabricCanvas.getPointer(e);
            const rect = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                fill: color,
                stroke: color,
                strokeWidth: 1,
                width: 1,
                height: 1,
                originX: 'left',
                originY: 'top',
                selectable: true,
                name: `rect-${Date.now()}`,
            });
            fabricCanvas.__drawingObject = rect;
            fabricCanvas.__isDrawingRect = true;
            fabricCanvas.add(rect);
        }
    };
    const handleMouseMove = (e) => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas || !fabricCanvas.__drawingObject)
            return;
        const pointer = fabricCanvas.getPointer(e);
        const obj = fabricCanvas.__drawingObject;
        let width = pointer.x - obj.left;
        let height = pointer.y - obj.top;
        if (width < 0) {
            obj.set({ left: pointer.x });
            width = Math.abs(width);
        }
        if (height < 0) {
            obj.set({ top: pointer.y });
            height = Math.abs(height);
        }
        obj.set({ width, height });
        obj.setCoords();
        fabricCanvas.requestRenderAll();
    };
    const handleMouseUp = () => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        if (fabricCanvas.__isDrawingRect && fabricCanvas.__drawingObject) {
            fabricCanvas.setActiveObject(fabricCanvas.__drawingObject);
            fabricCanvas.__drawingObject = null;
            fabricCanvas.__isDrawingRect = false;
            saveHistory();
            updateObjects();
            changeMode(TOOL_MODES.SELECT);
        }
    };
    const addText = useCallback(() => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        const text = new fabric.IText('Text', {
            left: 100,
            top: 100,
            selectable: true,
            name: `text-${Date.now()}`,
            fill: color,
        });
        fabricCanvas.add(text);
        fabricCanvas.setActiveObject(text);
        text.enterEditing();
        text.hiddenTextarea?.focus();
        fabricCanvas.requestRenderAll();
        changeMode(TOOL_MODES.SELECT);
    }, [color, changeMode]);
    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const fabricCanvas = fabricCanvasRef.current;
            if (!fabricCanvas)
                return;
            fabric.Image.fromURL(evt.target?.result as string)
                .then((img) => {
                img.set({ left: 50, top: 50, selectable: true, evented: true, name: `img-${Date.now()}` });
                fabricCanvas.add(img);
                fabricCanvas.setActiveObject(img);
                applyCanvasMode(TOOL_MODES.SELECT);
                fabricCanvas.requestRenderAll();
                changeMode(TOOL_MODES.SELECT);
            })
                .catch((err) => {
                console.error('Failed to load image', err);
                alert('Failed to load image.');
            });
        };
        reader.onerror = () => {
            console.error('Failed to read file');
            alert('Failed to load image.');
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };
    const handleUndo = useCallback(() => {
        const h = history.current;
        if (h.index > 0) {
            loadHistory(h.index - 1);
        }
    }, [loadHistory]);
    const handleRedo = useCallback(() => {
        const h = history.current;
        loadHistory(h.index + 1);
    }, [loadHistory]);
    const handleDelete = useCallback(() => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        const active = fabricCanvas.getActiveObjects();
        active.forEach((obj) => fabricCanvas.remove(obj));
        fabricCanvas.discardActiveObject();
        fabricCanvas.requestRenderAll();
    }, []);
    const handleCopy = useCallback(async () => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        const active = fabricCanvas.getActiveObject();
        if (active) {
            clipboard.current = await active.clone();
        }
    }, []);
    const handlePaste = useCallback(async () => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas || !clipboard.current)
            return;
        const clonedObj = await clipboard.current.clone();
        fabricCanvas.discardActiveObject();
        clonedObj.set({ left: clonedObj.left + 10, top: clonedObj.top + 10, selectable: true });
        fabricCanvas.add(clonedObj);
        fabricCanvas.setActiveObject(clonedObj);
        fabricCanvas.requestRenderAll();
        changeMode(TOOL_MODES.SELECT);
    }, [changeMode]);
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable)
                return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    handleRedo();
                }
                else {
                    handleUndo();
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                handleRedo();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                handleDelete();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDelete, handleUndo, handleRedo]);
    const toggleVisibility = (obj) => {
        obj.visible = !obj.visible;
        obj.canvas.requestRenderAll();
        updateObjects();
        markDirty();
    };
    const toggleLock = (obj) => {
        const locked = !(obj.lockMovementX && obj.lockMovementY);
        obj.lockMovementX = obj.lockMovementY = locked;
        obj.selectable = !locked;
        obj.evented = !locked;
        obj.canvas.requestRenderAll();
        updateObjects();
        markDirty();
    };
    const renameObject = (obj, name) => {
        obj.name = name;
        updateObjects();
        markDirty();
    };
    const selectLayer = (obj, id) => {
        const fabricCanvas = fabricCanvasRef.current;
        if (!fabricCanvas)
            return;
        fabricCanvas.setActiveObject(obj);
        fabricCanvas.requestRenderAll();
        setSelectedId(id);
    };
    // Expose canvas control methods to parent via ref (after all function definitions)
    useImperativeHandle(ref, () => ({
        changeMode,
        addText,
        triggerImageUpload: () => fileInputRef.current?.click(),
        handleColorChange,
        handleUndo,
        handleRedo,
        handleCopy,
        handlePaste,
        handleDelete,
        handleClear,
        handleSave
    }), [changeMode, addText, handleColorChange, handleUndo, handleRedo, handleCopy, handlePaste, handleDelete, handleClear, handleSave]);
    return (_jsxs("div", { style: { display: 'flex', height: '100%' }, children: [_jsxs("div", { className: styles.layersPanel, children: [_jsx("h4", { children: "Layers" }), objects.map(({ id, name, obj }) => (_jsxs("div", { className: `${styles.layerItem} ${selectedId === id ? styles.layerItemSelected : ''}`, onClick: () => selectLayer(obj, id), children: [_jsx("input", { style: { flex: '1 1 auto', marginRight: '4px' }, value: name, onChange: (e) => renameObject(obj, e.target.value), onClick: (e) => e.stopPropagation() }), _jsx("button", { className: styles.button, onClick: (e) => {
                                    e.stopPropagation();
                                    toggleVisibility(obj);
                                }, "aria-label": "Toggle visibility", children: obj.visible ? '👁️' : '🚫' }), _jsx("button", { className: styles.button, onClick: (e) => {
                                    e.stopPropagation();
                                    toggleLock(obj);
                                }, "aria-label": "Toggle lock", children: obj.lockMovementX ? '🔒' : '🔓' })] }, id)))] }), _jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column' }, children: [_jsx("div", { ref: containerRef, className: styles.canvasContainer, onMouseDown: mode === TOOL_MODES.RECT ? handleMouseDown : undefined, onMouseMove: mode === TOOL_MODES.RECT ? handleMouseMove : undefined, onMouseUp: mode === TOOL_MODES.RECT ? handleMouseUp : undefined, children: loadingCanvas && _jsx(SpinnerOverlay, {}) }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", style: { display: 'none' }, onChange: handleImageUpload })] })] }));
});
export default DesignerComponent;
