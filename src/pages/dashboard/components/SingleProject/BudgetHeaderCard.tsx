import React, { useState, useMemo, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCoins,
  faMoneyBillWave,
  faPercent,
  faFileInvoiceDollar,
  faCalculator,
  faPen,
} from "@fortawesome/free-solid-svg-icons";
import { Segmented, Switch } from "antd";
import type { SegmentedValue } from "antd/es/segmented";

import SummaryCard from "./SummaryCard";
import EditBallparkModal from "./EditBallparkModal";
import ClientInvoicePreviewModal from "./ClientInvoicePreviewModal";
import useBudgetData from "./useBudgetData";

import { updateBudgetItem } from "../../../../utils/api";
import { formatUSD } from "../../../../utils/budgetUtils";
import { CHART_COLORS } from "../../../../utils/colorUtils";

import summaryStyles from "./BudgetHeaderSummary.module.css";
import headerStyles from "./BudgetHeader.module.css";

/* =========================
   Types
   ========================= */

type MarkupBasis = "Budgeted" | "Actual" | "Reconciled";

interface BudgetItem {
  [key: string]: any;
  itemReconciledCost?: number | string;
  itemActualCost?: number | string;
  itemBudgetedCost?: number | string;
  itemFinalCost?: number | string;
}

interface BudgetHeaderData {
  [key: string]: any;
  budgetItemId: string;
  revision: number;
  headerBallPark?: number | string;
  headerBudgetedTotalCost?: number | string;
  headerActualTotalCost?: number | string;
  headerFinalTotalCost?: number | string;
}

interface ActiveProject {
  projectId: string;
  [key: string]: any;
}

interface BudgetHeaderCardProps {
  activeProject: ActiveProject | null;
  onOpenRevisionModal: () => void;
  onBallparkChange?: (val: number) => void;
}

/* =========================
   Helpers
   ========================= */

