import { useState, useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import {
  createBudgetItem,
  updateBudgetItem,
  fetchBudgetItems,
  deleteBudgetItem,
  fetchBudgetHeaders,
} from '../../../../utils/api';
import { slugify } from '../../../../utils/slug';

export interface BudgetHistorySnapshot {
  items: any[];
  header: any;
}

export interface UseBudgetBusinessLogicProps {
  activeProject: any;
  budgetHeader: any;
  budgetItems: any[];
  setBudgetHeader: (header: any) => void;
  setBudgetItems: (items: any[]) => void;
  onBudgetUpdate?: () => void;
}

export const useBudgetBusinessLogic = ({
  activeProject,
  budgetHeader,
  budgetItems,
  setBudgetHeader,
  setBudgetItems,
  onBudgetUpdate,
}: UseBudgetBusinessLogicProps) => {
  // History management
  const [undoStack, setUndoStack] = useState<BudgetHistorySnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BudgetHistorySnapshot[]>([]);

  // Selection and UI state
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState('none');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);

  // Derived state
  const [areaGroups, setAreaGroups] = useState<string[]>([]);
  const [invoiceGroups, setInvoiceGroups] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  const pushHistory = useCallback(() => {
    setUndoStack((prev) => {
      const snapshot = {
        items: JSON.parse(JSON.stringify(budgetItems)),
        header: budgetHeader ? JSON.parse(JSON.stringify(budgetHeader)) : null,
      };
      const stack = [...prev, snapshot];
      return stack.slice(-20); // Keep only last 20 snapshots
    });
    setRedoStack([]);
  }, [budgetItems, budgetHeader]);

  const calculateHeaderTotals = useCallback((items: any[]) => {
    let budgeted = 0;
    let final = 0;
    let actual = 0;
    
    items.forEach((it) => {
      const qty = parseFloat(it.quantity) || 0;
      const budget = parseFloat(it.itemBudgetedCost) || 0;
      const markup = parseFloat(it.itemMarkUp) || 0;
      const baseActual = it.itemActualCost ?? it.itemReconciledCost;
      const actualUnit = parseFloat(baseActual) || 0;

      budgeted += qty * budget;
      final += qty * budget * (1 + markup);
      actual += qty * actualUnit;
    });
    
    const effectiveMarkup = budgeted ? (final - budgeted) / budgeted : 0;
    return { budgeted, final, actual, effectiveMarkup };
  }, []);

  const syncHeaderTotals = useCallback(
    async (items: any[]) => {
      if (!activeProject?.projectId || !budgetHeader) return;
      
      const totals = calculateHeaderTotals(items);
      
      try {
        await updateBudgetItem(
          activeProject.projectId,
          budgetHeader.budgetItemId,
          {
            headerBudgetedTotalCost: totals.budgeted,
            headerFinalTotalCost: totals.final,
            headerActualTotalCost: totals.actual,
            headerEffectiveMarkup: totals.effectiveMarkup,
            revision: budgetHeader.revision,
          }
        );
        
        setBudgetHeader((prev: any) =>
          prev
            ? {
                ...prev,
                headerBudgetedTotalCost: totals.budgeted,
                headerFinalTotalCost: totals.final,
                headerActualTotalCost: totals.actual,
                headerEffectiveMarkup: totals.effectiveMarkup,
              }
            : prev
        );
        
        onBudgetUpdate?.();
      } catch (err) {
        console.error('Error updating budget header:', err);
      }
    },
    [activeProject?.projectId, budgetHeader, calculateHeaderTotals, setBudgetHeader, onBudgetUpdate]
  );

  const computeGroupsAndClients = useCallback(
    (items: any[], header: any) => {
      const aSet = new Set<string>();
      const iSet = new Set<string>();
      const cSet = new Set(Array.isArray(header?.clients) ? header.clients : []);
      
      items.forEach((it) => {
        if (it.areaGroup) aSet.add(String(it.areaGroup).trim().toUpperCase());
        if (it.invoiceGroup) iSet.add(String(it.invoiceGroup).trim().toUpperCase());
        if (it.client) cSet.add(it.client);
      });
      
      setAreaGroups(Array.from(aSet));
      setInvoiceGroups(Array.from(iSet));
      setClients(Array.from(cSet));
    },
    []
  );

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
    setBudgetHeader(prev.header);
    computeGroupsAndClients(prev.items, prev.header);
    setSelectedRowKeys([]);
    await syncHeaderTotals(prev.items);
  }, [undoStack, budgetItems, budgetHeader, setBudgetItems, setBudgetHeader, computeGroupsAndClients, syncHeaderTotals]);

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
    setBudgetHeader(next.header);
    computeGroupsAndClients(next.items, next.header);
    setSelectedRowKeys([]);
    await syncHeaderTotals(next.items);
  }, [redoStack, budgetItems, budgetHeader, setBudgetItems, setBudgetHeader, computeGroupsAndClients, syncHeaderTotals]);

  const createLineItem = useCallback(
    async (data: any) => {
      if (!activeProject?.projectId || !budgetHeader?.budgetId) return null;
      
      pushHistory();
      
      try {
        const normalized = {
          ...data,
          areaGroup: data.areaGroup ? data.areaGroup.trim().toUpperCase() : '',
          invoiceGroup: data.invoiceGroup ? data.invoiceGroup.trim().toUpperCase() : '',
          description: data.description ? data.description.trim().toUpperCase() : '',
        };
        
        const item = await createBudgetItem(
          activeProject.projectId,
          budgetHeader.budgetId,
          { 
            ...normalized, 
            budgetItemId: `LINE-${uuid()}`, 
            revision: budgetHeader.revision 
          }
        );
        
        if (!item) return null;
        
        const updated = [...budgetItems, item];
        setBudgetItems(updated);
        
        // Update groups and clients
        if (normalized.areaGroup) {
          setAreaGroups((prev) => Array.from(new Set([...prev, normalized.areaGroup])));
        }
        if (normalized.invoiceGroup) {
          setInvoiceGroups((prev) => Array.from(new Set([...prev, normalized.invoiceGroup])));
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
            setBudgetHeader((prev: any) => (prev ? { ...prev, clients: newClients } : prev));
          } catch (err) {
            console.error('Error updating clients list', err);
          }
          setClients(newClients);
        }
        
        await syncHeaderTotals(updated);
        return { budgetItemId: item.budgetItemId };
      } catch (err) {
        console.error('Error creating line item:', err);
        return null;
      }
    },
    [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, setBudgetHeader, clients, syncHeaderTotals, pushHistory]
  );

  const updateLineItem = useCallback(
    async (data: any) => {
      if (!activeProject?.projectId || !data.budgetItemId) return null;
      
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
        
        // Update groups and clients
        if (normalized.areaGroup && !areaGroups.includes(normalized.areaGroup)) {
          setAreaGroups((prev) => Array.from(new Set([...prev, normalized.areaGroup])));
        }
        if (normalized.invoiceGroup && !invoiceGroups.includes(normalized.invoiceGroup)) {
          setInvoiceGroups((prev) => Array.from(new Set([...prev, normalized.invoiceGroup])));
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
            setBudgetHeader((prev: any) => (prev ? { ...prev, clients: newClients } : prev));
          } catch (err) {
            console.error('Error updating clients list', err);
          }
          setClients(newClients);
        }
        
        await syncHeaderTotals(updatedList);
        return { budgetItemId: updatedItem.budgetItemId };
      } catch (err) {
        console.error('Error updating line item:', err);
        return null;
      }
    },
    [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, setBudgetHeader, areaGroups, invoiceGroups, clients, syncHeaderTotals, pushHistory]
  );

  const deleteLineItems = useCallback(
    async (budgetItemIds: string[]) => {
      if (!activeProject?.projectId || budgetItemIds.length === 0) return;
      
      pushHistory();
      
      try {
        await Promise.all(
          budgetItemIds.map((id) => deleteBudgetItem(activeProject.projectId, id))
        );
        
        const updatedList = budgetItems.filter(
          (it) => !budgetItemIds.includes(it.budgetItemId)
        );
        setBudgetItems(updatedList);
        setSelectedRowKeys((prev) => prev.filter((key) => !budgetItemIds.includes(key)));
        
        await syncHeaderTotals(updatedList);
      } catch (err) {
        console.error('Error deleting line items:', err);
      }
    },
    [activeProject?.projectId, budgetItems, setBudgetItems, syncHeaderTotals, pushHistory]
  );

  const duplicateLineItems = useCallback(
    async (budgetItemIds: string[]) => {
      if (!activeProject?.projectId || !budgetHeader || budgetItemIds.length === 0) return;
      
      pushHistory();
      
      try {
        const toClone = budgetItems.filter((it) => budgetItemIds.includes(it.budgetItemId));
        const tempItems = [...budgetItems];
        const clones = [];
        
        for (const item of toClone) {
          const slug = slugify(activeProject?.title || '');
          let maxKey = 0;
          tempItems.forEach((it) => {
            if (typeof it.elementKey === 'string') {
              const match = it.elementKey.match(/-(\d+)$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxKey) maxKey = num;
              }
            }
          });
          const nextKey = `${slug}-${String(maxKey + 1).padStart(4, '0')}`;

          let maxId = 0;
          if (item.category) {
            tempItems.forEach((it) => {
              if (it.category === item.category && typeof it.elementId === 'string') {
                const match = it.elementId.match(/-(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxId) maxId = num;
                }
              }
            });
          }
          const nextId = item.category
            ? `${item.category}-${String(maxId + 1).padStart(4, '0')}`
            : '';

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
        console.error('Error duplicating line items:', err);
      }
    },
    [activeProject?.projectId, budgetHeader, budgetItems, setBudgetItems, syncHeaderTotals, pushHistory]
  );

  // Initialize groups and clients when data changes
  useMemo(() => {
    computeGroupsAndClients(budgetItems, budgetHeader);
  }, [budgetItems, budgetHeader, computeGroupsAndClients]);

  return {
    // State
    selectedRowKeys,
    setSelectedRowKeys,
    groupBy,
    setGroupBy,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    undoStack,
    redoStack,
    areaGroups,
    invoiceGroups,
    clients,
    
    // Actions
    handleUndo,
    handleRedo,
    createLineItem,
    updateLineItem,
    deleteLineItems,
    duplicateLineItems,
    getNextElementKey,
    getNextElementId,
    syncHeaderTotals,
    calculateHeaderTotals,
  };
};