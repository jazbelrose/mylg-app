import React from "react";

interface Props {
  projectId?: string;
}

const BudgetPiePanel: React.FC<Props> = ({ projectId }) => {
  return <div>BudgetPiePanel {projectId}</div>;
};

export default BudgetPiePanel;
