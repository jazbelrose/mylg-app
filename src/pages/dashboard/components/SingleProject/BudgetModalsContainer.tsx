import React, { useState, useCallback } from "react";
import { Checkbox } from "antd";
import ConfirmModal from "../../../components/ConfirmModal";
import BudgetFileModal from "./BudgetFileModal";
import CreateLineItemModal from "./CreateLineItemModal";
import EventEditModal from "./EventEditModal";
import RevisionModal from "./RevisionModal";
import styles from "../../BudgetPage.module.css";
import type { BudgetLine, BudgetHeader } from "../../../../utils/api";

interface BudgetModalsContainerProps {
  activeProject: any;
  budgetHeader: BudgetHeader | null;
  budgetItems: BudgetLine[];
  revisions: BudgetHeader[];
  areaGroups: string[];
  invoiceGroups: string[];
  clients: string[];
  nextElementKey: string;
  prefillItem: BudgetLine | null;
  editItem: BudgetLine | null;
  eventItem: BudgetLine | null;
  eventList: any[];
  eventDescOptions: string[];
  deleteTargets: string[];
  onCreateLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  onEditLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  onSaveEvents: (data: any) => Promise<void>;
  onConfirmDelete: () => Promise<void>;
  onSwitchRevision: (revision: number) => Promise<void>;
  onNewRevision: (duplicate?: boolean, fromRevision?: number) => Promise<void>;
  onDeleteRevision: (revision: number) => Promise<void>;
  onSetClientRevision: (revision: BudgetHeader) => Promise<void>;
  onParseFile: (data: any) => void;
  onBallparkChange: (value: number) => void;
  canEdit: boolean;
}

interface ModalStates {
  isBudgetModalOpen: boolean;
  isRevisionModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEventModalOpen: boolean;
  isConfirmingDelete: boolean;
}

