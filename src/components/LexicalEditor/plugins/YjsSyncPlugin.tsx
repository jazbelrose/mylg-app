// plugins/YjsSyncPlugin.tsx
import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Doc } from "yjs";

type ProviderLike = {
  doc: Doc;
  awareness?: any;
};

export default function YjsSyncPlugin({ provider }: { provider?: ProviderLike }) {
  const [editor] = useLexicalComposerContext();
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!provider) return;

    const onUpdate = () => {
      // Debounce updates to avoid excessive re-renders
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      updateTimeoutRef.current = setTimeout(() => {
        // Only trigger update if editor is still mounted and provider exists
        if (provider && editor) {
          editor.update(() => {
            // Minimal update to trigger collaboration decorations refresh
          });
        }
      }, 16); // ~60fps debouncing
    };

    provider.doc.on("update", onUpdate);
    
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      provider.doc.off("update", onUpdate);
    };
  }, [editor, provider]);

  return null;
}
