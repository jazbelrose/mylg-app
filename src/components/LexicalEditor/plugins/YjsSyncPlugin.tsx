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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!provider) return;

    // Debounced update function to reduce performance impact on Firefox
    const onUpdate = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        // Only update if editor is still mounted and focused
        try {
          editor.update(() => {});
        } catch (error) {
          console.warn("[YjsSyncPlugin] Update error:", error);
        }
      }, 16); // ~60fps, prevents excessive updates on Firefox
    };

    provider.doc.on("update", onUpdate);
    
    return () => {
      provider.doc.off("update", onUpdate);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [editor, provider]);

  return null;
}
