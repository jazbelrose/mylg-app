import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useData } from "../../app/contexts/DataProvider";
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
  onChange: (json: string) => void;
  initialContent?: string; // stringified Lexical JSON from DB
  registerToolbar?: (api: unknown) => void;
};

type ProviderWithExtras = WebsocketProvider & {
  doc: Y.Doc;
  sharedType: Y.Text;
};

const LexicalEditor: React.FC<LexicalEditorProps> = ({
  onChange,
  initialContent,
  registerToolbar,
}) => {
  const { userName, activeProject } = useData();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const providerRef = useRef<ProviderWithExtras | null>(null);
  const persistenceRef = useRef<IndexeddbPersistence | null>(null);

  // Keep initial content in a ref and sync when prop changes (handles async load & project switch)
  const initialContentRef = useRef<string | undefined>(initialContent);
  
  useEffect(() => {
    initialContentRef.current = initialContent;
  }, [initialContent]);

  const hasScrolledToBottom = useRef(false);

  // Memoize project id
  const projectId = useMemo(() => {
    if (activeProject && typeof activeProject === "object") {
      return activeProject.projectId ?? "default-project";
    }
    return (activeProject as unknown as string) ?? "default-project";
  }, [activeProject]);

  // Room id must be project/<id>/lexical to match server validator AND Y.Text key
  const roomId = useMemo(() => `project/${projectId}/description`, [projectId]);

  // Cleanup provider on unmount
  useEffect(() => {
    return () => {
      if (providerRef.current) {
        try {
          providerRef.current.destroy();
        } catch (error) {
          console.warn("[LexicalEditor] Error destroying provider:", error);
        }
        providerRef.current = null;
      }
      if (persistenceRef.current) {
        try {
          persistenceRef.current.destroy();
        } catch (error) {
          console.warn("[LexicalEditor] Error destroying persistence:", error);
        }
        persistenceRef.current = null;
      }
    };
  }, []);

  // Clear prior IndexedDB when project changes and reset cached content
  useEffect(() => {
    if (persistenceRef.current) {
      persistenceRef.current
        .destroy()
        .then(() => {
          console.log("IndexedDB cleared for room:", roomId);
        })
        .catch((err) => {
          console.error("Error clearing IndexedDB:", err);
        })
        .finally(() => {
          persistenceRef.current = null;
        });
    }
    
    // Reset cached content to prevent stale content from previous project
    initialContentRef.current = initialContent;
  }, [roomId, initialContent]);

  // Reset autoscroll flag on project change
  useEffect(() => {
    hasScrolledToBottom.current = false;
  }, [roomId]);

  // Memoize username to prevent flickering and unnecessary re-renders
  const stableUserName = useMemo(() => {
    return userName && userName.trim() ? userName.trim() : "anonymous";
  }, [userName]);

  const [, setYjsProvider] = useState<WebsocketProvider | null>(null);
const WS_ENDPOINT = useMemo(() => {
  // Prefer Vite env; fall back to NEXT_PUBLIC_ only if you also build with Next
  const fromEnv =
    (import.meta as any).env?.VITE_WS_ENDPOINT ||
    (import.meta as any).env?.NEXT_PUBLIC_WS_ENDPOINT;

  // If none set, choose based on page protocol - ensure /yjs suffix
  const fallback =
    (typeof window !== 'undefined' && window.location.protocol === 'https:')
      ? 'wss://YOUR_DOMAIN/yjs'      // <-- set up nginx/ALB to proxy to 127.0.0.1:1234
      : 'ws://35.165.113.63:1234/yjs';   // EC2 direct (http sites only) with /yjs

  const val = fromEnv || fallback;
  console.log('[client] WS_ENDPOINT (effective)', val);
  return val;
}, []);
  // Create or reuse the provider for this room
  const getProvider = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>) => {
      if (providerRef.current) {
        return providerRef.current as WebsocketProvider;
      }

      let doc = yjsDocMap.get(id);
      if (!doc) {
        doc = new Y.Doc();
        yjsDocMap.set(id, doc);
      }

      // Persistence per-room
      const persistence = new IndexeddbPersistence(id, doc);
      persistence.on("synced", () => {
        console.log("IndexedDB synced for project:", id);
      });
      persistenceRef.current = persistence;

      const provider = new WebsocketProvider(WS_ENDPOINT, id, doc, {
        connect: true,
        maxBackoffTime: 5000, // Max 5 seconds between reconnection attempts
      }) as ProviderWithExtras;
      const sharedType = doc.getText("description");

      provider.doc = doc;
      provider.sharedType = sharedType;

      providerRef.current = provider;
      setYjsProvider(provider);

      // Enhanced connection monitoring and error handling
      provider.on("status", (event: { status: string }) => {
        console.log("[y-websocket] status:", event.status, "room:", id);
        if (event.status === "disconnected") {
          console.warn("[y-websocket] Disconnected from Yjs server");
        }
      });
     provider.on("sync", (isSynced: boolean) => {
  console.log("[y-websocket] sync:", isSynced, "room:", id);
  if (isSynced) {
    console.log("[y-websocket] current text:", provider.sharedType.toString());
  }
});

      provider.on("connection-error", (event: any) => {
        console.error("[y-websocket] Connection error:", event);
      });

      return provider as WebsocketProvider;
    },
    [WS_ENDPOINT]
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

  // Memoize provider factory to prevent unnecessary re-creation
  const memoizedProviderFactory = useCallback(
    (id: string, yjsDocMap: Map<string, Y.Doc>) => {
      return getProvider(id, yjsDocMap) as unknown as WebsocketProvider;
    },
    [getProvider]
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
                    />
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />

                <CollaborationPlugin
                  id={roomId}
                  providerFactory={memoizedProviderFactory as any}
                  shouldBootstrap={true} // only runs when Y doc is empty
                  username={stableUserName}
                  initialEditorState={(editor) => {
                    const seed = parseInitialEditorState();
                    if (!seed) return;
                    try {
                      const parsed = editor.parseEditorState(seed);
                      editor.setEditorState(parsed);
                      console.log("[LexicalEditor] bootstrapped from DB JSON");
                    } catch (e) {
                      console.warn("[LexicalEditor] bootstrap failed:", e);
                    }
                  }}
                />

                <RemoveEmptyLayoutItemsOnBackspacePlugin />
                {providerRef.current && (
                  <YjsSyncPlugin provider={providerRef.current} />
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

                <OnChangePlugin
                  onChange={useCallback(
                    (editorState: EditorState) => {
                      // Serialize to Lexical JSON string and bubble up
                      const json = JSON.stringify(editorState.toJSON());
                      // console.log("[Editor State] Updated:", json);
                      onChange(json);
                    },
                    [onChange]
                  )}
                />
              </div>
            </div>
          </ImageLockPlugin>
        </DropdownProvider>
      </LexicalComposer>
    </div>
  );
};

export default LexicalEditor;
