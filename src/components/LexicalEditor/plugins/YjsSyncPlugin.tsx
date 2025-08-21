// plugins/YjsSyncPlugin.tsx
import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { Doc } from "yjs";

type ProviderLike = {
  doc: Doc;
  awareness?: any;
};

export default function YjsSyncPlugin({ provider }: { provider?: ProviderLike }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!provider) return;

    const onUpdate = () => {
      // Touch the editor so Lexical re-evaluates collaborator decorations
      editor.update(() => {});
    };

    provider.doc.on("update", onUpdate);
    return () => {
      provider.doc.off("update", onUpdate);
    };
  }, [editor, provider]);

  return null;
}
