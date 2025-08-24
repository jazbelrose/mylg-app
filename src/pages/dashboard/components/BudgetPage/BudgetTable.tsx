import React, { useMemo } from "react";
import { Table, Tooltip as AntTooltip } from "antd";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock } from "@fortawesome/free-solid-svg-icons";
import { formatUSD } from "../../../../utils/budgetUtils";
import styles from "../../BudgetPage.module.css";

interface BudgetItem {
  budgetItemId: string;
  [key: string]: any;
}

interface EventsByLineItem {
  [key: string]: any[];
}

interface BudgetTableProps {
  budgetItems: BudgetItem[];
  eventsByLineItem: EventsByLineItem;
  selectedRowKeys: string[];
  setSelectedRowKeys: React.Dispatch<React.SetStateAction<string[]>>;
  groupBy: string;
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  tableHeight: number;
  canEdit: boolean;
  onEditEvent: (event: any) => void;
  beautifyLabel: (key: string) => string;
}

const TABLE_HEADER_FOOTER = 110;

const BudgetTable: React.FC<BudgetTableProps> = ({
  budgetItems,
  eventsByLineItem,
  selectedRowKeys,
  setSelectedRowKeys,
  groupBy,
  currentPage,
  pageSize,
  setCurrentPage,
  setPageSize,
  tableHeight,
  canEdit,
  onEditEvent,
  beautifyLabel,
}) => {
  const isDefined = (value: any): boolean => {
    return value !== undefined && value !== null && value !== "";
  };

  const getActiveCostKey = (record: BudgetItem): string => {
    if (isDefined(record.itemReconciledCost)) return "itemReconciledCost";
    if (isDefined(record.itemActualCost)) return "itemActualCost";
    return "itemBudgetedCost";
  };

  const renderPaymentStatus = (value: any, record: BudgetItem) => {
    if (!isDefined(value)) return "";
    
    const statusColors = {
      PAID: "#4CAF50",
      PARTIAL: "#FF9800",
      UNPAID: "#F44336",
    };
    
    const color = statusColors[value as keyof typeof statusColors] || "#666";
    
    return (
      <span style={{ color, fontWeight: "bold" }}>
        {value}
      </span>
    );
  };

  const renderEvents = (budgetItemId: string) => {
    const events = eventsByLineItem[budgetItemId] || [];
    if (events.length === 0) return null;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        <FontAwesomeIcon icon={faClock} style={{ fontSize: "12px", color: "#999" }} />
        <span style={{ fontSize: "11px", color: "#999" }}>
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        {canEdit && (
          <button
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "11px",
              padding: "0 5px",
            }}
            onClick={(e) => {
              e.stopPropagation();
              onEditEvent(events[0]);
            }}
          >
            Edit
          </button>
        )}
      </div>
    );
  };

  // Build columns dynamically
  const getColumns = () => {
    if (!budgetItems || budgetItems.length === 0) return [];
    
    const sampleItem = budgetItems[0];
    const allKeys = Object.keys(sampleItem);
    
    const priorityKeys = [
      "elementKey",
      "description",
      "category",
      "areaGroup",
      "invoiceGroup",
      "client",
      "quantity",
      "unit",
      "itemBudgetedCost",
      "itemActualCost",
      "itemReconciledCost",
      "itemFinalCost",
      "itemMarkUp",
      "paymentStatus",
      "paymentType",
      "paymentTerms",
    ];
    
    const costKeys = [
      "itemBudgetedCost",
      "itemActualCost", 
      "itemReconciledCost",
      "itemFinalCost",
    ];
    
    const visibleKeys = priorityKeys.filter((key) => allKeys.includes(key));
    
    const cols = visibleKeys
      .map((key) => {
        if (key === "budgetItemId") return null;
        
        const base: any = {
          title: beautifyLabel(key),
          dataIndex: key,
          key,
          width: key === "description" ? 200 : 120,
          ellipsis: true,
        };
        
        if (key === "elementKey") {
          base.fixed = "left";
          base.width = 150;
          base.render = (value: any, record: BudgetItem) => (
            <span className={styles.elementKeyCell}>
              <input
                type="checkbox"
                checked={selectedRowKeys.includes(record.budgetItemId)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
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
          base.align = "right";
          base.render = (value: any, record: BudgetItem) => {
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
            const children = origRender ? origRender(value, record, index) : value;
            return { children, props: { rowSpan: span } };
          };
        }
        
        return base;
      })
      .filter(Boolean);
    
    // Add events column
    cols.push({
      title: "",
      key: "events",
      align: "center" as const,
      width: 80,
      render: (_: any, record: BudgetItem) => renderEvents(record.budgetItemId),
    });
    
    return cols;
  };

  // Group data if needed
  const processedData = useMemo(() => {
    if (groupBy === "none" || !budgetItems) return budgetItems;
    
    const grouped = budgetItems.reduce((acc, item) => {
      const groupValue = item[groupBy] || "Other";
      if (!acc[groupValue]) acc[groupValue] = [];
      acc[groupValue].push(item);
      return acc;
    }, {} as Record<string, BudgetItem[]>);
    
    // Flatten with row spans
    const result: any[] = [];
    Object.entries(grouped).forEach(([groupValue, items]) => {
      items.forEach((item, index) => {
        const processedItem = {
          ...item,
          [`${groupBy}RowSpan`]: index === 0 ? items.length : 0,
        };
        result.push(processedItem);
      });
    });
    
    return result;
  }, [budgetItems, groupBy]);

  return (
    <Table
      dataSource={processedData}
      columns={getColumns()}
      rowKey="budgetItemId"
      size="small"
      pagination={{
        current: currentPage,
        pageSize: pageSize,
        total: processedData?.length || 0,
        showSizeChanger: true,
        pageSizeOptions: ['25', '50', '100', '200'],
        position: ['bottomRight'],
        showTotal: (total, range) =>
          `Showing ${range[0]}–${range[1]} of ${total} items`,
        size: 'small',
        onChange: (page, size) => {
          setCurrentPage(page);
          if (size !== pageSize) setPageSize(size);
        },
      }}
      scroll={{ y: Math.max(0, tableHeight - TABLE_HEADER_FOOTER) }}
      className={styles.tableMinHeight}
      style={{ height: tableHeight }}
    />
  );
};

export default BudgetTable;