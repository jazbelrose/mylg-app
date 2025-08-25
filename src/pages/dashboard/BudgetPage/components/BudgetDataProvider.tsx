import React, { createContext, useContext, PropsWithChildren, useEffect, useMemo, useRef } from "react";
import useBudgetData from "../../components/SingleProject/useBudgetData";
import { useSocketEvents } from "../../../../app/contexts/SocketContext";
import type { BudgetHeader, BudgetLine } from "../../../../utils/api";

interface BudgetContextValue {
  budgetHeader: BudgetHeader | null;
  budgetItems: BudgetLine[];
  setBudgetHeader: (header: BudgetHeader | ((prev: BudgetHeader | null) => BudgetHeader)) => void;
  setBudgetItems: (items: BudgetLine[]) => void;
  refresh: () => Promise<{ header: BudgetHeader | null; items: BudgetLine[] } | null>;
  loading: boolean;
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

export const useBudget = (): BudgetContextValue => {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudget must be used within BudgetProvider");
  return ctx;
};

interface ProviderProps extends PropsWithChildren {
  projectId?: string;
}

export const BudgetProvider: React.FC<ProviderProps> = ({ projectId, children }) => {
  const { budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading } = useBudgetData(projectId);
  const onSocketEvent = useSocketEvents();
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = onSocketEvent((data: any) => {
      if (data?.action === "budgetUpdated" && data.projectId === projectId) {
        refreshRef.current();
      }
    });
    const handleWindow = (e: Event) => {
      const detail = (e as CustomEvent).detail as { projectId?: string } | undefined;
      if (detail?.projectId === projectId) {
        refreshRef.current();
      }
    };
    window.addEventListener("budgetUpdated", handleWindow as EventListener);
    return () => {
      unsubscribe();
      window.removeEventListener("budgetUpdated", handleWindow as EventListener);
    };
  }, [onSocketEvent, projectId]);

  const value = useMemo(
    () => ({ budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading }),
    [budgetHeader, budgetItems, setBudgetHeader, setBudgetItems, refresh, loading]
  );

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export default BudgetProvider;

