import React, { useState, useCallback, useRef } from "react";
import { v4 as uuid } from "uuid";
import {
  createBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  fetchBudgetItems,
} from "../../../../utils/api";
import { enqueueProjectUpdate } from "../../../../utils/requestQueue";
import { slugify } from "../../../../utils/slug";
import type { BudgetLine, BudgetHeader } from "../../../../utils/api";

interface BudgetOperationsProviderProps {
  children: React.ReactNode;
  activeProject: any;
  budgetHeader: BudgetHeader | null;
  budgetItems: BudgetLine[];
  setBudgetItems: (items: BudgetLine[]) => void;
  setBudgetHeader: (header: BudgetHeader | ((prev: BudgetHeader | null) => BudgetHeader)) => void;
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  setLockedLines: React.Dispatch<React.SetStateAction<string[]>>;
  setAreaGroups: React.Dispatch<React.SetStateAction<string[]>>;
  setInvoiceGroups: React.Dispatch<React.SetStateAction<string[]>>;
  setClients: React.Dispatch<React.SetStateAction<string[]>>;
  clients: string[];
  areaGroups: string[];
  invoiceGroups: string[];
  updateTimelineEvents: any;
}

interface HistoryItem {
  budgetHeader: BudgetHeader | null;
  budgetItems: BudgetLine[];
  selectedRowKeys: string[];
}

const BudgetOperationsContext = React.createContext<{
  handleCreateLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  handleEditLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  handleDuplicateSelected: (selectedRowKeys: string[]) => Promise<void>;
  confirmDelete: (deleteTargets: string[]) => Promise<void>;
  handleBallparkChange: (value: number) => void;
  syncHeaderTotals: (items: BudgetLine[]) => Promise<void>;
  handleUndo: () => void;
  handleRedo: () => void;
  undoStackLength: number;
  redoStackLength: number;
} | null>(null);

export const useBudgetOperations = () => {
  const context = React.useContext(BudgetOperationsContext);
  if (!context) {
    throw new Error("useBudgetOperations must be used within BudgetOperationsProvider");
  }
  return context;
};

