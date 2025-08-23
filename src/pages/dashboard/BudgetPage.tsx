import React, { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, Segmented } from 'antd';
import ProjectPageLayout from './components/SingleProject/ProjectPageLayout';
import CreateLineItemModal from './components/SingleProject/CreateLineItemModal';
import RevisionModal from './components/SingleProject/RevisionModal';
import BudgetTable, { BudgetItem } from './components/SingleProject/BudgetTable';
import BudgetChart, { BudgetChartDatum } from './components/SingleProject/BudgetChart';
import { useData } from '../../app/contexts/DataProvider';
import { useSocket } from '../../app/contexts/SocketContext';
import useBudgetData from './components/SingleProject/useBudgetData';
import { slugify } from '../../utils/slug';
import { createBudgetItem } from '../../utils/api';

const BudgetPage: React.FC = () => {
  const { projectSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeProject } = useData();
  const { ws } = useSocket();
  const { budgetHeader, budgetItems } = useBudgetData(activeProject?.projectId);

  const [groupBy, setGroupBy] = useState<'none' | 'areaGroup' | 'invoiceGroup'>('none');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [nextElementKey, setNextElementKey] = useState<string>('');
  const [isRevisionOpen, setRevisionOpen] = useState(false);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const tableHeight = 400;

  const getNextElementKey = (): string => {
    const slug = slugify(activeProject?.title || '');
    let max = 0;
    budgetItems.forEach(it => {
      if (typeof it.elementKey === 'string') {
        const match = it.elementKey.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > max) max = num;
        }
      }
    });
    return `${slug}-${String(max + 1).padStart(4, '0')}`;
  };

  const openCreateModal = () => {
    const key = getNextElementKey();
    setNextElementKey(key);
    setEditItem(null);
    setCreateOpen(true);
  };

  const openEditModal = (item: BudgetItem) => {
    setEditItem(item);
    setCreateOpen(true);
  };

  const handleItemSubmit = async (item: Record<string, any>) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    await createBudgetItem(activeProject.projectId, budgetHeader.budgetId, {
      ...item,
      revision: budgetHeader.revision,
    });
    setCreateOpen(false);
  };

  const handleNewRevision = async () => {
    if (!activeProject?.projectId || !budgetHeader) return;
    const newRev = (budgetHeader.revision || 0) + 1;
    await createBudgetItem(activeProject.projectId, budgetHeader.budgetId, {
      revision: newRev,
    });
  };

  const chartData: BudgetChartDatum[] = useMemo(() => {
    const totals: Record<string, number> = {};
    budgetItems.forEach(it => {
      const cat = it.category || 'Other';
      totals[cat] = (totals[cat] || 0) + (it.itemFinalCost || 0);
    });
    return Object.entries(totals).map(([category, amount]) => ({ category, amount }));
  }, [budgetItems]);

  return (
    <ProjectPageLayout header={<div />}>
      <div style={{ marginBottom: 16 }}>
        <Button onClick={() => setRevisionOpen(true)}>{`Rev.${budgetHeader?.revision}`}</Button>
        <Button onClick={openCreateModal} style={{ marginLeft: 8 }}>
          Create Line Item
        </Button>
      </div>
      <Segmented
        options={[
          { label: 'None', value: 'none' },
          { label: 'Area Group', value: 'areaGroup' },
          { label: 'Invoice Group', value: 'invoiceGroup' },
        ]}
        value={groupBy}
        onChange={val => setGroupBy(val as 'none' | 'areaGroup' | 'invoiceGroup')}
      />
      <BudgetChart data={chartData} />
      <BudgetTable
        items={budgetItems as BudgetItem[]}
        groupBy={groupBy}
        onRowClick={openEditModal}
        expandedRowKeys={expandedRowKeys}
        onExpandedRowKeysChange={setExpandedRowKeys}
        tableHeight={tableHeight}
      />
      <CreateLineItemModal
        isOpen={isCreateOpen}
        onRequestClose={() => setCreateOpen(false)}
        onSubmit={handleItemSubmit}
        defaultElementKey={nextElementKey}
        budgetItems={budgetItems as BudgetItem[]}
        initialData={editItem as any}
        title={editItem ? 'Edit Item' : 'Create Line Item'}
        revision={budgetHeader?.revision || 1}
      />
      <RevisionModal
        isOpen={isRevisionOpen}
        onRequestClose={() => setRevisionOpen(false)}
        revisions={revisions}
        activeRevision={budgetHeader?.revision}
        onSwitch={() => {}}
        onDuplicate={() => {}}
        onCreateNew={handleNewRevision}
        onDelete={() => {}}
        onSetClient={() => {}}
        isAdmin={true}
        activeProject={activeProject}
      />
    </ProjectPageLayout>
  );
};

export default BudgetPage;
