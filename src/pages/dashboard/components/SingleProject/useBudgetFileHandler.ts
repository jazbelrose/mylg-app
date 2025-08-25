import { useState, useCallback } from 'react';
import * as ExcelJS from 'exceljs';

export interface UseBudgetFileHandlerReturn {
  budgetData: any[];
  error: string | null;
  parseFile: (file: File) => Promise<void>;
  setBudgetData: (data: any[]) => void;
  setError: (error: string | null) => void;
}

export const useBudgetFileHandler = (): UseBudgetFileHandlerReturn => {
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (file: File) => {
    if (!file) return;
    
    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      
      const worksheet = workbook.worksheets[0];
      const json: any[] = [];
      
      // Convert worksheet to JSON starting from row 12 (index 11)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber >= 12) { // Skip first 11 rows
          const rowData: any[] = [];
          row.eachCell((cell, colNumber) => {
            rowData[colNumber - 1] = cell.value || '';
          });
          json.push(rowData);
        }
      });
      
      const [headers, ...rows] = json;
      const idxCategory = headers.findIndex(
        (h: any) => /element description/i.test(h) || /category/i.test(h)
      );
      const idxAmount = headers.findIndex(
        (h: any) =>
          /final total/i.test(h) || /amount/i.test(h) || /value|cost/i.test(h)
      );
      
      if (idxCategory < 0 || idxAmount < 0) {
        throw new Error(
          'Could not find "Element Description" (or "Category") and "Final Total" (or "Amount") columns.'
        );
      }
      
      const formatted = rows
        .map((row: any[]) => ({
          category: row[idxCategory],
          amount: parseFloat(row[idxAmount]) || 0,
        }))
        .filter((r) => r.category && r.amount > 0);

      setBudgetData(formatted);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(
        'Failed to parse Excel file. Ensure it includes headers like "Element Description" and "Final Total" at row 12.'
      );
    }
  }, []);

  return {
    budgetData,
    error,
    parseFile,
    setBudgetData,
    setError,
  };
};