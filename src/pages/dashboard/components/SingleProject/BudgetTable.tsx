import React, { useMemo } from 'react';
import { Table } from 'antd';

export interface BudgetItem {
  budgetItemId: string;
  elementKey: string;
  elementId: string;
  description: string;
  quantity: number;
  itemBudgetedCost: number;
  itemFinalCost: number;
  itemActualCost: number;
  paymentStatus: string;
  areaGroup: string;
  invoiceGroup: string;
  category: string;
  notes: string;
  [key: string]: any;
}

export interface BudgetTableProps {
  items: BudgetItem[];
  groupBy: 'none' | 'areaGroup' | 'invoiceGroup';
  onRowClick: (item: BudgetItem) => void;
  expandedRowKeys: React.Key[];
  onExpandedRowKeysChange: (keys: React.Key[]) => void;
  tableHeight: number;
}

const BudgetTable: React.FC<BudgetTableProps> = ({
  items,
  groupBy,
  onRowClick,
  expandedRowKeys,
  onExpandedRowKeysChange,
  tableHeight,
}) => {
  const columns = useMemo(
    () => [
      { title: 'Element Key', dataIndex: 'elementKey', key: 'elementKey' },
      { title: 'Element ID', dataIndex: 'elementId', key: 'elementId' },
      { title: 'Description', dataIndex: 'description', key: 'description' },
      { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
      { title: 'Budgeted Cost', dataIndex: 'itemBudgetedCost', key: 'itemBudgetedCost' },
      { title: 'Final Cost', dataIndex: 'itemFinalCost', key: 'itemFinalCost' },
      { title: 'Actual Cost', dataIndex: 'itemActualCost', key: 'itemActualCost' },
      { title: 'Payment Status', dataIndex: 'paymentStatus', key: 'paymentStatus' },
      { title: 'Area Group', dataIndex: 'areaGroup', key: 'areaGroup' },
      { title: 'Invoice Group', dataIndex: 'invoiceGroup', key: 'invoiceGroup' },
      { title: 'Category', dataIndex: 'category', key: 'category' },
      { title: 'Notes', dataIndex: 'notes', key: 'notes' },
    ],
    []
  );

  const data = useMemo(() => {
    if (groupBy === 'areaGroup' || groupBy === 'invoiceGroup') {
      const map: Record<string, BudgetItem[]> = {};
      const field = groupBy;
      items.forEach(it => {
        const key = it[field] || 'Ungrouped';
        if (!map[key]) map[key] = [];
        map[key].push({ ...it, key: it.budgetItemId });
      });
      return Object.entries(map).map(([grp, children]) => ({
        key: `group-${grp}`,
        [field]: grp,
        children,
      }));
    }
    return items.map(it => ({ ...it, key: it.budgetItemId }));
  }, [items, groupBy]);

  return (
    <Table
      columns={columns}
      dataSource={data}
      pagination={false}
      expandable={groupBy !== 'none' ? {
        expandedRowKeys,
        onExpand: (expanded, record) => {
          const key = record.key as React.Key;
          onExpandedRowKeysChange(
            expanded
              ? [...expandedRowKeys, key]
              : expandedRowKeys.filter(k => k !== key)
          );
        },
      } : undefined}
      onRow={record => ({
        onClick: () => {
          const item = record as BudgetItem;
          if (item.budgetItemId) onRowClick(item);
        },
      })}
      rowKey="key"
      scroll={{ y: Math.max(0, tableHeight - 110) }}
    />
  );
};

export default BudgetTable;
