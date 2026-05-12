import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'label-studio-records';
const DEFAULT_RECORDS = [
  { code: "INV-001", project: "HQ Renovation", type: "Invoice", date: "1403/02/10", party: "BuildCo", amount: "12,500,000", related: ["CONTRACT-001"] },
  { code: "REC-002", project: "IT Upgrade", type: "Receipt", date: "1403/02/12", party: "TechStore", amount: "3,200,000", related: [] },
  { code: "PAY-003", project: "Marketing", type: "Payment", date: "1403/02/14", party: "AdAgency", amount: "8,000,000", related: ["CONTRACT-001", "CONTRACT-002"] },
  { code: "CONTRACT-001", project: "Office Contract", type: "Contract", date: "1403/01/01", party: "Legal Dept", amount: "50,000,000", related: [] },
  { code: "CONTRACT-002", project: "IT Contract", type: "Contract", date: "1403/01/15", party: "Tech Corp", amount: "100,000,000", related: [] },
];

export function useRecords() {
  const [records, setRecords] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_RECORDS;
    } catch {
      return DEFAULT_RECORDS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch { /* storage full */ }
  }, [records]);

  const addRecord = useCallback((record) => {
    setRecords(prev => [...prev, record]);
  }, []);

  const updateRecord = useCallback((index, record) => {
    setRecords(prev => prev.map((r, i) => i === index ? record : r));
  }, []);

  const deleteRecords = useCallback((indices) => {
    setRecords(prev => prev.filter((_, i) => !indices.has(i)));
  }, []);

  const reorderRecords = useCallback((fromIndex, toIndex) => {
    setRecords(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const getRelatedLabels = useCallback((relatedCodes) => {
    if (!relatedCodes || relatedCodes.length === 0) return [];
    return records.filter(r => relatedCodes.includes(r.code));
  }, [records]);

  const getAvailableLabels = useCallback((excludeCode = null) => {
    return records.filter(r => r.code !== excludeCode);
  }, [records]);

  const isDuplicateCode = useCallback((code, excludeIndex = null) => {
    return records.some((r, i) => r.code === code && i !== excludeIndex);
  }, [records]);

  const searchRecords = useCallback((query) => {
    if (!query.trim()) return records;
    const q = query.toLowerCase();
    return records.filter(r =>
      Object.values(r).some(v =>
        Array.isArray(v)
          ? v.some(item => String(item).toLowerCase().includes(q))
          : String(v).toLowerCase().includes(q)
      )
    );
  }, [records]);

  return {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    getRelatedLabels, getAvailableLabels,
    isDuplicateCode, searchRecords,
  };
}
