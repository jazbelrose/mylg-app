import React, { useMemo, useCallback, useState } from "react";
import { Checkbox, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faClone,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import BudgetItemsTable from "./BudgetItemsTable";
import styles from "../../BudgetPage.module.css";
import { formatUSD } from "../../../../utils/budgetUtils";
import type { BudgetLine } from "../../../../utils/api";

interface BudgetTableContainerProps {
  budgetItems: BudgetLine[];
  groupBy: string;
  selectedRowKeys: string[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  lockedLines: string[];
  expandedRowKeys: string[];
  setExpandedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  tableRef: React.RefObject<any>;
  tableHeight: number;
  pageSize: number;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  eventsByLineItem: Record<string, any[]>;
  mainColumnsOrder: string[];
  sortField: string | null;
  sortOrder: string | null;
  onEditItem: (item: BudgetLine) => void;
  onDeleteItems: (ids: string[]) => void;
  onDuplicateItem: (item: BudgetLine) => void;
  onEventModal: (item: BudgetLine) => void;
  onTableSort: (field: string | null, order: string | null) => void;
}

const costKeys = [
  "itemBudgetedTotalCost",
  "itemActualTotalCost",
  "itemFinalCost",
];

const BudgetTableContainer: React.FC<BudgetTableContainerProps> = ({
  budgetItems,
  groupBy,
  selectedRowKeys,
  setSelectedRowKeys,
  lockedLines,
  expandedRowKeys,
  setExpandedRowKeys,
  tableRef,
  tableHeight,
  pageSize,
  currentPage,
  setCurrentPage,
  setPageSize,
  eventsByLineItem,
  mainColumnsOrder,
  sortField,
  sortOrder,
  onEditItem,
  onDeleteItems,
  onDuplicateItem,
  onEventModal,
  onTableSort,
}) => {
  const isDefined = (val: any) => val !== undefined && val !== null && val !== "";

  const getActiveCostKey = useCallback((record: BudgetLine) => {
    for (const key of costKeys) {
      if (isDefined(record[key as keyof BudgetLine])) {
        return key;
      }
    }
    return null;
  }, []);

  const renderPaymentStatus = useCallback((value: any, record: BudgetLine) => {
    const isLocked = lockedLines.includes(record.budgetItemId);
    if (!isLocked) return value;
    return (
      <span style={{ color: "#4ade80", fontWeight: "bold" }}>
        {value || "PAID"}
      </span>
    );
  }, [lockedLines]);

  const tableColumns = useMemo(() => {
    const cols = mainColumnsOrder
      .map((key) => {
        const config = {
          elementKey: { title: "Element Key", width: 120 },
          elementId: { title: "Element ID", width: 120 },
          areaGroup: { title: "Area Group", width: 100 },
          invoiceGroup: { title: "Invoice Group", width: 100 },
          category: { title: "Category", width: 100 },
          description: { title: "Description", width: 200 },
          quantity: { title: "Qty", width: 60, align: "right" as const },
          unit: { title: "Unit", width: 60 },
          unitCost: { title: "Unit Cost", width: 90, align: "right" as const },
          itemBudgetedTotalCost: { title: "Budgeted", width: 90, align: "right" as const },
          itemActualTotalCost: { title: "Actual", width: 90, align: "right" as const },
          itemFinalCost: { title: "Final", width: 90, align: "right" as const },
          itemMarkUp: { title: "Markup", width: 80, align: "right" as const },
          client: { title: "Client", width: 100 },
          vendor: { title: "Vendor", width: 100 },
          paymentStatus: { title: "Status", width: 80 },
        };

        if (config[key as keyof typeof config]) {
          const base = {
            ...config[key as keyof typeof config],
            key,
            dataIndex: key,
            sorter: true,
            sortOrder: sortField === key ? sortOrder : null,
          };

          if (key === "description") {
            base.render = (value: any, record: BudgetLine) => (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
              >
                <Checkbox
                  checked={selectedRowKeys.includes(record.budgetItemId)}
                  onChange={(e) => {
                    const checked = e.target.checked;
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
            base.render = (value: any, record: BudgetLine) => {
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

    // Add events column
    cols.push({
      title: "",
      key: "events",
      align: "center" as const,
      render: (_v: any, record: BudgetLine) => {
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
                onEventModal(record);
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

    // Add actions column
    cols.push({
      title: "",
      key: "actions",
      align: "center" as const,
      render: (_value: any, record: BudgetLine) => (
        <div className={styles.actionButtons}>
          <button
            className={styles.duplicateButton}
            onClick={(e) => {
              e.stopPropagation();
              onDuplicateItem(record);
            }}
            aria-label="Duplicate line item"
          >
            <FontAwesomeIcon icon={faClone} />
          </button>
          <button
            className={styles.deleteButton}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItems([record.budgetItemId]);
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
    getActiveCostKey,
    onEditItem,
    onDeleteItems,
    onDuplicateItem,
    onEventModal,
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
    "elementKey",
    "elementId",
    "areaGroup",
    "invoiceGroup", 
    "category",
    "description",
    "quantity",
    "unit",
    "unitCost",
    "itemBudgetedTotalCost",
    "itemActualTotalCost",
    "itemFinalCost",
    "itemMarkUp",
    "client",
    "vendor",
    "paymentStatus",
  ];

  const expandedRowRender = useCallback((record: BudgetLine) => {
    return (
      <div style={{ padding: "10px", backgroundColor: "#1a1a1a" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "15px" }}>
          {detailOrder.map((field) => {
            const value = record[field as keyof BudgetLine];
            if (!isDefined(value)) return null;
            
            let displayValue = value;
            if (costKeys.includes(field)) {
              displayValue = formatUSD(value as number);
            } else if (field === "itemMarkUp" && typeof value === "number") {
              displayValue = `${Math.round(value * 100)}%`;
            }
            
            return (
              <div key={field} style={{ minWidth: "150px" }}>
                <strong style={{ color: "#ccc" }}>
                  {field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}:
                </strong>
                <div style={{ color: "#fff" }}>{String(displayValue)}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }, []);

  const handleTableChange = useCallback((pagination: any, filters: any, sorter: any) => {
    if (sorter && sorter.columnKey) {
      onTableSort(sorter.columnKey, sorter.order);
    } else {
      onTableSort(null, null);
    }
  }, [onTableSort]);

  return (
    <BudgetItemsTable
      dataSource={budgetItems.length > 0 ? groupedTableData : []}
      columns={tableColumns}
      groupBy={groupBy}
      selectedRowKeys={selectedRowKeys}
      lockedLines={lockedLines}
      handleTableChange={handleTableChange}
      openEditModal={onEditItem}
      openDeleteModal={onDeleteItems}
      expandedRowRender={expandedRowRender}
      expandedRowKeys={expandedRowKeys}
      setExpandedRowKeys={setExpandedRowKeys}
      tableRef={tableRef}
      tableHeight={tableHeight}
      pageSize={pageSize}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      setPageSize={setPageSize}
    />
  );
};

export default BudgetTableContainer;