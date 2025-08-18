import { useState, useEffect, useCallback } from "react";
import { fetchBudgetHeader, fetchBudgetItems } from "../../../../utils/api";

// In-memory cache of budget data per projectId
const budgetCache = new Map();
/**
 * Pre-load budget data for a project into the cache without updating any
 * component state. This allows subsequent calls to the hook to render
 * immediately with cached data.
 */
export async function prefetchBudgetData(projectId) {
  if (!projectId || budgetCache.has(projectId)) return;
  try {
    const header = await fetchBudgetHeader(projectId);
    let items = [];
    if (header?.budgetId) {
      items = await fetchBudgetItems(header.budgetId, header.revision);
    }
    budgetCache.set(projectId, { header, items });
  } catch (err) {
    console.error("Error prefetching budget data", err);
  }
}

export default function useBudgetData(projectId) {
  const cached = projectId ? budgetCache.get(projectId) : null;
  const [budgetHeader, setBudgetHeader] = useState(cached ? cached.header : null);
  const [budgetItems, setBudgetItemsState] = useState(cached ? cached.items : []);
  // Start in a loading state if we don't already have cached data to avoid
  // displaying fallback messages before the first fetch completes.
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!projectId) {
        setBudgetHeader(null);
        setBudgetItemsState([]);
        setLoading(false);
        return;
      }
      const cached = budgetCache.get(projectId);
      if (cached) {
        setBudgetHeader(cached.header);
        setBudgetItemsState(cached.items);
        return;
      }

      // No cached data, clear existing state before fetching
      setBudgetHeader(null);
      setBudgetItemsState([]);
      setLoading(true);

      try {
        const currentId = projectId;
        const header = await fetchBudgetHeader(currentId);
        let items = [];
        if (header?.budgetId) {
          items = await fetchBudgetItems(header.budgetId, header.revision);
        }
        if (!ignore && currentId === projectId) {
          setBudgetHeader(header);
          setBudgetItemsState(items);
        }
        budgetCache.set(currentId, { header, items });
      } catch (err) {
        console.error("Error fetching budget data", err);
        if (!ignore) {
          setBudgetHeader(null);
          setBudgetItemsState([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [projectId]);

  const refresh = useCallback(async () => {
    if (!projectId) return null;
    setLoading(true);
    try {
      const currentId = projectId;
      const header = await fetchBudgetHeader(currentId);
      let items = [];
      if (header?.budgetId) {
        items = await fetchBudgetItems(header.budgetId, header.revision);
      }
      if (currentId === projectId) {
        setBudgetHeader(header);
        setBudgetItemsState(items);
      }
      budgetCache.set(currentId, { header, items });
      return { header, items };
    } catch (err) {
      console.error("Error refreshing budget data", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const setBudgetItems = useCallback(
    (items) => {
      if (!projectId) return;
      setBudgetItemsState(items);
      const cached = budgetCache.get(projectId) || { header: budgetHeader, items: [] };
      budgetCache.set(projectId, { header: cached.header || budgetHeader, items });
    },
    [projectId, budgetHeader]
  );

  return { budgetHeader, budgetItems, setBudgetItems, refresh, loading };
}