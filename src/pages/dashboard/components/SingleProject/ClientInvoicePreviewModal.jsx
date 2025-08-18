import React from "react";
import InvoicePreviewModal from "./InvoicePreviewModal";

const ClientInvoicePreviewModal = ({ isOpen, onRequestClose, revision, project }) => (
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
