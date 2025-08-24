import React from "react";

interface Props {
  projectId?: string;
}

const BudgetItemsTable: React.FC<Props> = ({ projectId }) => {
  return <div>BudgetItemsTable {projectId}</div>;
};

export default BudgetItemsTable;
