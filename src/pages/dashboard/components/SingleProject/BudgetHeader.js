import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCoins, faMoneyBillWave, faPercent, faFileInvoiceDollar, faCalculator, } from "@fortawesome/free-solid-svg-icons";
import EditBallparkModal from "./EditBallparkModal";
import { updateBudgetItem } from "../../../../utils/api";
import { faPen } from "@fortawesome/free-solid-svg-icons";
import { Segmented, Switch } from "antd";
import summaryStyles from "./BudgetHeaderSummary.module.css";
import headerStyles from "./BudgetHeader.module.css";
import { formatUSD } from "../../../../utils/budgetUtils";
import ClientInvoicePreviewModal from "./ClientInvoicePreviewModal";
import VisxPieChart from "./VisxPieChart";
import { CHART_COLORS, generateSequentialPalette, getColor, } from "../../../../utils/colorUtils";
const SummaryCard = ({ icon, color, title, tag, value, description, onClick, active, className = '', children }) => (_jsxs("div", { className: `${summaryStyles.card} ${active ? summaryStyles.active : ""} ${className}`, onClick: onClick, role: onClick ? "button" : undefined, tabIndex: onClick ? 0 : undefined, "aria-label": onClick ? title : undefined, onKeyDown: onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
            }
        }
        : undefined, children: [_jsx("div", { className: summaryStyles.cardIcon, style: { background: color }, children: _jsx(FontAwesomeIcon, { icon: icon }) }), _jsx("span", { className: summaryStyles.cardTag, children: tag }), children, _jsx("div", { className: summaryStyles.cardTitle, children: title }), _jsx("div", { className: summaryStyles.cardValue, children: value }), _jsx("div", { className: summaryStyles.cardDesc, children: description })] }));
