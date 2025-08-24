import React, { useState, useMemo, useCallback } from "react";
import { Segmented } from "antd";
import type { SegmentedValue } from "antd/es/segmented";

import VisxPieChart from "./VisxPieChart";
import useBudgetData from "./useBudgetData";

import { formatUSD } from "../../../../utils/budgetUtils";
import { generateSequentialPalette, getColor } from "../../../../utils/colorUtils";

import summaryStyles from "./BudgetHeaderSummary.module.css";

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

interface BudgetItem {
  [key: string]: any;
  areaGroup?: string;
  invoiceGroup?: string;
  category?: string;
  itemReconciledCost?: number | string;
  itemActualCost?: number | string;
  itemBudgetedCost?: number | string;
  itemFinalCost?: number | string;
  itemMarkUp?: number | string;
}

interface BudgetHeaderData {
  [key: string]: any;
  headerBallPark?: number | string;
  headerBudgetedTotalCost?: number | string;
  headerActualTotalCost?: number | string;
  headerFinalTotalCost?: number | string;
}

interface ActiveProject {
  projectId: string;
  color?: string;
  [key: string]: any;
}

interface BudgetPiePanelProps {
  activeProject: ActiveProject | null;
  groupBy: GroupBy;
  setGroupBy: (value: GroupBy) => void;
  selectedMetric?: MetricTitle;
  onMetricChange?: (metric: MetricTitle) => void;
  showReconciled?: boolean;
  markupBasis?: MarkupBasis;
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

const BudgetPiePanel: React.FC<BudgetPiePanelProps> = ({
  activeProject,
  groupBy,
  setGroupBy,
  selectedMetric = "Final Cost",
  onMetricChange,
  showReconciled = false,
  markupBasis = "Budgeted",
}) => {
  const { budgetHeader, budgetItems } = useBudgetData(activeProject?.projectId);

  const reconciledTotal = useMemo(
    () =>
      budgetItems.reduce(
        (sum, it) => sum + (parseFloat(String(it.itemReconciledCost ?? 0)) || 0),
        0
      ),
    [budgetItems]
  );

  // Metrics array for determining field mapping
  const metrics = useMemo(
    () => [
      {
        title: "Ballpark" as const,
        chartValue: toNumber(budgetHeader?.headerBallPark),
        field: null as const,
      },
      {
        title: "Budgeted Cost" as const,
        chartValue: toNumber(budgetHeader?.headerBudgetedTotalCost),
        field: "itemBudgetedCost",
      },
      {
        title: (showReconciled ? "Reconciled Cost" : "Actual Cost") as
          | "Reconciled Cost"
          | "Actual Cost",
        chartValue: showReconciled
          ? reconciledTotal
          : toNumber(budgetHeader?.headerActualTotalCost),
        field: showReconciled ? "itemReconciledCost" : "itemActualCost",
      },
      {
        title: "Effective Markup" as const,
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
        field: "markupAmount",
        isPercentage: true,
      },
      {
        title: "Final Cost" as const,
        chartValue: toNumber(budgetHeader?.headerFinalTotalCost),
        field: "itemFinalCost",
      },
    ],
    [budgetHeader, showReconciled, reconciledTotal, markupBasis]
  );

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

  const formatTooltip = useCallback(
    (d: { name: string; value: number }) => {
      const metric = metrics.find((m) => m.title === selectedMetric);
      const isPercent = (metric as any)?.isPercentage && selectedMetric !== "Effective Markup";
      const rounded = Math.round(d.value);
      const value = isPercent ? `${rounded}%` : formatUSD(rounded);
      return `${d.name}: ${value}`;
    },
    [metrics, selectedMetric]
  );

  return (
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
  );
};

export default BudgetPiePanel;