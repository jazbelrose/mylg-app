import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
} from "react";
import { useData } from "../../app/contexts/DataProvider";
import { useAuth } from "../../app/contexts/AuthContext";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ClickableLinkPlugin } from "@lexical/react/LexicalClickableLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";

import TextStylePlugin from "./plugins/TextStylePlugin";
import DraggableBlockPlugin from "./plugins/DraggableBlockPlugin";
import FloatingToolbar from "./plugins/FloatingToolbar";
import { DropdownProvider } from "./contexts/DropdownContext";
import { CollaborationPlugin } from "@lexical/react/LexicalCollaborationPlugin";
import DragAndDropPlugin from "./plugins/DragAndDropPlugin";
import AutoScrollToBottomPlugin from "./plugins/AutoScrollToBottomPlugin";
import DeleteImagePlugin from "./plugins/DeleteImagePlugin";
import ImageLockPlugin from "./plugins/ImageLockPlugin";
import ImageCopyPastePlugin from "./plugins/ImageCopyPastePlugin";
import YjsSyncPlugin from "./plugins/YjsSyncPlugin";
import YjsIdleSavePlugin from "./plugins/YjsIdleSavePlugin";

import { WebsocketProvider } from "y-websocket";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";

import "./LexicalEditor.css";

import { ListNode, ListItemNode } from "@lexical/list";
import { ParagraphNode, type EditorState } from "lexical";
import { AutoLinkNode, LinkNode } from "@lexical/link";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";

import { ResizableImageNode } from "./plugins/nodes/ResizableImageNode";
import { SvgNode } from "./plugins/nodes/SvgNode";
import { FigmaEmbedNode } from "./plugins/nodes/FigmaEmbedNode";
import { LayoutContainerNode } from "./plugins/nodes/LayoutContainerNode";
import { LayoutItemNode } from "./plugins/nodes/LayoutItemNode";
import RemoveEmptyLayoutItemsOnBackspacePlugin from "./plugins/BackspacePlugin";
import ColorPlugin from "./plugins/ColorPlugin";
import FontPlugin from "./plugins/FontPlugin";
import ImagePlugin from "./plugins/ImagePlugin";
import FigmaPlugin from "./plugins/FigmaPlugin";
import SpeechToTextPlugin from "./plugins/SpeechToTextPlugin";
import ToolbarActionsPlugin from "./plugins/ToolbarActionsPlugin";

type LexicalEditorProps = {
  onChange?: (json: string) => void; // Made optional since we're moving to idle save
  onSave?: (json: string) => Promise<void>; // New prop for save strategy
  onBlur?: () => void; // Callback for when editor loses focus
  initialContent?: string; // stringified Lexical JSON from DB
  registerToolbar?: (api: unknown) => void;
  idleTimeMs?: number; // Configurable idle time for saves
  ref?: React.RefObject<any>; // Allow ref forwarding
};

type ProviderWithExtras = WebsocketProvider & {
  doc: Y.Doc;
  sharedType: Y.Text;
};