const BudgetOperationsProvider: React.FC<BudgetOperationsProviderProps> = ({
  children,
  activeProject,
  budgetHeader,
  budgetItems,
  setBudgetItems,
  setBudgetHeader,
  setSelectedRowKeys,
  setLockedLines,
  setAreaGroups,
  setInvoiceGroups,
  setClients,
  clients,
  areaGroups,
  invoiceGroups,
  updateTimelineEvents,
}) => {
  const [undoStack, setUndoStack] = useState<HistoryItem[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryItem[]>([]);
  const nextHistoryRef = useRef<HistoryItem | null>(null);

  const pushHistory = useCallback(() => {
    const current: HistoryItem = {
      budgetHeader,
      budgetItems: [...budgetItems],
      selectedRowKeys: [],
    };
    setUndoStack(prev => [...prev, current]);
    setRedoStack([]);
  }, [budgetHeader, budgetItems]);

  const syncHeaderTotals = useCallback(async (items: BudgetLine[]) => {
    if (!activeProject?.projectId || !budgetHeader?.budgetItemId) return;

    const totals = items.reduce(
      (acc, item) => {
        if (typeof item.itemBudgetedTotalCost === "number") {
          acc.budgeted += item.itemBudgetedTotalCost;
        }
        if (typeof item.itemActualTotalCost === "number") {
          acc.actual += item.itemActualTotalCost;
        }
        if (typeof item.itemFinalCost === "number") {
          acc.final += item.itemFinalCost;
        }
        return acc;
      },
      { budgeted: 0, actual: 0, final: 0 }
    );

    const effectiveMarkup =
      totals.budgeted > 0 ? (totals.final - totals.budgeted) / totals.budgeted : 0;

    const updated = {
      headerBudgetedTotalCost: totals.budgeted,
      headerActualTotalCost: totals.actual,
      headerFinalTotalCost: totals.final,
      headerEffectiveMarkup: effectiveMarkup,
    };

    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        ...updated,
        revision: budgetHeader.revision,
      });

      setBudgetHeader(prev => prev ? { ...prev, ...updated } : prev);
    } catch (err) {
      console.error("Error syncing header totals:", err);
    }
  }, [activeProject?.projectId, budgetHeader, setBudgetHeader]);

  const queueEventsUpdate = useCallback(async (events: any[]) => {
    if (!activeProject?.projectId) return;
    
    const projectUpdate = {
      projectId: activeProject.projectId,
      timelineEvents: events,
    };
    
    await enqueueProjectUpdate(projectUpdate);
  }, [activeProject?.projectId]);

  const emitTimelineUpdate = useCallback((events: any[]) => {
    updateTimelineEvents(events);
    
    window.dispatchEvent(
      new CustomEvent("budgetUpdated", {
        detail: { projectId: activeProject?.projectId },
      })
    );
  }, [activeProject?.projectId, updateTimelineEvents]);

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
        invoiceGroup: data.invoiceGroup ? data.invoiceGroup.trim().toUpperCase() : '',
        description: data.description ? data.description.trim().toUpperCase() : '',
      };
      
      const clientName = normalized.client ? normalized.client.trim() : '';
      const item = await createBudgetItem(
        activeProject.projectId,
        budgetHeader.budgetId,
        { ...normalized, budgetItemId: `LINE-${uuid()}`, revision: budgetHeader.revision }
      );
      
      if (!item) return;
      
      const updated = [...budgetItems, item];
      setBudgetItems(updated);
      
      if (normalized.areaGroup && !areaGroups.includes(normalized.areaGroup)) {
        setAreaGroups(prev => Array.from(new Set([...prev, normalized.areaGroup])));
      }
      if (normalized.invoiceGroup && !invoiceGroups.includes(normalized.invoiceGroup)) {
        setInvoiceGroups(prev => Array.from(new Set([...prev, normalized.invoiceGroup])));
      }
      if (clientName && !clients.includes(clientName)) {
        const newClients = [...clients, clientName];
        try {
          await updateBudgetItem(
            activeProject.projectId,
            budgetHeader.budgetItemId,
            { clients: newClients, revision: budgetHeader.revision }
          );
          setBudgetHeader(prev => prev ? { ...prev, clients: newClients } : prev);
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
  }, [
    activeProject,
    budgetHeader,
    budgetItems,
    setBudgetItems,
    setBudgetHeader,
    pushHistory,
    syncHeaderTotals,
    areaGroups,
    invoiceGroups,
    clients,
    setAreaGroups,
    setInvoiceGroups,
    setClients,
  ]);

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
        { ...normalized, revision: budgetHeader?.revision }
      );
      
      const updatedList = budgetItems.map(it =>
        it.budgetItemId === updatedItem.budgetItemId ? updatedItem : it
      );
      setBudgetItems(updatedList);
      
      if (normalized.areaGroup && !areaGroups.includes(normalized.areaGroup)) {
        setAreaGroups(prev => Array.from(new Set([...prev, normalized.areaGroup])));
      }
      if (normalized.invoiceGroup && !invoiceGroups.includes(normalized.invoiceGroup)) {
        setInvoiceGroups(prev => Array.from(new Set([...prev, normalized.invoiceGroup])));
      }
      
      const clientName = normalized.client ? normalized.client.trim() : '';
      if (clientName && !clients.includes(clientName)) {
        const newClients = [...clients, clientName];
        try {
          await updateBudgetItem(
            activeProject.projectId,
            budgetHeader?.budgetItemId || '',
            { clients: newClients, revision: budgetHeader?.revision }
          );
          setBudgetHeader(prev => prev ? { ...prev, clients: newClients } : prev);
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
  }, [
    activeProject,
    budgetHeader,
    budgetItems,
    setBudgetItems,
    setBudgetHeader,
    pushHistory,
    syncHeaderTotals,
    areaGroups,
    invoiceGroups,
    clients,
    setAreaGroups,
    setInvoiceGroups,
    setClients,
  ]);

  const handleDuplicateSelected = useCallback(async (selectedRowKeys: string[]) => {
    if (!activeProject?.projectId || !budgetHeader || selectedRowKeys.length === 0) return;
    
    pushHistory();
    try {
      const toClone = budgetItems.filter(it => selectedRowKeys.includes(it.budgetItemId));
      const tempItems = [...budgetItems];
      const clones = [];
      
      for (const item of toClone) {
        const slug = slugify(activeProject?.title || "");
        let maxKey = 0;
        tempItems.forEach(it => {
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
          tempItems.forEach(it => {
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
      setSelectedRowKeys([]);
      await syncHeaderTotals(updated);
    } catch (err) {
      console.error("Error duplicating line items:", err);
    }
  }, [activeProject, budgetHeader, budgetItems, setBudgetItems, setSelectedRowKeys, pushHistory, syncHeaderTotals]);

  const confirmDelete = useCallback(async (deleteTargets: string[]) => {
    if (!activeProject?.projectId || deleteTargets.length === 0) return;
    
    pushHistory();
    try {
      await Promise.all(
        deleteTargets.map(id => deleteBudgetItem(activeProject.projectId, id))
      );
      
      const updatedList = budgetItems.filter(it => !deleteTargets.includes(it.budgetItemId));
      setBudgetItems(updatedList);
      setSelectedRowKeys(prev => prev.filter(key => !deleteTargets.includes(key)));
      
      if (Array.isArray(activeProject?.timelineEvents)) {
        const remainingEvents = activeProject.timelineEvents.filter(
          ev => !deleteTargets.includes(ev.budgetItemId)
        );
        if (remainingEvents.length !== activeProject.timelineEvents.length) {
          await queueEventsUpdate(remainingEvents);
          emitTimelineUpdate(remainingEvents);
        }
      }
      
      await syncHeaderTotals(updatedList);
      setLockedLines(prev => prev.filter(id => !deleteTargets.includes(id)));
    } catch (err) {
      console.error('Error deleting line items:', err);
    }
  }, [
    activeProject,
    budgetItems,
    setBudgetItems,
    setSelectedRowKeys,
    setLockedLines,
    pushHistory,
    syncHeaderTotals,
    queueEventsUpdate,
    emitTimelineUpdate,
  ]);

  const handleBallparkChange = useCallback((value: number) => {
    if (!activeProject?.projectId || !budgetHeader?.budgetItemId) return;
    
    updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
      headerBallPark: value,
      revision: budgetHeader.revision,
    })
      .then(() => {
        setBudgetHeader(prev => prev ? { ...prev, headerBallPark: value } : prev);
      })
      .catch(err => console.error('Error updating ballpark:', err));
  }, [activeProject?.projectId, budgetHeader, setBudgetHeader]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const current: HistoryItem = {
      budgetHeader,
      budgetItems: [...budgetItems],
      selectedRowKeys: [],
    };
    
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, current]);
    
    setBudgetHeader(previous.budgetHeader);
    setBudgetItems(previous.budgetItems);
    setSelectedRowKeys(previous.selectedRowKeys);
  }, [undoStack, budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, setSelectedRowKeys]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const current: HistoryItem = {
      budgetHeader,
      budgetItems: [...budgetItems],
      selectedRowKeys: [],
    };
    
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, current]);
    
    setBudgetHeader(next.budgetHeader);
    setBudgetItems(next.budgetItems);
    setSelectedRowKeys(next.selectedRowKeys);
  }, [redoStack, budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, setSelectedRowKeys]);

  const value = {
    handleCreateLineItem,
    handleEditLineItem,
    handleDuplicateSelected,
    confirmDelete,
    handleBallparkChange,
    syncHeaderTotals,
    handleUndo,
    handleRedo,
    undoStackLength: undoStack.length,
    redoStackLength: redoStack.length,
  };

  return (
    <BudgetOperationsContext.Provider value={value}>
      {children}
    </BudgetOperationsContext.Provider>
  );
};

export default BudgetOperationsProvider;