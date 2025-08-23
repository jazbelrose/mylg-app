import React from 'react';
import { Table } from 'antd';

export interface BudgetItem {
  budgetItemId: string;
  elementKey: string;
  elementId: string;
  description: string;
  quantity: number;
  itemBudgetedCost: number;
  itemFinalCost: number;
  notes?: string;
  [key: string]: any;
}

interface BudgetTableProps {
  items: BudgetItem[];
  onRowClick: (item: BudgetItem) => void;
}

const columns = [
  { title: 'Description', dataIndex: 'description', key: 'description' },
  { title: 'Quantity', dataIndex: 'quantity', key: 'quantity' },
  { title: 'Budgeted Cost', dataIndex: 'itemBudgetedCost', key: 'itemBudgetedCost' },
];

const BudgetTable: React.FC<BudgetTableProps> = ({ items, onRowClick }) => (
  <Table
    columns={columns}
    dataSource={items}
    rowKey="budgetItemId"
    expandable={{ expandedRowRender: (record) => <p>{record.notes}</p> }}
    onRow={(record) => ({
      onClick: (_e: React.MouseEvent) => onRowClick(record),
    })}
    pagination={false}
  />
);

export default BudgetTable;
