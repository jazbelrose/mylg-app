import React, { useCallback, useEffect, useMemo } from "react";
import { useBudget } from "./BudgetDataProvider";
import { useData } from "../../../../app/contexts/DataProvider";
import { useSocket } from "../../../../app/contexts/SocketContext";
import { normalizeMessage } from "../../../../utils/websocketUtils";
import { slugify } from "../../../../utils/slug";
import { v4 as uuid } from "uuid";
import {
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
} from "../../../../utils/api";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
import styles from "../../BudgetPage.module.css";

interface BudgetEventManagerProps {
  activeProject: any;
  eventsByLineItem: Record<string, any[]>;
  updateTimelineEvents: (projectId: string, events: any[]) => Promise<void>;
  userId: string;
  user: any;
  stateManager: any; // Type from BudgetStateManager
  children: (handlers: BudgetEventHandlers) => React.ReactNode;
}

interface BudgetEventHandlers {
  // Line item operations
  handleCreateLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  handleEditLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  confirmDelete: () => Promise<void>;
  handleDuplicateSelected: () => Promise<void>;
  
  // Modal operations
  openCreateModal: () => void;
  openEditModal: (item: any) => void;
  openEventModal: (item: any) => void;
  openDuplicateModal: (item: any) => void;
  openDeleteModal: (ids: string[]) => void;
  closeCreateModal: () => void;
  closeEventModal: () => void;
  
  // Event operations
  handleSaveEvents: (events: any[]) => Promise<void>;
  
  // WebSocket operations
  emitBudgetUpdate: () => void;
  emitLineLock: (lineId: string) => void;
  emitLineUnlock: (lineId: string) => void;
  emitTimelineUpdate: (events: any[]) => void;
  
  // Helper functions
  getNextElementKey: () => string;
  getNextElementId: (category: string) => string;
  queueEventsUpdate: (events: any[]) => Promise<void>;
}

