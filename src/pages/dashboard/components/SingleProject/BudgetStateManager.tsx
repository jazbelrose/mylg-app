import React, { useState, useCallback, useMemo } from "react";
import { useBudget } from "./BudgetDataProvider";
import { updateBudgetItem } from "../../../../utils/api";
import styles from "../../BudgetPage.module.css";

interface BudgetStateManagerProps {
  activeProject: any;
  children: (state: BudgetStateManagerState) => React.ReactNode;
}

interface BudgetStateManagerState {
  // Undo/Redo state
  undoStack: any[];
  redoStack: any[];
  pushHistory: () => void;
  handleUndo: () => Promise<void>;
  handleRedo: () => Promise<void>;
  
  // Modal states
  isBudgetModalOpen: boolean;
  isRevisionModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEventModalOpen: boolean;
  isConfirmingDelete: boolean;
  
  // Modal controls
  setBudgetModalOpen: (open: boolean) => void;
  setRevisionModalOpen: (open: boolean) => void;
  setCreateModalOpen: (open: boolean) => void;
  setEventModalOpen: (open: boolean) => void;
  setIsConfirmingDelete: (open: boolean) => void;
  
  // Table configuration
  groupBy: string;
  setGroupBy: (group: string) => void;
  sortField: string | null;
  sortOrder: string | null;
  setSortField: (field: string | null) => void;
  setSortOrder: (order: string | null) => void;
  expandedRowKeys: string[];
  setExpandedRowKeys: (keys: string[]) => void;
  selectedRowKeys: string[];
  setSelectedRowKeys: (keys: string[]) => void;
  
  // Edit/Create state
  editItem: any;
  prefillItem: any;
  setEditItem: (item: any) => void;
  setPrefillItem: (item: any) => void;
  nextElementKey: string;
  setNextElementKey: (key: string) => void;
  
  // Delete state
  deleteTargets: string[];
  setDeleteTargets: (targets: string[]) => void;
  
  // Event editing
  eventItem: any;
  eventList: any[];
  setEventItem: (item: any) => void;
  setEventList: (events: any[]) => void;
  
  // Pagination
  pageSize: number;
  currentPage: number;
  setPageSize: (size: number) => void;
  setCurrentPage: (page: number) => void;
  
  // Line locking
  lockedLines: string[];
  setLockedLines: (lines: string[]) => void;
  editingLineId: string | null;
  setEditingLineId: (id: string | null) => void;
  
  // Helper functions
  computeGroupsAndClients: (items: any[], header: any) => void;
  syncHeaderTotals: (items: any[]) => Promise<void>;
  calculateHeaderTotals: (items: any[]) => any;
}

const BudgetStateManager: React.FC<BudgetStateManagerProps> = ({
  activeProject,
  children,
}) => {
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems } = useBudget();
  
  // Undo/Redo state
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  
  // Modal states
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isRevisionModalOpen, setRevisionModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Table configuration
  const [groupBy, setGroupBy] = useState("none");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  
  // Edit/Create state
  const [editItem, setEditItem] = useState<any>(null);
  const [prefillItem, setPrefillItem] = useState<any>(null);
  const [nextElementKey, setNextElementKey] = useState('');
  
  // Delete state
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  
  // Event editing
  const [eventItem, setEventItem] = useState<any>(null);
  const [eventList, setEventList] = useState<any[]>([]);
  
  // Pagination
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Line locking
  const [lockedLines, setLockedLines] = useState<string[]>([]);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  
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
      } catch (err) {
        console.error('Error updating budget header:', err);
      }
    },
    [activeProject?.projectId, budgetHeader, calculateHeaderTotals, setBudgetHeader]
  );

  const computeGroupsAndClients = useCallback(
    (items: any[], header: any) => {
      // This function will be moved to a separate state management component
      // For now, it's a no-op since the parent components handle this
    },
    []
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

  const state: BudgetStateManagerState = useMemo(() => ({
    // Undo/Redo state
    undoStack,
    redoStack,
    pushHistory,
    handleUndo,
    handleRedo,
    
    // Modal states
    isBudgetModalOpen,
    isRevisionModalOpen,
    isCreateModalOpen,
    isEventModalOpen,
    isConfirmingDelete,
    
    // Modal controls
    setBudgetModalOpen,
    setRevisionModalOpen,
    setCreateModalOpen,
    setEventModalOpen,
    setIsConfirmingDelete,
    
    // Table configuration
    groupBy,
    setGroupBy,
    sortField,
    sortOrder,
    setSortField,
    setSortOrder,
    expandedRowKeys,
    setExpandedRowKeys,
    selectedRowKeys,
    setSelectedRowKeys,
    
    // Edit/Create state
    editItem,
    prefillItem,
    setEditItem,
    setPrefillItem,
    nextElementKey,
    setNextElementKey,
    
    // Delete state
    deleteTargets,
    setDeleteTargets,
    
    // Event editing
    eventItem,
    eventList,
    setEventItem,
    setEventList,
    
    // Pagination
    pageSize,
    currentPage,
    setPageSize,
    setCurrentPage,
    
    // Line locking
    lockedLines,
    setLockedLines,
    editingLineId,
    setEditingLineId,
    
    // Helper functions
    computeGroupsAndClients,
    syncHeaderTotals,
    calculateHeaderTotals,
  }), [
    undoStack, redoStack, pushHistory, handleUndo, handleRedo,
    isBudgetModalOpen, isRevisionModalOpen, isCreateModalOpen, isEventModalOpen, isConfirmingDelete,
    groupBy, sortField, sortOrder, expandedRowKeys, selectedRowKeys,
    editItem, prefillItem, nextElementKey,
    deleteTargets,
    eventItem, eventList,
    pageSize, currentPage,
    lockedLines, editingLineId,
    computeGroupsAndClients, syncHeaderTotals, calculateHeaderTotals
  ]);

  return <>{children(state)}</>;
};

export default BudgetStateManager;