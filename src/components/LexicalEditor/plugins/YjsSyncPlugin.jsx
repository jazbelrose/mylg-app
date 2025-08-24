import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

export default function YjsSyncPlugin({ provider }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!provider) return;
    const onUpdate = () => {
      editor.update(() => {});
    };
    provider.doc.on("update", onUpdate);
    return () => {
      provider.doc.off("update", onUpdate);
    };
  }, [editor, provider]);

  return null;
}