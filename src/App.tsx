import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecords } from './hooks/useRecords';
import { useToast } from './hooks/useToast';
import { useSWR, invalidateCache } from './hooks/useSWR';
import { usePrintExport } from './hooks/usePrintExport';
import { useWorkspace } from './hooks/useWorkspace';
import { useCustomFields } from './hooks/useCustomFields';
import { useRecordForm } from './hooks/useRecordForm';
import { useRecordsList } from './hooks/useRecordsList';
import { useWorkspaceData, loadHistory, saveHistory, loadCustomFields, saveCustomFields, loadTags, saveTags } from './hooks/useWorkspaceData';
import { FIELDS, LABEL_PRINT_COLS, LABEL_WIDTH, LABEL_HEIGHT } from './data/fields';
import { formatAmount, parseCode, formatCode } from './utils/formatters';
import { estimatePaperCount } from './utils/printHelpers';
import { api, isAuthenticated, getAuthUser } from './utils/api';

import SearchableSelect from './components/SearchableSelect';
import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TransitionPage from './components/TransitionPage';
import Toast from './components/Toast';
import ShortcutsHelp from './components/ShortcutsHelp';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import LoadingScreen from './components/LoadingScreen';
import LoadingSpinner from './components/LoadingSpinner';
import ConfirmDialog from './components/ConfirmDialog';
import FormPanel from './components/panels/FormPanel';
import ListPanel from './components/panels/ListPanel';
import {
  DashboardSkeleton, ReportsSkeleton, SettingsSkeleton,
  ProfileSkeleton, HistorySkeleton, ViewDetailSkeleton,
  ImportSkeleton, PreviewSkeleton, StatsSkeleton,
} from './components/LoadingSkeleton';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import type { RecordItem, Template, Workspace, FilterPreset, FilterState, CustomField, FormField, ActivityLogEntry } from './types';
import RecordsPage from './components/RecordsPage';
import {
  Settings as SettingsIcon, FileSpreadsheet, FileText, Printer, ArrowRight,
  ScanLine, CloudDownload, Lock, LayoutTemplate, Save, Trash2, Undo2,
  X, Palette, Tags, Check, ArrowLeft, Loader2,
} from 'lucide-react';

const StatsCards = lazy(() => import('./components/StatsCards'));
const ImportCSV = lazy(() => import('./components/ImportCSV'));
const LabelPreview = lazy(() => import('./components/LabelPreview'));
const ViewDetail = lazy(() => import('./components/ViewDetail'));
const ReportsTab = lazy(() => import('./components/ReportsTab'));
const DashboardTab = lazy(() => import('./components/DashboardTab'));
const LoginPage = lazy(() => import('./components/LoginPage'));
const ProfileTab = lazy(() => import('./components/ProfileTab'));
const HistoryTab = lazy(() => import('./components/HistoryTab'));
const SettingsTab = lazy(() => import('./components/SettingsTab'));
const PrintSettingsModal = lazy(() => import('./components/PrintSettingsModal'));
const BackupModal = lazy(() => import('./components/BackupModal'));
const QRScanner = lazy(() => import('./components/QRScanner'));
const PrintQueue = lazy(() => import('./components/PrintQueue'));
const RecordHistoryModal = lazy(() => import('./components/RecordHistoryModal'));
const TaxBookExportModal = lazy(() => import('./components/TaxBookExportModal'));
const AssistantPage = lazy(() => import('./components/AssistantPage'));
const ChatPage = lazy(() => import('./components/ChatPage'));

