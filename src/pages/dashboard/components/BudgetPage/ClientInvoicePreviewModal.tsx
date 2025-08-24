import React from "react";

interface Props {
  projectId?: string;
}

const ClientInvoicePreviewModal: React.FC<Props> = ({ projectId }) => {
  return <div>ClientInvoicePreviewModal {projectId}</div>;
};

export default ClientInvoicePreviewModal;
