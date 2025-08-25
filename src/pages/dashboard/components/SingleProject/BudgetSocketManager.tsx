import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { normalizeMessage } from "../../../../utils/websocketUtils";

interface BudgetSocketManagerProps {
  activeProject: any;
  budgetHeader: any;
  user: any;
  userId: string;
  refresh: () => Promise<void>;
}

export const useBudgetSocketManager = ({
  activeProject,
  budgetHeader,
  user,
  userId,
  refresh,
}: BudgetSocketManagerProps) => {
  const { ws } = useSocket();
  const [lockedLines, setLockedLines] = useState<string[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const emitBudgetUpdate = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId)
      return;
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
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId)
        return;
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
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId)
        return;
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
      if (!ws || ws.readyState !== WebSocket.OPEN || !activeProject?.projectId)
        return;
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

  // WebSocket message handler
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
          setLockedLines((prev) => (prev.includes(data.lineId) ? prev : [...prev, data.lineId]));
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
          await refresh();
        } else {
          console.log('[BudgetPage] Ignoring websocket message', data);
        }
      } catch {
        // ignore parse errors
      }
    };
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, activeProject?.projectId, budgetHeader?.revision, userId, refresh]);

  // Cleanup editing line lock on unmount
  useEffect(() => {
    return () => {
      if (editingLineId) {
        emitLineUnlock(editingLineId);
      }
    };
  }, [editingLineId, emitLineUnlock]);

  return {
    lockedLines,
    setLockedLines,
    editingLineId,
    setEditingLineId,
    emitBudgetUpdate,
    emitLineLock,
    emitLineUnlock,
    emitTimelineUpdate,
  };
};