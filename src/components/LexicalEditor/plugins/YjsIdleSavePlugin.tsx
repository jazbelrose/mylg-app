import { useEffect, useRef, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { Doc } from 'yjs';

type ProviderLike = {
  doc: Doc;
  awareness?: any;
};

interface YjsIdleSavePluginProps {
  provider?: ProviderLike;
  onSave: (json: string) => Promise<void>;
  idleTimeMs?: number; // Default 25 seconds
  onActivity?: () => void; // Optional callback for activity tracking
  onManualSaveReady?: (saveFunc: () => Promise<void>) => void; // Callback to expose manual save
}

/**
 * Plugin that monitors Yjs document activity and triggers saves only after inactivity periods.
 * This prevents excessive DynamoDB writes while preserving data integrity.
 */
export default function YjsIdleSavePlugin({ 
  provider, 
  onSave, 
  idleTimeMs = 25000, // 25 seconds default
  onActivity,
  onManualSaveReady
}: YjsIdleSavePluginProps) {
  const [editor] = useLexicalComposerContext();
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string>('');
  const pendingSaveRef = useRef<boolean>(false);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const triggerSave = useCallback(async () => {
    if (pendingSaveRef.current) return; // Prevent concurrent saves
    
    pendingSaveRef.current = true;
    try {
      // Get current editor state as JSON
      await editor.getEditorState().read(() => {
        const json = JSON.stringify(editor.getEditorState().toJSON());
        
        // Only save if content has actually changed
        if (json !== lastSaveRef.current) {
          lastSaveRef.current = json;
          console.log('[YjsIdleSavePlugin] Triggering save, content length:', json.length);
          onSave(json).catch((error) => {
            console.error('[YjsIdleSavePlugin] Save failed:', error);
            // Reset lastSaveRef so we'll retry on next opportunity
            if (error.message.includes('concurrent') || error.message.includes('conflict')) {
              console.warn('[YjsIdleSavePlugin] Conflict detected, will retry later');
            } else {
              lastSaveRef.current = ''; // Reset to force retry
            }
          });
        } else {
          console.log('[YjsIdleSavePlugin] No changes detected, skipping save');
        }
      });
    } catch (error) {
      console.error('[YjsIdleSavePlugin] Error reading editor state:', error);
    } finally {
      pendingSaveRef.current = false;
    }
  }, [editor, onSave]);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer();
    
    // Track activity if callback provided
    if (onActivity) {
      onActivity();
    }
    
    // Set new timer for idle save
    idleTimerRef.current = setTimeout(() => {
      triggerSave();
    }, idleTimeMs);
  }, [clearIdleTimer, triggerSave, idleTimeMs, onActivity]);

  // Monitor Yjs document updates
  useEffect(() => {
    if (!provider?.doc) return;

    const onUpdate = () => {
      resetIdleTimer();
    };

    provider.doc.on('update', onUpdate);
    
    // Set initial timer
    resetIdleTimer();
    
    return () => {
      provider.doc.off('update', onUpdate);
      clearIdleTimer();
    };
  }, [provider, resetIdleTimer, clearIdleTimer]);

  // Public API for manual saves (exposed via ref or callback)
  const manualSave = useCallback(() => {
    clearIdleTimer();
    return triggerSave();
  }, [clearIdleTimer, triggerSave]);

  // Expose manual save function to parent component
  useEffect(() => {
    if (onManualSaveReady) {
      onManualSaveReady(manualSave);
    }
    
    // Store the manual save function on the editor for external access (legacy)
    (editor as any)._manualSave = manualSave;
    
    return () => {
      delete (editor as any)._manualSave;
    };
  }, [editor, manualSave, onManualSaveReady]);

  return null;
}