const BudgetEventManager: React.FC<BudgetEventManagerProps> = ({
  activeProject,
  eventsByLineItem,
  updateTimelineEvents,
  userId,
  user,
  stateManager,
  children,
}) => {
  const { budgetHeader, budgetItems, setBudgetItems, setBudgetHeader } = useBudget();
  const { ws } = useSocket();
  
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

  const queueEventsUpdate = useCallback(async (events: any[]) => {
    if (!activeProject?.projectId) return;
    try {
      await enqueueProjectUpdate(updateTimelineEvents, activeProject.projectId, events);
    } catch (err) {
      console.error('Error updating events:', err);
    }
  }, [activeProject?.projectId, updateTimelineEvents]);

  const getNextElementKey = useCallback(() => {
    const slug = slugify(activeProject?.title || '');
    let max = 0;
    budgetItems.forEach((it) => {
      if (typeof it.elementKey === 'string') {
        const match = it.elementKey.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    });
    const nextNum = String(max + 1).padStart(4, '0');
    return `${slug}-${nextNum}`;
  }, [activeProject?.title, budgetItems]);

  const getNextElementId = useCallback(
    (category: string) => {
      if (!category) return '';
      let max = 0;
      budgetItems.forEach((it) => {
        if (it.category === category && typeof it.elementId === 'string') {
          const match = it.elementId.match(/-(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > max) max = num;
          }
        }
      });
      return `${category}-${String(max + 1).padStart(4, '0')}`;
    },
    [budgetItems]
  );

  const openCreateModal = useCallback(() => {
    const nextKey = getNextElementKey();
    stateManager.setNextElementKey(nextKey);
    stateManager.setEditItem(null);
    stateManager.setPrefillItem(null);
    stateManager.setCreateModalOpen(true);
  }, [getNextElementKey, stateManager]);

  const openEditModal = useCallback((item: any) => {
    if (stateManager.lockedLines.includes(item.budgetItemId)) return;
    stateManager.setEditItem(item);
    stateManager.setEditingLineId(item.budgetItemId);
    emitLineLock(item.budgetItemId);
    stateManager.setPrefillItem(null);
    stateManager.setCreateModalOpen(true);
  }, [stateManager, emitLineLock]);

  const openEventModal = useCallback((item: any) => {
    if (stateManager.lockedLines.includes(item.budgetItemId)) return;
    const evs = eventsByLineItem[item.budgetItemId] || [];
    stateManager.setEventItem(item);
    stateManager.setEventList(evs.map((ev) => ({ ...ev })));
    stateManager.setEventModalOpen(true);
  }, [stateManager, eventsByLineItem]);

  const openDuplicateModal = useCallback((item: any) => {
    const nextKey = getNextElementKey();
    const nextId = getNextElementId(item.category);
    const clone = { ...item, elementKey: nextKey };
    if (nextId) clone.elementId = nextId;
    delete clone.budgetItemId;
    stateManager.setNextElementKey(nextKey);
    stateManager.setPrefillItem(clone);
    stateManager.setEditItem(null);
    stateManager.setCreateModalOpen(true);
  }, [getNextElementKey, getNextElementId, stateManager]);

  const openDeleteModal = useCallback((ids: string[]) => {
    stateManager.setDeleteTargets(ids);
    stateManager.setIsConfirmingDelete(true);
  }, [stateManager]);

  const closeCreateModal = useCallback(() => {
    stateManager.setCreateModalOpen(false);
    if (stateManager.editingLineId) {
      emitLineUnlock(stateManager.editingLineId);
    }
    stateManager.setEditingLineId(null);
    stateManager.setEditItem(null);
    stateManager.setPrefillItem(null);
  }, [stateManager, emitLineUnlock]);

  const closeEventModal = useCallback(() => {
    stateManager.setEventModalOpen(false);
    stateManager.setEventItem(null);
    stateManager.setEventList([]);
  }, [stateManager]);

  const handleSaveEvents = useCallback(async (events: any[]) => {
    if (!activeProject?.projectId || !stateManager.eventItem) {
      closeEventModal();
      return;
    }
    let others = Array.isArray(activeProject?.timelineEvents)
      ? activeProject.timelineEvents.filter((ev) => ev.budgetItemId !== stateManager.eventItem.budgetItemId)
      : [];
    const withIds = events.map((ev) => ({
      id: ev.id || uuid(),
      date: ev.date,
      hours: ev.hours,
      description: ev.description || '',
      budgetItemId: stateManager.eventItem.budgetItemId,
    }));
    const updated = [...others, ...withIds];
    try {
      await queueEventsUpdate(updated);
      emitTimelineUpdate(updated);
    } catch (err) {
      console.error('Error saving events', err);
    }
    closeEventModal();
  }, [activeProject, stateManager.eventItem, closeEventModal, queueEventsUpdate, emitTimelineUpdate]);

  const confirmDelete = useCallback(async () => {
    if (!activeProject?.projectId || stateManager.deleteTargets.length === 0) {
      stateManager.setIsConfirmingDelete(false);
      stateManager.setDeleteTargets([]);
      return;
    }
    stateManager.pushHistory();
    try {
      await Promise.all(
        stateManager.deleteTargets.map((id) => deleteBudgetItem(activeProject.projectId, id))
      );
      const updatedList = budgetItems.filter(
        (it) => !stateManager.deleteTargets.includes(it.budgetItemId)
      );
      setBudgetItems(updatedList);
      stateManager.setSelectedRowKeys((prev) =>
        prev.filter((key) => !stateManager.deleteTargets.includes(key))
      );
      if (stateManager.deleteTargets.includes(stateManager.editItem?.budgetItemId)) {
        closeCreateModal();
      }
      if (Array.isArray(activeProject?.timelineEvents)) {
        const remainingEvents = activeProject.timelineEvents.filter(
          (ev) => !stateManager.deleteTargets.includes(ev.budgetItemId)
        );
        if (remainingEvents.length !== activeProject.timelineEvents.length) {
          await queueEventsUpdate(remainingEvents);
          emitTimelineUpdate(remainingEvents);
        }
      }
      await stateManager.syncHeaderTotals(updatedList);
      stateManager.setLockedLines((prev) => prev.filter((id) => !stateManager.deleteTargets.includes(id)));
    } catch (err) {
      console.error('Error deleting line items:', err);
    } finally {
      stateManager.setIsConfirmingDelete(false);
      stateManager.setDeleteTargets([]);
    }
  }, [activeProject, stateManager, budgetItems, setBudgetItems, closeCreateModal, queueEventsUpdate, emitTimelineUpdate]);

  const handleDuplicateSelected = useCallback(async () => {
    if (!activeProject?.projectId || !budgetHeader || stateManager.selectedRowKeys.length === 0)
      return;
    stateManager.pushHistory();
    try {
      const toClone = budgetItems.filter((it) =>
        stateManager.selectedRowKeys.includes(it.budgetItemId)
      );
      const tempItems = [...budgetItems];
      const clones = [];
      for (const item of toClone) {
        const slug = slugify(activeProject?.title || "");
        let maxKey = 0;
        tempItems.forEach((it) => {
          if (typeof it.elementKey === "string") {
            const match = it.elementKey.match(/-(\d+)$/);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxKey) maxKey = num;
            }
          }
        });
        const nextKey = `${slug}-${String(maxKey + 1).padStart(4, "0")}`;

        let maxId = 0;
        if (item.category) {
          tempItems.forEach((it) => {
            if (it.category === item.category && typeof it.elementId === "string") {
              const match = it.elementId.match(/-(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxId) maxId = num;
              }
            }
          });
        }
        const nextId = item.category
          ? `${item.category}-${String(maxId + 1).padStart(4, "0")}`
          : "";

        const { budgetItemId, createdAt, updatedAt, ...rest } = item;
        const payload = {
          ...rest,
          elementKey: nextKey,
          revision: budgetHeader.revision,
          budgetItemId: `LINE-${uuid()}`,
        };
        if (nextId) payload.elementId = nextId;
        const newItem = await createBudgetItem(
          activeProject.projectId,
          budgetHeader.budgetId,
          payload
        );
        tempItems.push(newItem);
        clones.push(newItem);
      }
      const updated = [...budgetItems, ...clones];
      setBudgetItems(updated);
      stateManager.setSelectedRowKeys([]);
      await stateManager.syncHeaderTotals(updated);
    } catch (err) {
      console.error("Error duplicating line items:", err);
    }
  }, [activeProject, budgetHeader, stateManager, budgetItems, setBudgetItems]);

  const handleCreateLineItem = useCallback(async (data: any, isAutoSave = false) => {
    if (data.budgetItemId) {
      return await handleEditLineItem(data, isAutoSave);
    }
    if (!activeProject?.projectId || !budgetHeader?.budgetId) return;
    if (!isAutoSave) {
      // Close the modal immediately so the UI feels responsive
      closeCreateModal();
    }
    stateManager.pushHistory();
    try {
      const normalized = {
        ...data,
        areaGroup: data.areaGroup ? data.areaGroup.trim().toUpperCase() : '',
        invoiceGroup: data.invoiceGroup
          ? data.invoiceGroup.trim().toUpperCase()
          : '',
        description: data.description ? data.description.trim().toUpperCase() : '',
      };
      const item = await createBudgetItem(
        activeProject.projectId,
        budgetHeader.budgetId,
        { ...normalized, budgetItemId: `LINE-${uuid()}`, revision: budgetHeader.revision }
      );
      if (!item) {
        return;
      }
      const updated = [...budgetItems, item];
      setBudgetItems(updated);
      await stateManager.syncHeaderTotals(updated);
      
      return { budgetItemId: item.budgetItemId };
    } catch (err) {
      console.error('Error creating line item:', err);
    }
    return null;
  }, [activeProject, budgetHeader, budgetItems, setBudgetItems, closeCreateModal, stateManager]);

  const handleEditLineItem = useCallback(async (data: any, isAutoSave = false) => {
    if (!activeProject?.projectId || !data.budgetItemId) return;
    if (!isAutoSave) {
      // Close the modal immediately so the user doesn't wait for the request
      closeCreateModal();
    }
    stateManager.pushHistory();
    try {
      const normalized = {
        ...data,
        areaGroup: data.areaGroup ? data.areaGroup.trim().toUpperCase() : '',
        invoiceGroup: data.invoiceGroup ? data.invoiceGroup.trim().toUpperCase() : '',
        description: data.description ? data.description.trim().toUpperCase() : '',
      };
      const updatedItem = await updateBudgetItem(
        activeProject.projectId,
        data.budgetItemId,
        { ...normalized, revision: budgetHeader.revision }
      );
      const updatedList = budgetItems.map((it) =>
        it.budgetItemId === updatedItem.budgetItemId ? updatedItem : it
      );
      setBudgetItems(updatedList);
      await stateManager.syncHeaderTotals(updatedList);
      return { budgetItemId: updatedItem.budgetItemId };
    } catch (err) {
      console.error('Error updating line item:', err);
    }
    return null;
  }, [activeProject, budgetHeader, budgetItems, setBudgetItems, closeCreateModal, stateManager]);

  // WebSocket event handling
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
          stateManager.setLockedLines((prev) => (prev.includes(data.lineId) ? prev : [...prev, data.lineId]));
        } else if (
          data.action === 'lineUnlocked' &&
          data.projectId === activeProject?.projectId &&
          data.revision === budgetHeader?.revision
        ) {
          if (data.senderId === userId) return;
          stateManager.setLockedLines((prev) => prev.filter((id) => id !== data.lineId));
        } else if (
          data.action === 'budgetUpdated' &&
          data.projectId === activeProject?.projectId
        ) {
          if (data.senderId === userId) return;
          // Trigger refresh through the provider
        }
      } catch {
        // ignore parse errors
      }
    };
    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, activeProject?.projectId, budgetHeader?.revision, userId, stateManager]);

  // Cleanup line locks on unmount
  useEffect(() => {
    return () => {
      if (stateManager.editingLineId) {
        emitLineUnlock(stateManager.editingLineId);
      }
    };
  }, [stateManager.editingLineId, emitLineUnlock]);

  const handlers: BudgetEventHandlers = useMemo(() => ({
    // Line item operations
    handleCreateLineItem,
    handleEditLineItem,
    confirmDelete,
    handleDuplicateSelected,
    
    // Modal operations
    openCreateModal,
    openEditModal,
    openEventModal,
    openDuplicateModal,
    openDeleteModal,
    closeCreateModal,
    closeEventModal,
    
    // Event operations
    handleSaveEvents,
    
    // WebSocket operations
    emitBudgetUpdate,
    emitLineLock,
    emitLineUnlock,
    emitTimelineUpdate,
    
    // Helper functions
    getNextElementKey,
    getNextElementId,
    queueEventsUpdate,
  }), [
    handleCreateLineItem, handleEditLineItem, confirmDelete, handleDuplicateSelected,
    openCreateModal, openEditModal, openEventModal, openDuplicateModal, openDeleteModal,
    closeCreateModal, closeEventModal,
    handleSaveEvents,
    emitBudgetUpdate, emitLineLock, emitLineUnlock, emitTimelineUpdate,
    getNextElementKey, getNextElementId, queueEventsUpdate
  ]);

  return <>{children(handlers)}</>;
};

export default BudgetEventManager;