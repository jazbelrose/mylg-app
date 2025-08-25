import React, { useEffect, useState, useMemo, useCallback } from "react";
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

import EditBallparkModal from "../../components/SingleProject/EditBallparkModal";
import ClientInvoicePreviewModal from "../../components/SingleProject/ClientInvoicePreviewModal";
import VisxPieChart from "../../components/SingleProject/VisxPieChart";

import { updateBudgetItem } from "../../../../utils/api";
import { formatUSD } from "../../../../utils/budgetUtils";
import {
  CHART_COLORS,
  generateSequentialPalette,
  getColor,
} from "../../../../utils/colorUtils";

import summaryStyles from "./BudgetHeaderSummary.module.css";
import headerStyles from "./BudgetHeader.module.css";

/* =========================
   Types
   ========================= */

type MetricTitle =
  | "Ballpark"
  | "Budgeted Cost"
  | "Actual Cost"
  | "Reconciled Cost"
  | "Effective Markup"
  | "Final Cost";

type GroupBy = "none" | "areaGroup" | "invoiceGroup" | "category";

type MarkupBasis = "Budgeted" | "Actual" | "Reconciled";

export interface BudgetItem {
  [key: string]: any;
  areaGroup?: string;
  invoiceGroup?: string;
  category?: string;

  // numeric fields (string or number in data; we coerce with parseFloat)
  itemBudgetedCost?: string | number;
  itemActualCost?: string | number;
  itemReconciledCost?: string | number;
  itemFinalCost?: string | number;
  itemMarkUp?: string | number;
}

export interface BudgetHeaderData {
  budgetItemId: string;
  revision: number;
  headerBallPark?: number | string;
  headerBudgetedTotalCost?: number | string;
  headerActualTotalCost?: number | string;
  headerFinalTotalCost?: number | string;
}

export interface ProjectLike {
  projectId?: string;
  color?: string;
}

type SegmentedValue = GroupBy | MarkupBasis;

interface SummaryCardProps {
  icon: any;
  color: string;
  title: MetricTitle;
  tag: string;
  value: string;
  description: string;
  onClick?: () => void;
  active?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface BudgetHeaderProps {
  activeProject?: ProjectLike | null;
  budgetHeader?: BudgetHeaderData | null;
  groupBy: GroupBy;
  setGroupBy: (g: GroupBy) => void;
  budgetItems?: BudgetItem[];
  onBallparkChange?: (val: number) => void;
  onOpenRevisionModal: () => void;
}

/* =========================
   Helpers
   ========================= */

const toNumber = (v: number | string | undefined | null): number => {
  if (v === undefined || v === null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isNaN(n) ? 0 : n;
};

/* =========================
   Components
   ========================= */

const SummaryCard: React.FC<SummaryCardProps> = ({
  icon,
  color,
  title,
  tag,
  value,
  description,
  onClick,
  active,
  className = "",
  children,
}) => (
  <div
    className={`${summaryStyles.card} ${active ? summaryStyles.active : ""} ${className}`}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    aria-label={onClick ? title : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    <div className={summaryStyles.cardIcon} style={{ background: color }}>
      <FontAwesomeIcon icon={icon} />
    </div>
    <span className={summaryStyles.cardTag}>{tag}</span>
    {children}
    <div className={summaryStyles.cardTitle}>{title}</div>
    <div className={summaryStyles.cardValue}>{value}</div>
    <div className={summaryStyles.cardDesc}>{description}</div>
  </div>
);

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
  const [selectedMetric, setSelectedMetric] = useState<MetricTitle>("Final Cost");

  const hasReconciled = useMemo(
    () =>
      budgetItems.some(
        (it) => it.itemReconciledCost != null && String(it.itemReconciledCost) !== ""
      ),
    [budgetItems]
  );

  const [showReconciled, setShowReconciled] = useState<boolean>(false);
  const [markupBasis, setMarkupBasis] = useState<MarkupBasis>("Budgeted");
  const [isBallparkModalOpen, setBallparkModalOpen] = useState(false);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState<BudgetHeaderData | null>(null);

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

  const openInvoicePreview = useCallback(() => {
    if (!budgetHeader) return;
    setInvoiceRevision(budgetHeader);
    setIsInvoicePreviewOpen(true);
  }, [budgetHeader]);

  const closeInvoicePreview = useCallback(() => {
    setIsInvoicePreviewOpen(false);
    // blur the trigger to avoid leftover focus outline
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  }, []);

  const reconciledTotal = useMemo(
    () =>
      budgetItems.reduce(
        (sum, it) => sum + (parseFloat(String(it.itemReconciledCost ?? 0)) || 0),
        0
      ),
    [budgetItems]
  );

  useEffect(() => {
    if (selectedMetric === "Actual Cost" || selectedMetric === "Reconciled Cost") {
      setSelectedMetric(showReconciled ? "Reconciled Cost" : "Actual Cost");
    }
  }, [showReconciled, selectedMetric]);

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
      openInvoicePreview,
      onOpenRevisionModal,
    ]
  );

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

