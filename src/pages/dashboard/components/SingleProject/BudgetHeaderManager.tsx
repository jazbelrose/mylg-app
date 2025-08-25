import React, { useCallback } from "react";
import { useBudget } from "./BudgetDataProvider";
import { useData } from "../../../../app/contexts/DataProvider";
import { updateBudgetItem, fetchBudgetHeaders, createBudgetItem, fetchBudgetItems, deleteBudgetItem } from "../../../../utils/api";
import { v4 as uuid } from "uuid";

interface BudgetHeaderManagerProps {
  activeProject: any;
  revisions: any[];
  setRevisions: (revisions: any[]) => void;
  emitBudgetUpdate: () => void;
}

export const useBudgetHeaderManager = ({ activeProject, revisions, setRevisions, emitBudgetUpdate }: BudgetHeaderManagerProps) => {
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems } = useBudget();

  const handleBallparkChange = useCallback(async (val: number) => {
    if (!activeProject?.projectId || !budgetHeader) return;
    try {
      await updateBudgetItem(activeProject.projectId, budgetHeader.budgetItemId, {
        headerBallPark: val,
        revision: budgetHeader.revision,
      });
      setBudgetHeader((prev) => (prev ? { ...prev, headerBallPark: val } : prev));
      emitBudgetUpdate();
    } catch (err) {
      console.error('Error updating ballpark', err);
    }
  }, [activeProject?.projectId, budgetHeader, setBudgetHeader, emitBudgetUpdate]);

  const handleNewRevision = useCallback(async (duplicate = false, fromRevision = null) => {
    if (!activeProject?.projectId || !budgetHeader) return;

    const targetRev = fromRevision != null ? fromRevision : budgetHeader.revision;

    let newRev;
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
      const sourceHeader =
        revisions.find((h) => h.revision === targetRev) || budgetHeader;
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

      let newItems = [];
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
      emitBudgetUpdate();
    } catch (err) {
      console.error('Error creating new revision', err);
    }
  }, [activeProject?.projectId, budgetHeader, budgetItems, revisions, setBudgetHeader, setBudgetItems, setRevisions, emitBudgetUpdate]);

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
      emitBudgetUpdate();
    } catch (err) {
      console.error('Error deleting revision', err);
    }
  }, [activeProject?.projectId, revisions, budgetHeader?.revision, setBudgetHeader, setBudgetItems, setRevisions, emitBudgetUpdate]);

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
      setBudgetHeader((prev) => {
        if (!prev) return prev;
        const match = updated.find((h) => h.revision === prev.revision);
        return match ? { ...prev, clientRevisionId: match.clientRevisionId } : prev;
      });
      emitBudgetUpdate();
    } catch (err) {
      console.error('Error setting client revision', err);
    }
  }, [activeProject?.projectId, revisions, setBudgetHeader, setRevisions, emitBudgetUpdate]);

  return {
    handleBallparkChange,
    handleNewRevision,
    handleSwitchRevision,
    handleDeleteRevision,
    handleSetClientRevision,
  };
};