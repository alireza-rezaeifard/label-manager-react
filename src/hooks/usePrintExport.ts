import { useCallback } from 'react';
import * as exportUtils from '../utils/exporters';
import { estimatePaperCount } from '../utils/printHelpers';

interface PrintExportDeps {
  currentRecords: any[];
  sortedRecords: any[];
  selected: Set<number>;
  allExportFields: any[];
  printCols: number;
  printWidth: number;
  printHeight: number;
  printTemplate: string;
  printQr: boolean;
  printBarcode: boolean;
  printHistory: any[];
  sortByCode: (records: any[]) => any[];
  setPrintHistory: (h: any[]) => void;
  saveHistory: (h: any[]) => void;
  addToast: (...args: any[]) => void;
}

export function usePrintExport(deps: PrintExportDeps) {
  const {
    currentRecords, sortedRecords, selected, allExportFields,
    printCols, printWidth, printHeight, printTemplate, printQr, printBarcode,
    printHistory, sortByCode, setPrintHistory, saveHistory, addToast,
  } = deps;

  const withPrint = useCallback((entry: any) => {
    const updated = [entry, ...printHistory].slice(0, 50);
    setPrintHistory(updated);
    saveHistory(updated);
  }, [printHistory, setPrintHistory, saveHistory]);

  const handlePrint = useCallback((scope: 'selected' | 'filtered' = 'selected') => {
    const source = scope === 'filtered' ? sortedRecords : currentRecords;
    let sel = source.filter((_, i) => selected.has(i));
    if (!sel.length && scope === 'selected') sel = source;
    if (!sel.length) { addToast('هیچ رکوردی برای چاپ وجود ندارد', 'error'); return; }
    sel = sortByCode(sel);
    exportUtils.printLabels(sel, allExportFields, printCols, printWidth, printHeight, printTemplate, printQr, printBarcode);
    withPrint({
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR'),
      count: sel.length, codes: sel.map(r => r.code),
    });
    addToast(`${sel.length} برچسب برای چاپ ارسال شد (حدود ${estimatePaperCount(sel.length, printCols)} برگ)`, 'success');
  }, [currentRecords, sortedRecords, selected, sortByCode, allExportFields, printCols, printWidth, printHeight, printTemplate, printQr, printBarcode, withPrint, addToast]);

  const handleExcel = useCallback(() => {
    let sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    sel = sortByCode(sel);
    exportUtils.downloadExcel(sel, allExportFields);
    addToast('فایل اکسل با موفقیت ساخته شد', 'success');
  }, [currentRecords, selected, sortByCode, allExportFields, addToast]);

  const handleCSVExport = useCallback(() => {
    let sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    sel = sortByCode(sel);
    exportUtils.downloadCSV(sel, allExportFields);
    addToast('فایل CSV با موفقیت ساخته شد', 'success');
  }, [currentRecords, selected, sortByCode, allExportFields, addToast]);

  const handlePDF = useCallback(async () => {
    const el = document.getElementById('preview-grid');
    if (!el) return;
    try { await exportUtils.downloadPDF(el); addToast('فایل PDF با موفقیت ساخته شد', 'success'); }
    catch { addToast('خطا در ساخت PDF', 'error'); }
  }, [addToast]);

  const handleExportAllExcel = useCallback(() => {
    if (currentRecords.length === 0) { addToast('هیچ رکوردی برای خروجی وجود ندارد', 'error'); return; }
    exportUtils.downloadExcel(sortByCode(currentRecords), allExportFields);
    addToast('فایل اکسل همه رکوردها ساخته شد', 'success');
  }, [currentRecords, sortByCode, allExportFields, addToast]);

  const handleExportAllCSV = useCallback(() => {
    if (currentRecords.length === 0) { addToast('هیچ رکوردی برای خروجی وجود ندارد', 'error'); return; }
    exportUtils.downloadCSV(sortByCode(currentRecords), allExportFields);
    addToast('فایل CSV همه رکوردها ساخته شد', 'success');
  }, [currentRecords, sortByCode, allExportFields, addToast]);

  const handleExportAllPrint = useCallback(() => {
    if (currentRecords.length === 0) { addToast('هیچ رکوردی برای چاپ وجود ندارد', 'error'); return; }
    const sorted = sortByCode(currentRecords);
    exportUtils.printLabels(sorted, allExportFields, printCols, printWidth, printHeight, printTemplate, printQr, printBarcode);
    addToast(`${currentRecords.length} رکورد برای چاپ ارسال شد (حدود ${estimatePaperCount(currentRecords.length, printCols)} برگ)`, 'success');
  }, [currentRecords, sortByCode, allExportFields, printCols, printWidth, printHeight, printTemplate, printQr, printBarcode, addToast]);

  return { handlePrint, handleExcel, handleCSVExport, handlePDF, handleExportAllExcel, handleExportAllCSV, handleExportAllPrint };
}