  const pieData = useMemo(() => {
    if (groupBy === "none") {
      return metrics.map((m) => ({ name: m.title, value: m.chartValue as number }));
    }
    const selected = metrics.find((m) => m.title === selectedMetric);
    const field = (selected?.field as keyof BudgetItem) || "itemFinalCost";

    const totals: Record<string, number> = {};
    budgetItems.forEach((item) => {
      const key = (item[groupBy] as string) || "Unspecified";
      let val: number;

      if (field === "markupAmount") {
        const finalCost = toNumber(item.itemFinalCost);
        const budgeted = toNumber(item.itemBudgetedCost);
        const actual = toNumber(item.itemActualCost);
        const reconciled = toNumber(item.itemReconciledCost);
        const base =
          markupBasis === "Budgeted"
            ? budgeted
            : markupBasis === "Reconciled"
            ? reconciled
            : actual;
        val = finalCost - base;
      } else {
        // coerce numeric (including percent)
        if (field === "itemMarkUp") {
          val = toNumber(item[field]) * 100;
        } else {
          val = toNumber(item[field]);
        }
      }

      totals[key] = (totals[key] || 0) + (Number.isNaN(val) ? 0 : val);
    });

    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [groupBy, metrics, budgetItems, selectedMetric, markupBasis]);

  const totalPieValue = useMemo(() => {
    if (groupBy === "none") {
      return toNumber(budgetHeader?.headerFinalTotalCost);
    }
    return pieData.reduce((sum, d) => sum + d.value, 0);
  }, [groupBy, budgetHeader, pieData]);

  const pieDataSorted = useMemo(
    () => [...pieData].sort((a, b) => b.value - a.value),
    [pieData]
  );

  const colors = useMemo(
    () =>
      // Reverse so the largest segment uses the darkest shade
      generateSequentialPalette(
        activeProject?.color || getColor(activeProject?.projectId),
        pieDataSorted.length
      ).reverse(),
    [activeProject?.color, activeProject?.projectId, pieDataSorted.length]
  );

  const effectiveMarkupPercent = useMemo(() => {
    const final = toNumber(budgetHeader?.headerFinalTotalCost);
    const budgeted = toNumber(budgetHeader?.headerBudgetedTotalCost);
    const actual = toNumber(budgetHeader?.headerActualTotalCost);
    const base =
      markupBasis === "Budgeted"
        ? budgeted
        : markupBasis === "Reconciled"
        ? reconciledTotal
        : actual;
    if (!base) return 0;
    return Math.round(((final - base) / base) * 100);
  }, [budgetHeader, markupBasis, reconciledTotal]);

  const formatTooltip = (d: { name: string; value: number }) => {
    const metric = metrics.find((m) => m.title === selectedMetric);
    const isPercent = (metric as any)?.isPercentage && selectedMetric !== "Effective Markup";
    const rounded = Math.round(d.value);
    const value = isPercent ? `${rounded}%` : formatUSD(rounded);
    return `${d.name}: ${value}`;
  };

  return (
    <div>
      <div className={summaryStyles.container}>
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
                onClick={m.field ? () => setSelectedMetric(m.title) : undefined}
                active={selectedMetric === m.title}
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
                onClick={m.field ? () => setSelectedMetric(m.title) : undefined}
                active={selectedMetric === m.title}
              >
                {m.extra}
              </SummaryCard>
            ))}
          </div>
        </div>

        <div className={summaryStyles.chartColumn}>
          <div className={summaryStyles.overviewHeader}>
            <Segmented
              size="small"
              options={
                [
                  { label: "None", value: "none" },
                  { label: "Area Group", value: "areaGroup" },
                  { label: "Invoice Group", value: "invoiceGroup" },
                  { label: "Category", value: "category" },
                ] as { label: string; value: GroupBy }[]
              }
              value={groupBy}
              onChange={(val: SegmentedValue) => setGroupBy(val as GroupBy)}
              style={{ background: "#1a1a1a" }}
            />
          </div>

          <div className={summaryStyles.chartAndLegend}>
            <div className={summaryStyles.chartContainer}>
              <VisxPieChart
                data={pieDataSorted}
                total={totalPieValue}
                colors={colors}
                formatTooltip={formatTooltip}
                colorMode="sequential"
              />
            </div>
            <ul className={summaryStyles.legend}>
              {pieDataSorted.map((m, i) => (
                <li className={summaryStyles.legendItem} key={m.name}>
                  <span
                    className={summaryStyles.legendDot}
                    style={{ background: colors[i % colors.length] }}
                  />
                  {m.name}
                </li>
              ))}
            </ul>
          </div>
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
    </div>
  );
};

export default BudgetHeader;
