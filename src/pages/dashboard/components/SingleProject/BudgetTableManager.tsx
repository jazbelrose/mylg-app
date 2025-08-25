import React, { useState, useMemo, useCallback } from "react";

export const useBudgetTableManager = (budgetItems: any[]) => {
  const [groupBy, setGroupBy] = useState("none");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleTableChange = useCallback((_pagination: any, _filters: any, sorter: any) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s && s.order) {
      setSortField(s.columnKey);
      setSortOrder(s.order);
    } else {
      setSortField(null);
      setSortOrder(null);
    }
  }, []);

  const tableData = useMemo(
    () =>
      budgetItems.map((item) => ({
        ...item,
        key: item.budgetItemId,
      })),
    [budgetItems]
  );

  const sortedTableData = useMemo(() => {
    const compareValues = (a: any, b: any) => {
      if (a === b) return 0;
      if (a === undefined || a === null) return -1;
      if (b === undefined || b === null) return 1;
      if (typeof a === "number" && typeof b === "number") {
        return a - b;
      }
      return String(a).localeCompare(String(b));
    };

    const data = tableData.slice();

    data.sort((a, b) => {
      if (groupBy !== "none") {
        const groupComp = compareValues(a[groupBy], b[groupBy]);
        if (groupComp !== 0) {
          // If sorting the group column itself allow descend/ascend
          if (sortField === groupBy && sortOrder === "descend") {
            return -groupComp;
          }
          return groupComp;
        }
      }

      if (sortField && sortField !== groupBy) {
        const fieldComp = compareValues(a[sortField], b[sortField]);
        return sortOrder === "descend" ? -fieldComp : fieldComp;
      }

      return 0;
    });

    return data;
  }, [tableData, groupBy, sortField, sortOrder]);

  const groupedTableData = useMemo(() => {
    if (groupBy === "none") {
      return sortedTableData.map((row) => ({ ...row }));
    }

    const result = [];
    let i = 0;

    while (i < sortedTableData.length) {
      const current = sortedTableData[i][groupBy];
      let j = i + 1;
      while (j < sortedTableData.length && sortedTableData[j][groupBy] === current) {
        j++;
      }

      const groupRows = sortedTableData.slice(i, j);
      const expandedCount = groupRows.filter((r) => expandedRowKeys.includes(r.key)).length;
      const span = groupRows.length + expandedCount;

      for (let k = i; k < j; k++) {
        const row = { ...sortedTableData[k] };
        row[`${groupBy}RowSpan`] = k === i ? span : 0;
        result.push(row);
      }

      i = j;
    }

    return result;
  }, [sortedTableData, groupBy, expandedRowKeys]);

  return {
    groupBy,
    setGroupBy,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    expandedRowKeys,
    setExpandedRowKeys,
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    tableData,
    sortedTableData,
    groupedTableData,
    handleTableChange,
  };
};