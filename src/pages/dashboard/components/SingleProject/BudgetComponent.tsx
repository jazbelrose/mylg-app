import React, { useState, useMemo, useCallback } from "react";

import { CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { formatUSD } from "../../../../utils/budgetUtils";
import { slugify } from "../../../../utils/slug";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoiceDollar, faSpinner } from "@fortawesome/free-solid-svg-icons";
import ClientInvoicePreviewModal from "./ClientInvoicePreviewModal";
import { useBudget } from "./BudgetDataProvider";
import VisxPieChart from "./VisxPieChart";
import { generateSequentialPalette, getColor } from "../../../../utils/colorUtils";


type Project = {
  projectId?: string;
  title?: string;
  color?: string;
};

type BudgetHeader = {
  headerFinalTotalCost?: number | null;
  headerBallPark?: number | null;
  headerBudgetedTotalCost?: number | null;
  headerActualTotalCost?: number | null;
  headerEffectiveMarkup?: number | null; // e.g. 0.25 for 25%
  createdAt?: string | number | Date | null;
  // Include other fields if your app uses them
};

type BudgetItem = {
  itemFinalCost?: number | string | null;
  invoiceGroup?: string | null; // default grouping key
  // Add other fields if needed
  [key: string]: unknown;
};

type PieDatum = { name: string; value: number };

interface BudgetComponentProps {
  projectId?: string;
}

