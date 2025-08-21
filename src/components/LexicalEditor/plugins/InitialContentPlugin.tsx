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
        if (root.getChildrenSize() === 0) {
          console.log("[InitialContentPlugin] Editor is empty, setting initial content");
          
          try {
            const parsedContent = JSON.parse(initialContent);
            if (parsedContent && parsedContent.root && parsedContent.root.children) {
              // Create the editor state from the parsed content
              const editorState = editor.parseEditorState(initialContent);
              editor.setEditorState(editorState);
              console.log("[InitialContentPlugin] Successfully set initial content");
            } else {
              console.warn("[InitialContentPlugin] Invalid content structure");
            }
          } catch (error) {
            console.warn("[InitialContentPlugin] Failed to parse content, creating simple text:", error);
            // Fallback: create a simple paragraph with the content as text
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(initialContent));
            root.append(paragraph);
          }
        } else {
          console.log("[InitialContentPlugin] Editor already has content, skipping initialization");
        }
      });
    }, 1000); // Wait 1 second for collaboration to be ready

    return () => clearTimeout(timer);
  }, [editor, initialContent, projectId]);

  return null;
}
