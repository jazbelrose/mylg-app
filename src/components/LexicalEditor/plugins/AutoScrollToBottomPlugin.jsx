import { useEffect, useRef } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

/**
 * Scrolls contentRef to bottom once, after actual DOM nodes are present.
 */
export default function AutoScrollToBottomPlugin({ contentRef }) {
  const [editor] = useLexicalComposerContext();
  const hasScrolled = useRef(false);
  const observerRef = useRef(null);

  useEffect(() => {
    const container = contentRef.current;
    if (!container || hasScrolled.current) return;

    // Only scroll when we see "real" content added (paragraph/text nodes)
    const tryScroll = () => {
      if (
        container.scrollHeight > container.clientHeight + 10 && // content is overflowing
        !hasScrolled.current
      ) {
        container.scrollTop = container.scrollHeight;
        hasScrolled.current = true;
        if (observerRef.current) observerRef.current.disconnect();
      }
    };

    // Observe for DOM changes inside the content container
    observerRef.current = new MutationObserver(() => {
      tryScroll();
    });

    observerRef.current.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // In case DOM is already present (e.g., fast local state), try once
    tryScroll();

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [contentRef]);

  return null;
}
