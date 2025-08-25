import { useState, useCallback, useEffect } from 'react';
import { normalizeMessage } from '../../../../utils/websocketUtils';

export interface UseBudgetWebSocketProps {
  ws: WebSocket | null;
  activeProject: any;
  user: any;
  userId: string;
  budgetHeader: any;
  onBudgetUpdate?: () => void;
}

export const useBudgetWebSocket = ({
  ws,
  activeProject,
  user,
  userId,
  budgetHeader,
  onBudgetUpdate,
}: UseBudgetWebSocketProps) => {
  const [lockedLines, setLockedLines] = useState<string[]>([]);

  const emitBudgetUpdate = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId) return;
    
    ws.send(
      JSON.stringify({
        action: 'budgetUpdated',
        projectId: activeProject.projectId,
        title: activeProject.title,
        revision: budgetHeader?.revision,
        total: budgetHeader?.headerFinalTotalCost,
        conversationId: `project#${activeProject.projectId}`,
        username: user?.firstName || 'Someone',
        senderId: userId,
      })
    );
  }, [ws, activeProject, user, userId, budgetHeader]);

  const emitLineLock = useCallback(
    (lineId: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId) return;
      
      ws.send(
        JSON.stringify({
          action: 'lineLocked',
          projectId: activeProject.projectId,
          lineId,
          revision: budgetHeader?.revision,
          conversationId: `project#${activeProject.projectId}`,
          username: user?.firstName || 'Someone',
          senderId: userId,
        })
      );
    },
    [ws, activeProject, user, userId, budgetHeader?.revision]
  );

  const emitLineUnlock = useCallback(
    (lineId: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId) return;
      
      ws.send(
        JSON.stringify({
          action: 'lineUnlocked',
          projectId: activeProject.projectId,
          lineId,
          revision: budgetHeader?.revision,
          conversationId: `project#${activeProject.projectId}`,
          username: user?.firstName || 'Someone',
          senderId: userId,
        })
      );
    },
    [ws, activeProject, user, userId, budgetHeader?.revision]
  );

  const emitTimelineUpdate = useCallback(
    (events: any[]) => {
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId) return;
      
      ws.send(
        JSON.stringify(
          normalizeMessage(
            {
              action: 'timelineUpdated',
              projectId: activeProject.projectId,
              title: activeProject.title,
              events,
              conversationId: `project#${activeProject.projectId}`,
              username: user?.firstName || 'Someone',
              senderId: user.userId,
            },
            'timelineUpdated'
          )
        )
      );
    },
    [ws, activeProject, user]
  );

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (!ws) return;
    
    const handleMessage = async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (
          data.action === 'lineLocked' &&
          data.projectId === activeProject?.projectId &&
          data.revision === budgetHeader?.revision
        ) {
          if (data.senderId === userId) return;
          setLockedLines((prev) => 
            prev.includes(data.lineId) ? prev : [...prev, data.lineId]
          );
        } else if (
          data.action === 'lineUnlocked' &&
          data.projectId === activeProject?.projectId &&
          data.revision === budgetHeader?.revision
        ) {
          if (data.senderId === userId) return;
          setLockedLines((prev) => prev.filter((id) => id !== data.lineId));
        } else if (
          data.action === 'budgetUpdated' &&
          data.projectId === activeProject?.projectId
        ) {
          if (data.senderId === userId) return;
          onBudgetUpdate?.();
        } else {
          console.log('[BudgetWebSocket] Ignoring websocket message', data);
        }
      } catch {
        // ignore parse errors
      }
    };
    
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, activeProject?.projectId, budgetHeader?.revision, userId, onBudgetUpdate]);

  return {
    lockedLines,
    setLockedLines,
    emitBudgetUpdate,
    emitLineLock,
    emitLineUnlock,
    emitTimelineUpdate,
  };
};