import React from "react";
import { useParams } from "react-router-dom";

import BudgetHeaderCard from "./BudgetHeaderCard";
import BudgetPiePanel from "./BudgetPiePanel";
import BudgetItemsTable from "./BudgetItemsTable";
import ClientInvoicePreviewModal from "./ClientInvoicePreviewModal";
import TasksLinkedToBudget from "./TasksLinkedToBudget";

const BudgetPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  return (
    <div>
      <BudgetHeaderCard projectId={projectId} />
      <BudgetPiePanel projectId={projectId} />
      <BudgetItemsTable projectId={projectId} />
      <ClientInvoicePreviewModal projectId={projectId} />
      <TasksLinkedToBudget projectId={projectId} />
    </div>
  );
};

export default BudgetPage;
