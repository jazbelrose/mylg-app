import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import {
  createBudgetItem,
  updateBudgetItem,
  fetchBudgetItems,
  deleteBudgetItem,
  fetchBudgetHeaders,
} from '../../../../utils/api';

export interface UseBudgetRevisionsProps {
  activeProject: any;
  budgetHeader: any;
  budgetItems: any[];
  setBudgetHeader: (header: any) => void;
  setBudgetItems: (items: any[]) => void;
  onBudgetUpdate?: () => void;
}

export const useBudgetRevisions = ({
  activeProject,
  budgetHeader,
  budgetItems,
  setBudgetHeader,
  setBudgetItems,
  onBudgetUpdate,
}: UseBudgetRevisionsProps) => {
  const [revisions, setRevisions] = useState<any[]>([]);

  const handleNewRevision = useCallback(async (duplicate = false, fromRevision: number | null = null) => {
    if (!activeProject?.projectId || !budgetHeader) return;

    const targetRev = fromRevision != null ? fromRevision : budgetHeader.revision;

    let newRev: number;
    if (duplicate) {
      const base = Math.floor(targetRev);
      const decimals = revisions
        .filter((r) => Math.floor(r.revision) === base && r.revision !== base)
        .map((r) => parseInt(String(r.revision).split('.')[1] || '0', 10))
        .filter((n) => !Number.isNaN(n));
      const nextDec = decimals.length ? Math.max(...decimals) + 1 : 1;
      newRev = parseFloat(`${base}.${nextDec}`);
    } else {
      const bases = revisions.map((r) => Math.floor(r.revision));
      const nextBase = bases.length ? Math.max(...bases) + 1 : 1;
      newRev = nextBase;
    }

    while (revisions.some((r) => r.revision === newRev)) {
      if (duplicate) {
        const base = Math.floor(targetRev);
        const decimals = revisions
          .filter((r) => Math.floor(r.revision) === base && r.revision !== base)
          .map((r) => parseInt(String(r.revision).split('.')[1] || '0', 10))
          .filter((n) => !Number.isNaN(n));
        const nextDec = decimals.length ? Math.max(...decimals) + 1 : 1;
        newRev = parseFloat(`${base}.${nextDec}`);
      } else {
        newRev += 1;
      }
    }

    try {
      const sourceHeader = revisions.find((h) => h.revision === targetRev) || budgetHeader;
      const headerFields = duplicate
        ? {
            ...sourceHeader,
            revision: newRev,
            isHeader: true,
          }
        : {
            title: budgetHeader.title,
            startDate: budgetHeader.startDate,
            endDate: budgetHeader.endDate,
            clients: budgetHeader.clients,
            headerBallPark: 0,
            headerBudgetedTotalCost: 0,
            headerActualTotalCost: 0,
            headerEffectiveMarkup: 0,
            headerFinalTotalCost: 0,
            revision: newRev,
            isHeader: true,
          };
      delete headerFields.budgetItemId;
      delete headerFields.createdAt;
      delete headerFields.updatedAt;

      const newHeader = await createBudgetItem(
        activeProject.projectId,
        budgetHeader.budgetId,
        headerFields
      );

      let newItems: any[] = [];
      if (duplicate) {
        let items = budgetItems;
        if (sourceHeader.revision !== budgetHeader.revision) {
          items = await fetchBudgetItems(sourceHeader.budgetId, sourceHeader.revision);
        }
        if (items.length > 0) {
          newItems = await Promise.all(
            items.map((it) => {
              const { budgetItemId, createdAt, updatedAt, ...rest } = it;
              return createBudgetItem(activeProject.projectId, budgetHeader.budgetId, {
                ...rest,
                budgetItemId: `LINE-${uuid()}`,
                revision: newRev,
              });
            })
          );
        }
      }

      setBudgetHeader(newHeader);
      setBudgetItems(newItems);
      const revs = await fetchBudgetHeaders(activeProject.projectId);
      setRevisions(revs);
      onBudgetUpdate?.();
    } catch (err) {
      console.error('Error creating new revision', err);
    }
  }, [activeProject?.projectId, budgetHeader, budgetItems, revisions, setBudgetHeader, setBudgetItems, onBudgetUpdate]);

  const handleSwitchRevision = useCallback(async (rev: number) => {
    if (!activeProject?.projectId) return;
    const header = revisions.find((h) => h.revision === rev);
    if (!header) return;
    
    try {
      const items = await fetchBudgetItems(header.budgetId, rev);
      setBudgetHeader(header);
      setBudgetItems(items);
    } catch (err) {
      console.error('Error switching revision', err);
    }
  }, [activeProject?.projectId, revisions, setBudgetHeader, setBudgetItems]);

  const handleDeleteRevision = useCallback(async (rev: number) => {
    if (!activeProject?.projectId) return;
    const header = revisions.find((h) => h.revision === rev);
    if (!header) return;
    
    try {
      const items = await fetchBudgetItems(header.budgetId, rev);
      await Promise.all(
        items.map((it) => deleteBudgetItem(activeProject.projectId, it.budgetItemId))
      );
      await deleteBudgetItem(activeProject.projectId, header.budgetItemId);
      const updated = revisions.filter((h) => h.revision !== rev);
      setRevisions(updated);
      
      if (budgetHeader?.revision === rev) {
        const nextHeader = updated[0] || null;
        if (nextHeader) {
          const nextItems = await fetchBudgetItems(nextHeader.budgetId, nextHeader.revision);
          setBudgetHeader(nextHeader);
          setBudgetItems(nextItems);
        } else {
          setBudgetHeader(null);
          setBudgetItems([]);
        }
      }
      onBudgetUpdate?.();
    } catch (err) {
      console.error('Error deleting revision', err);
    }
  }, [activeProject?.projectId, revisions, budgetHeader, setBudgetHeader, setBudgetItems, onBudgetUpdate]);

  const handleSetClientRevision = useCallback(async (rev: number) => {
    if (!activeProject?.projectId) return;
    
    try {
      await Promise.all(
        revisions.map((h) =>
          updateBudgetItem(activeProject.projectId, h.budgetItemId, {
            clientRevisionId: rev,
            revision: h.revision,
          })
        )
      );
      const updated = await fetchBudgetHeaders(activeProject.projectId);
      setRevisions(updated);
      // keep current editing revision but update its client flag
      setBudgetHeader((prev: any) => {
        if (!prev) return prev;
        const match = updated.find((h) => h.revision === prev.revision);
        return match ? { ...prev, clientRevisionId: match.clientRevisionId } : prev;
      });
      onBudgetUpdate?.();
    } catch (err) {
      console.error('Error setting client revision', err);
    }
  }, [activeProject?.projectId, revisions, setBudgetHeader, onBudgetUpdate]);

  const refreshRevisions = useCallback(async () => {
    if (!activeProject?.projectId) return;
    
    try {
      const revs = await fetchBudgetHeaders(activeProject.projectId);
      setRevisions(revs);
      return revs;
    } catch (err) {
      console.error('Error fetching revisions', err);
      return [];
    }
  }, [activeProject?.projectId]);

  return {
    revisions,
    setRevisions,
    handleNewRevision,
    handleSwitchRevision,
    handleDeleteRevision,
    handleSetClientRevision,
    refreshRevisions,
  };
};