const BudgetHeader = ({ activeProject, budgetHeader, groupBy, setGroupBy, budgetItems = [], onBallparkChange, onOpenRevisionModal, }) => {
    const [selectedMetric, setSelectedMetric] = useState("Final Cost");
    const hasReconciled = useMemo(() => budgetItems.some((it) => it.itemReconciledCost != null && it.itemReconciledCost !== ""), [budgetItems]);
    const [showReconciled, setShowReconciled] = useState(false);
    const [markupBasis, setMarkupBasis] = useState("Budgeted");
    const [isBallparkModalOpen, setBallparkModalOpen] = useState(false);
    const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
    const [invoiceRevision, setInvoiceRevision] = useState(null);
    useEffect(() => {
        if (!hasReconciled)
            setShowReconciled(false);
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
        if (!budgetHeader)
            return;
        setInvoiceRevision(budgetHeader);
        setIsInvoicePreviewOpen(true);
    }, [budgetHeader]);
    const closeInvoicePreview = useCallback(() => {
        setIsInvoicePreviewOpen(false);
        // remove focus from any element (like the trigger button) to avoid leftover borders
        setTimeout(() => {
            const active = document.activeElement;
            if (active && active !== document.body && typeof active.blur === 'function') {
                active.blur();
            }
        }, 0);
    }, []);
    const reconciledTotal = useMemo(() => budgetItems.reduce((sum, it) => sum + (parseFloat(it.itemReconciledCost) || 0), 0), [budgetItems]);
    useEffect(() => {
        if (selectedMetric === "Actual Cost" || selectedMetric === "Reconciled Cost") {
            setSelectedMetric(showReconciled ? "Reconciled Cost" : "Actual Cost");
        }
    }, [showReconciled, selectedMetric]);
    const metrics = useMemo(() => [
        {
            title: "Ballpark",
            tag: "Estimate",
            icon: faCalculator,
            color: CHART_COLORS[4],
            value: formatUSD(budgetHeader?.headerBallPark || 0),
            chartValue: budgetHeader?.headerBallPark || 0,
            description: "Estimated total",
            field: null,
            extra: (_jsx("button", { className: headerStyles.editButton, onClick: () => setBallparkModalOpen(true), "aria-label": "Edit Ballpark", children: _jsx(FontAwesomeIcon, { icon: faPen }) })),
        },
        {
            title: "Budgeted Cost",
            tag: "Budgeted",
            icon: faCoins,
            color: CHART_COLORS[0],
            value: formatUSD(budgetHeader?.headerBudgetedTotalCost || 0),
            chartValue: budgetHeader?.headerBudgetedTotalCost || 0,
            description: "Planned expenses",
            field: "itemBudgetedCost",
            sticky: true,
        },
        {
            title: showReconciled ? "Reconciled Cost" : "Actual Cost",
            tag: showReconciled ? "Reconciled" : "Actual",
            icon: faMoneyBillWave,
            color: CHART_COLORS[1],
            value: formatUSD(showReconciled
                ? reconciledTotal
                : budgetHeader?.headerActualTotalCost || 0),
            chartValue: showReconciled
                ? reconciledTotal
                : budgetHeader?.headerActualTotalCost || 0,
            description: showReconciled ? "Reconciled spending" : "Recorded spending",
            field: showReconciled ? "itemReconciledCost" : "itemActualCost",
            sticky: true,
            extra: hasReconciled ? (_jsx(Switch, { size: "small", checked: showReconciled, onChange: setShowReconciled, className: summaryStyles.toggleSwitch })) : null,
        },
        {
            title: "Effective Markup",
            tag: "Markup",
            icon: faPercent,
            color: CHART_COLORS[2],
            value: (() => {
                const finalTotal = parseFloat(budgetHeader?.headerFinalTotalCost) || 0;
                const budgetedTotal = parseFloat(budgetHeader?.headerBudgetedTotalCost) || 0;
                const actualTotal = parseFloat(budgetHeader?.headerActualTotalCost) || 0;
                const base = markupBasis === "Budgeted"
                    ? budgetedTotal
                    : markupBasis === "Reconciled"
                        ? reconciledTotal
                        : actualTotal;
                if (!base)
                    return "N/A";
                const diff = finalTotal - base;
                const percent = Math.round((diff / base) * 100);
                return `${percent}% (${formatUSD(diff)})`;
            })(),
            chartValue: (() => {
                const finalTotal = parseFloat(budgetHeader?.headerFinalTotalCost) || 0;
                const budgetedTotal = parseFloat(budgetHeader?.headerBudgetedTotalCost) || 0;
                const actualTotal = parseFloat(budgetHeader?.headerActualTotalCost) || 0;
                const base = markupBasis === "Budgeted"
                    ? budgetedTotal
                    : markupBasis === "Reconciled"
                        ? reconciledTotal
                        : actualTotal;
                return finalTotal - base;
            })(),
            description: "Markup amount",
            field: "markupAmount",
            isPercentage: true,
            extra: (_jsx(Segmented, { size: "small", options: showReconciled
                    ? ["Budgeted", "Actual", "Reconciled"]
                    : ["Budgeted", "Actual"], value: markupBasis, onChange: setMarkupBasis, className: summaryStyles.toggleSwitch })),
        },
        {
            title: "Final Cost",
            tag: "Final",
            icon: faFileInvoiceDollar,
            color: CHART_COLORS[3],
            value: formatUSD(budgetHeader?.headerFinalTotalCost || 0),
            chartValue: budgetHeader?.headerFinalTotalCost || 0,
            description: "All-in total",
            field: "itemFinalCost",
            sticky: true,
            extra: (_jsxs("div", { className: summaryStyles.invoicePreviewContainer, children: [_jsx(FontAwesomeIcon, { icon: faFileInvoiceDollar, className: summaryStyles.invoicePreviewIcon, title: "Invoice preview", "aria-label": "Invoice preview", role: "button", tabIndex: 0, onClick: (e) => {
                            e.stopPropagation();
                            openInvoicePreview();
                        }, onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                openInvoicePreview();
                            }
                        } }), _jsx("span", { className: headerStyles.revisionLabel, role: "button", tabIndex: 0, onClick: (e) => {
                            e.stopPropagation();
                            onOpenRevisionModal();
                        }, onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.stopPropagation();
                                onOpenRevisionModal();
                            }
                        }, children: `Rev.${budgetHeader?.revision ?? 1}` })] })),
        },
    ], [
        budgetHeader,
        showReconciled,
        reconciledTotal,
        hasReconciled,
        markupBasis,
        openInvoicePreview,
        onOpenRevisionModal,
    ]);
    const handleBallparkSave = async (val) => {
        if (!activeProject?.projectId || !budgetHeader) {
            setBallparkModalOpen(false);
            return;
        }
        try {
            await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
                headerBallPark: val,
                revision: budgetHeader.revision,
            });
            if (onBallparkChange)
                onBallparkChange(val);
        }
        catch (err) {
            console.error("Error updating ballpark", err);
        }
        setBallparkModalOpen(false);
    };
    const pieData = useMemo(() => {
        if (groupBy === "none") {
            return metrics.map((m) => ({ name: m.title, value: m.chartValue }));
        }
        const selected = metrics.find((m) => m.title === selectedMetric);
        const field = selected?.field || "itemFinalCost";
        const totals = {};
        budgetItems.forEach((item) => {
            const key = item[groupBy] || "Unspecified";
            let val;
            if (field === "markupAmount") {
                const finalCost = parseFloat(item.itemFinalCost) || 0;
                const budgeted = parseFloat(item.itemBudgetedCost) || 0;
                const actual = parseFloat(item.itemActualCost) || 0;
                const reconciled = parseFloat(item.itemReconciledCost) || 0;
                const base = markupBasis === "Budgeted"
                    ? budgeted
                    : markupBasis === "Reconciled"
                        ? reconciled
                        : actual;
                val = finalCost - base;
            }
            else {
                val = parseFloat(item[field]);
                if (field === "itemMarkUp") {
                    val = parseFloat(item[field]) * 100;
                }
            }
            if (Number.isNaN(val))
                val = 0;
            totals[key] = (totals[key] || 0) + val;
        });
        return Object.entries(totals).map(([name, value]) => ({ name, value }));
    }, [groupBy, metrics, budgetItems, selectedMetric]);
    const totalPieValue = useMemo(() => {
        if (groupBy === "none") {
            return budgetHeader?.headerFinalTotalCost || 0;
        }
        return pieData.reduce((sum, d) => sum + d.value, 0);
    }, [groupBy, budgetHeader, pieData]);
    const pieDataSorted = useMemo(() => [...pieData].sort((a, b) => b.value - a.value), [pieData]);
    const colors = useMemo(() => 
    // Reverse so the largest segment is represented by the darkest color.
    generateSequentialPalette(activeProject?.color || getColor(activeProject?.projectId), pieDataSorted.length).reverse(), [activeProject?.color, activeProject?.projectId, pieDataSorted.length]);
    const effectiveMarkupPercent = useMemo(() => {
        const final = parseFloat(budgetHeader?.headerFinalTotalCost) || 0;
        const budgeted = parseFloat(budgetHeader?.headerBudgetedTotalCost) || 0;
        const actual = parseFloat(budgetHeader?.headerActualTotalCost) || 0;
        const base = markupBasis === "Budgeted"
            ? budgeted
            : markupBasis === "Reconciled"
                ? reconciledTotal
                : actual;
        if (!base)
            return 0;
        return Math.round(((final - base) / base) * 100);
    }, [budgetHeader, markupBasis, showReconciled, reconciledTotal]);
    const formatTooltip = (d) => {
        const metric = metrics.find((m) => m.title === selectedMetric);
        const isPercent = metric?.isPercentage && selectedMetric !== "Effective Markup";
        const rounded = Math.round(d.value);
        const value = isPercent ? `${rounded}%` : formatUSD(rounded);
        return `${d.name}: ${value}`;
    };
    // Render
    return (_jsxs("div", { children: [_jsxs("div", { className: summaryStyles.container, children: [_jsxs("div", { className: summaryStyles.cardsColumn, children: [_jsx("div", { className: summaryStyles.cardsRow, children: metrics.slice(0, 3).map((m) => (_jsx(SummaryCard, { ...m, className: m.sticky ? summaryStyles.stickyCard : "", onClick: m.field ? () => setSelectedMetric(m.title) : undefined, active: selectedMetric === m.title, children: m.extra }, m.title))) }), _jsx("div", { className: summaryStyles.cardsRow, children: metrics.slice(3).map((m) => (_jsx(SummaryCard, { ...m, className: m.sticky ? summaryStyles.stickyCard : "", onClick: m.field ? () => setSelectedMetric(m.title) : undefined, active: selectedMetric === m.title, children: m.extra }, m.title))) })] }), _jsxs("div", { className: summaryStyles.chartColumn, children: [_jsx("div", { className: summaryStyles.overviewHeader, children: _jsx(Segmented, { size: "small", options: [
                                        { label: "None", value: "none" },
                                        { label: "Area Group", value: "areaGroup" },
                                        { label: "Invoice Group", value: "invoiceGroup" },
                                        { label: "Category", value: "category" },
                                    ], value: groupBy, onChange: (val) => setGroupBy(val), style: { background: "#1a1a1a" } }) }), _jsxs("div", { className: summaryStyles.chartAndLegend, children: [_jsx("div", { className: summaryStyles.chartContainer, children: _jsx(VisxPieChart, { data: pieDataSorted, total: totalPieValue, colors: colors, formatTooltip: formatTooltip, colorMode: "sequential" }) }), _jsx("ul", { className: summaryStyles.legend, children: pieDataSorted.map((m, i) => (_jsxs("li", { className: summaryStyles.legendItem, children: [_jsx("span", { className: summaryStyles.legendDot, style: { background: colors[i % colors.length] } }), m.name] }, m.name))) })] })] })] }), _jsx(EditBallparkModal, { isOpen: isBallparkModalOpen, onRequestClose: () => setBallparkModalOpen(false), onSubmit: handleBallparkSave, initialValue: budgetHeader?.headerBallPark || 0 }), _jsx(ClientInvoicePreviewModal, { isOpen: isInvoicePreviewOpen, onRequestClose: closeInvoicePreview, revision: invoiceRevision, project: activeProject })] }));
};
export default BudgetHeader;
