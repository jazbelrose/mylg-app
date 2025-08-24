// ClientInvoicePreviewModal.tsx
import React from "react";
import InvoicePreviewModal from "./InvoicePreviewModal";

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
  <InvoicePreviewModal
    isOpen={isOpen}
    onRequestClose={onRequestClose}
    revision={revision}
    project={project}
    showSidebar={false}
    allowSave={false}
  />
);

export default ClientInvoicePreviewModal;