const LexicalEditor = React.forwardRef<any, LexicalEditorProps>(({
  onChange,
  onSave,
  onBlur,
  initialContent,
  registerToolbar,
  idleTimeMs = 25000, // Default 25 seconds
}, ref) => {
  const { userName, activeProject } = useData();
  const { userId } = useAuth();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const providerRef = useRef<ProviderWithExtras | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);
  const manualSaveRef = useRef<(() => Promise<void>) | null>(null);

  // Expose manual save function via ref
  useImperativeHandle(ref, () => ({
    manualSave: () => manualSaveRef.current?.(),
    _manualSave: () => manualSaveRef.current?.(), // For backward compatibility
  }), []);

  // Keep initial content in a ref and sync when prop changes (handles async load & project switch)
  const initialContentRef = useRef<string | undefined>(initialContent);
  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  const hasScrolledToBottom = useRef(false);

  // Memoize project id - only return valid projectId, no fallback
  const projectId = useMemo(() => {
    if (activeProject && typeof activeProject === "object") {
      const id = (activeProject as any).projectId;
      return id && typeof id === "string" && id.trim() !== "" ? id : null;
    }
    return null; // Return null instead of fallback to prevent wrong room connections
  }, [activeProject]);

  // Clear prior IndexedDB and WebSocket provider when project changes
  useEffect(() => {
    // Tear down IndexedDB for the old room
    if (persistenceRef.current) {
      persistenceRef.current
        .destroy()
        .then(() => {
          console.log("IndexedDB cleared for project:", projectId);
        })
        .catch((err) => {
          console.error("Error clearing IndexedDB:", err);
        })
        .finally(() => {
          persistenceRef.current = null;
        });
    }
    
    // Tear down WebSocket for the old room
    if (providerRef.current) {
      try { 
        providerRef.current.destroy(); 
      } catch (e) {
        console.warn("Error destroying provider:", e);
      }
      providerRef.current = null;
      setYjsProvider(null);
    }
    
    // Reset room tracking
    currentRoomRef.current = null;
  }, [projectId]);

  // Reset autoscroll flag on project change
  useEffect(() => {
    hasScrolledToBottom.current = false;
  }, [projectId]);

  const [, setYjsProvider] = useState<WebsocketProvider | null>(null);

  // Track which room the current provider belongs to
  const currentRoomRef = useRef<string | null>(null);

const WS_BASE = useMemo(() => {
  // Connect to the dedicated y-websocket server
  // Use WSS in production (HTTPS) and WS in development
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://35.165.113.63:1234`;
}, []);
  // Create params object for y-websocket
  const wsParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (userId) params.userId = userId;
    if (userName) params.userName = userName;
    return params;
  }, [userId, userName]);


  // Create or reuse the provider for this room - now room-aware
  const getProvider = useCallback(
    (roomId: string, yjsDocMap: Map<string, Y.Doc>) => {
      // Reuse only if we're already connected to THIS room
      if (providerRef.current && currentRoomRef.current === roomId) {
        return providerRef.current as WebsocketProvider;
      }

      // Otherwise, clean up any existing provider
      if (providerRef.current) {
        try { 
          providerRef.current.destroy(); 
        } catch (e) {
          console.warn("Error destroying existing provider:", e);
        }
        providerRef.current = null;
      }

      // Ensure we have a doc per room
      let doc = yjsDocMap.get(roomId);
      if (!doc) {
        doc = new Y.Doc();
        yjsDocMap.set(roomId, doc);
      }

      // Per-room IndexedDB cache
      const persistence = new IndexeddbPersistence(roomId, doc);
      persistence.on("synced", () => {
        console.log("IndexedDB synced for project:", roomId);
      });
      persistenceRef.current = persistence;

      // ✅ Create WebSocket provider with correct URL structure for the y-websocket server
      // The y-websocket server expects: ws://host:port/roomId?userId=...&userName=...
      const provider = new WebsocketProvider(WS_BASE, roomId, doc, { params: wsParams }) as ProviderWithExtras;
      provider.doc = doc;
      provider.sharedType = doc.getText("lexical");

      // Configure awareness for presence/cursor display
      if (provider.awareness) {
        provider.awareness.setLocalStateField('user', {
          name: userName ?? "anonymous",
          color: '#' + Math.floor(Math.random()*16777215).toString(16), // Random color
        });
      }

      provider.on("status", (e: { status: string }) => {
        console.log("[y-websocket] status:", e.status, "room:", roomId);
        if (e.status === "connected") {
          console.log("✅ Connected to y-websocket server for room:", roomId);
        } else if (e.status === "disconnected") {
          console.log("❌ Disconnected from y-websocket server for room:", roomId);
        } else if (e.status === "connecting") {
          console.log("🔄 Connecting to y-websocket server for room:", roomId);
        }
      });
      provider.on("sync", (isSynced: boolean) => {
        console.log("[y-websocket] sync:", isSynced, "room:", roomId);
        if (isSynced) {
          console.log("🔄 Document synchronized for room:", roomId);
        }
      });

      // Add connection error handling
      provider.on("connection-error", (error: any) => {
        console.error("❌ WebSocket connection error for room:", roomId, error);
      });

      // Add WebSocket-level event logging for debugging
      if (provider.ws) {
        provider.ws.addEventListener('open', () => {
          console.log("🌐 WebSocket opened for room:", roomId);
        });
        provider.ws.addEventListener('close', (event) => {
          console.log("🌐 WebSocket closed for room:", roomId, "Code:", event.code, "Reason:", event.reason);
        });
        provider.ws.addEventListener('error', (error) => {
          console.error("🌐 WebSocket error for room:", roomId, error);
        });
      }

      providerRef.current = provider;
      currentRoomRef.current = roomId;
      setYjsProvider(provider);
      return provider as WebsocketProvider;
    },
    [WS_BASE, wsParams]
  );

  // Lexical composer config
  const initialConfig = useMemo(
    () => ({
      namespace: "MyEditor",
      theme: {
        paragraph: "editor-paragraph",
        text: {
          bold: "editor-bold",
          italic: "editor-italic",
          underline: "editor-underline",
          strikethrough: "editor-strikethrough",
          code: "editor-code",
          color: "editor-text-color",
          backgroundColor: "editor-bg-color",
        },
        quote: "editor-quote",
        heading: {
          h1: "editor-heading-h1",
          h2: "editor-heading-h2",
        },
        list: {
          nested: { listitem: "editor-nested-listitem" },
          ol: "editor-list-ol",
          ul: "editor-list-ul",
          listitem: "editor-listitem",
        },
        alignment: {
          left: "editor-align-left",
          center: "editor-align-center",
          right: "editor-align-right",
          justify: "editor-align-justify",
        },
        link: "editor-link",
      },
      nodes: [
        ParagraphNode,
        ListNode,
        ListItemNode,
        LinkNode,
        HeadingNode,
        QuoteNode,
        AutoLinkNode,
        ResizableImageNode,
        SvgNode,
        FigmaEmbedNode,
        LayoutContainerNode,
        LayoutItemNode,
      ],
      onError: (error: unknown) =>
        console.error("Lexical Editor Error:", error),
      editorState: null as unknown, // we bootstrap via CollaborationPlugin
    }),
    []
  );

  // Safely parse initialContent JSON for initialEditorState seeding (used only if Yjs doc is empty)
  const parseInitialEditorState = useCallback(() => {
    const raw = initialContentRef.current;
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      console.warn("[LexicalEditor] Invalid initialContent JSON");
      return undefined;
    }
  }, []);

  return (
    <div
      ref={editorRef}
      style={{
        maxWidth: "1920px",
        width: "100%",
        height: "100vh",
        minHeight: "800px",
      }}
    >
      <LexicalComposer initialConfig={initialConfig as any}>
        <DropdownProvider>
          <ImageLockPlugin provider={providerRef.current}>
            <div
              className="editor-container"
              ref={editorContainerRef}
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                height: "100%",
              }}
            >
              <ToolbarActionsPlugin registerToolbar={registerToolbar} />
              <ColorPlugin showToolbar={false} />
              <FontPlugin showToolbar={false} />
              <ImagePlugin showToolbarButton={false} />
              <FigmaPlugin showToolbarButton={false} />
              <SpeechToTextPlugin showToolbarButton={false} />
              <FloatingToolbar editorRef={editorRef} />

              <div
                className="content-container"
                ref={contentRef}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <RichTextPlugin
                  contentEditable={
                    <ContentEditable
                      className="editor-input"
                      style={{ position: "relative", minHeight: "100%" }}
                      onBlur={onBlur}
                    />
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />

                {/* Only render CollaborationPlugin when we have a valid projectId */}
                {projectId && (
                  <CollaborationPlugin
                    // @ts-ignore - key prop is always valid in React components
                    key={projectId}         // ← forces new binding per room
                    id={projectId}
                    providerFactory={getProvider as any}
                  /**
                   * IMPORTANT: Provide a function that sets editor state ONLY when the Yjs doc is empty.
                   * The CollaborationPlugin handles the “seed when empty” logic; we just supply the seed.
                   */
                  initialEditorState={(editor) => {
                    const seed = parseInitialEditorState();
                    if (!seed) return;
                    // Let Lexical parse the serialized state
                    const parsed = editor.parseEditorState(seed);
                    editor.setEditorState(parsed);
                  }}
                  shouldBootstrap={true}
                  username={userName ?? "anonymous"}
                />
                )}

                <RemoveEmptyLayoutItemsOnBackspacePlugin />
                {projectId && providerRef.current && (
                  <>
                    <YjsSyncPlugin provider={providerRef.current} />
                    {onSave && (
                      <YjsIdleSavePlugin 
                        provider={providerRef.current}
                        onSave={onSave}
                        idleTimeMs={idleTimeMs}
                        onActivity={() => {
                          // Optional: track activity for UI feedback
                        }}
                        onManualSaveReady={(saveFunc) => {
                          manualSaveRef.current = saveFunc;
                        }}
                      />
                    )}
                  </>
                )}
                <ListPlugin />
                <LinkPlugin />
                <ClickableLinkPlugin />
                <TextStylePlugin />
                {editorContainerRef.current && (
                  <DraggableBlockPlugin anchorElem={editorContainerRef.current} />
                )}

                <DragAndDropPlugin />
                <ImageCopyPastePlugin />
                <DeleteImagePlugin />

                <AutoScrollToBottomPlugin contentRef={contentRef} />

                {/* Keep onChange for backward compatibility if provided */}
                {onChange && (
                  <OnChangePlugin
                    onChange={useCallback(
                      (editorState: EditorState) => {
                        // Serialize to Lexical JSON string and bubble up
                        const json = JSON.stringify(editorState.toJSON());
                        onChange(json);
                      },
                      [onChange]
                    )}
                  />
                )}
              </div>
            </div>
          </ImageLockPlugin>
        </DropdownProvider>
      </LexicalComposer>
    </div>
  );
});

LexicalEditor.displayName = 'LexicalEditor';

export default LexicalEditor;
