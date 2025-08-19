import { useState, useEffect, useCallback } from "react";
import { fetchBudgetHeader, fetchBudgetItems } from "../../../../utils/api";

// In-memory cache and in-flight trackers keyed by projectId
const budgetCache = new Map();
const inflight = new Map();

async function fetchData(projectId, force = false) {
  if (!projectId) return { header: null, items: [] };

  if (!force && budgetCache.has(projectId)) {
    return budgetCache.get(projectId);
  }

  if (inflight.has(projectId)) {
    return inflight.get(projectId);
  }

  const promise = (async () => {
    const maxAttempts = 3;
    let attempt = 0;
    let delay = 500;
    // Simple exponential backoff for 429 errors
    while (true) {
      try {
        const header = await fetchBudgetHeader(projectId);
        let items = [];
        if (header?.budgetId) {
          items = await fetchBudgetItems(header.budgetId, header.revision);
        }
        const result = { header, items };
        budgetCache.set(projectId, result);
        return result;
      } catch (err) {
        const msg = String(err?.message || "");
        if (msg.includes("429") && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          attempt += 1;
          delay *= 2;
          continue;
        }
        throw err;
      }
    }
  })();

  inflight.set(projectId, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(projectId);
  }
}

/**
 * Pre-load budget data for a project into the cache without updating any
 * component state. This allows subsequent calls to the hook to render
 * immediately with cached data.
 */
export async function prefetchBudgetData(projectId) {
  if (!projectId || budgetCache.has(projectId)) return;
  try {
    await fetchData(projectId);
  } catch (err) {
    console.error("Error prefetching budget data", err);
  }
}

export default function useBudgetData(projectId) {
  const cached = projectId ? budgetCache.get(projectId) : null;
  const [budgetHeader, setBudgetHeader] = useState(cached ? cached.header : null);
  const [budgetItems, setBudgetItemsState] = useState(cached ? cached.items : []);
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

      setLoading(true);
      try {
        const { header, items } = await fetchData(projectId);
        if (!ignore) {
          setBudgetHeader(header);
          setBudgetItemsState(items);
        }
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
      const data = await fetchData(projectId, true);
      setBudgetHeader(data.header);
      setBudgetItemsState(data.items);
      return data;
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