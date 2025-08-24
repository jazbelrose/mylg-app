// ClientInvoicePreviewModal.tsx
import React from "react";
import InvoicePreviewModal from "./InvoicePreviewModal";
import { BudgetProvider } from "./BudgetDataProvider";

interface ClientInvoicePreviewModalProps {
  isOpen: boolean;
  onRequestClose: () => void;
  revision: any;
  project: any;
}

const ClientInvoicePreviewModal: React.FC<ClientInvoicePreviewModalProps> = ({
  isOpen,
  onRequestClose,
  revision,
  project,
}) => (
  <BudgetProvider projectId={project?.projectId}>
    <InvoicePreviewModal
      isOpen={isOpen}
      onRequestClose={onRequestClose}
      revision={revision}
      project={project}
      showSidebar={false}
      allowSave={false}
    />
  </BudgetProvider>
);

export default ClientInvoicePreviewModal;
