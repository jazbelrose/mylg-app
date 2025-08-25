import React, { useCallback, useState } from "react";
import { useBudget } from "./BudgetDataProvider";
import { createBudgetItem, updateBudgetItem, deleteBudgetItem } from "../../../../utils/api";
import { v4 as uuid } from "uuid";
import { slugify } from "../../../../utils/slug";

interface BudgetItemsManagerProps {
  activeProject: any;
  areaGroups: string[];
  setAreaGroups: (groups: string[]) => void;
  invoiceGroups: string[];
  setInvoiceGroups: (groups: string[]) => void;
  clients: string[];
  setClients: (clients: string[]) => void;
  syncHeaderTotals: (items: any[]) => Promise<void>;
  emitBudgetUpdate: () => void;
  updateTimelineEvents: (projectId: string, events: any[]) => Promise<void>;
  queueEventsUpdate: (events: any[]) => Promise<void>;
  emitTimelineUpdate: (events: any[]) => void;
}

export const useBudgetItemsManager = ({
  activeProject,
  areaGroups,
  setAreaGroups,
  invoiceGroups,
  setInvoiceGroups,
  clients,
  setClients,
  syncHeaderTotals,
  emitBudgetUpdate,
  updateTimelineEvents,
  queueEventsUpdate,
  emitTimelineUpdate,
}: BudgetItemsManagerProps) => {
  const { budgetHeader, budgetItems, setBudgetItems } = useBudget();
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => {
      const snapshot = {
        items: JSON.parse(JSON.stringify(budgetItems)),
        header: budgetHeader ? JSON.parse(JSON.stringify(budgetHeader)) : null,
      };
      const stack = [...prev, snapshot];
      return stack.slice(-20);
    });
    setRedoStack([]);
  }, [budgetItems, budgetHeader]);

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

  const handleCreateLineItem = useCallback(async (data: any, isAutoSave = false) => {
    if (data.budgetItemId) {
      return await handleEditLineItem(data, isAutoSave);
    }
    if (!activeProject?.projectId || !budgetHeader?.budgetId) return;

    pushHistory();
    try {
      const normalized = {
        ...data,
        areaGroup: data.areaGroup ? data.areaGroup.trim().toUpperCase() : '',
        invoiceGroup: data.invoiceGroup
          ? data.invoiceGroup.trim().toUpperCase()
          : '',
        description: data.description ? data.description.trim().toUpperCase() : '',
      };
      const clientName = normalized.client ? normalized.client.trim() : '';
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
      if (normalized.areaGroup) {
        setAreaGroups(
          Array.from(new Set([...areaGroups, normalized.areaGroup]))
        );
      }
      if (normalized.invoiceGroup) {
        setInvoiceGroups(
          Array.from(new Set([...invoiceGroups, normalized.invoiceGroup]))
        );
      }
      if (clientName && !clients.includes(clientName)) {
        const newClients = [...clients, clientName];
        try {
          await updateBudgetItem(
            activeProject.projectId,
            budgetHeader.budgetItemId,
            { clients: newClients, revision: budgetHeader.revision }
          );
        } catch (err) {
          console.error('Error updating clients list', err);
        }
        setClients(newClients);
      }
      await syncHeaderTotals(updated);
      
      return { budgetItemId: item.budgetItemId };
    } catch (err) {
      console.error('Error creating line item:', err);
    }
    return null;
  }, [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, areaGroups, setAreaGroups, invoiceGroups, setInvoiceGroups, clients, setClients, syncHeaderTotals, pushHistory]);

  const handleEditLineItem = useCallback(async (data: any, isAutoSave = false) => {
    if (!activeProject?.projectId || !data.budgetItemId) return;

    pushHistory();
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
      if (normalized.areaGroup && !areaGroups.includes(normalized.areaGroup)) {
        setAreaGroups(Array.from(new Set([...areaGroups, normalized.areaGroup])));
      }
      if (normalized.invoiceGroup && !invoiceGroups.includes(normalized.invoiceGroup)) {
        setInvoiceGroups(Array.from(new Set([...invoiceGroups, normalized.invoiceGroup])));
      }
      const clientName = normalized.client ? normalized.client.trim() : '';
      if (clientName && !clients.includes(clientName)) {
        const newClients = [...clients, clientName];
        try {
          await updateBudgetItem(
            activeProject.projectId,
            budgetHeader.budgetItemId,
            { clients: newClients, revision: budgetHeader.revision }
          );
        } catch (err) {
          console.error('Error updating clients list', err);
        }
        setClients(newClients);
      }
      await syncHeaderTotals(updatedList);
      return { budgetItemId: updatedItem.budgetItemId };
    } catch (err) {
      console.error('Error updating line item:', err);
    }
    return null;
  }, [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, areaGroups, setAreaGroups, invoiceGroups, setInvoiceGroups, clients, setClients, syncHeaderTotals, pushHistory]);

  const handleDuplicateSelected = useCallback(async (selectedRowKeys: string[]) => {
    if (!activeProject?.projectId || !budgetHeader || selectedRowKeys.length === 0)
      return;
    pushHistory();
    try {
      const toClone = budgetItems.filter((it) =>
        selectedRowKeys.includes(it.budgetItemId)
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
      await syncHeaderTotals(updated);
    } catch (err) {
      console.error("Error duplicating line items:", err);
    }
  }, [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, syncHeaderTotals, pushHistory]);

  const handleDeleteItems = useCallback(async (deleteTargets: string[]) => {
    if (!activeProject?.projectId || deleteTargets.length === 0) {
      return;
    }
    pushHistory();
    try {
      await Promise.all(
        deleteTargets.map((id) => deleteBudgetItem(activeProject.projectId, id))
      );
      const updatedList = budgetItems.filter(
        (it) => !deleteTargets.includes(it.budgetItemId)
      );
      setBudgetItems(updatedList);

      if (Array.isArray(activeProject?.timelineEvents)) {
        const remainingEvents = activeProject.timelineEvents.filter(
          (ev) => !deleteTargets.includes(ev.budgetItemId)
        );
        if (remainingEvents.length !== activeProject.timelineEvents.length) {
          await queueEventsUpdate(remainingEvents);
          emitTimelineUpdate(remainingEvents);
        }
      }
      await syncHeaderTotals(updatedList);
    } catch (err) {
      console.error('Error deleting line items:', err);
    }
  }, [activeProject?.projectId, activeProject?.timelineEvents, budgetItems, setBudgetItems, syncHeaderTotals, queueEventsUpdate, emitTimelineUpdate, pushHistory]);

  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, s.length - 1));
    setRedoStack((s) => [
      ...s,
      {
        items: JSON.parse(JSON.stringify(budgetItems)),
        header: budgetHeader ? JSON.parse(JSON.stringify(budgetHeader)) : null,
      },
    ]);
    setBudgetItems(prev.items);
    await syncHeaderTotals(prev.items);
  }, [undoStack, budgetItems, budgetHeader, setBudgetItems, syncHeaderTotals]);

  const handleRedo = useCallback(async () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, s.length - 1));
    setUndoStack((s) => [
      ...s,
      {
        items: JSON.parse(JSON.stringify(budgetItems)),
        header: budgetHeader ? JSON.parse(JSON.stringify(budgetHeader)) : null,
      },
    ]);
    setBudgetItems(next.items);
    await syncHeaderTotals(next.items);
  }, [redoStack, budgetItems, budgetHeader, setBudgetItems, syncHeaderTotals]);

  return {
    undoStack,
    redoStack,
    getNextElementKey,
    getNextElementId,
    handleCreateLineItem,
    handleEditLineItem,
    handleDuplicateSelected,
    handleDeleteItems,
    handleUndo,
    handleRedo,
  };
};