import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { TextNode } from "lexical";
import { useEffect } from "react";
export default function TextStylePlugin() {
    const [editor] = useLexicalComposerContext();
    useEffect(() => {
        // A transform that runs whenever a TextNode is updated
        return editor.registerNodeTransform(TextNode, (textNode) => {
            const domElement = editor.getElementByKey(textNode.getKey());
            if (domElement) {
                const styleString = textNode.getStyle() || "";
                domElement.setAttribute("style", styleString);
            }
        });
    }, [editor]);
    return null;
}
