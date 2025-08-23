import React, { useMemo, useState } from 'react';
import { Segmented, Button } from 'antd';
import ProjectPageLayout from './components/SingleProject/ProjectPageLayout';
import CreateLineItemModal from './components/SingleProject/CreateLineItemModal';
import RevisionModal from './components/SingleProject/RevisionModal';
import BudgetChart from './components/BudgetChart';
import BudgetTable, { BudgetItem } from './components/BudgetTable';
import { useData } from '../../app/contexts/DataProvider';
import useBudgetData from './components/SingleProject/useBudgetData';
import { slugify } from '../../utils/slug';
import { createBudgetItem } from '../../utils/api';

const BudgetPage: React.FC = () => {
  const { activeProject } = useData();
  const { budgetHeader, budgetItems } = useBudgetData(activeProject?.projectId);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isRevisionModalOpen, setRevisionModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);

  const nextElementKey = useMemo(() => {
    return `${slugify(activeProject?.title || '')}-0001`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject]);

  const handleCreateSubmit = async (data: Record<string, any>) => {
    if (!activeProject || !budgetHeader) return;
    await createBudgetItem(activeProject.projectId, budgetHeader.budgetId, data);
    setCreateModalOpen(false);
  };

  const handleNewRevision = async () => {
    if (!activeProject || !budgetHeader) return;
    await createBudgetItem(activeProject.projectId, budgetHeader.budgetId, {
      revision: (budgetHeader.revision || 1) + 1,
    });
    setRevisionModalOpen(false);
  };

  const handleRowClick = (item: BudgetItem) => {
    setEditItem(item);
  };

  return (
    <ProjectPageLayout header={<div />}>
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={['None', 'Area Group', 'Invoice Group']}
          value={groupBy}
          onChange={(val: string | number) => setGroupBy(val as string)}
        />
        <Button onClick={() => setCreateModalOpen(true)} style={{ marginLeft: 8 }}>
          Create Line Item
        </Button>
        <Button onClick={() => setRevisionModalOpen(true)} style={{ marginLeft: 8 }}>
          {`Rev.${budgetHeader?.revision ?? 1}`}
        </Button>
      </div>
      <BudgetChart data={[{ category: 'Total', amount: budgetHeader?.headerFinalTotalCost || 0 }]} />
      <BudgetTable items={budgetItems} onRowClick={handleRowClick} />
      <CreateLineItemModal
        isOpen={isCreateModalOpen}
        onRequestClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        budgetItems={budgetItems}
        defaultElementKey={nextElementKey}
        revision={budgetHeader?.revision ?? 1}
      />
      {editItem && (
        <CreateLineItemModal
          isOpen
          onRequestClose={() => setEditItem(null)}
          onSubmit={async () => null}
          budgetItems={budgetItems}
          initialData={editItem}
          title="Edit Item"
          revision={budgetHeader?.revision ?? 1}
        />
      )}
      <RevisionModal
        isOpen={isRevisionModalOpen}
        onRequestClose={() => setRevisionModalOpen(false)}
        revisions={budgetHeader ? [budgetHeader] : []}
        activeRevision={budgetHeader?.revision ?? 1}
        onCreateNew={handleNewRevision}
        isAdmin
        activeProject={activeProject}
      />
    </ProjectPageLayout>
  );
};

export default BudgetPage;
