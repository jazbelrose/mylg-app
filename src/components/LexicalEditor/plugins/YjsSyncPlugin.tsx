import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

interface YjsSyncPluginProps {
    provider: {
        doc?: {
            on: (event: string, callback: () => void) => void;
            off: (event: string, callback: () => void) => void;
        };
    } | null;
}

export default function YjsSyncPlugin({ provider }: YjsSyncPluginProps) {
    const [editor] = useLexicalComposerContext();
    
    useEffect(() => {
        if (!provider || !provider.doc) {
            console.warn("⚠️ YjsSyncPlugin: No provider or doc available");
            return;
        }
        
        const onUpdate = () => {
            try {
                editor.update(() => { 
                    // Trigger editor update when Yjs doc changes
                });
            } catch (error) {
                console.error("❌ Error syncing Yjs update to editor:", error);
            }
        };
        
        try {
            provider.doc.on("update", onUpdate);
            console.log("✅ YjsSyncPlugin: Connected to provider doc updates");
        } catch (error) {
            console.error("❌ YjsSyncPlugin: Error connecting to provider:", error);
        }
        
        return () => {
            try {
                if (provider && provider.doc) {
                    provider.doc.off("update", onUpdate);
                    console.log("🧹 YjsSyncPlugin: Disconnected from provider doc updates");
                }
            } catch (error) {
                console.warn("⚠️ YjsSyncPlugin: Error during cleanup:", error);
            }
        };
    }, [editor, provider]);
    
    return null;
}
