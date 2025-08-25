import { useState, useCallback } from 'react';

export interface UseBudgetModalsReturn {
  // Modal states
  isBudgetModalOpen: boolean;
  isRevisionModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEventModalOpen: boolean;
  isConfirmingDelete: boolean;
  
  // Modal data
  editItem: any;
  prefillItem: any;
  eventItem: any;
  eventList: any[];
  deleteTargets: string[];
  nextElementKey: string;
  
  // Modal actions
  openCreateModal: () => void;
  openEditModal: (item: any) => void;
  openDuplicateModal: (item: any) => void;
  openEventModal: (item: any) => void;
  openDeleteModal: (ids: string[]) => void;
  openBudgetModal: () => void;
  openRevisionModal: () => void;
  
  closeCreateModal: () => void;
  closeEventModal: () => void;
  closeBudgetModal: () => void;
  closeRevisionModal: () => void;
  closeDeleteModal: () => void;
  
  setNextElementKey: (key: string) => void;
  setEventList: (events: any[]) => void;
}

export interface UseBudgetModalsProps {
  getNextElementKey: () => string;
  getNextElementId: (category: string) => string;
  onLineLock?: (lineId: string) => void;
  onLineUnlock?: (lineId: string) => void;
}

export const useBudgetModals = ({
  getNextElementKey,
  getNextElementId,
  onLineLock,
  onLineUnlock,
}: UseBudgetModalsProps): UseBudgetModalsReturn => {
  // Modal states
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isRevisionModalOpen, setRevisionModalOpen] = useState(false);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Modal data
  const [editItem, setEditItem] = useState<any>(null);
  const [prefillItem, setPrefillItem] = useState<any>(null);
  const [eventItem, setEventItem] = useState<any>(null);
  const [eventList, setEventList] = useState<any[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [nextElementKey, setNextElementKey] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);

  const openCreateModal = useCallback(() => {
    const nextKey = getNextElementKey();
    setNextElementKey(nextKey);
    setEditItem(null);
    setPrefillItem(null);
    setCreateModalOpen(true);
  }, [getNextElementKey]);

  const openEditModal = useCallback((item: any) => {
    setEditItem(item);
    setEditingLineId(item.budgetItemId);
    onLineLock?.(item.budgetItemId);
    setPrefillItem(null);
    setCreateModalOpen(true);
  }, [onLineLock]);

  const openDuplicateModal = useCallback((item: any) => {
    const nextKey = getNextElementKey();
    const nextId = getNextElementId(item.category);
    const clone = { ...item, elementKey: nextKey };
    if (nextId) clone.elementId = nextId;
    delete clone.budgetItemId;
    setNextElementKey(nextKey);
    setPrefillItem(clone);
    setEditItem(null);
    setCreateModalOpen(true);
  }, [getNextElementKey, getNextElementId]);

  const openEventModal = useCallback((item: any) => {
    setEventItem(item);
    setEventList([]); // Initialize with empty, caller should populate
    setEventModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((ids: string[]) => {
    setDeleteTargets(ids);
    setIsConfirmingDelete(true);
  }, []);

  const openBudgetModal = useCallback(() => {
    setBudgetModalOpen(true);
  }, []);

  const openRevisionModal = useCallback(() => {
    setRevisionModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    if (editingLineId) {
      onLineUnlock?.(editingLineId);
    }
    setEditingLineId(null);
    setEditItem(null);
    setPrefillItem(null);
  }, [editingLineId, onLineUnlock]);

  const closeEventModal = useCallback(() => {
    setEventModalOpen(false);
    setEventItem(null);
    setEventList([]);
  }, []);

  const closeBudgetModal = useCallback(() => {
    setBudgetModalOpen(false);
  }, []);

  const closeRevisionModal = useCallback(() => {
    setRevisionModalOpen(false);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsConfirmingDelete(false);
    setDeleteTargets([]);
  }, []);

  return {
    // Modal states
    isBudgetModalOpen,
    isRevisionModalOpen,
    isCreateModalOpen,
    isEventModalOpen,
    isConfirmingDelete,
    
    // Modal data
    editItem,
    prefillItem,
    eventItem,
    eventList,
    deleteTargets,
    nextElementKey,
    
    // Modal actions
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    openEventModal,
    openDeleteModal,
    openBudgetModal,
    openRevisionModal,
    
    closeCreateModal,
    closeEventModal,
    closeBudgetModal,
    closeRevisionModal,
    closeDeleteModal,
    
    setNextElementKey,
    setEventList,
  };
};