import React, { useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faClone, faClock } from "@fortawesome/free-solid-svg-icons";
import { Tooltip as AntTooltip } from "antd";
import { useBudget } from "./BudgetDataProvider";
import { formatUSD } from "../../../../utils/budgetUtils";
import styles from "../BudgetPage.module.css";

interface BudgetTableLogicProps {
  groupBy: string;
  sortField: string | null;
  sortOrder: string | null;
  selectedRowKeys: string[];
  expandedRowKeys: string[];
  eventsByLineItem: Record<string, any[]>;
  setSelectedRowKeys: (keys: string[]) => void;
  openEditModal: (item: any) => void;
  openDeleteModal: (ids: string[]) => void;
  openDuplicateModal: (item: any) => void;
  openEventModal: (item: any) => void;
  children: (tableConfig: BudgetTableConfig) => React.ReactNode;
}

interface BudgetTableConfig {
  tableColumns: any[];
  tableData: any[];
  sortedTableData: any[];
  groupedTableData: any[];
  expandedRowRender: (record: any) => React.ReactNode;
  mainColumnsOrder: string[];
}

const BudgetTableLogic: React.FC<BudgetTableLogicProps> = ({
  groupBy,
  sortField,
  sortOrder,
  selectedRowKeys,
  expandedRowKeys,
  eventsByLineItem,
  setSelectedRowKeys,
  openEditModal,
  openDeleteModal,
  openDuplicateModal,
  openEventModal,
  children,
}) => {
  const { budgetItems } = useBudget();

  const beautifyLabel = useCallback((key: string) => {
    if (!key) return "";
    const abbreviations = { po: "PO", id: "ID", url: "URL" };
    return key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(/\s+/)
      .map((w) => {
        const lower = w.toLowerCase();
        return abbreviations[lower] || w.charAt(0).toUpperCase() + w.slice(1);
      })
      .join(" ");
  }, []);

  const isDefined = useCallback((val: any) => {
    if (val === undefined || val === null) return false;
    const str = String(val).trim();
    if (!str) return false;
    const num = parseFloat(str.replace(/[$,]/g, ""));
    if (!Number.isNaN(num)) {
      return num !== 0;
    }
    return str !== "0";
  }, []);

  const getActiveCostKey = useCallback(
    (item: any) => {
      if (isDefined(item.itemReconciledCost)) return "itemReconciledCost";
      if (isDefined(item.itemActualCost)) return "itemActualCost";
      return "itemBudgetedCost";
    },
    [isDefined]
  );

  const baseColumnsOrder = [
    "elementKey",
    "elementId",
    "description",
    "quantity",
    "unit",
    "itemBudgetedCost",
    "itemActualCost",
    "itemReconciledCost",
    "itemMarkUp",
    "itemFinalCost",
    "paymentStatus",
  ];

  const mainColumnsOrder = useMemo(
    () =>
      groupBy !== "none" ? [groupBy, ...baseColumnsOrder] : baseColumnsOrder,
    [groupBy]
  );

  const columnHeaderMap = {
    elementKey: "Element Key",
    elementId: "Element ID",
    category: "Category",
    areaGroup: "Area Group",
    invoiceGroup: "Invoice Group",
    description: "Description",
    quantity: "Quantity",
    unit: "Unit",
    dates: "Dates",
    itemBudgetedCost: "Budgeted Cost",
    itemActualCost: "Actual Cost",
    itemReconciledCost: "Reconciled Cost",
    itemMarkUp: "Markup",
    itemFinalCost: "Final Cost",
    paymentStatus: "Payment Status",
  };

  const renderPaymentStatus = useCallback((status: string) => {
    const cleaned = (status || "")
      .replace(/[·.]+$/, "")
      .trim();
    const normalizedStatus = cleaned.toUpperCase();
    const colorClass =
      normalizedStatus === "PAID"
        ? styles.paid
        : normalizedStatus === "PARTIAL"
        ? styles.partial
        : styles.unpaid;
    const display =
      normalizedStatus === "PAID" || normalizedStatus === "PARTIAL"
        ? cleaned
        : "UNPAID";
    return (
      <span className={styles.paymentStatus}>
        {display}
        <span className={`${styles.statusDot} ${colorClass}`} />
      </span>
    );
  }, []);

  const tableColumns = useMemo(() => {
    const hidden = [
      "projectId",
      "budgetItemId",
      "budgetId",
      "title",
      "startDate",
      "endDate",
      "itemCost",
    ];
    const safeBudgetItems = budgetItems.filter(Boolean);
    const available = safeBudgetItems.length
      ? Array.from(
          new Set([
            ...mainColumnsOrder,
            ...safeBudgetItems.flatMap((it) => Object.keys(it)),
          ])
        ).filter((key) => !hidden.includes(key))
      : mainColumnsOrder;
    const costKeys = [
      "itemBudgetedCost",
      "itemActualCost",
      "itemReconciledCost",
      "itemFinalCost",
    ];
    const allIds = safeBudgetItems.map((it) => it.budgetItemId);
    const cols = mainColumnsOrder
      .map((key) => {
        if (key === "dates") {
          return {
            title: columnHeaderMap[key],
            dataIndex: "dates",
            key: "dates",
          };
        }
        if (available.includes(key)) {
          const base = {
            title: columnHeaderMap[key] || key,
            dataIndex: key,
            key,
            sorter: () => 0,
            sortOrder: sortField === key ? sortOrder : null,
          };
          if (key === "elementKey") {
            base.title = (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={
                    allIds.length > 0 && selectedRowKeys.length === allIds.length
                  }
                  ref={(el) => {
                    if (el) {
                      el.indeterminate =
                        selectedRowKeys.length > 0 &&
                        selectedRowKeys.length < allIds.length;
                    }
                  }}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setSelectedRowKeys(checked ? allIds : []);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{columnHeaderMap[key]}</span>
              </span>
            );
            base.render = (value: any, record: any) => (
              <span className={styles.elementKeyCell}>
                <input
                  type="checkbox"
                  checked={selectedRowKeys.includes(record.budgetItemId)}
                  onChange={(e) => {
                    const { checked } = e.target;
                    setSelectedRowKeys((prev) => {
                      if (checked) {
                        return Array.from(new Set([...prev, record.budgetItemId]));
                      }
                      return prev.filter((k) => k !== record.budgetItemId);
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ marginLeft: "15px" }}>{value}</span>
              </span>
            );
          }
          if (key === "paymentStatus") {
            base.align = "right";
            base.render = renderPaymentStatus;
          } else if (key === "itemMarkUp") {
            base.render = (value: any) =>
              typeof value === "number" ? `${Math.round(value * 100)}%` : value;
          } else if (costKeys.includes(key)) {
            base.render = (value: any, record: any) => {
              if (!isDefined(value)) return "";
              if (key === "itemFinalCost") {
                return <span>{formatUSD(value)}</span>;
              }
              const activeKey = getActiveCostKey(record);
              const className = activeKey === key ? undefined : styles.dimmed;
              return <span className={className}>{formatUSD(value)}</span>;
            };
          }
          if (groupBy !== "none" && key === groupBy) {
            base.className = styles.groupColumn;
            const origRender = base.render;
            base.render = (value: any, record: any, index: number) => {
              const span = record[`${groupBy}RowSpan`];
              const children = origRender
                ? origRender(value, record, index)
                : value;
              return { children, props: { rowSpan: span } };
            };
          }
          return base;
        }
        return null;
      })
      .filter(Boolean);

    cols.push({
      title: "",
      key: "events",
      align: "center",
      render: (_v: any, record: any) => {
        const events = eventsByLineItem[record.budgetItemId] || [];
        const count = events.length;
        const tooltipContent = events.length
          ? (
              <div>
                {events.map((ev, i) => (
                  <div key={i}>
                    {new Date(ev.date).toLocaleDateString()} - {ev.hours} hrs
                    {ev.description ? ` - ${ev.description}` : ""}
                  </div>
                ))}
              </div>
            )
          : "No events";
        return (
          <AntTooltip title={tooltipContent} placement="top">
            <button
              className={styles.calendarButton}
              onClick={(e) => {
                e.stopPropagation();
                openEventModal(record);
              }}
              aria-label="Manage events"
            >
              <FontAwesomeIcon icon={faClock} />
              {count > 0 && <span className={styles.eventBadge}>{count}</span>}
            </button>
          </AntTooltip>
        );
      },
      width: 40,
    });
    cols.push({
      title: "",
      key: "actions",
      align: "center",
      render: (_value: any, record: any) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              openDuplicateModal(record);
            }}
            aria-label="Duplicate line item"
          >
            <FontAwesomeIcon icon={faClone} />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              openDeleteModal([record.budgetItemId]);
            }}
            aria-label="Delete line item"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      ),
      width: 60,
    });
    return cols;
  }, [
    budgetItems,
    groupBy,
    mainColumnsOrder,
    sortField,
    sortOrder,
    selectedRowKeys,
    eventsByLineItem,
    setSelectedRowKeys,
    renderPaymentStatus,
    isDefined,
    getActiveCostKey,
    openEventModal,
    openDuplicateModal,
    openDeleteModal,
  ]);

  const tableData = useMemo(
    () =>
      budgetItems.map((item) => ({
        ...item,
        key: item.budgetItemId,
      })),
    [budgetItems]
  );

  const sortedTableData = useMemo(() => {
    const compareValues = (a: any, b: any) => {
      if (a === b) return 0;
      if (a === undefined || a === null) return -1;
      if (b === undefined || b === null) return 1;
      if (typeof a === "number" && typeof b === "number") {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    };

    const data = tableData.slice();

    data.sort((a, b) => {
      if (groupBy !== "none") {
        const groupComp = compareValues(a[groupBy], b[groupBy]);
        if (groupComp !== 0) {
          // If sorting the group column itself allow descend/ascend
          if (sortField === groupBy && sortOrder === "descend") {
            return -groupComp;
          }
          return groupComp;
        }
      }

      if (sortField && sortField !== groupBy) {
        const fieldComp = compareValues(a[sortField], b[sortField]);
        return sortOrder === "descend" ? -fieldComp : fieldComp;
      }

      return 0;
    });

    return data;
  }, [tableData, groupBy, sortField, sortOrder]);

  const groupedTableData = useMemo(() => {
    if (groupBy === "none") {
      return sortedTableData.map((row) => ({ ...row }));
    }

    const result = [];
    let i = 0;

    while (i < sortedTableData.length) {
      const current = sortedTableData[i][groupBy];
      let j = i + 1;
      while (j < sortedTableData.length && sortedTableData[j][groupBy] === current) {
        j++;
      }

      const groupRows = sortedTableData.slice(i, j);
      const expandedCount = groupRows.filter((r) => expandedRowKeys.includes(r.key)).length;
      const span = groupRows.length + expandedCount;

      for (let k = i; k < j; k++) {
        const row = { ...sortedTableData[k] };
        row[`${groupBy}RowSpan`] = k === i ? span : 0;
        result.push(row);
      }

      i = j;
    }

    return result;
  }, [sortedTableData, groupBy, expandedRowKeys]);

  const detailOrder = [
    "paymentTerms",
    "paymentType",
    null,
    "vendor",
    "vendorInvoiceNumber",
    "poNumber",
    null,
    "client",
    "amountPaid",
    "balanceDue",
    null,
    "areaGroup",
    "invoiceGroup",
    "category",
  ];

  const expandedRowRender = useCallback(
    (record: any) => {
      const notes = record.notes;
      return (
        <table>
          <tbody>
            {(record.startDate || record.endDate) && (
              <tr key="dates">
                <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Dates</td>
                <td style={{ textAlign: "right" }}>
                  {`${record.startDate || ""}${
                    record.endDate ? ` - ${record.endDate}` : ""
                  }`}
                </td>
              </tr>
            )}
            {detailOrder.map((key, idx) =>
              key === null ? (
                <tr key={`hr-${idx}`}>
                  <td colSpan={2}>
                    <hr style={{ margin: "8px 0", borderColor: "#444" }} />
                  </td>
                </tr>
              ) : (
                <tr key={key}>
                  <td style={{ fontWeight: "bold", paddingRight: "8px" }}>
                    {beautifyLabel(key)}
                  </td>
                  <td style={{ textAlign: "right" }}>{String(record[key] ?? "")}</td>
                </tr>
              )
            )}
            <tr key="notes-divider">
              <td colSpan={2}>
                <hr style={{ margin: "8px 0", borderColor: "#444" }} />
              </td>
            </tr>
            <tr key="notes">
              <td style={{ fontWeight: "bold", paddingRight: "8px" }}>Notes</td>
              <td
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 3,
                  color: notes ? "inherit" : "#888",
                  textAlign: "right",
                }}
              >
                {notes || "No notes available"}
              </td>
            </tr>
          </tbody>
        </table>
      );
    },
    [beautifyLabel]
  );

  const tableConfig: BudgetTableConfig = useMemo(() => ({
    tableColumns,
    tableData,
    sortedTableData,
    groupedTableData,
    expandedRowRender,
    mainColumnsOrder,
  }), [tableColumns, tableData, sortedTableData, groupedTableData, expandedRowRender, mainColumnsOrder]);

  return <>{children(tableConfig)}</>;
};

export default BudgetTableLogic;