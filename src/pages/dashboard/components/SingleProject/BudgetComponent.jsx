import React, { useState, useEffect, useMemo } from "react";
import { useSocket } from '../../../../app/contexts/SocketContext';
import { CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../../../app/contexts/DataProvider";
import { formatUSD } from "../../../../utils/budgetUtils";
import { slugify } from "../../../../utils/slug";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileInvoiceDollar, faSpinner } from "@fortawesome/free-solid-svg-icons";
import ClientInvoicePreviewModal from "./ClientInvoicePreviewModal";
import useBudgetData from "./useBudgetData";
import VisxPieChart from "./VisxPieChart";
import { generateSequentialPalette, getColor } from "../../../../utils/colorUtils";

const BudgetComponent = ({ activeProject }) => {
  // ...existing code...
  const { budgetHeader, budgetItems, refresh, loading } = useBudgetData(
    activeProject?.projectId
  );
  const { ws } = useSocket();
  const navigate = useNavigate();
  const { user, isAdmin, isBuilder, isDesigner } = useData(); // keep for potential future use
  // Listen for budget updates from BudgetPage via window event
  useEffect(() => {
    const handleBudgetUpdated = (e) => {
      if (e.detail?.projectId === activeProject?.projectId) {
        refresh();
      }
    };
    window.addEventListener('budgetUpdated', handleBudgetUpdated);
    return () => window.removeEventListener('budgetUpdated', handleBudgetUpdated);
  }, [activeProject?.projectId, refresh]);

  // Listen for websocket budgetUpdated messages
  useEffect(() => {
    if (!ws) return;
    const onMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.action === 'budgetUpdated' && data.projectId === activeProject?.projectId) {
          refresh();
        }
      } catch (err) {
        // Ignore parse errors
      }
    };
    ws.addEventListener('message', onMessage);
    return () => ws.removeEventListener('message', onMessage);
  }, [ws, activeProject?.projectId, refresh]);
  const [groupBy] = useState("invoiceGroup");
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const [invoiceRevision, setInvoiceRevision] = useState(null);


  const ballparkValue =
    budgetItems && budgetItems.length > 0
      ? budgetHeader?.headerFinalTotalCost ?? 0
      : budgetHeader?.headerBallPark ?? 0;

  // metrics array moved inside pieData useMemo below

  const pieData = useMemo(() => {
    if (groupBy === "none") {
      const metrics = [
        {
          title: "Ballpark",
          chartValue: ballparkValue,
        },
        {
          title: "Budgeted Cost",
          chartValue: budgetHeader?.headerBudgetedTotalCost || 0,
        },
        {
          title: "Actual Cost",
          chartValue: budgetHeader?.headerActualTotalCost || 0,
        },
        {
          title: "Effective Markup",
          chartValue: (budgetHeader?.headerEffectiveMarkup || 0) * 100,
        },
        {
          title: "Final Cost",
          chartValue: budgetHeader?.headerFinalTotalCost || 0,
        },
      ];
      return metrics.map((m) => ({ name: m.title, value: m.chartValue }));
    }

    const hasFinalCost = budgetItems.some(
      (item) => item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );
    if (!hasFinalCost) {
      return [
        {
          name: "Ballpark",
          value: ballparkValue,
        },
      ];
    }
    const totals = {};
    budgetItems.forEach((item) => {
      const rawKey = item[groupBy];
      const key = rawKey && String(rawKey).trim() !== "" ? rawKey : "Unspecified";
      const val = parseFloat(item.itemFinalCost) || 0;
      totals[key] = (totals[key] || 0) + val;
    });

    const entries = Object.entries(totals);
    if (entries.length === 1 && entries[0][0] === "Unspecified") {
      return [{ name: "Final Cost", value: entries[0][1] }];
    }

    return entries.map(([name, value]) => ({ name, value }));
  }, [groupBy, budgetItems, ballparkValue, budgetHeader?.headerBudgetedTotalCost, budgetHeader?.headerActualTotalCost, budgetHeader?.headerEffectiveMarkup, budgetHeader?.headerFinalTotalCost]);
  const totalPieValue = useMemo(() => {
    if (groupBy === "none") {
      return ballparkValue;
    }
    const hasFinalCost = budgetItems.some(
      (item) => item.itemFinalCost !== undefined && item.itemFinalCost !== null
    );
    if (!hasFinalCost) {
      return ballparkValue;
    }
    return pieData.reduce((sum, d) => sum + d.value, 0);
  }, [groupBy, pieData, budgetItems, ballparkValue]);

  const pieDataSorted = useMemo(
    () => [...pieData].sort((a, b) => b.value - a.value),
    [pieData]
  );

  const colors = useMemo(
    () =>
      // Reverse the palette so the largest slice uses the darkest color.
      generateSequentialPalette(
        activeProject?.color || getColor(activeProject?.projectId),
        pieDataSorted.length
      ).reverse(),
    [activeProject?.color, activeProject?.projectId, pieDataSorted.length]
  );

  const formatTooltip = (d) => {
    const isPercent = groupBy === "none" && d.name === "Effective Markup";
    const rounded = Math.round(d.value);
    return `${d.name}: ${isPercent ? rounded + "%" : formatUSD(rounded)}`;
  };

  const openInvoicePreview = async () => {
    if (!activeProject?.projectId) return;
    try {
      const data = await refresh();
      if (data?.header) {
        setInvoiceRevision(data.header);
        setIsInvoicePreviewOpen(true);
      }
    } catch (err) {
      console.error("Failed to load invoice", err);
    }
  };

  const closeInvoicePreview = (e) => {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    setIsInvoicePreviewOpen(false);
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && typeof active.blur === "function") {
        active.blur();
      }
    }, 0);
  };

  const openBudgetPage = () => {
    if (!activeProject || !isAdmin) return;
    const slug = slugify(activeProject.title);
    navigate(`/dashboard/projects/${slug}/budget`);
  };

  return (
    <div
      className="dashboard-item budget budget-component-container"
      onClick={isAdmin ? openBudgetPage : undefined}
      style={{ cursor: isAdmin ? 'pointer' : 'default', position: 'relative' }}
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
              {budgetHeader
                ? formatUSD(ballparkValue)
                : "Not available"}
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
                    ></span>
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
        project={activeProject}
      />
    </div>
  );
};

export default BudgetComponent;