const toNumber = (val: any): number => {
  if (typeof val === "number") return val || 0;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/* =========================
   Main Component
   ========================= */

const BudgetHeaderCard: React.FC<BudgetHeaderCardProps> = ({
  activeProject,
  onOpenRevisionModal,
  onBallparkChange,
}) => {
  const { budgetHeader, budgetItems } = useBudgetData(activeProject?.projectId);

  const [showReconciled, setShowReconciled] = useState<boolean>(false);
  const [markupBasis, setMarkupBasis] = useState<MarkupBasis>("Budgeted");
  const [isBallparkModalOpen, setBallparkModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState<BudgetHeaderData | null>(null);

  const hasReconciled = useMemo(
    () =>
      budgetItems.some(
        (it) => it.itemReconciledCost != null && String(it.itemReconciledCost) !== ""
      ),
    [budgetItems]
  );

  const reconciledTotal = useMemo(
    () =>
      budgetItems.reduce(
        (sum, it) => sum + (parseFloat(String(it.itemReconciledCost ?? 0)) || 0),
        0
      ),
    [budgetItems]
  );

  useEffect(() => {
    if (!hasReconciled) setShowReconciled(false);
  }, [hasReconciled]);

  useEffect(() => {
    if (!hasReconciled && markupBasis === "Reconciled") {
      setMarkupBasis("Budgeted");
    }
  }, [hasReconciled, markupBasis]);

  useEffect(() => {
    if (!showReconciled && markupBasis === "Reconciled") {
      setMarkupBasis("Actual");
    }
  }, [showReconciled, markupBasis]);

  const openInvoicePreview = () => {
    if (!budgetHeader) return;
    setInvoiceRevision(budgetHeader);
    setIsInvoicePreviewOpen(true);
  };

  const closeInvoicePreview = () => {
    setIsInvoicePreviewOpen(false);
    // blur the trigger to avoid leftover focus outline
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  };

  const handleBallparkSave = async (val: number) => {
    if (!activeProject?.projectId || !budgetHeader) {
      setBallparkModalOpen(false);
      return;
    }
    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        headerBallPark: val,
        revision: budgetHeader.revision,
      });
      onBallparkChange?.(val);
    } catch (err) {
      // keep quiet but log
      // eslint-disable-next-line no-console
      console.error("Error updating ballpark", err);
    }
    setBallparkModalOpen(false);
  };

  const metrics = useMemo(
    () => [
      {
        title: "Ballpark" as const,
        tag: "Estimate",
        icon: faCalculator,
        color: CHART_COLORS[4],
        value: formatUSD(toNumber(budgetHeader?.headerBallPark)),
        chartValue: toNumber(budgetHeader?.headerBallPark),
        description: "Estimated total",
        field: null as const,
        extra: (
          <button
            className={headerStyles.editButton}
            onClick={() => setBallparkModalOpen(true)}
            aria-label="Edit Ballpark"
            type="button"
          >
            <FontAwesomeIcon icon={faPen} />
          </button>
        ),
      },
      {
        title: "Budgeted Cost" as const,
        tag: "Budgeted",
        icon: faCoins,
        color: CHART_COLORS[0],
        value: formatUSD(toNumber(budgetHeader?.headerBudgetedTotalCost)),
        chartValue: toNumber(budgetHeader?.headerBudgetedTotalCost),
        description: "Planned expenses",
        field: "itemBudgetedCost",
        sticky: true,
      },
      {
        title: (showReconciled ? "Reconciled Cost" : "Actual Cost") as
          | "Reconciled Cost"
          | "Actual Cost",
        tag: showReconciled ? "Reconciled" : "Actual",
        icon: faMoneyBillWave,
        color: CHART_COLORS[1],
        value: formatUSD(
          showReconciled ? reconciledTotal : toNumber(budgetHeader?.headerActualTotalCost)
        ),
        chartValue: showReconciled
          ? reconciledTotal
          : toNumber(budgetHeader?.headerActualTotalCost),
        description: showReconciled ? "Reconciled spending" : "Recorded spending",
        field: showReconciled ? "itemReconciledCost" : "itemActualCost",
        sticky: true,
        extra: hasReconciled ? (
          <Switch
            size="small"
            checked={showReconciled}
            onChange={(val) => setShowReconciled(val)}
            className={summaryStyles.toggleSwitch}
          />
        ) : null,
      },
      {
        title: "Effective Markup" as const,
        tag: "Markup",
        icon: faPercent,
        color: CHART_COLORS[2],
        value: (() => {
          const finalTotal = toNumber(budgetHeader?.headerFinalTotalCost);
          const budgetedTotal = toNumber(budgetHeader?.headerBudgetedTotalCost);
          const actualTotal = toNumber(budgetHeader?.headerActualTotalCost);
          const base =
            markupBasis === "Budgeted"
              ? budgetedTotal
              : markupBasis === "Reconciled"
              ? reconciledTotal
              : actualTotal;
          if (!base) return "N/A";
          const diff = finalTotal - base;
          const percent = Math.round((diff / base) * 100);
          return `${percent}% (${formatUSD(diff)})`;
        })(),
        chartValue: (() => {
          const finalTotal = toNumber(budgetHeader?.headerFinalTotalCost);
          const budgetedTotal = toNumber(budgetHeader?.headerBudgetedTotalCost);
          const actualTotal = toNumber(budgetHeader?.headerActualTotalCost);
          const base =
            markupBasis === "Budgeted"
              ? budgetedTotal
              : markupBasis === "Reconciled"
              ? reconciledTotal
              : actualTotal;
          return finalTotal - base;
        })(),
        description: "Markup amount",
        field: "markupAmount",
        isPercentage: true,
        extra: (
          <Segmented
            size="small"
            options={
              showReconciled
                ? (["Budgeted", "Actual", "Reconciled"] as MarkupBasis[])
                : (["Budgeted", "Actual"] as MarkupBasis[])
            }
            value={markupBasis}
            onChange={(val: SegmentedValue) => setMarkupBasis(val as MarkupBasis)}
            className={summaryStyles.toggleSwitch}
          />
        ),
      },
      {
        title: "Final Cost" as const,
        tag: "Final",
        icon: faFileInvoiceDollar,
        color: CHART_COLORS[3],
        value: formatUSD(toNumber(budgetHeader?.headerFinalTotalCost)),
        chartValue: toNumber(budgetHeader?.headerFinalTotalCost),
        description: "All-in total",
        field: "itemFinalCost",
        sticky: true,
        extra: (
          <div className={summaryStyles.invoicePreviewContainer}>
            <FontAwesomeIcon
              icon={faFileInvoiceDollar}
              className={summaryStyles.invoicePreviewIcon}
              title="Invoice preview"
              aria-label="Invoice preview"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                openInvoicePreview();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  openInvoicePreview();
                }
              }}
            />
            <span
              className={headerStyles.revisionLabel}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenRevisionModal();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenRevisionModal();
                }
              }}
            >
              {`Rev.${budgetHeader?.revision ?? 1}`}
            </span>
          </div>
        ),
      },
    ],
    [
      budgetHeader,
      showReconciled,
      reconciledTotal,
      hasReconciled,
      markupBasis,
      onOpenRevisionModal,
    ]
  );

  return (
    <>
      <div className={summaryStyles.cardsColumn}>
        <div className={summaryStyles.cardsRow}>
          {metrics.slice(0, 3).map((m) => (
            <SummaryCard
              key={m.title}
              icon={m.icon}
              color={m.color}
              title={m.title}
              tag={m.tag}
              value={m.value}
              description={m.description}
              className={m.sticky ? summaryStyles.stickyCard : ""}
              onClick={undefined}
              active={false}
            >
              {m.extra}
            </SummaryCard>
          ))}
        </div>

        <div className={summaryStyles.cardsRow}>
          {metrics.slice(3).map((m) => (
            <SummaryCard
              key={m.title}
              icon={m.icon}
              color={m.color}
              title={m.title}
              tag={m.tag}
              value={m.value}
              description={m.description}
              className={m.sticky ? summaryStyles.stickyCard : ""}
              onClick={undefined}
              active={false}
            >
              {m.extra}
            </SummaryCard>
          ))}
        </div>
      </div>

      <EditBallparkModal
        isOpen={isBallparkModalOpen}
        onRequestClose={() => setBallparkModalOpen(false)}
        onSubmit={handleBallparkSave}
        initialValue={toNumber(budgetHeader?.headerBallPark)}
      />

      <ClientInvoicePreviewModal
        isOpen={isInvoicePreviewOpen}
        onRequestClose={closeInvoicePreview}
        revision={invoiceRevision}
        project={activeProject}
      />
    </>
  );
};

export default BudgetHeaderCard;