import React from "react";

interface Props {
  projectId?: string;
}

const BudgetHeaderCard: React.FC<Props> = ({ projectId }) => {
  return <div>BudgetHeaderCard {projectId}</div>;
};

export default BudgetHeaderCard;
