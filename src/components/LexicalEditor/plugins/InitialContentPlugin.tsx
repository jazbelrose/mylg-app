import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

interface InitialContentPluginProps {
  initialContent?: string;
  projectId: string;
}

export default function InitialContentPlugin({ initialContent, projectId }: InitialContentPluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!initialContent) return;

    console.log("[InitialContentPlugin] Setting up initial content for project:", projectId);
    console.log("[InitialContentPlugin] Initial content:", initialContent);

    // Wait a bit for the collaboration plugin to initialize
    const timer = setTimeout(() => {
      editor.update(() => {
        const root = $getRoot();
        
        // Only set initial content if the editor is currently empty
        // This ensures we don't override collaborative content
        if (root.getChildrenSize() === 0) {
          console.log("[InitialContentPlugin] Editor is empty, setting initial content");
          
          try {
            // Try to parse as Lexical JSON first
            const parsedContent = JSON.parse(initialContent);
            if (parsedContent && parsedContent.root && parsedContent.root.children) {
              // Create the editor state from the parsed content
              const editorState = editor.parseEditorState(initialContent);
              editor.setEditorState(editorState);
              console.log("[InitialContentPlugin] Successfully set initial content from JSON");
            } else {
              throw new Error("Invalid JSON structure");
            }
          } catch (error) {
            console.warn("[InitialContentPlugin] Failed to parse as JSON, creating simple text:", error);
            // Fallback: create a simple paragraph with the content as text
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(initialContent));
            root.append(paragraph);
            console.log("[InitialContentPlugin] Set initial content as plain text");
          }
        } else {
          console.log("[InitialContentPlugin] Editor already has content (likely from Yjs), skipping initialization");
        }
      });
    }, 1500); // Increased delay to ensure Yjs collaboration is fully ready

    return () => clearTimeout(timer);
  }, [editor, initialContent, projectId]);

  return null;
}
