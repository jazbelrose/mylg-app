import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import InvoicePreviewModal from "./InvoicePreviewModal";
const ClientInvoicePreviewModal = ({ isOpen, onRequestClose, revision, project }) => (_jsx(InvoicePreviewModal, { isOpen: isOpen, onRequestClose: onRequestClose, revision: revision, project: project, showSidebar: false, allowSave: false }));
export default ClientInvoicePreviewModal;