const BudgetComponent: React.FC<BudgetComponentProps> = ({ projectId }) => {
  const { activeProject, isAdmin } = useData();
  console.log("[BudgetComponent] render");
  const { budgetHeader, budgetItems, refresh, loading } = useBudget();
  const navigate = useNavigate();

  const [groupBy] = useState<"invoiceGroup" | "none">("invoiceGroup");
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState<BudgetHeader | null>(null);

  const ballparkValue: number =
    budgetItems && budgetItems.length > 0
      ? Number(budgetHeader?.headerFinalTotalCost ?? 0)
      : Number(budgetHeader?.headerBallPark ?? 0);

  const pieData: PieDatum[] = useMemo(() => {
    if (groupBy === "none") {
      const metrics = [
        { title: "Ballpark", chartValue: ballparkValue },
        { title: "Budgeted Cost", chartValue: Number(budgetHeader?.headerBudgetedTotalCost ?? 0) },
        { title: "Actual Cost", chartValue: Number(budgetHeader?.headerActualTotalCost ?? 0) },
        {
          title: "Effective Markup",
          chartValue: Number((budgetHeader?.headerEffectiveMarkup ?? 0) * 100),
        },
        { title: "Final Cost", chartValue: Number(budgetHeader?.headerFinalTotalCost ?? 0) },
      ];
      return metrics.map((m) => ({ name: m.title, value: m.chartValue }));
    }

    const hasFinalCost = budgetItems.some(
      (item) => item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );
    if (!hasFinalCost) {
      return [{ name: "Ballpark", value: ballparkValue }];
    }

    const totals: Record<string, number> = {};
    for (const item of budgetItems) {
      const rawKey = (item as Record<string, unknown>)[groupBy];
      const key =
        rawKey && String(rawKey).trim() !== "" ? String(rawKey) : "Unspecified";
      const val = Number(item.itemFinalCost ?? 0) || 0;
      totals[key] = (totals[key] ?? 0) + val;
    }

    const entries = Object.entries(totals);
    if (entries.length === 1 && entries[0][0] === "Unspecified") {
      return [{ name: "Final Cost", value: entries[0][1] }];
    }
    return entries.map(([name, value]) => ({ name, value }));
  }, [
    groupBy,
    budgetItems,
    ballparkValue,
    budgetHeader?.headerBudgetedTotalCost,
    budgetHeader?.headerActualTotalCost,
    budgetHeader?.headerEffectiveMarkup,
    budgetHeader?.headerFinalTotalCost,
  ]);

  const totalPieValue = useMemo(() => {
    if (groupBy === "none") return ballparkValue;

    const hasFinalCost = budgetItems.some(
      (item) => item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );
    if (!hasFinalCost) return ballparkValue;

    return pieData.reduce((sum, d) => sum + d.value, 0);
  }, [groupBy, pieData, budgetItems, ballparkValue]);

  const pieDataSorted = useMemo(
    () => [...pieData].sort((a, b) => b.value - a.value),
    [pieData]
  );

  const colors = useMemo(() => {
    const base = activeProject?.color || getColor(projectId);
    if (typeof base !== "string") {
      console.error("Invalid color base", base);
      return [];
    }
    return generateSequentialPalette(base, pieDataSorted.length).reverse();
  }, [pieDataSorted.length, projectId, activeProject?.color]);

  const formatTooltip = useCallback(
    (d: PieDatum) => {
      const isPercent = groupBy === "none" && d.name === "Effective Markup";
      const rounded = Math.round(d.value);
      return `${d.name}: ${isPercent ? `${rounded}%` : formatUSD(rounded)}`;
    },
    [groupBy]
  );

  const openInvoicePreview = async (): Promise<void> => {
    if (!projectId) return;
    try {
      const data = await refresh();
      if (data && "header" in data && data.header) {
        setInvoiceRevision(data.header);
        setIsInvoicePreviewOpen(true);
      }
    } catch (err) {
      console.error("Failed to load invoice", err);
    }
  };

  const closeInvoicePreview = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e && "stopPropagation" in e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    setIsInvoicePreviewOpen(false);
    // Restore focus state after modal close
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  };
  const openBudgetPage = () => {
    if (!activeProject || !isAdmin) return;
    const slug = slugify(activeProject.title ?? "");
    navigate(`/dashboard/projects/${slug}/budget`);
  };



  return (
    <div
      className="dashboard-item budget budget-component-container"
      onClick={isAdmin ? openBudgetPage : undefined}
      style={{ cursor: isAdmin ? "pointer" : "default", position: "relative" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <CircleDollarSign size={26} style={{ marginRight: "12px" }} />
          Budget
        </span>

        {loading ? (
          <FontAwesomeIcon
            icon={faSpinner}
            spin
            style={{ marginTop: "8px" }}
            aria-label="Loading budget"
          />
        ) : (
          <>
            <span
              style={{
                marginTop: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {budgetHeader ? formatUSD(ballparkValue) : "Not available"}
              {budgetHeader && (
                <FontAwesomeIcon
                  icon={faFileInvoiceDollar}
                  style={{ fontSize: "1.75rem", cursor: "pointer", marginLeft: "8px" }}
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
              )}
            </span>

            <span style={{ marginTop: "8px" }}>
              {budgetHeader?.createdAt
                ? new Date(budgetHeader.createdAt).toLocaleDateString()
                : "No date"}
            </span>
          </>
        )}
      </div>

      {loading ? (
        <div
          style={{
            marginTop: "16px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <FontAwesomeIcon icon={faSpinner} spin aria-label="Loading chart" />
        </div>
      ) : (
        budgetHeader && (
          <>
            <div className="chart-legend-container">
              <div className="budget-chart">
                <VisxPieChart
                  data={pieDataSorted}
                  total={totalPieValue}
                  colors={colors}
                  formatTooltip={formatTooltip}
                  colorMode="sequential"
                />
              </div>

              <ul className="budget-legend">
                {pieDataSorted.map((m, i) => (
                  <li key={m.name} className="budget-legend-item">
                    <span
                      className="budget-legend-dot"
                      style={{ background: colors[i % colors.length] }}
                    />
                    {m.name}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )
      )}

      <ClientInvoicePreviewModal
        isOpen={isInvoicePreviewOpen}
        onRequestClose={closeInvoicePreview}
        revision={invoiceRevision}
        project={projectId}
      />
    </div>
  );
};

export default React.memo(BudgetComponent, (prev, next) =>
  prev.projectId === next.projectId
);
