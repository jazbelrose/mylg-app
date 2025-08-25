import React, { useState, useCallback } from "react";

export const useBudgetModalsManager = () => {
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isRevisionModalOpen, setRevisionModalOpen] = useState(false);
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [prefillItem, setPrefillItem] = useState<any>(null);
  const [deleteTargets, setDeleteTargets] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [nextElementKey, setNextElementKey] = useState('');

  const openCreateModal = useCallback((getNextElementKey: () => string) => {
    const nextKey = getNextElementKey();
    setNextElementKey(nextKey);
    setEditItem(null);
    setPrefillItem(null);
    setCreateModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: any, lockedLines: string[], emitLineLock: (lineId: string) => void, setEditingLineId: (id: string) => void) => {
    if (lockedLines.includes(item.budgetItemId)) return;
    setEditItem(item);
    setEditingLineId(item.budgetItemId);
    emitLineLock(item.budgetItemId);
    setPrefillItem(null);
    setCreateModalOpen(true);
  }, []);

  const openDuplicateModal = useCallback((item: any, getNextElementKey: () => string, getNextElementId: (category: string) => string) => {
    const nextKey = getNextElementKey();
    const nextId = getNextElementId(item.category);
    const clone = { ...item, elementKey: nextKey };
    if (nextId) clone.elementId = nextId;
    delete clone.budgetItemId;
    setNextElementKey(nextKey);
    setPrefillItem(clone);
    setEditItem(null);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback((editingLineId: string | null, emitLineUnlock: (lineId: string) => void, setEditingLineId: (id: string | null) => void) => {
    setCreateModalOpen(false);
    if (editingLineId) {
      emitLineUnlock(editingLineId);
    }
    setEditingLineId(null);
    setEditItem(null);
    setPrefillItem(null);
  }, []);

  const openRevisionModal = useCallback(() => setRevisionModalOpen(true), []);
  const closeRevisionModal = useCallback(() => setRevisionModalOpen(false), []);

  const closeBudgetModal = useCallback(() => setBudgetModalOpen(false), []);

  const openDeleteModal = useCallback((ids: string[]) => {
    setDeleteTargets(ids);
    setIsConfirmingDelete(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsConfirmingDelete(false);
    setDeleteTargets([]);
  }, []);

  const confirmDelete = useCallback(async (handleDeleteItems: (targets: string[]) => Promise<void>) => {
    await handleDeleteItems(deleteTargets);
    setSelectedRowKeys((prev) =>
      prev.filter((key) => !deleteTargets.includes(key))
    );
    closeDeleteModal();
  }, [deleteTargets, closeDeleteModal]);

  return {
    // Create/Edit Modal
    isCreateModalOpen,
    editItem,
    prefillItem,
    nextElementKey,
    openCreateModal,
    openEditModal,
    openDuplicateModal,
    closeCreateModal,

    // Revision Modal
    isRevisionModalOpen,
    openRevisionModal,
    closeRevisionModal,

    // Budget File Modal
    isBudgetModalOpen,
    setBudgetModalOpen,
    closeBudgetModal,

    // Delete Confirmation
    isConfirmingDelete,
    deleteTargets,
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,

    // Table Selection
    selectedRowKeys,
    setSelectedRowKeys,
  };
};