const BudgetModalsContainer: React.FC<BudgetModalsContainerProps> = ({
  activeProject,
  budgetHeader,
  budgetItems,
  revisions,
  areaGroups,
  invoiceGroups,
  clients,
  nextElementKey,
  prefillItem,
  editItem,
  eventItem,
  eventList,
  eventDescOptions,
  deleteTargets,
  onCreateLineItem,
  onEditLineItem,
  onSaveEvents,
  onConfirmDelete,
  onSwitchRevision,
  onNewRevision,
  onDeleteRevision,
  onSetClientRevision,
  onParseFile,
  onBallparkChange,
  canEdit,
}) => {
  const [modalStates, setModalStates] = useState<ModalStates>({
    isBudgetModalOpen: false,
    isRevisionModalOpen: false,
    isCreateModalOpen: false,
    isEventModalOpen: false,
    isConfirmingDelete: false,
  });

  const updateModal = useCallback((modal: keyof ModalStates, isOpen: boolean) => {
    setModalStates(prev => ({ ...prev, [modal]: isOpen }));
  }, []);

  const openBudgetModal = useCallback(() => updateModal('isBudgetModalOpen', true), [updateModal]);
  const closeBudgetModal = useCallback(() => updateModal('isBudgetModalOpen', false), [updateModal]);
  
  const openRevisionModal = useCallback(() => updateModal('isRevisionModalOpen', true), [updateModal]);
  const closeRevisionModal = useCallback(() => updateModal('isRevisionModalOpen', false), [updateModal]);
  
  const openCreateModal = useCallback(() => updateModal('isCreateModalOpen', true), [updateModal]);
  const closeCreateModal = useCallback(() => updateModal('isCreateModalOpen', false), [updateModal]);
  
  const openEventModal = useCallback(() => updateModal('isEventModalOpen', true), [updateModal]);
  const closeEventModal = useCallback(() => updateModal('isEventModalOpen', false), [updateModal]);

  const handleCreateLineItem = useCallback(async (data: any, isAutoSave = false) => {
    const result = await onCreateLineItem(data, isAutoSave);
    if (!isAutoSave) {
      closeCreateModal();
    }
    return result;
  }, [onCreateLineItem, closeCreateModal]);

  const handleEditLineItem = useCallback(async (data: any, isAutoSave = false) => {
    const result = await onEditLineItem(data, isAutoSave);
    if (!isAutoSave) {
      closeCreateModal();
    }
    return result;
  }, [onEditLineItem, closeCreateModal]);

  const handleConfirmDelete = useCallback(async () => {
    await onConfirmDelete();
    updateModal('isConfirmingDelete', false);
  }, [onConfirmDelete, updateModal]);

  return (
    <>
      <BudgetFileModal
        isOpen={modalStates.isBudgetModalOpen}
        onRequestClose={closeBudgetModal}
        onFileSelected={onParseFile}
      />
      
      <RevisionModal
        isOpen={modalStates.isRevisionModalOpen}
        onRequestClose={closeRevisionModal}
        revisions={revisions}
        activeRevision={budgetHeader?.revision}
        onSwitch={onSwitchRevision}
        onDuplicate={(rev) => onNewRevision(true, rev)}
        onCreateNew={() => onNewRevision(false)}
        onDelete={(rev) => onDeleteRevision(rev.revision)}
        onSetClient={(rev) => onSetClientRevision(rev)}
        isAdmin={canEdit}
        activeProject={activeProject}
      />
      
      <CreateLineItemModal
        isOpen={modalStates.isCreateModalOpen}
        onRequestClose={closeCreateModal}
        onSubmit={(d, isAutoSave) =>
          editItem
            ? handleEditLineItem(d, isAutoSave)
            : handleCreateLineItem(d, isAutoSave)
        }
        defaultElementKey={nextElementKey}
        budgetItems={budgetItems}
        areaGroupOptions={areaGroups}
        invoiceGroupOptions={invoiceGroups}
        clientOptions={clients}
        defaultStartDate={budgetHeader?.startDate || ''}
        defaultEndDate={budgetHeader?.endDate || ''}
        initialData={prefillItem || editItem}
        title={editItem ? 'Edit Item' : 'Create Line Item'}
        revision={budgetHeader?.revision || 1}
      />
      
      <EventEditModal
        isOpen={modalStates.isEventModalOpen}
        onRequestClose={closeEventModal}
        events={eventList}
        defaultDate={budgetHeader?.startDate || ''}
        defaultDescription={eventItem?.description || ''}
        descOptions={eventDescOptions}
        onSubmit={onSaveEvents}
      />
      
      <ConfirmModal
        isOpen={modalStates.isConfirmingDelete}
        onRequestClose={() => updateModal('isConfirmingDelete', false)}
        onConfirm={handleConfirmDelete}
        message="Delete selected line item(s)?"
        className={{
          base: styles.modalContent,
          afterOpen: styles.modalContentAfterOpen,
          beforeClose: styles.modalContentBeforeClose,
        }}
        overlayClassName={{
          base: styles.modalOverlay,
          afterOpen: styles.modalOverlayAfterOpen,
          beforeClose: styles.modalOverlayBeforeClose,
        }}
      />
    </>
  );
};

export default BudgetModalsContainer;

// Export modal control methods for parent component
export const useBudgetModals = () => {
  const [modalStates, setModalStates] = useState<ModalStates>({
    isBudgetModalOpen: false,
    isRevisionModalOpen: false,
    isCreateModalOpen: false,
    isEventModalOpen: false,
    isConfirmingDelete: false,
  });

  const updateModal = useCallback((modal: keyof ModalStates, isOpen: boolean) => {
    setModalStates(prev => ({ ...prev, [modal]: isOpen }));
  }, []);

  return {
    modalStates,
    openBudgetModal: () => updateModal('isBudgetModalOpen', true),
    closeBudgetModal: () => updateModal('isBudgetModalOpen', false),
    openRevisionModal: () => updateModal('isRevisionModalOpen', true),
    closeRevisionModal: () => updateModal('isRevisionModalOpen', false),
    openCreateModal: () => updateModal('isCreateModalOpen', true),
    closeCreateModal: () => updateModal('isCreateModalOpen', false),
    openEventModal: () => updateModal('isEventModalOpen', true),
    closeEventModal: () => updateModal('isEventModalOpen', false),
    openConfirmModal: () => updateModal('isConfirmingDelete', true),
    closeConfirmModal: () => updateModal('isConfirmingDelete', false),
  };
};