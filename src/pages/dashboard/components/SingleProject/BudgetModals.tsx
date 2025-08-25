import React from 'react';
import ConfirmModal from '../../../components/ConfirmModal';
import BudgetFileModal from './BudgetFileModal';
import CreateLineItemModal from './CreateLineItemModal';
import EventEditModal from './EventEditModal';
import RevisionModal from './RevisionModal';
import styles from '../../BudgetPage.module.css';

interface BudgetModalsProps {
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
  
  // Budget data
  budgetHeader: any;
  budgetItems: any[];
  areaGroups: string[];
  invoiceGroups: string[];
  clients: string[];
  revisions: any[];
  activeProject: any;
  eventDescOptions: string[];
  
  // Modal handlers
  closeBudgetModal: () => void;
  closeRevisionModal: () => void;
  closeCreateModal: () => void;
  closeEventModal: () => void;
  closeDeleteModal: () => void;
  
  // Action handlers
  onFileSelected: (file: File) => void;
  onCreateLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  onEditLineItem: (data: any, isAutoSave?: boolean) => Promise<any>;
  onSaveEvents: (events: any[]) => void;
  onConfirmDelete: () => void;
  onSwitchRevision: (rev: number) => void;
  onDuplicateRevision: (rev: number) => void;
  onCreateNewRevision: () => void;
  onDeleteRevision: (rev: any) => void;
  onSetClientRevision: (rev: number) => void;
  
  // Permissions
  canEdit: boolean;
}

const BudgetModals: React.FC<BudgetModalsProps> = ({
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
  
  // Budget data
  budgetHeader,
  budgetItems,
  areaGroups,
  invoiceGroups,
  clients,
  revisions,
  activeProject,
  eventDescOptions,
  
  // Modal handlers
  closeBudgetModal,
  closeRevisionModal,
  closeCreateModal,
  closeEventModal,
  closeDeleteModal,
  
  // Action handlers
  onFileSelected,
  onCreateLineItem,
  onEditLineItem,
  onSaveEvents,
  onConfirmDelete,
  onSwitchRevision,
  onDuplicateRevision,
  onCreateNewRevision,
  onDeleteRevision,
  onSetClientRevision,
  
  // Permissions
  canEdit,
}) => {
  return (
    <>
      <BudgetFileModal
        isOpen={isBudgetModalOpen}
        onRequestClose={closeBudgetModal}
        onFileSelected={onFileSelected}
      />
      
      <RevisionModal
        isOpen={isRevisionModalOpen}
        onRequestClose={closeRevisionModal}
        revisions={revisions}
        activeRevision={budgetHeader?.revision}
        onSwitch={onSwitchRevision}
        onDuplicate={(rev) => onDuplicateRevision(rev)}
        onCreateNew={onCreateNewRevision}
        onDelete={(rev) => onDeleteRevision(rev.revision)}
        onSetClient={(rev) => onSetClientRevision(rev)}
        isAdmin={canEdit}
        activeProject={activeProject}
      />
      
      <CreateLineItemModal
        isOpen={isCreateModalOpen}
        onRequestClose={closeCreateModal}
        onSubmit={(d, isAutoSave) =>
          editItem
            ? onEditLineItem(d, isAutoSave)
            : onCreateLineItem(d, isAutoSave)
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
        isOpen={isEventModalOpen}
        onRequestClose={closeEventModal}
        events={eventList}
        defaultDate={budgetHeader?.startDate || ''}
        defaultDescription={eventItem?.description || ''}
        descOptions={eventDescOptions}
        onSubmit={onSaveEvents}
      />
      
      <ConfirmModal
        isOpen={isConfirmingDelete}
        onRequestClose={closeDeleteModal}
        onConfirm={onConfirmDelete}
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

export default BudgetModals;