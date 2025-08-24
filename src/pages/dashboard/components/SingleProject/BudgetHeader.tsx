import React from "react";

import BudgetHeaderCard from "./BudgetHeaderCard";
import BudgetPiePanel from "./BudgetPiePanel";

import summaryStyles from "./BudgetHeaderSummary.module.css";

/* =========================
   Types
   ========================= */

type GroupBy = "none" | "areaGroup" | "invoiceGroup" | "category";

interface BudgetItem {
  [key: string]: any;
}

interface BudgetHeaderData {
  [key: string]: any;
  revision?: number;
}

interface ActiveProject {
  projectId: string;
  [key: string]: any;
}

interface BudgetHeaderProps {
  activeProject: ActiveProject | null;
  budgetHeader: BudgetHeaderData | null;
  budgetItems: BudgetItem[];
  groupBy: GroupBy;
  setGroupBy: (value: GroupBy) => void;
  onOpenRevisionModal: () => void;
  onBallparkChange?: (val: number) => void;
}

/* =========================
   Main
   ========================= */

const BudgetHeader: React.FC<BudgetHeaderProps> = ({
  activeProject,
  budgetHeader,
  groupBy,
  setGroupBy,
  budgetItems = [],
  onBallparkChange,
  onOpenRevisionModal,
}) => {
  return (
    <div className={summaryStyles.container}>
      <BudgetHeaderCard
        activeProject={activeProject}
        onOpenRevisionModal={onOpenRevisionModal}
        onBallparkChange={onBallparkChange}
      />
      <BudgetPiePanel
        activeProject={activeProject}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
      />
    </div>
  );
};

export default BudgetHeader;