export default function App() {
  // ========== TOAST (needed by many hooks) ==========
  const { toasts, addToast, removeToast } = useToast();

  // ========== NAVIGATION ==========
  const location = useLocation();
  const navigate = useNavigate();
  const pathTab = location.pathname.replace('/', '').split('/')[0] || 'records';
  const validTabs = ['records', 'add', 'import', 'preview', 'view', 'history', 'profile', 'settings', 'reports', 'dashboard', 'assistant', 'chat'];
  const initialTab = validTabs.includes(pathTab) ? pathTab : 'records';

  const [tab, setTabState] = useState(initialTab);
  const viewCode = location.pathname.startsWith('/view/') ? decodeURIComponent(location.pathname.split('/')[2] || '') : '';

  useEffect(() => {
    const p = location.pathname.replace('/', '').split('/')[0] || 'records';
    const t = validTabs.includes(p) ? p : 'records';
    setTabState(prev => prev !== t ? t : prev);
  }, [location.pathname]);

  const setTab = useCallback((t: string) => {
    const target = '/' + t;
    if (location.pathname !== target) navigate(target);
    startTransition(() => { setTabState(t); });
  }, [navigate, location.pathname]);

  // ========== WORKSPACE DATA (server, auth, data fetching, settings state) ==========
  const ws = useWorkspaceData();

  // ========== LOCAL RECORDS ==========
  const {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    undo, undoStack, pushUndo,
    isDuplicateCode, checkDuplicateCode,
  } = useRecords();

  const currentRecords: RecordItem[] = ws.serverMode ? ws.serverRecords : records;

  // ========== RECORDS LIST (search, sort, filter, pagination, selection) ==========
  const list = useRecordsList(currentRecords, ws.customFields);

  // ========== RECORD FORM ==========
  const formState = useRecordForm({
    currentRecords,
    serverMode: ws.serverMode,
    currentWorkspaceId: ws.currentWorkspaceId,
    customFields: ws.customFields,
    addToast,
    setServerRecords: ws.setServerRecords,
    setServerLoading: ws.setServerLoading,
    refreshServerRecords: ws.refreshServerRecords,
    setRecords,
    setRefreshKey: ws.setRefreshKey,
    setTab,
    setPage: list.setPage,
  });

  // ========== NAVIGATION CALLBACKS (depend on formState) ==========
  const handleTabChange = useCallback((t: string) => {
    startTransition(() => {
      setTab(t);
      formState.setEditIndex(null);
      formState.setTemplateData(null);
      formState.setShowTemplates(false);
      formState.setTemplateKey(k => k + 1);
    });
  }, [setTab, formState.setEditIndex, formState.setTemplateData, formState.setShowTemplates, formState.setTemplateKey]);

  // ========== VIEW STATE ==========
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [showTaxBookModal, setShowTaxBookModal] = useState(false);

  useEffect(() => {
    if (!viewCode || currentRecords.length === 0) return;
    const idx = currentRecords.findIndex(r => r.code === viewCode);
    if (idx !== -1) setViewIndex(idx);
  }, [viewCode, currentRecords]);

  const handleView = useCallback((i: number) => {
    setViewIndex(i);
    setTab('view');
  }, [setTab]);

  const handleEdit = useCallback((i: number) => {
    formState.setEditIndex(i);
    formState.setTemplateData(null);
    setTab('add');
  }, [formState.setEditIndex, formState.setTemplateData, setTab]);

  // ========== EXPORT & PRINT ==========
  const enabledSet = new Set(ws.enabledCustomFieldKeys);
  const allExportFields = [...FIELDS, ...ws.customFields.filter((f: CustomField) => enabledSet.has(f.key))];

  const {
    handlePrint, handleExcel, handleCSVExport, handlePDF,
    handleExportAllExcel, handleExportAllCSV, handleExportAllPrint,
  } = usePrintExport({
    currentRecords, sortedRecords: list.sortedRecords, selected: list.selected, allExportFields,
    printCols: ws.printCols, printWidth: ws.printWidth, printHeight: ws.printHeight,
    printTemplate: ws.printTemplate, printQr: ws.printQr, printBarcode: ws.printBarcode,
    printHistory: ws.printHistory, sortByCode: list.sortByCode,
    setPrintHistory: ws.setPrintHistory, saveHistory, addToast,
  });

  // ========== CUSTOM FIELDS & TAGS ==========
  const {
    handleToggleCustomField, handleAddCustomField,
    handleRemoveCustomField, handleEditCustomField,
    handleAddTag, handleRemoveTag,
  } = useCustomFields(
    ws.serverMode, ws.currentWorkspaceId, ws.customFields, ws.setCustomFields, saveCustomFields,
    ws.tags, ws.setTags, saveTags, ws.setEnabledCustomFieldKeys, ws.enabledCustomFieldKeys,
    ws.newFieldName, ws.setNewFieldName, ws.newFieldType, ws.setNewFieldType,
    (v: string | null) => list.setSelectedTagFilter(v), addToast, invalidateCache,
  );

  // ========== WORKSPACE ACTIONS ==========
  const {
    handleLogin, handleLoginGoToServer, handleLogout,
    handleWorkspaceSwitch, handleCreateWorkspace,
    handleInviteMember, handleLeaveWorkspace, handleDeleteWorkspace,
  } = useWorkspace({
    serverMode: ws.serverMode, currentWorkspaceId: ws.currentWorkspaceId,
    workspaces: ws.workspaces,
    setServerMode: ws.setServerMode, setAuthUser: ws.setAuthUser,
    setLocalMode: ws.setLocalMode, setWorkspaces: ws.setWorkspaces,
    setCurrentWorkspaceId: ws.setCurrentWorkspaceId,
    setServerLoading: ws.setServerLoading, setSelected: list.setSelected,
    setTab, addToast, invalidateCache, fetchedRef: ws.fetchedRef,
  });

  // ========== RECORD OPERATIONS ==========
  const handleDeleteClick = () => {
    if (list.selected.size === 0) return;
    ws.setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const count = list.selected.size;
    if (count === 0) return;
    ws.setShowDeleteConfirm(false);
    if (ws.serverMode) {
      const ids = [...list.selected].map(i => currentRecords[i]?.id).filter(Boolean);
      if (ids.length === 0) { addToast('هیچ رکوردی برای حذف انتخاب نشده', 'error'); return; }
      ws.setServerLoading(true);
      try {
        await api.deleteRecords(ids);
        const idSet = new Set(ids);
        ws.setServerRecords(prev => prev.filter(r => !idSet.has(r.id)));
        ws.setRefreshKey(k => k + 1);
        list.setSelected(new Set());
        await ws.refreshServerRecords();
        ws.setServerLoading(false);
        addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
      } catch (err: any) {
        ws.setServerLoading(false);
        addToast('خطا در حذف: ' + err.message, 'error');
      }
    } else {
      deleteRecords(list.selected);
      list.setSelected(new Set());
      addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
    }
  };

  const handleReorder = useCallback(async (from: number, to: number) => {
    if (ws.serverMode) {
      const reordered = [...currentRecords];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      const ids = reordered.map((r: RecordItem) => r.id).filter(Boolean);
      ws.setServerRecords(reordered);
      try {
        await api.reorder(ids as number[]);
        await ws.refreshServerRecords();
      } catch (err: any) {
        ws.setServerRecords(currentRecords);
        addToast('خطا در مرتب‌سازی: ' + err.message, 'error');
      }
    } else {
      reorderRecords(from, to);
    }
  }, [ws.serverMode, currentRecords, reorderRecords, ws.refreshServerRecords, addToast]);

  const handleImport = async (imported: RecordItem[]) => {
    let ok = true;
    if (ws.serverMode) {
      for (const r of imported) {
        try {
          await api.createRecord({ ...r, workspace_id: ws.currentWorkspaceId });
        } catch {
          ok = false;
        }
      }
      if (ok) await ws.refreshServerRecords();
    } else {
      setRecords((p: RecordItem[]) => [...p, ...imported]);
    }
    if (ok) setTab('records');
  };

  const handleQRScan = (code: string) => {
    ws.setShowScanner(false);
    const idx = currentRecords.findIndex(r => r.code === code);
    if (idx === -1) { addToast(`کد "${code}" یافت نشد`, 'error'); return; }
    handleView(idx);
  };

  const handleShowVersionHistory = useCallback((id: string, code: string) => {
    ws.setVersionHistoryRecord({ id, code });
  }, []);

  const handleRestoreVersion = useCallback(async (versionId: number) => {
    if (!ws.versionHistoryRecord) return;
    try {
      if (ws.serverMode) {
        await api.restoreRecordVersion(ws.versionHistoryRecord.id, versionId);
        await ws.refreshServerRecords();
        addToast('نسخه با موفقیت بازگردانی شد', 'success');
      } else {
        addToast('بازگردانی نسخه فقط در حالت سرور پشتیبانی می‌شود', 'error');
      }
    } catch (err: any) {
      addToast('خطا در بازگردانی نسخه: ' + err.message, 'error');
    }
    ws.setVersionHistoryRecord(null);
  }, [ws.versionHistoryRecord, ws.serverMode]);

  const handleDragStart = (e: React.DragEvent, idx: number | null) => {
    list.setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (list.dragIndex !== null && list.dragIndex !== dropIdx) {
      handleReorder(list.dragIndex, dropIdx);
      list.setSelected(new Set());
    }
    list.setDragIndex(null);
  };

  const clearHistory = () => {
    ws.setPrintHistory([]);
    saveHistory([]);
    addToast('تاریخچه پاک شد', 'success');
  };

  const handleBackup = () => {
    const cache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-cache') || '{}'); } catch { return {}; } })();
    const codeCache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-code-cache') || '{}'); } catch { return {}; } })();
    const recordsWithCustomFields = list.sortByCode(currentRecords).map(r => {
      if (!ws.serverMode) return r;
      const merged = { ...r };
      for (const f of ws.customFields) {
        if (merged[f.key] === undefined) {
          const val = cache[r.id]?.[f.key] ?? codeCache[r.code]?.[f.key];
          if (val !== undefined) merged[f.key] = val;
        }
      }
      return merged;
    });
    const blob = new Blob([JSON.stringify({ records: recordsWithCustomFields, customFields: ws.customFields }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `label-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('پشتیبان با موفقیت ساخته شد', 'success');
  };

  const handleRestore = async () => {
    if (!ws.backupFile) { addToast('فایل را انتخاب کنید', 'error'); return; }
    try {
      const text = await ws.backupFile.text();
      const data = JSON.parse(text);
      let restoredRecords: RecordItem[], restoredCustomFields: CustomField[];
      const STATIC_KEYS = new Set(['id', 'code', 'project', 'type', 'date', 'party', 'amount', 'related', 'tags', 'image', 'color', 'user_id', 'created_at', 'updated_at', 'workspace_id', 'sort_order', 'notes', 'deleted_at', 'is_favorite', 'locked_by', 'locked_at']);
      if (Array.isArray(data)) {
        restoredRecords = data;
        restoredCustomFields = [];
      } else if (data && data.records) {
        restoredRecords = data.records;
        restoredCustomFields = data.customFields || [];
      } else {
        throw new Error('فرمت فایل نامعتبر');
      }
      if (!restoredCustomFields.length && restoredRecords.length > 0) {
        const customKeys = new Set<string>();
        for (const r of restoredRecords) {
          for (const k of Object.keys(r)) {
            if (!STATIC_KEYS.has(k)) customKeys.add(k);
          }
        }
        if (customKeys.size > 0) {
          restoredCustomFields = [...customKeys].map(k => ({ key: k, fa: k, label: k, fieldType: 'text' }));
        }
      }
      if (restoredCustomFields.length > 0) {
        ws.setPendingRestore({ records: restoredRecords, customFields: restoredCustomFields });
        ws.setShowRestoreConfirm(true);
      } else {
        executeRestore(restoredRecords, []);
      }
    } catch (err: any) {
      addToast('خطا در بازیابی: ' + err.message, 'error');
    }
  };

  const executeRestore = async (restoredRecords: RecordItem[], restoredCustomFields: CustomField[]) => {
    if (restoredCustomFields.length > 0) {
      ws.setCustomFields(restoredCustomFields);
      saveCustomFields(restoredCustomFields);
    }
    if (ws.serverMode) {
      ws.setServerLoading(true);
      ws.isRestoringRef.current = true;
      try {
        if (restoredCustomFields.length > 0) {
          await api.batchSaveCustomFields(restoredCustomFields, ws.currentWorkspaceId!);
        }
        await api.restore(restoredRecords, ws.currentWorkspaceId!);
        const freshRecords = await api.getAllRecords(ws.currentWorkspaceId!);
        const merged = freshRecords.map((sr: RecordItem) => {
          const br = restoredRecords.find(r => r.code === sr.code);
          if (br) return { ...br, id: sr.id, created_at: sr.created_at, updated_at: sr.updated_at, workspace_id: sr.workspace_id };
          return sr;
        });
        ws.setServerRecords(merged);
        const existingCache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-cache') || '{}'); } catch { return {}; } })();
        const codeCache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-code-cache') || '{}'); } catch { return {}; } })();
        const restoredKeys = new Set(restoredCustomFields.map(f => f.key));
        for (const r of merged) {
          const entry: Record<string, unknown> = {};
          for (const k of restoredKeys) {
            if (k in r) entry[k] = r[k];
          }
          if (Object.keys(entry).length) {
            if (r.id) existingCache[r.id] = entry;
            if (r.code) codeCache[r.code] = entry;
          }
        }
        try { localStorage.setItem('label-studio-record-cfields-cache', JSON.stringify(existingCache)); } catch {}
        try { localStorage.setItem('label-studio-record-cfields-code-cache', JSON.stringify(codeCache)); } catch {}
        ws.setRefreshKey(k => k + 1);
        ws.setServerLoading(false);
        ws.setShowBackupModal(false);
        addToast(`${restoredRecords.length} رکورد با موفقیت بازیابی شد`, 'success');
      } catch (err: any) {
        ws.setServerLoading(false);
        addToast('خطا در بازیابی: ' + err.message, 'error');
      } finally {
        ws.isRestoringRef.current = false;
        setTimeout(() => { ws.refreshServerRecordsRef.current(); }, 100);
      }
    } else {
      setRecords(restoredRecords);
      ws.setShowBackupModal(false);
      addToast(`${restoredRecords.length} رکورد با موفقیت بازیابی شد`, 'success');
    }
  };

  // ========== INLINE EDIT & FAVORITE ==========
  const handleInlineEdit = useCallback((index: number, field: string, value: string) => {
    if (ws.serverMode) {
      const record = currentRecords[index];
      if (!record) return;
      if (record.locked_by) {
        addToast(`این رکورد توسط ${record.locked_by} قفل شده و قابل ویرایش نیست`, 'warning');
        return;
      }
      ws.setServerLoading(true);
      api.updateRecord(record.id, { ...record, [field]: value }).then((updated) => {
        ws.setServerRecords((prev: RecordItem[]) => {
          const idx = prev.findIndex(r => r.id === record.id);
          if (idx >= 0) { const c = [...prev]; c[idx] = { ...updated, ...record }; return c; }
          return prev;
        });
        ws.setRefreshKey(k => k + 1);
        const merged: RecordItem = { ...record, [field]: value };
        const cfields: Record<string, unknown> = {};
        ws.customFields.forEach((f: CustomField) => { if (merged[f.key] !== undefined) cfields[f.key] = merged[f.key]; });
        if (Object.keys(cfields).length > 0) {
          const cache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-cache') || '{}'); } catch { return {}; } })();
          cache[record.id] = cfields;
          try { localStorage.setItem('label-studio-record-cfields-cache', JSON.stringify(cache)); } catch {}
          const codeCache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-code-cache') || '{}'); } catch { return {}; } })();
          if (updated.code) codeCache[updated.code] = cfields;
          try { localStorage.setItem('label-studio-record-cfields-code-cache', JSON.stringify(codeCache)); } catch {}
        }
        ws.setServerLoading(false);
        ws.refreshServerRecords();
      }).catch(() => ws.setServerLoading(false));
    } else {
      const record = currentRecords[index];
      if (!record) return;
      updateRecord(index, { ...record, [field]: value });
      ws.setRefreshKey(k => k + 1);
    }
    addToast('فیلد با موفقیت ویرایش شد', 'success');
  }, [ws.serverMode, currentRecords, ws.customFields, updateRecord, addToast]);

  const handleToggleFavorite = useCallback(async (index: number) => {
    const record = currentRecords[index];
    if (!record) return;
    if (ws.serverMode) {
      try {
        const updated = await api.toggleFavorite(record.id);
        ws.setServerRecords((prev: RecordItem[]) => prev.map(r => r.id === record.id ? { ...r, is_favorite: updated.is_favorite } : r));
        addToast(updated.is_favorite ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'success');
      } catch (err: any) {
        addToast('خطا: ' + err.message, 'error');
      }
    } else {
      const updated = { ...record, is_favorite: !record.is_favorite };
      updateRecord(index, updated);
      addToast(updated.is_favorite ? 'به علاقه‌مندی‌ها اضافه شد' : 'از علاقه‌مندی‌ها حذف شد', 'success');
    }
  }, [currentRecords, ws.serverMode, updateRecord, addToast]);

  // ========== LOCK / UNLOCK ==========
  const handleLockRecord = useCallback(async () => {
    if (viewIndex === null) return;
    const record = currentRecords[viewIndex];
    if (!record?.id) return;
    try {
      const result = await api.lockRecord(record.id);
      ws.setServerRecords((prev: RecordItem[]) => prev.map(r => r.id === record.id ? { ...r, locked_by: result.locked_by, locked_at: result.locked_at } : r));
      addToast('رکورد قفل شد', 'success');
    } catch (err: any) {
      addToast('خطا در قفل کردن: ' + err.message, 'error');
    }
  }, [viewIndex, currentRecords, addToast]);

  const handleUnlockRecord = useCallback(async () => {
    if (viewIndex === null) return;
    const record = currentRecords[viewIndex];
    if (!record?.id) return;
    try {
      await api.unlockRecord(record.id);
      ws.setServerRecords((prev: RecordItem[]) => prev.map(r => r.id === record.id ? { ...r, locked_by: undefined, locked_at: undefined } : r));
      addToast('قفل رکورد باز شد', 'success');
    } catch (err: any) {
      addToast('خطا در باز کردن قفل: ' + err.message, 'error');
    }
  }, [viewIndex, currentRecords, addToast]);

  // ========== BULK EDIT & RENUMBER ==========
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkEditTags, setBulkEditTags] = useState<string[]>([]);
  const [bulkEditColor, setBulkEditColor] = useState('');

  const handleBulkEdit = () => {
    if (!bulkEditField && bulkEditValue === undefined && bulkEditTags.length === 0 && !bulkEditColor) {
      addToast('حداقل یک فیلد، برچسب یا رنگ را مشخص کنید', 'error'); return;
    }
    const selectedIndices = [...list.selected];
    const buildUpdates = (record: RecordItem) => {
      const updates: Record<string, unknown> = {};
      if (bulkEditField && bulkEditValue !== undefined) updates[bulkEditField] = bulkEditValue;
      if (bulkEditColor) updates.color = bulkEditColor;
      if (bulkEditTags.length > 0) {
        const existing = record.tags || [];
        updates.tags = [...new Set([...existing, ...bulkEditTags])];
      }
      return updates;
    };
    if (ws.serverMode) {
      ws.setServerLoading(true);
      Promise.all(selectedIndices.map(i => {
        const record = currentRecords[i];
        if (!record) return Promise.resolve(null);
        const updates = buildUpdates(record);
        return api.updateRecord(record.id, { ...record, ...updates });
      })).then((results) => {
        const updatedMap = new Map(results.filter(Boolean).map(r => [r.id, r]));
        if (updatedMap.size > 0) {
          ws.setServerRecords((prev: RecordItem[]) => prev.map(r => updatedMap.get(r.id) || r));
        }
        ws.setRefreshKey(k => k + 1);
        const cache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-cache') || '{}'); } catch { return {}; } })();
        const codeCache = (() => { try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-code-cache') || '{}'); } catch { return {}; } })();
        selectedIndices.forEach(i => {
          const record = currentRecords[i];
          if (record) {
            const cfields: Record<string, unknown> = {};
            ws.customFields.forEach((f: CustomField) => { if (record[f.key] !== undefined) cfields[f.key] = record[f.key]; });
            if (Object.keys(cfields).length > 0) {
              const updated = updatedMap.get(record.id) || record;
              cache[record.id] = cfields;
              if (updated.code) codeCache[updated.code] = cfields;
            }
          }
        });
        try { localStorage.setItem('label-studio-record-cfields-cache', JSON.stringify(cache)); } catch {}
        try { localStorage.setItem('label-studio-record-cfields-code-cache', JSON.stringify(codeCache)); } catch {}
        ws.setServerLoading(false);
        ws.setShowBulkEdit(false);
        setBulkEditField('');
        setBulkEditValue('');
        setBulkEditTags([]);
        setBulkEditColor('');
        addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
        ws.refreshServerRecords();
      }).catch(() => {
        ws.setServerLoading(false);
        addToast('خطا در ویرایش دسته‌جمعی', 'error');
      });
    } else {
      selectedIndices.forEach(i => {
        const record = currentRecords[i];
        if (record) {
          const updates = buildUpdates(record);
          updateRecord(i, { ...record, ...updates });
        }
      });
      ws.setRefreshKey(k => k + 1);
      ws.setShowBulkEdit(false);
      setBulkEditField('');
      setBulkEditValue('');
      setBulkEditTags([]);
      setBulkEditColor('');
      addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
    }
  };

  const handleRenumber = async () => {
    if (ws.isViewer) { addToast('دسترسی محدود', 'error'); return; }
    if (currentRecords.length === 0) { addToast('هیچ رکوردی وجود ندارد', 'error'); return; }
    const snapshot = [...currentRecords];
    ws.setServerLoading(true);
    try {
      const parsed = currentRecords.map((r, i) => {
        const p = parseCode(r.code);
        return { record: r, index: i, parsed: p };
      });
      const parseable = parsed.filter(x => x.parsed !== null);
      const unparseable = parsed.filter(x => x.parsed === null);
      if (parseable.length === 0) {
        addToast('هیچ رکوردی با فرمت معتبر یافت نشد', 'error');
        ws.setServerLoading(false);
        ws.setShowRenumberConfirm(false);
        return;
      }
      const groups: Record<string, typeof parseable> = {};
      for (const item of parseable) {
        const key = `${item.parsed!.projectNum ?? ''}|${item.parsed!.type}|${item.parsed!.year}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }
      for (const key of Object.keys(groups)) {
        groups[key].sort((a, b) => {
          const dateA = a.record.date || '';
          const dateB = b.record.date || '';
          return dateA.localeCompare(dateB);
        });
      }
      const groupKeys = Object.keys(groups).sort((a, b) => {
        const [projA, typeA, yearA] = a.split('|');
        const [projB, typeB, yearB] = b.split('|');
        const pNumA = parseInt(projA, 10) || 0;
        const pNumB = parseInt(projB, 10) || 0;
        if (pNumA !== pNumB) return pNumA - pNumB;
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return yearB.localeCompare(yearA);
      });
      const newRecordsOrder: { record: RecordItem }[] = [];
      const updates: { id: number; newCode: string }[] = [];
      for (const groupKey of groupKeys) {
        const items = groups[groupKey];
        const { projectNum, type, year } = items[0].parsed!;
        items.forEach((item, seqIdx) => {
          const newCode = formatCode(projectNum, type, year, seqIdx + 1);
          if (currentRecords[item.index]?.id) {
            updates.push({ id: currentRecords[item.index].id, newCode });
          }
          newRecordsOrder.push({ record: { ...item.record, code: newCode } });
        });
      }
      for (const item of unparseable) {
        newRecordsOrder.push({ record: { ...item.record } });
      }
      const finalRecords = newRecordsOrder.map(item => item.record);
      if (ws.serverMode) {
        if (updates.length > 0) await api.renumberRecords(updates);
        ws.setServerRecords(finalRecords);
        pushUndo({ records: snapshot, label: 'renumber' });
      } else {
        try { localStorage.setItem('label-studio-records', JSON.stringify(finalRecords)); } catch {}
        setRecords(finalRecords);
        pushUndo({ records: snapshot, label: 'renumber' });
        ws.setRefreshKey(k => k + 1);
      }
      list.setSelected(new Set());
      list.setPage(1);
      addToast(`${parseable.length} رکورد با موفقیت بازنویسی شد`, 'success');
      ws.setServerLoading(false);
      ws.setShowRenumberConfirm(false);
    } catch (err: any) {
      ws.setServerLoading(false);
      addToast('خطا در بازنویسی کدها: ' + (err.message || 'خطای ناشناخته'), 'error');
    }
  };

  // ========== KEYBOARD SHORTCUTS ==========
  const keyboardHandlers = useMemo(() => ({
    onNewRecord: () => { if (ws.isViewer) { addToast('دسترسی محدود', 'error'); return; } formState.setEditIndex(null); setTab('add'); },
    onEdit: () => {
      if (ws.isViewer) { addToast('دسترسی محدود', 'error'); return; }
      const first = [...list.selected][0];
      if (first !== undefined && currentRecords[first]) { formState.setEditIndex(first); setTab('add'); }
      else { addToast('ابتدا یک رکورد را انتخاب کنید', 'error'); }
    },
    onDuplicate: () => {
      if (ws.isViewer) { addToast('دسترسی محدود', 'error'); return; }
      const first = [...list.selected][0];
      if (first !== undefined && currentRecords[first]) {
        const dup = { ...currentRecords[first], code: currentRecords[first].code + '-COPY' };
        if (ws.serverMode) {
          api.createRecord({ ...dup, workspace_id: ws.currentWorkspaceId }).then(created => {
            ws.setServerRecords((prev: RecordItem[]) => [created, ...prev]);
            ws.refreshServerRecords();
          }).catch(e => addToast(e.message, 'error'));
        } else { addRecord(dup); }
        addToast('رکورد کپی شد', 'success');
      } else { addToast('ابتدا یک رکورد را انتخاب کنید', 'error'); }
    },
    onDelete: () => { if (ws.isViewer) { addToast('دسترسی محدود', 'error'); return; } handleDeleteClick(); },
    onSearch: () => {
      const input = document.querySelector<HTMLInputElement>('.search-box input');
      if (input) { input.focus(); input.select(); }
    },
    onSave: () => {
      const form = document.querySelector('.form-card');
      if (form && tab === 'add') {
        const submitBtn = form.querySelector<HTMLElement>('.btn-primary');
        submitBtn?.click();
      }
    },
    onSelectAll: () => list.toggleAll(),
    onEscape: () => {
      if (ws.showDeleteConfirm) { ws.setShowDeleteConfirm(false); return; }
      if (ws.showPrintQueue) { ws.setShowPrintQueue(false); return; }
      if (ws.showPrintSettings) { ws.setShowPrintSettings(false); return; }
      if (ws.showBackupModal) { ws.setShowBackupModal(false); return; }
      if (ws.showRenumberConfirm) { ws.setShowRenumberConfirm(false); return; }
      if (ws.showBulkEdit) { ws.setShowBulkEdit(false); return; }
      if (ws.showScanner) { ws.setShowScanner(false); return; }
      if (formState.editIndex !== null) { formState.setEditIndex(null); setTab('records'); return; }
      if (viewIndex !== null) { setViewIndex(null); setTab('records'); return; }
      if (list.selected.size > 0) { list.setSelected(new Set()); return; }
    },
    onUndo: () => {
      if (!ws.serverMode && undoStack.length > 0) { undo(); addToast('عملیات لغو شد', 'success'); }
    },
    onTabChange: (t: string) => { formState.setEditIndex(null); setTab(t); },
  }), [ws.isViewer, ws.serverMode, ws.currentWorkspaceId, list.selected, currentRecords, formState.editIndex, viewIndex, undoStack, tab]);

  const { showHelp: showShortcutsHelp, setShowHelp: setShowShortcutsHelp } = useKeyboardShortcuts(keyboardHandlers);

  // ========== COMPUTED VALUES ==========
  const findRelated = (codes: string[]) => {
    if (!codes || !codes.length) return [];
    return currentRecords.filter(r => codes.includes(r.code));
  };

  const selectedRecords = useMemo(
    () => list.sortByCode(currentRecords.filter((_, i) => list.selected.has(i))),
    [currentRecords, list.selected, list.sortByCode]
  );

  // ========== EARLY RETURNS ==========
  if (!ws.serverMode && !ws.authUser && !getAuthUser() && !ws.localMode) {
    return <LoginPage onLogin={handleLogin} />;
  }
  if (ws.serverMode && (ws.serverLoading || (ws.swrLoading && currentRecords.length === 0))) {
    return <LoadingScreen message="در حال بارگذاری..." />;
  }

  // ========== RENDER ==========
  const allTypes = [...new Set(currentRecords.map((r: RecordItem) => r.type).filter(Boolean))] as string[];
  const allParties = [...new Set(currentRecords.map((r: RecordItem) => r.party).filter(Boolean))] as string[];

  return (
    <ErrorBoundary>
      {tab === 'chat' ? (
        <Suspense fallback={<LoadingScreen />}>
          <ChatPage />
        </Suspense>
      ) : (
      <div className={`app-container${ws.sidebarOpen ? ' sidebar-collapsed' : ''}${ws.sidebarCompact ? ' sidebar-compact' : ''}`}>
        <Sidebar
          tab={tab}
          onTabChange={handleTabChange}
          sidebarOpen={ws.sidebarOpen}
          onClose={() => ws.setSidebarOpen(false)}
          onResetForm={formState.resetForm}
          isViewer={ws.isViewer}
          serverMode={ws.serverMode}
          activityLog={ws.activityLog}
          compact={ws.sidebarCompact}
          onToggleCompact={ws.toggleSidebarCompact}
          onRefreshActivity={ws.handleRefreshActivity}
        />

        <main className="main-content">
          <Header
            search={list.search}
            onSearchChange={(v: string) => { list.setSearch(v); list.setPage(1); }}
            theme={ws.theme}
            onToggleTheme={ws.toggleTheme}
            onToggleSidebar={ws.toggleSidebar}
            onSettingsClick={() => setTab('settings')}
            onProfileClick={() => setTab('profile')}
            onShortcutsHelp={() => setShowShortcutsHelp(true)}
            connectionStatus={ws.serverMode ? ws.connectionStatus : undefined}
          />

          <div className="content-area">
            {tab !== 'assistant' && (
            <div className="page-header">
              <div>
                <h1 className="page-title">
                  {tab === 'records' && 'مدیریت سوابق'}
                  {tab === 'add' && (formState.editIndex !== null ? 'ویرایش رکورد' : 'افزودن رکورد جدید')}
                  {tab === 'import' && 'ورود از CSV'}
                  {tab === 'preview' && 'پیش‌نمایش برچسب‌ها'}
                  {tab === 'view' && 'جزئیات برچسب'}
                  {tab === 'history' && 'تاریخچه چاپ'}
                  {tab === 'profile' && 'پروفایل'}
                  {tab === 'settings' && 'تنظیمات'}
                  {tab === 'reports' && 'گزارش‌ها و آمار'}
                  {tab === 'dashboard' && 'داشبورد'}
                  {tab === 'assistant' && 'دستیار هوشمند'}
                </h1>
                <p className="page-subtitle">ابزار مدیریت اسناد و چاپ برچسب</p>
              </div>

              <div className="d-flex gap-2 flex-wrap align-items-center">
                {tab === 'preview' && list.selected.size > 0 && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => ws.setShowPrintSettings(true)}>
                      <SettingsIcon className="h-4 w-4" /> تنظیمات چاپ
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleExcel}>
                      <FileSpreadsheet className="h-4 w-4" /> اکسل
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleCSVExport}>
                      <FileText className="h-4 w-4" /> CSV
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handlePDF}>
                      <FileText className="h-4 w-4" /> PDF
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => handlePrint('selected')}>
                       <Printer className="h-4 w-4" /> چاپ ({selectedRecords.length} عدد، حدود {estimatePaperCount(selectedRecords.length, ws.printCols)} برگ)
                     </button>
                  </>
                )}
                {tab === 'view' && viewIndex !== null && (
                  <button className="btn btn-outline btn-sm" onClick={() => { setViewIndex(null); setTab('records'); list.setSelected(new Set([viewIndex])); }}>
                    <ArrowRight className="h-4 w-4" /> بازگشت
                  </button>
                )}
                {(tab === 'records' || tab === 'add' || tab === 'import') && (
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('preview')}>
                    <Printer className="h-4 w-4" /> پیش‌نمایش
                  </button>
                )}
                {ws.serverMode && (
                  <WorkspaceSwitcher
                    workspaces={ws.workspaces}
                    currentWorkspaceId={ws.currentWorkspaceId}
                    onSwitch={handleWorkspaceSwitch}
                    onCreateWorkspace={handleCreateWorkspace}
                    onInviteMember={handleInviteMember}
                    onLeave={handleLeaveWorkspace}
                    onDeleteWorkspace={handleDeleteWorkspace}
                    currentRole={ws.currentWsRole}
                  />
                )}
                <button className="btn btn-outline btn-sm" onClick={() => ws.setShowPrintQueue(true)}>
                  <Printer className="h-4 w-4" /> صف چاپ
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => ws.setShowScanner(true)}>
                  <ScanLine className="h-4 w-4" /> اسکن QR
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => ws.setShowBackupModal(true)}>
                  <CloudDownload className="h-4 w-4" /> پشتیبان
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowTaxBookModal(true)}>
                  <FileSpreadsheet className="h-4 w-4" /> خروجی دفتر مالی
                </button>
                <button className="btn btn-outline btn-sm" onClick={ws.serverMode ? handleLogout : handleLoginGoToServer}>
                  <i className={`ti ${ws.serverMode ? 'ti-logout' : 'ti-server'}`}></i>
                  {ws.serverMode ? 'خروج' : 'ورود به سرور'}
                </button>
              </div>
            </div>
            )}

            <TransitionPage tab={tab}>
              {tab !== 'view' && tab !== 'settings' && tab !== 'profile' && tab !== 'reports' && tab !== 'dashboard' && tab !== 'assistant' && (
                <StatsCards records={currentRecords} selected={list.selected} filtered={list.sortedRecords} />
              )}

              {tab === 'records' && (
                <ListPanel
                  currentRecords={currentRecords}
                  sortedRecords={list.sortedRecords}
                  pagedRecords={list.pagedRecords}
                  selected={list.selected}
                  sortBy={list.sortBy}
                  sortOrder={list.sortOrder}
                  refreshKey={ws.refreshKey}
                  search={list.search}
                  filterType={list.filterType}
                  filterParty={list.filterParty}
                  filterDateFrom={list.filterDateFrom}
                  filterDateTo={list.filterDateTo}
                  filterAmountMin={list.filterAmountMin}
                  filterAmountMax={list.filterAmountMax}
                  selectedTagFilter={list.selectedTagFilter}
                  allTypes={allTypes}
                  allParties={allParties}
                  viewMode={list.viewMode}
                  useVirtualScroll={list.useVirtualScroll}
                  serverLoading={ws.serverLoading}
                  safePage={list.safePage}
                  totalPages={list.totalPages}
                  customFields={ws.customFields}
                  enabledCustomFieldKeys={ws.enabledCustomFieldKeys}
                  tags={ws.tags}
                  findRelated={findRelated}
                  recordToIndex={list.recordToIndex}
                  isViewer={ws.isViewer}
                  serverMode={ws.serverMode}
                  onSort={list.handleSort}
                  onToggleSelect={list.toggleSelect}
                  onToggleAll={list.toggleAll}
                  onEdit={handleEdit}
                  onView={handleView}
                  onDeleteClick={handleDeleteClick}
                  onExcel={handleExcel}
                  onCSVExport={handleCSVExport}
                  onExportAllExcel={handleExportAllExcel}
                  onExportAllCSV={handleExportAllCSV}
                  onExportAllPrint={handleExportAllPrint}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                  onSetDragIndex={(i: number | null) => list.setDragIndex(i)}
                  onInlineEdit={handleInlineEdit}
                  onToggleFavorite={handleToggleFavorite}
                  onApplyPreset={list.handleApplyPreset}
                  onTabChange={setTab}
                  onSetViewMode={list.setViewMode}
                  onSetUseVirtualScroll={list.setUseVirtualScroll}
                  onSetFilterType={list.setFilterType}
                  onSetFilterParty={list.setFilterParty}
                  onSetFilterDateFrom={list.setFilterDateFrom}
                  onSetFilterDateTo={list.setFilterDateTo}
                  onSetFilterAmountMin={list.setFilterAmountMin}
                  onSetFilterAmountMax={list.setFilterAmountMax}
                  onSetSelectedTagFilter={list.setSelectedTagFilter}
                  onSetPage={list.setPage}
                  onShowRenumberConfirm={ws.setShowRenumberConfirm}
                  onShowBulkEdit={ws.setShowBulkEdit}
                  onSetEnabledCustomFieldKeys={ws.setEnabledCustomFieldKeys}
                  onClearSelection={() => list.setSelected(new Set())}
                  addToast={addToast}
                />
              )}

              {tab === 'add' && (
                <FormPanel
                  isViewer={ws.isViewer}
                  editIndex={formState.editIndex}
                  editRecord={formState.editRecord}
                  availLabels={formState.availLabels}
                  isDuplicateCode={isDuplicateCode}
                  checkDuplicateCode={checkDuplicateCode}
                  onSubmit={formState.handleSubmit}
                  onCancel={() => { formState.setEditIndex(null); formState.setTemplateData(null); setTab('records'); }}
                  addToast={addToast}
                  customFields={ws.customFields}
                  serverMode={ws.serverMode}
                  allTags={ws.tags}
                  loading={ws.serverLoading}
                  onFormChange={(data: RecordItem) => { formState.formDraftRef.current = data; }}
                  fieldSuggestions={formState.fieldSuggestions}
                  templateName={formState.templateName}
                  setTemplateName={formState.setTemplateName}
                  showTemplates={formState.showTemplates}
                  setShowTemplates={formState.setShowTemplates}
                  templates={formState.templates}
                  handleSaveTemplate={formState.handleSaveTemplate}
                  handleLoadTemplate={formState.handleLoadTemplate}
                  handleDeleteTemplate={formState.handleDeleteTemplate}
                  templateKey={formState.templateKey}
                  onAddTemplateCustomFields={(fields) => {
                    fields.forEach(f => {
                      if (!ws.customFields.find((cf: CustomField) => cf.key === f.key)) {
                        const cf: CustomField = { key: f.key, label: f.label, fa: f.fa, type: f.type, options: f.type === 'dropdown' ? [] : undefined };
                        ws.setCustomFields((prev: CustomField[]) => [...prev, cf]);
                        ws.saveCustomFields([...ws.customFields, cf]);
                        if (ws.serverMode) {
                          api.createCustomField({ ...cf, workspace_id: ws.currentWorkspaceId }).catch(() => {});
                        }
                      }
                    });
                  }}
                />
              )}

              {tab === 'import' && (
                <Suspense fallback={<ImportSkeleton />}>
                  <ImportCSV onImport={handleImport} addToast={addToast} existingRecords={currentRecords} customFields={ws.customFields} />
                </Suspense>
              )}

              {tab === 'view' && viewIndex !== null && (
                <Suspense fallback={<ViewDetailSkeleton />}>
                  <ViewDetail
                    record={currentRecords[viewIndex]}
                    relatedRecords={findRelated(currentRecords[viewIndex]?.related)}
                    onEdit={() => handleEdit(viewIndex)}
                    customFields={ws.customFields}
                    onNavigateToRelated={(rel: { code: string }) => {
                      const idx = currentRecords.findIndex(r => r.code === rel.code);
                      if (idx !== -1) setViewIndex(idx);
                    }}
                    onShowHistory={ws.serverMode ? () => {
                      const r = currentRecords[viewIndex];
                      handleShowVersionHistory(r.id, r.code);
                    } : undefined}
                    onLock={ws.serverMode ? handleLockRecord : undefined}
                    onUnlock={ws.serverMode ? handleUnlockRecord : undefined}
                    serverMode={ws.serverMode}
                    currentUserName={ws.authUser?.username}
                  />
                </Suspense>
              )}

              {tab === 'preview' && (
                <Suspense fallback={<PreviewSkeleton />}>
                  <LabelPreview selectedRecords={selectedRecords} onGoToRecords={() => setTab('records')} customFields={ws.customFields} enabledCustomFieldKeys={ws.enabledCustomFieldKeys} />
                </Suspense>
              )}

              {tab === 'history' && (
                <Suspense fallback={<HistorySkeleton />}>
                  <HistoryTab printHistory={ws.printHistory} clearHistory={clearHistory} />
                </Suspense>
              )}

              {tab === 'reports' && (
                <Suspense fallback={<ReportsSkeleton />}>
                  <ReportsTab records={currentRecords} onFilter={(type: string, value: string) => {
                    list.setSearch(''); list.setFilterType(''); list.setFilterParty('');
                    list.setFilterDateFrom(''); list.setFilterDateTo('');
                    list.setFilterAmountMin(''); list.setFilterAmountMax('');
                    list.setSelectedTagFilter(null);
                    if (type === 'type') list.setFilterType(value);
                    else if (type === 'party') list.setFilterParty(value);
                    else list.setSearch(value);
                    list.setPage(1);
                    setTab('records');
                  }} />
                </Suspense>
              )}

              {tab === 'dashboard' && (
                <Suspense fallback={<DashboardSkeleton />}>
                  <DashboardTab records={currentRecords} customFields={ws.customFields} tags={ws.tags} activityLog={ws.activityLog} onTabChange={setTab} />
                </Suspense>
              )}

              {tab === 'assistant' && (
                <Suspense fallback={<StatsSkeleton />}>
                  <AssistantPage />
                </Suspense>
              )}

              {tab === 'profile' && (
                <Suspense fallback={<ProfileSkeleton />}>
                  <ProfileTab
                    authUser={ws.authUser}
                    serverMode={ws.serverMode}
                    recordCount={currentRecords.length}
                    onLogin={handleLoginGoToServer}
                    onBackup={handleBackup}
                    onOpenBackupModal={() => ws.setShowBackupModal(true)}
                    addToast={addToast}
                  />
                </Suspense>
              )}

              {tab === 'settings' && (
                <Suspense fallback={<SettingsSkeleton />}>
                   <SettingsTab
                    customFields={ws.customFields}
                    onAddField={handleAddCustomField}
                    onRemoveField={handleRemoveCustomField}
                    onEditField={handleEditCustomField}
                    newFieldName={ws.newFieldName}
                    onNewFieldNameChange={ws.setNewFieldName}
                    newFieldType={ws.newFieldType}
                    onNewFieldTypeChange={ws.setNewFieldType}
                    serverMode={ws.serverMode}
                    authUser={ws.authUser}
                    tags={ws.tags}
                    onAddTag={handleAddTag}
                    onRemoveTag={handleRemoveTag}
                    useVirtualScroll={list.useVirtualScroll}
                    onToggleVirtualScroll={() => list.setUseVirtualScroll(p => !p)}
                    theme={ws.theme}
                    onThemeChange={ws.setTheme}
                    aiApiUrl={ws.aiApiUrl}
                    onAiApiUrlChange={ws.setAiApiUrl}
                    aiApiKey={ws.aiApiKey}
                    onAiApiKeyChange={ws.setAiApiKey}
                    aiModel={ws.aiModel}
                    onAiModelChange={ws.setAiModel}
                    aiCorsProxy={ws.aiCorsProxy}
                    onAiCorsProxyChange={ws.setAiCorsProxy}
                    addToast={addToast}
                  />
                </Suspense>
              )}
            </TransitionPage>
          </div>
        </main>

        <Toast toasts={toasts} onRemove={removeToast} />

        {!ws.serverMode && undoStack.length > 0 && (
          <div className="undo-redo-bar" style={{
            position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1rem', borderRadius: 12,
            background: 'var(--card-bg)', border: '1px solid var(--border-color)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 1000,
            fontSize: '0.85rem',
          }}>
            <button className="btn btn-outline btn-sm" onClick={() => { undo(); addToast('عملیات لغو شد', 'success'); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Undo2 className="h-4 w-4" /> لغو
            </button>
            <span style={{ opacity: 0.5 }}>{undoStack.length} عملیات قابل بازگشت</span>
          </div>
        )}

        <ShortcutsHelp show={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

        <Suspense fallback={null}>
          <PrintSettingsModal
            show={ws.showPrintSettings}
            onClose={() => ws.setShowPrintSettings(false)}
            printTemplate={ws.printTemplate}
            setPrintTemplate={ws.setPrintTemplate}
            printCols={ws.printCols}
            setPrintCols={ws.setPrintCols}
            printWidth={ws.printWidth}
            setPrintWidth={ws.setPrintWidth}
            printHeight={ws.printHeight}
            setPrintHeight={ws.setPrintHeight}
            printQr={ws.printQr}
            setPrintQr={ws.setPrintQr}
            printBarcode={ws.printBarcode}
            setPrintBarcode={ws.setPrintBarcode}
            customFields={ws.customFields}
            enabledCustomFieldKeys={ws.enabledCustomFieldKeys}
            onToggleCustomField={handleToggleCustomField}
          />
        </Suspense>

        <Suspense fallback={null}>
          <BackupModal
            show={ws.showBackupModal}
            onClose={() => ws.setShowBackupModal(false)}
            recordCount={currentRecords.length}
            onBackup={handleBackup}
            onRestore={handleRestore}
            setBackupFile={ws.setBackupFile}
            isViewer={ws.isViewer}
          />
        </Suspense>

        {ws.showRestoreConfirm && ws.pendingRestore && (
          <div className="modal-overlay" onClick={() => { ws.setShowRestoreConfirm(false); ws.setPendingRestore(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>بازیابی فیلدهای سفارشی</h3>
                <X className="h-5 w-5 cursor-pointer" onClick={() => { ws.setShowRestoreConfirm(false); ws.setPendingRestore(null); }} />
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem', lineHeight: 1.8 }}>
                فایل پشتیبان شامل <strong>{ws.pendingRestore.customFields.length} فیلد سفارشی</strong> است:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {ws.pendingRestore.customFields.map(cf => (
                  <span key={cf.key} style={{ padding: '0.3rem 0.7rem', background: 'var(--hover-bg)', borderRadius: 8, fontSize: '0.85rem' }}>
                    {cf.fa || cf.label || cf.key}
                  </span>
                ))}
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1.5rem', lineHeight: 1.8 }}>
                آیا مایل به بازیابی این فیلدها هستید؟
              </p>
              <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => { ws.setShowRestoreConfirm(false); ws.setPendingRestore(null); }}>
                  فقط رکوردها
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const pr = ws.pendingRestore;
                  ws.setShowRestoreConfirm(false);
                  ws.setPendingRestore(null);
                  executeRestore(pr.records, pr.customFields);
                }}>
                  بازیابی با فیلدها
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          show={ws.showDeleteConfirm}
          title="حذف رکوردها"
          message={`آیا از حذف ${list.selected.size} رکورد انتخاب شده اطمینان دارید؟ این عملیات قابل بازگشت نیست.`}
          confirmLabel="حذف شود"
          cancelLabel="انصراف"
          variant="danger"
          icon="ti-alert-triangle"
          loading={ws.serverLoading}
          onConfirm={handleDelete}
          onCancel={() => ws.setShowDeleteConfirm(false)}
        />

        {ws.showRenumberConfirm && (
          <div className="modal-overlay" onClick={() => ws.setShowRenumberConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>بازنویسی کدها</h3>
                <X className="h-5 w-5 cursor-pointer" onClick={() => ws.setShowRenumberConfirm(false)} />
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem', lineHeight: 1.8 }}>
                همه رکوردها بر اساس پروژه، نوع و سال مرتب شده و کدهای آنها بازنویسی می‌شوند.
                محتوای رکوردها تغییری نمی‌کند. ادامه می‌دهید؟
              </p>
              <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => ws.setShowRenumberConfirm(false)}>
                  انصراف
                </button>
                <button className="btn btn-primary" onClick={handleRenumber} disabled={ws.serverLoading}>
                  {ws.serverLoading ? <><LoadingSpinner size={18} /> در حال اجرا...</> : 'تایید و بازنویسی'}
                </button>
              </div>
            </div>
          </div>
        )}

        {ws.showBulkEdit && (
          <div className="modal-overlay" onClick={() => ws.setShowBulkEdit(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>ویرایش دسته‌جمعی</h3>
                <X className="h-5 w-5 cursor-pointer" onClick={() => ws.setShowBulkEdit(false)} />
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{list.selected.size} رکورد انتخاب شده</p>

              <div className="form-group">
                <label className="form-label">فیلد</label>
                <SearchableSelect
                  value={(() => {
                    const std = FIELDS.find(f => f.key === bulkEditField);
                    const cus = ws.customFields.find((f: CustomField) => f.key === bulkEditField);
                    return std?.fa || cus?.fa || bulkEditField;
                  })()}
                  options={[
                    ...FIELDS.filter(f => f.key !== 'code' && f.key !== 'related').map(f => f.fa),
                    ...ws.customFields.map((f: CustomField) => f.fa),
                  ]}
                  onChange={(label: string) => {
                    const std = FIELDS.find(f => f.fa === label);
                    const cus = ws.customFields.find((f: CustomField) => f.fa === label);
                    setBulkEditField(std?.key || cus?.key || '');
                  }}
                  dir="rtl"
                />
              </div>
              <div className="form-group">
                <label className="form-label">مقدار جدید</label>
                <input type="text" className="form-input" value={bulkEditValue} onChange={e => setBulkEditValue(e.target.value)} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

              <div className="form-group">
                <label className="form-label">
                  <Palette className="h-4 w-4" style={{ marginRight: 8 }} />
                  رنگ
                </label>
                <div className="d-flex gap-2 align-items-center">
                  <input type="color" value={bulkEditColor || '#7367f0'}
                    onChange={e => setBulkEditColor(e.target.value)}
                    style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2, background: 'none' }} />
                  <input type="text" className="form-input" value={bulkEditColor}
                    onChange={e => setBulkEditColor(e.target.value)}
                    placeholder="#7367f0" style={{ marginBottom: 0, fontFamily: 'monospace' }} />
                  <button className="btn btn-outline btn-sm" onClick={() => setBulkEditColor('')}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Tags className="h-4 w-4" style={{ marginRight: 8 }} />
                  افزودن برچسب
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {ws.tags.map((tag: string) => {
                    const active = bulkEditTags.includes(tag);
                    return (
                      <span key={tag} onClick={() => {
                        const next = active ? bulkEditTags.filter(t => t !== tag) : [...bulkEditTags, tag];
                        setBulkEditTags(next);
                      }} style={{
                        padding: '0.4rem 0.8rem', borderRadius: 20, cursor: 'pointer',
                        fontSize: '0.85rem', transition: 'all 0.2s',
                        background: active ? 'var(--primary)' : 'var(--bg-body)',
                        color: active ? 'white' : 'var(--text-color)',
                        border: active ? 'none' : '1px solid var(--border-color)',
                      }}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>

              <button className="btn btn-primary w-100" onClick={handleBulkEdit} disabled={ws.serverLoading}>
                {ws.serverLoading ? <LoadingSpinner size={18} /> : <Check className="h-4 w-4" />} اعمال به {list.selected.size} رکورد
              </button>
            </div>
          </div>
        )}

        {ws.showScanner && (
          <Suspense fallback={null}>
            <QRScanner
              onScan={handleQRScan}
              onClose={() => ws.setShowScanner(false)}
            />
          </Suspense>
        )}

        {ws.showPrintQueue && (
          <Suspense fallback={null}>
            <PrintQueue
              records={currentRecords}
              selectedRecords={selectedRecords}
              addToast={addToast}
              onClose={() => ws.setShowPrintQueue(false)}
            />
          </Suspense>
        )}

        {ws.versionHistoryRecord && (
          <Suspense fallback={null}>
            <RecordHistoryModal
              recordId={ws.versionHistoryRecord.id}
              recordCode={ws.versionHistoryRecord.code}
              onClose={() => ws.setVersionHistoryRecord(null)}
              onRestore={handleRestoreVersion}
              addToast={addToast}
            />
          </Suspense>
        )}

        {showTaxBookModal && (
          <Suspense fallback={null}>
            <TaxBookExportModal
              open={showTaxBookModal}
              onClose={() => setShowTaxBookModal(false)}
              allRecords={currentRecords}
              selectedRecords={selectedRecords}
              sortedRecords={list.sortedRecords}
              customFields={ws.customFields}
              enabledCustomFieldKeys={ws.enabledCustomFieldKeys}
              aiApiUrl={ws.aiApiUrl}
              aiApiKey={ws.aiApiKey}
              aiModel={ws.aiModel}
              aiCorsProxy={ws.aiCorsProxy}
              addToast={addToast}
            />
          </Suspense>
        )}
      </div>
      )}
    </ErrorBoundary>
  );
}
