import React, { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRecords } from './hooks/useRecords';
import { useToast } from './hooks/useToast';
import { useSWR, invalidateCache } from './hooks/useSWR';
import { usePrintExport } from './hooks/usePrintExport';
import { useWorkspace } from './hooks/useWorkspace';
import { useCustomFields } from './hooks/useCustomFields';
import { FIELDS, LABEL_PRINT_COLS, LABEL_WIDTH, LABEL_HEIGHT, PAGE_SIZE } from './data/fields';
import { formatAmount, parseCode, formatCode } from './utils/formatters';
import { estimatePaperCount } from './utils/printHelpers';
import { api, isAuthenticated, getAuthUser } from './utils/api';

import ErrorBoundary from './components/ErrorBoundary';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import TransitionPage from './components/TransitionPage';
import RecordForm from './components/RecordForm';
import Toast from './components/Toast';
import ShortcutsHelp from './components/ShortcutsHelp';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import LoadingScreen from './components/LoadingScreen';
import LoadingSpinner from './components/LoadingSpinner';
import ConfirmDialog from './components/ConfirmDialog';
import {
  DashboardSkeleton, ReportsSkeleton, SettingsSkeleton,
  ProfileSkeleton, HistorySkeleton, ViewDetailSkeleton,
  ImportSkeleton, PreviewSkeleton,
} from './components/LoadingSkeleton';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useWebSocket } from './hooks/useWebSocket';
import { useDebounce } from './hooks/useDebounce';
import type { RecordItem } from './types';
import RecordsPage from './components/RecordsPage';

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

const HISTORY_KEY = 'label-studio-print-history';
const CUSTOM_FIELDS_KEY = 'label-studio-custom-fields';
const TAGS_KEY = 'label-studio-tags';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h: any[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* localStorage may be full */ }
}
function loadCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]'); } catch { return []; }
}
function saveCustomFields(f: any[]) {
  try { localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(f)); } catch { /* localStorage may be full */ }
}
function loadTags() {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]'); } catch { return []; }
}
function saveTags(t: string[]) {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); } catch { /* localStorage may be full */ }
}

const RECORD_CUSTOM_FIELDS_CACHE_KEY = 'label-studio-record-cfields-cache';
const RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY = 'label-studio-record-cfields-code-cache';

function loadRecordCustomFieldsCache() {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CACHE_KEY) || '{}'); } catch { return {}; }
}

function saveRecordCustomFieldsCache(data: Record<string, unknown>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CACHE_KEY, JSON.stringify(data)); } catch { /* */ }
}

function loadRecordCustomFieldsCodeCache() {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY) || '{}'); } catch { return {}; }
}

function saveRecordCustomFieldsCodeCache(data: Record<string, unknown>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY, JSON.stringify(data)); } catch { /* */ }
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathTab = location.pathname.replace('/', '').split('/')[0] || 'records';
  const validTabs = ['records', 'add', 'import', 'preview', 'view', 'history', 'profile', 'settings', 'reports', 'dashboard'];
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
    setTabState(t);
  }, [navigate, location.pathname]);
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('local_mode') === 'true');
  const [authUser, setAuthUser] = useState(() => localMode ? null : getAuthUser());
  const [serverMode, setServerMode] = useState(() => localMode ? false : !!getAuthUser());

  const {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    undo, undoStack, pushUndo,
    isDuplicateCode,
  } = useRecords();

  const [serverRecords, setServerRecords] = useState<any[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchedRef = useRef(false);
  const isRestoringRef = useRef(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [viewIndex, setViewIndex] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 150);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    try { return localStorage.getItem('sidebar-compact') === 'true'; } catch { return false; }
  });

  const toggleSidebarCompact = useCallback(() => {
    setSidebarCompact(p => {
      const next = !p;
      try { localStorage.setItem('sidebar-compact', String(next)); } catch {}
      return next;
    });
  }, []);

  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [printHistory, setPrintHistory] = useState(loadHistory);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printCols, setPrintCols] = useState(LABEL_PRINT_COLS);
  const [printWidth, setPrintWidth] = useState(LABEL_WIDTH);
  const [printHeight, setPrintHeight] = useState(LABEL_HEIGHT);
  const [printTemplate, setPrintTemplate] = useState('classic');
  const [printQr, setPrintQr] = useState(false);
  const [printBarcode, setPrintBarcode] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const [customFields, setCustomFields] = useState(loadCustomFields);
  const [enabledCustomFieldKeys, setEnabledCustomFieldKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('label-studio-enabled-cfields');
    if (saved) return JSON.parse(saved);
    const fields = loadCustomFields();
    return fields.map((f: any) => f.key);
  });
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ records: any[]; customFields: any[] } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  const [tags, setTags] = useState(loadTags);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [viewMode, setViewMode] = useState(() => { try { return localStorage.getItem('view_mode') || 'card'; } catch { return 'card'; } });
  const [templates, setTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem('label-studio-record-templates') || '[]'); } catch { return []; } });
  const [templateName, setTemplateName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);
  const formDraftRef = useRef<any>(null);
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkEditTags, setBulkEditTags] = useState<string[]>([]);
  const [bulkEditColor, setBulkEditColor] = useState('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showRenumberConfirm, setShowRenumberConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [versionHistoryRecord, setVersionHistoryRecord] = useState<{ id: string; code: string } | null>(null);
  const [showPrintQueue, setShowPrintQueue] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() => {
    const saved = localStorage.getItem('current_workspace_id');
    return saved ? parseInt(saved, 10) : null;
  });

  const { toasts, addToast, removeToast } = useToast();

  const { data: activityLog = [], revalidate: refreshActivity } = useSWR<any[]>(
    serverMode && currentWorkspaceId ? `activity:${currentWorkspaceId}` : null,
    () => api.getActivity(currentWorkspaceId!).then((data: any) => data || []),
    { revalidateOnMount: true, refreshInterval: 15000 }
  );

  const handleRefreshActivity = useCallback(() => {
    invalidateCache(`activity:${currentWorkspaceId}`);
    refreshActivity();
  }, [refreshActivity, currentWorkspaceId]);

  const [useVirtualScroll, setUseVirtualScroll] = useState(() => {
    try { return localStorage.getItem('use_virtual_scroll') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('use_virtual_scroll', String(useVirtualScroll)); } catch { /* may be full */ }
  }, [useVirtualScroll]);

  useEffect(() => {
    setEnabledCustomFieldKeys(prev => {
      const next = new Set(prev);
      for (const f of customFields) next.add(f.key);
      const arr = [...next];
      localStorage.setItem('label-studio-enabled-cfields', JSON.stringify(arr));
      return arr;
    });
  }, [customFields]);

  useEffect(() => {
    if (serverMode && currentWorkspaceId) {
      api.getCustomFields(currentWorkspaceId).then(serverFields => {
        if (serverFields && serverFields.length > 0) {
          setCustomFields((prev: any[]) => {
            const merged = [...serverFields];
            for (const local of prev) {
              if (!merged.find(f => f.key === local.key)) {
                merged.push(local);
              }
            }
            saveCustomFields(merged);
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [serverMode, currentWorkspaceId]);

  // SWR fetcher: fetch records from server + merge custom fields
  const fetchServerRecords = useCallback(async () => {
    if (!serverMode || !currentWorkspaceId) return [];
    const data = await api.getAllRecords(currentWorkspaceId);
    const cache = loadRecordCustomFieldsCache();
    const codeCache = loadRecordCustomFieldsCodeCache();
    const customKeys = new Set<string>(customFields.map((f: any) => f.key));
    return data.map((serverRecord: any) => {
      const merged: any = { ...serverRecord };
      for (const key of customKeys) {
        const val = cache[serverRecord.id]?.[key] ?? codeCache[serverRecord.code]?.[key];
        if (val !== undefined) merged[key] = val;
      }
      return merged;
    });
  }, [serverMode, currentWorkspaceId, customFields]);

  const { data: swrData, isLoading: swrLoading, revalidate } = useSWR(
    serverMode && currentWorkspaceId ? `records:${currentWorkspaceId}` : null,
    fetchServerRecords,
  );

  // Sync SWR data to serverRecords
  useEffect(() => {
    if (swrData) setServerRecords(swrData as any[]);
  }, [swrData]);

  const refreshServerRecords = useCallback(async () => {
    if (!serverMode || !currentWorkspaceId) return;
    invalidateCache(`records:${currentWorkspaceId}`);
    await revalidate();
  }, [revalidate, serverMode, currentWorkspaceId]);

  useWebSocket(serverMode ? currentWorkspaceId : null, refreshServerRecords);

  const currentRecords: any[] = serverMode ? serverRecords : records;

  useEffect(() => {
    if (!viewCode || currentRecords.length === 0) return;
    const idx = currentRecords.findIndex(r => r.code === viewCode);
    if (idx !== -1) setViewIndex(idx);
  }, [viewCode, currentRecords]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const handleAuthChange = () => {
      if (!isAuthenticated()) {
        setServerMode(false);
        setAuthUser(null);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [theme]);

  useEffect(() => {
    if (serverMode && !fetchedRef.current) {
      fetchedRef.current = true;

      api.getWorkspaces().then(wsList => {
        setWorkspaces(wsList);
        if (!currentWorkspaceId && wsList.length > 0) {
          setCurrentWorkspaceId(wsList[0].id);
          localStorage.setItem('current_workspace_id', String(wsList[0].id));
        }
      }).catch(() => {});
    }
  }, [serverMode, currentWorkspaceId]);

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light');
  const toggleSidebar = () => setSidebarOpen(p => !p);
  const resetForm = () => setEditIndex(null);

  const handleTabChange = useCallback((t: string) => {
    setTab(t);
    setEditIndex(null);
    setTemplateData(null);
  }, [setTab]);

  const toggleSelect = useCallback((i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const toggleAll = () => {
    const filtered = getSortedRecords();
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(r => r.__lid !== undefined ? r.__lid : currentRecords.indexOf(r))));
    }
  };

  const sortByCode = useCallback((records: RecordItem[]) => {
    return [...records].sort((a, b) => {
      const pa = parseCode(a.code);
      const pb = parseCode(b.code);
      if (pa && pb) {
        if (pa.projectNum !== pb.projectNum) return pa.projectNum - pb.projectNum;
        if (pa.type !== pb.type) return pa.type.localeCompare(pb.type);
        if (pa.year !== pb.year) return pb.year.localeCompare(pa.year);
        return pb.sequence - pa.sequence;
      }
      if (pa) return -1;
      if (pb) return 1;
      return a.code.localeCompare(b.code);
    });
  }, []);

  const getSortedRecords = useCallback(() => {
    let result = currentRecords;

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = currentRecords.filter(r => {
        const formattedAmount = formatAmount(r.amount);
        const customFieldMatch = customFields.some((f: any) =>
          r[f.key] && formatAmount(r[f.key]).toLowerCase().includes(q)
        );
        return Object.values(r).some(v =>
          Array.isArray(v)
            ? v.some(item => String(item).toLowerCase().includes(q))
            : String(v).toLowerCase().includes(q)
        ) || (formattedAmount && formattedAmount.toLowerCase().includes(q)) || customFieldMatch;
      });
    }

    if (filterType) {
      result = result.filter(r => r.type === filterType);
    }
    if (filterParty) {
      result = result.filter(r => r.party === filterParty);
    }
    if (selectedTagFilter) {
      result = result.filter(r => r.tags && r.tags.includes(selectedTagFilter));
    }
    if (filterDateFrom) {
      result = result.filter(r => r.date && r.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter(r => r.date && r.date <= filterDateTo);
    }
    if (filterAmountMin) {
      result = result.filter(r => {
        const amt = parseFloat(r.amount);
        return !isNaN(amt) && amt >= parseFloat(filterAmountMin);
      });
    }
    if (filterAmountMax) {
      result = result.filter(r => {
        const amt = parseFloat(r.amount);
        return !isNaN(amt) && amt <= parseFloat(filterAmountMax);
      });
    }
    if (sortBy === 'code') {
      result = sortByCode(result);
      if (sortOrder === 'desc') result.reverse();
    } else if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = String(a[sortBy] || '').toLowerCase();
        const bVal = String(b[sortBy] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else {
      result = sortByCode(result);
    }
    return result;
  }, [debouncedSearch, sortBy, sortOrder, currentRecords, filterType, filterParty, selectedTagFilter, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, customFields]);

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const handleApplyPreset = useCallback((filters: any) => {
    setSearch(filters.search || '');
    setFilterType(filters.filterType || '');
    setFilterParty(filters.filterParty || '');
    setFilterDateFrom(filters.filterDateFrom || '');
    setFilterDateTo(filters.filterDateTo || '');
    setFilterAmountMin(filters.filterAmountMin || '');
    setFilterAmountMax(filters.filterAmountMax || '');
    setSelectedTagFilter(filters.selectedTagFilter || null);
    setPage(1);
  }, []);

  const sortedRecords = useMemo(() => getSortedRecords(), [getSortedRecords]);
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = useMemo(
    () => sortedRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedRecords, safePage]
  );

  const recordToIndex: Map<any, number> = useMemo(
    () => new Map(currentRecords.map((r: any, i) => [r, i] as [any, number])),
    [currentRecords]
  );

  const enabledSet = new Set(enabledCustomFieldKeys);
  const allExportFields = [...FIELDS, ...customFields.filter((f: any) => enabledSet.has(f.key))];

  const serverOp = async (fn: () => Promise<any>) => {
    if (!serverMode) return true;
    setServerLoading(true);
    try { await fn(); setServerLoading(false); return true; }
    catch (err: any) { addToast(err.message, 'error'); setServerLoading(false); return false; }
  };

  const handleSubmit = async (recordData: any) => {
    if (editIndex !== null) {
      if (serverMode) {
        const record = currentRecords[editIndex];
        if (!record) { addToast('رکورد یافت نشد', 'error'); return; }
        setServerLoading(true);
        try {
          const updated = await api.updateRecord(record.id, recordData);
          const cfields: Record<string, unknown> = {};
          customFields.forEach((f: any) => { if (recordData[f.key] !== undefined) cfields[f.key] = recordData[f.key]; });
          if (Object.keys(cfields).length > 0) {
            const cache = loadRecordCustomFieldsCache();
            cache[record.id] = cfields;
            saveRecordCustomFieldsCache(cache);
            const codeCache = loadRecordCustomFieldsCodeCache();
            if (updated.code) codeCache[updated.code] = cfields;
            saveRecordCustomFieldsCodeCache(codeCache);
          }
          setServerRecords(prev => {
            const idx = prev.findIndex(r => r.id === record.id);
            if (idx >= 0) { const c = [...prev]; c[idx] = { ...updated, ...recordData }; return c; }
            return prev;
          });
          setRefreshKey(k => k + 1);
          setServerLoading(false);
          setEditIndex(null);
          setTemplateData(null);
          await refreshServerRecords();
          addToast('رکورد با موفقیت ویرایش شد', 'success');
          setTab('records');
        } catch (err: any) {
          setServerLoading(false);
          addToast('خطا در ویرایش: ' + err.message, 'error');
        }
      } else {
        updateRecord(editIndex, recordData);
        setRefreshKey(k => k + 1);
        setEditIndex(null);
        setTemplateData(null);
        addToast('رکورد با موفقیت ویرایش شد', 'success');
        setTab('records');
      }
    } else {
      if (serverMode) {
        setServerLoading(true);
        try {
          const created = await api.createRecord({ ...recordData, workspace_id: currentWorkspaceId });
          const cfields: Record<string, unknown> = {};
          customFields.forEach((f: any) => { if (recordData[f.key] !== undefined) cfields[f.key] = recordData[f.key]; });
          if (Object.keys(cfields).length > 0) {
            const cache = loadRecordCustomFieldsCache();
            cache[created.id] = cfields;
            saveRecordCustomFieldsCache(cache);
            const codeCache = loadRecordCustomFieldsCodeCache();
            if (created.code) codeCache[created.code] = cfields;
            saveRecordCustomFieldsCodeCache(codeCache);
          }
          setServerRecords(prev => [{ ...created, ...recordData }, ...prev]);
          setRefreshKey(k => k + 1);
          setTemplateData(null);
          setServerLoading(false);
          await refreshServerRecords();
          addToast('رکورد با موفقیت اضافه شد', 'success');
          setTab('records');
          setPage(1);
        } catch (err: any) {
          setServerLoading(false);
          addToast('خطا در ایجاد: ' + err.message, 'error');
        }
      } else {
        addRecord(recordData);
        setRefreshKey(k => k + 1);
        setTemplateData(null);
        addToast('رکورد با موفقیت اضافه شد', 'success');
        setTab('records');
        setPage(1);
      }
    }
  };

  const handleEdit = (i: number) => { setEditIndex(i); setTemplateData(null); setTab('add'); };
  const handleView = (i: number) => { setViewIndex(i); setTab('view'); };

  const handleDeleteClick = () => {
    if (selected.size === 0) return;
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    const count = selected.size;
    if (count === 0) return;
    setShowDeleteConfirm(false);

    if (serverMode) {
      const ids = [...selected].map(i => currentRecords[i]?.id).filter(Boolean);
      if (ids.length === 0) { addToast('هیچ رکوردی برای حذف انتخاب نشده', 'error'); return; }
      setServerLoading(true);
      try {
        await api.deleteRecords(ids);
        const idSet = new Set(ids);
        setServerRecords(prev => prev.filter(r => !idSet.has(r.id)));
        setRefreshKey(k => k + 1);
        setSelected(new Set());
        await refreshServerRecords();
        setServerLoading(false);
        addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
      } catch (err: any) {
        setServerLoading(false);
        addToast('خطا در حذف: ' + err.message, 'error');
      }
    } else {
      deleteRecords(selected);
      setSelected(new Set());
      addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
    }
  };

  const handleImport = async (imported: any[]) => {
    let ok = true;
    if (serverMode) {
      ok = await serverOp(async () => {
        for (const r of imported) {
          await api.createRecord({ ...r, workspace_id: currentWorkspaceId });
        }
        await refreshServerRecords();
      });
    } else {
      setRecords(p => [...p, ...imported]);
    }
    if (ok) setTab('records');
  };

  const handleReorder = (from: number, to: number) => {
    if (serverMode) return;
    reorderRecords(from, to);
  };

  const handleQRScan = (code: string) => {
    setShowScanner(false);
    const idx = currentRecords.findIndex(r => r.code === code);
    if (idx === -1) {
      addToast(`کد "${code}" یافت نشد`, 'error');
      return;
    }
    handleView(idx);
  };

  const handleShowVersionHistory = useCallback((id: string, code: string) => {
    setVersionHistoryRecord({ id, code });
  }, []);

  const handleRestoreVersion = useCallback(async (versionId: number) => {
    if (!versionHistoryRecord) return;
    try {
      if (serverMode) {
        await api.restoreRecordVersion(versionHistoryRecord.id, versionId);
        await refreshServerRecords();
        addToast('نسخه با موفقیت بازگردانی شد', 'success');
      } else {
        addToast('بازگردانی نسخه فقط در حالت سرور پشتیبانی می‌شود', 'error');
      }
    } catch (err: any) {
      addToast('خطا در بازگردانی نسخه: ' + err.message, 'error');
    }
    setVersionHistoryRecord(null);
  }, [versionHistoryRecord, serverMode]);

  const {
    handlePrint, handleExcel, handleCSVExport, handlePDF,
    handleExportAllExcel, handleExportAllCSV, handleExportAllPrint,
  } = usePrintExport({
    currentRecords, sortedRecords, selected, allExportFields,
    printCols, printWidth, printHeight, printTemplate, printQr, printBarcode,
    printHistory, sortByCode, setPrintHistory, saveHistory, addToast,
  });

  const {
    handleToggleCustomField, handleAddCustomField,
    handleRemoveCustomField, handleEditCustomField,
    handleAddTag, handleRemoveTag,
  } = useCustomFields(
    serverMode, currentWorkspaceId, customFields, setCustomFields, saveCustomFields,
    tags, setTags, saveTags, setEnabledCustomFieldKeys, enabledCustomFieldKeys,
    newFieldName, setNewFieldName, newFieldType, setNewFieldType, setSelectedTagFilter, addToast, invalidateCache,
  );

  const {
    handleLogin, handleLoginGoToServer, handleLogout,
    handleWorkspaceSwitch, handleCreateWorkspace,
    handleInviteMember, handleLeaveWorkspace, handleDeleteWorkspace,
  } = useWorkspace({
    serverMode, currentWorkspaceId, workspaces, setServerMode, setAuthUser,
    setLocalMode, setWorkspaces, setCurrentWorkspaceId,
    setServerLoading, setSelected, setTab, addToast, invalidateCache, fetchedRef,
  });

  const handleDragStart = (e: React.DragEvent, idx: number | null) => { setDragIndex(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIdx) {
      handleReorder(dragIndex, dropIdx);
      setSelected(new Set());
    }
    setDragIndex(null);
  };

  const clearHistory = () => { setPrintHistory([]); saveHistory([]); addToast('تاریخچه پاک شد', 'success'); };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify({ records: sortByCode(currentRecords), customFields }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `label-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('پشتیبان با موفقیت ساخته شد', 'success');
  };

  const handleRestore = async () => {
    if (!backupFile) { addToast('فایل را انتخاب کنید', 'error'); return; }
    try {
      const text = await backupFile.text();
      const data = JSON.parse(text);
      let restoredRecords: any, restoredCustomFields: any;
      const STATIC_KEYS = new Set(['id', 'code', 'project', 'type', 'date', 'party', 'amount', 'related', 'tags', 'image', 'color', 'user_id', 'created_at', 'updated_at', 'workspace_id', 'sort_order']);
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
          restoredCustomFields = [...customKeys].map(k => ({ key: k, fa: k, label: k, field_type: 'text' }));
        }
      }

      if (restoredCustomFields.length > 0) {
        setPendingRestore({ records: restoredRecords, customFields: restoredCustomFields });
        setShowRestoreConfirm(true);
      } else {
        executeRestore(restoredRecords, []);
      }
    } catch (err: any) {
      addToast('خطا در بازیابی: ' + err.message, 'error');
    }
  };

  const executeRestore = async (restoredRecords: any[], restoredCustomFields: any[]) => {
    if (restoredCustomFields.length > 0) {
      setCustomFields(restoredCustomFields);
      saveCustomFields(restoredCustomFields);
    }

    if (serverMode) {
      setServerLoading(true);
      isRestoringRef.current = true;
      try {
        if (restoredCustomFields.length > 0) {
          await api.batchSaveCustomFields(restoredCustomFields, currentWorkspaceId!);
        }
        await api.restore(restoredRecords, currentWorkspaceId!);
        const freshRecords = await api.getAllRecords(currentWorkspaceId!);
        const merged = freshRecords.map((sr: any) => {
          const br = restoredRecords.find(r => r.code === sr.code);
          if (br) return { ...br, id: sr.id, created_at: sr.created_at, updated_at: sr.updated_at, workspace_id: sr.workspace_id };
          return sr;
        });
        setServerRecords(merged);
        const existingCache = loadRecordCustomFieldsCache();
        const codeCache = loadRecordCustomFieldsCodeCache();
        const restoredKeys = new Set(restoredCustomFields.map(f => f.key));
        for (const r of merged) {
          const entry: any = {};
          for (const k of restoredKeys) {
            if (k in r) entry[k] = r[k];
          }
          if (Object.keys(entry).length) {
            if (r.id) existingCache[r.id] = entry;
            if (r.code) codeCache[r.code] = entry;
          }
        }
        saveRecordCustomFieldsCache(existingCache);
        saveRecordCustomFieldsCodeCache(codeCache);
        setRefreshKey(k => k + 1);
        setServerLoading(false);
        setShowBackupModal(false);
        addToast(`${restoredRecords.length} رکورد با موفقیت بازیابی شد`, 'success');
      } catch (err: any) {
        setServerLoading(false);
        addToast('خطا در بازیابی: ' + err.message, 'error');
      } finally {
        isRestoringRef.current = false;
      }
    } else {
      setRecords(restoredRecords);
      setShowBackupModal(false);
      addToast(`${restoredRecords.length} رکورد با موفقیت بازیابی شد`, 'success');
    }
  };

  const TEMPLATES_KEY = 'label-studio-record-templates';
  const saveTemplates = (t: any[]) => { try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); } catch {} };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { addToast('نام الگو را وارد کنید', 'error'); return; }
    if (templates.some((t: any) => t.name === templateName.trim())) { addToast('این الگو قبلا وجود دارد', 'error'); return; }
    const sourceRecord = editIndex !== null ? currentRecords[editIndex] : (templateData || formDraftRef.current);
    if (!sourceRecord || !sourceRecord.code) { addToast('ابتدا یک رکورد را باز کنید یا فیلدها را پر کنید', 'error'); return; }
    const newTemplate = { name: templateName.trim(), fields: { ...sourceRecord } };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    saveTemplates(updated);
    setTemplateName('');
    setShowTemplates(false);
    addToast(`الگوی "${newTemplate.name}" ذخیره شد`, 'success');
  };

  const handleLoadTemplate = (tmpl: any) => {
    setShowTemplates(false);
    if (tmpl.fields && tmpl.fields.code) {
      if (editIndex !== null) {
        updateRecord(editIndex, tmpl.fields);
      } else {
        setTemplateData(tmpl.fields);
        setTab('add');
      }
      addToast(`الگوی "${tmpl.name}" اعمال شد`, 'success');
    } else {
      addToast('این الگو معتبر نیست (قدیمی یا خالی). لطفا حذف کنید و دوباره ذخیره نمایید', 'error');
    }
  };

  const handleDeleteTemplate = (name: string) => {
    const updated = templates.filter((t: any) => t.name !== name);
    setTemplates(updated);
    saveTemplates(updated);
    addToast(`الگوی "${name}" حذف شد`, 'success');
  };

  useEffect(() => { try { localStorage.setItem('view_mode', viewMode); } catch {} }, [viewMode]);

  const handleInlineEdit = (index: number, field: string, value: string) => {
    if (serverMode) {
      const record = currentRecords[index];
      if (!record) return;
      setServerLoading(true);
      api.updateRecord(record.id, { ...record, [field]: value }).then((updated) => {
        setServerRecords(prev => {
          const idx = prev.findIndex(r => r.id === record.id);
          if (idx >= 0) { const c = [...prev]; c[idx] = { ...updated, ...record }; return c; }
          return prev;
        });
        setRefreshKey(k => k + 1);
        const merged: any = { ...record, [field]: value };
        const cfields: Record<string, unknown> = {};
        customFields.forEach((f: any) => { if (merged[f.key] !== undefined) cfields[f.key] = merged[f.key]; });
        if (Object.keys(cfields).length > 0) {
          const cache = loadRecordCustomFieldsCache();
          cache[record.id] = cfields;
          saveRecordCustomFieldsCache(cache);
          const codeCache = loadRecordCustomFieldsCodeCache();
          if (updated.code) codeCache[updated.code] = cfields;
          saveRecordCustomFieldsCodeCache(codeCache);
        }
        setServerLoading(false);
        refreshServerRecords();
      }).catch(() => setServerLoading(false));
    } else {
      const record = currentRecords[index];
      if (!record) return;
      updateRecord(index, { ...record, [field]: value });
      setRefreshKey(k => k + 1);
    }
    addToast('فیلد با موفقیت ویرایش شد', 'success');
  };


  const handleBulkEdit = () => {
    if (!bulkEditField && bulkEditValue === undefined && bulkEditTags.length === 0 && !bulkEditColor) {
      addToast('حداقل یک فیلد، برچسب یا رنگ را مشخص کنید', 'error'); return;
    }
    const selectedIndices = [...selected];
    const buildUpdates = (record: any) => {
      const updates: any = {};
      if (bulkEditField && bulkEditValue !== undefined) {
        updates[bulkEditField] = bulkEditValue;
      }
      if (bulkEditColor) {
        updates.color = bulkEditColor;
      }
      if (bulkEditTags.length > 0) {
        const existing = record.tags || [];
        updates.tags = [...new Set([...existing, ...bulkEditTags])];
      }
      return updates;
    };
    if (serverMode) {
      setServerLoading(true);
      Promise.all(selectedIndices.map(i => {
        const record = currentRecords[i];
        if (!record) return Promise.resolve(null);
        const updates = buildUpdates(record);
        return api.updateRecord(record.id, { ...record, ...updates });
      })).then((results) => {
        const updatedMap = new Map(results.filter(Boolean).map(r => [r.id, r]));
        if (updatedMap.size > 0) {
          setServerRecords(prev => prev.map(r => updatedMap.get(r.id) || r));
        }
        setRefreshKey(k => k + 1);
        const cache = loadRecordCustomFieldsCache();
        const codeCache = loadRecordCustomFieldsCodeCache();
        selectedIndices.forEach(i => {
          const record = currentRecords[i];
          if (record) {
            const cfields: Record<string, unknown> = {};
            customFields.forEach((f: any) => { if (record[f.key] !== undefined) cfields[f.key] = record[f.key]; });
            if (Object.keys(cfields).length > 0) {
              const updated = updatedMap.get(record.id) || record;
              cache[record.id] = cfields;
              if (updated.code) codeCache[updated.code] = cfields;
            }
          }
        });
        saveRecordCustomFieldsCache(cache);
        saveRecordCustomFieldsCodeCache(codeCache);
        setServerLoading(false);
        setShowBulkEdit(false);
        setBulkEditField('');
        setBulkEditValue('');
        setBulkEditTags([]);
        setBulkEditColor('');
        addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
        refreshServerRecords();
      }).catch(() => {
        setServerLoading(false);
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
      setRefreshKey(k => k + 1);
      setShowBulkEdit(false);
      setBulkEditField('');
      setBulkEditValue('');
      setBulkEditTags([]);
      setBulkEditColor('');
      addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
    }
  };

  const handleRenumber = async () => {
    if (isViewer) { addToast('دسترسی محدود', 'error'); return; }
    if (currentRecords.length === 0) { addToast('هیچ رکوردی وجود ندارد', 'error'); return; }

    const snapshot = [...currentRecords];
    setServerLoading(true);
    try {
      const parsed = currentRecords.map((r, i) => {
        const p = parseCode(r.code);
        return { record: r, index: i, parsed: p };
      });

      const parseable = parsed.filter(x => x.parsed !== null);
      const unparseable = parsed.filter(x => x.parsed === null);

      if (parseable.length === 0) {
        addToast('هیچ رکوردی با فرمت معتبر (PROJxxx-YYY-xxxx-xxx) یافت نشد', 'error');
        setServerLoading(false);
        setShowRenumberConfirm(false);
        return;
      }

      const groups: Record<string, typeof parseable> = {};
      for (const item of parseable) {
        const key = `${item.parsed!.projectNum}|${item.parsed!.type}|${item.parsed!.year}`;
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
        const pNumA = parseInt(projA, 10);
        const pNumB = parseInt(projB, 10);
        if (pNumA !== pNumB) return pNumA - pNumB;
        if (typeA !== typeB) return typeA.localeCompare(typeB);
        return yearB.localeCompare(yearA);
      });

      const newRecordsOrder: { record: any }[] = [];
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

      if (serverMode) {
        if (updates.length > 0) {
          await api.renumberRecords(updates as any);
        }
        setServerRecords(finalRecords);
        pushUndo({ records: snapshot, label: 'renumber' });
      } else {
        try { localStorage.setItem('label-studio-records', JSON.stringify(finalRecords)); } catch {}
        setRecords(finalRecords);
        pushUndo({ records: snapshot, label: 'renumber' });
        setRefreshKey(k => k + 1);
      }

      setSelected(new Set());
      setPage(1);
      addToast(`${parseable.length} رکورد با موفقیت بازنویسی شد`, 'success');
      setServerLoading(false);
      setShowRenumberConfirm(false);
    } catch (err: any) {
      setServerLoading(false);
      addToast('خطا در بازنویسی کدها: ' + (err.message || 'خطای ناشناخته'), 'error');
    }
  };

  const keyboardHandlers = {
    onNewRecord: () => { if (isViewer) { addToast('دسترسی محدود', 'error'); return; } setEditIndex(null); setTab('add'); },
    onEdit: () => {
      if (isViewer) { addToast('دسترسی محدود', 'error'); return; }
      const first = [...selected][0];
      if (first !== undefined && currentRecords[first]) {
        setEditIndex(first); setTab('add');
      } else {
        addToast('ابتدا یک رکورد را انتخاب کنید', 'error');
      }
    },
    onDuplicate: () => {
      if (isViewer) { addToast('دسترسی محدود', 'error'); return; }
      const first = [...selected][0];
      if (first !== undefined && currentRecords[first]) {
        const dup = { ...currentRecords[first], code: currentRecords[first].code + '-COPY' };
        if (serverMode) {
          api.createRecord({ ...dup, workspace_id: currentWorkspaceId }).then(created => {
            setServerRecords(prev => [created, ...prev]);
            refreshServerRecords();
          }).catch(e => addToast(e.message, 'error'));
        } else {
          addRecord(dup);
        }
        addToast('رکورد کپی شد', 'success');
      } else {
        addToast('ابتدا یک رکورد را انتخاب کنید', 'error');
      }
    },
    onDelete: () => { if (isViewer) { addToast('دسترسی محدود', 'error'); return; } handleDeleteClick(); },
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
    onSelectAll: () => toggleAll(),
    onEscape: () => {
      if (showDeleteConfirm) { setShowDeleteConfirm(false); return; }
      if (showPrintQueue) { setShowPrintQueue(false); return; }
      if (showPrintSettings) { setShowPrintSettings(false); return; }
      if (showBackupModal) { setShowBackupModal(false); return; }
      if (showRenumberConfirm) { setShowRenumberConfirm(false); return; }
      if (showBulkEdit) { setShowBulkEdit(false); return; }
      if (showScanner) { setShowScanner(false); return; }
      if (editIndex !== null) { setEditIndex(null); setTab('records'); return; }
      if (viewIndex !== null) { setViewIndex(null); setTab('records'); return; }
      if (selected.size > 0) { setSelected(new Set()); return; }
    },
    onUndo: () => {
      if (!serverMode && undoStack.length > 0) {
        undo();
        addToast('عملیات لغو شد', 'success');
      }
    },
    onTabChange: (t: string) => { setEditIndex(null); setTab(t); },
  };

  const { showHelp: showShortcutsHelp, setShowHelp: setShowShortcutsHelp } = useKeyboardShortcuts(keyboardHandlers);

  const availLabels = editIndex !== null
    ? currentRecords.filter(r => r.code !== currentRecords[editIndex]?.code)
    : currentRecords;
  const editRecord = editIndex !== null ? currentRecords[editIndex] : templateData;
  const selectedRecords = sortByCode(currentRecords.filter((_, i) => selected.has(i)));

  const findRelated = (codes: string[]) => {
    if (!codes || !codes.length) return [];
    return currentRecords.filter(r => codes.includes(r.code));
  };

  const currentWs = workspaces.find(w => w.id === currentWorkspaceId);
  const currentWsRole = currentWs?.member_role;
  const isViewer = serverMode && currentWsRole === 'viewer';

  if (!serverMode && !authUser && !getAuthUser() && !localMode) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (serverMode && (serverLoading || (swrLoading && currentRecords.length === 0))) {
    return <LoadingScreen message="در حال بارگذاری..." />;
  }

  const allTypes = [...new Set(currentRecords.map((r: any) => r.type).filter(Boolean))] as string[];
  const allParties = [...new Set(currentRecords.map((r: any) => r.party).filter(Boolean))] as string[];

  return (
    <ErrorBoundary>
      <div className={`app-container${sidebarOpen ? ' sidebar-collapsed' : ''}${sidebarCompact ? ' sidebar-compact' : ''}`}>
        <Sidebar
          tab={tab}
          onTabChange={handleTabChange}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onResetForm={resetForm}
          isViewer={isViewer}
          serverMode={serverMode}
          activityLog={activityLog}
          compact={sidebarCompact}
          onToggleCompact={toggleSidebarCompact}
          onRefreshActivity={handleRefreshActivity}
        />

        <main className="main-content">
          <Header
            search={search}
            onSearchChange={(v: string) => { setSearch(v); setPage(1); }}
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleSidebar={toggleSidebar}
            onSettingsClick={() => setTab('settings')}
            onProfileClick={() => setTab('profile')}
            onShortcutsHelp={() => setShowShortcutsHelp(true)}
          />

          <div className="content-area">
            <div className="page-header">
              <div>
                <h1 className="page-title">
                  {tab === 'records' && 'مدیریت سوابق'}
                  {tab === 'add' && (editIndex !== null ? 'ویرایش رکورد' : 'افزودن رکورد جدید')}
                  {tab === 'import' && 'ورود از CSV'}
                  {tab === 'preview' && 'پیش‌نمایش برچسب‌ها'}
                  {tab === 'view' && 'جزئیات برچسب'}
                  {tab === 'history' && 'تاریخچه چاپ'}
                  {tab === 'profile' && 'پروفایل'}
                  {tab === 'settings' && 'تنظیمات'}
                  {tab === 'reports' && 'گزارش‌ها و آمار'}
                  {tab === 'dashboard' && 'داشبورد'}
                </h1>
                <p className="page-subtitle">ابزار مدیریت اسناد و چاپ برچسب</p>
              </div>

              <div className="d-flex gap-2 flex-wrap align-items-center">
                {tab === 'preview' && selected.size > 0 && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowPrintSettings(true)}>
                      <i className="ti ti-settings"></i> تنظیمات چاپ
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleExcel}>
                      <i className="ti ti-file-excel"></i> اکسل
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handleCSVExport}>
                      <i className="ti ti-file-text"></i> CSV
                    </button>
                    <button className="btn btn-outline btn-sm" onClick={handlePDF}>
                      <i className="ti ti-file-type-pdf"></i> PDF
                    </button>
                    <button className="btn btn-success btn-sm" onClick={() => handlePrint('selected')}>
                       <i className="ti ti-printer"></i> چاپ ({selectedRecords.length} عدد، حدود {estimatePaperCount(selectedRecords.length, printCols)} برگ)
                     </button>
                  </>
                )}
                {tab === 'view' && viewIndex !== null && (
                  <button className="btn btn-outline btn-sm" onClick={() => { setViewIndex(null); setTab('records'); setSelected(new Set([viewIndex])); }}>
                    <i className="ti ti-arrow-right"></i> بازگشت
                  </button>
                )}
                {(tab === 'records' || tab === 'add' || tab === 'import') && (
                  <button className="btn btn-outline btn-sm" onClick={() => setTab('preview')}>
                    <i className="ti ti-printer"></i> پیش‌نمایش
                  </button>
                )}
                {serverMode && (
                  <WorkspaceSwitcher
                    workspaces={workspaces}
                    currentWorkspaceId={currentWorkspaceId}
                    onSwitch={handleWorkspaceSwitch}
                    onCreateWorkspace={handleCreateWorkspace}
                    onInviteMember={handleInviteMember}
                    onLeave={handleLeaveWorkspace}
                    onDeleteWorkspace={handleDeleteWorkspace}
                    currentRole={currentWsRole}
                  />
                )}
                <button className="btn btn-outline btn-sm" onClick={() => setShowPrintQueue(true)}>
                  <i className="ti ti-printer"></i> صف چاپ
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowScanner(true)}>
                  <i className="ti ti-scan"></i> اسکن QR
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowBackupModal(true)}>
                  <i className="ti ti-cloud-download"></i> پشتیبان
                </button>
                <button className="btn btn-outline btn-sm" onClick={serverMode ? handleLogout : handleLoginGoToServer}>
                  <i className={`ti ${serverMode ? 'ti-logout' : 'ti-server'}`}></i>
                  {serverMode ? 'خروج' : 'ورود به سرور'}
                </button>
              </div>
            </div>

            <TransitionPage tab={tab}>
              {tab !== 'view' && tab !== 'settings' && tab !== 'profile' && tab !== 'reports' && tab !== 'dashboard' && (
              <StatsCards records={currentRecords} selected={selected} filtered={sortedRecords} />
            )}

            {tab === 'records' && (
              <RecordsPage
                currentRecords={currentRecords}
                sortedRecords={sortedRecords}
                pagedRecords={pagedRecords}
                selected={selected}
                sortBy={sortBy}
                sortOrder={sortOrder}
                refreshKey={refreshKey}
                search={search}
                filterType={filterType}
                filterParty={filterParty}
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                filterAmountMin={filterAmountMin}
                filterAmountMax={filterAmountMax}
                selectedTagFilter={selectedTagFilter}
                allTypes={allTypes}
                allParties={allParties}
                viewMode={viewMode}
                useVirtualScroll={useVirtualScroll}
                serverLoading={serverLoading}
                safePage={safePage}
                totalPages={totalPages}
                customFields={customFields}
                enabledCustomFieldKeys={enabledCustomFieldKeys}
                tags={tags}
                findRelated={findRelated}
                recordToIndex={recordToIndex}
                isViewer={isViewer}
                serverMode={serverMode}
                onSort={handleSort}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAll}
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
                onSetDragIndex={(i: number | null) => setDragIndex(i)}
                onInlineEdit={handleInlineEdit}
                onApplyPreset={handleApplyPreset}
                onTabChange={setTab}
                onSetViewMode={setViewMode}
                onSetUseVirtualScroll={setUseVirtualScroll}
                onSetFilterType={setFilterType}
                onSetFilterParty={setFilterParty}
                onSetFilterDateFrom={setFilterDateFrom}
                onSetFilterDateTo={setFilterDateTo}
                onSetFilterAmountMin={setFilterAmountMin}
                onSetFilterAmountMax={setFilterAmountMax}
                onSetSelectedTagFilter={setSelectedTagFilter}
                onSetPage={setPage}
                onShowRenumberConfirm={setShowRenumberConfirm}
                onShowBulkEdit={setShowBulkEdit}
                onSetEnabledCustomFieldKeys={setEnabledCustomFieldKeys}
                onClearSelection={() => setSelected(new Set())}
                addToast={addToast}
              />
            )}

            {tab === 'add' && (
              <div className="fade-in">
                {isViewer ? (
                  <div className="empty-state">
                    <div className="empty-icon"><i className="ti ti-lock"></i></div>
                    <h3 style={{ marginBottom: '0.5rem' }}>دسترسی محدود</h3>
                    <p style={{ opacity: 0.7 }}>شما دسترسی مشاهده دارید و نمی‌توانید رکورد جدید اضافه یا ویرایش کنید</p>
                  </div>
                ) : (
                <>
                {!editIndex && (
                  <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                    <div className="d-flex gap-2 align-items-center">
                      <button className="btn btn-outline btn-sm" onClick={() => setShowTemplates(p => !p)}>
                        <i className="ti ti-template"></i> الگوها
                      </button>
                      {templates.length > 0 && (
                        <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{templates.length} الگو</span>
                      )}
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                      <input type="text" className="form-input" placeholder="نام الگو..."
                        style={{ width: 150, marginBottom: 0 }}
                        value={templateName} onChange={e => setTemplateName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveTemplate()} />
                      <button className="btn btn-outline btn-sm" onClick={handleSaveTemplate}>
                        <i className="ti ti-device-floppy"></i> ذخیره به عنوان الگو
                      </button>
                    </div>
                  </div>
                )}
                {showTemplates && templates.length > 0 && (
                  <div className="form-card mb-4">
                    <h4 style={{ marginBottom: '1rem' }}>الگوهای ذخیره شده</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {templates.map((tmpl: any, i: number) => (
                        <div key={i} className="template-card" onClick={() => handleLoadTemplate(tmpl)}>
                          <i className="ti ti-template" style={{ fontSize: '1.5rem', color: tmpl.fields?.code ? 'var(--primary)' : 'var(--danger)' }}></i>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{tmpl.fields?.project || (tmpl.fields?.code ? '' : 'نامعتبر - حذف کنید')}</div>
                          </div>
                          <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.5, color: 'var(--danger)' }}
                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.name); }}></i>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <RecordForm
                  editRecord={editRecord}
                  editIndex={editIndex}
                  availableLabels={availLabels}
                  isDuplicateCode={isDuplicateCode}
                  onSubmit={handleSubmit}
                  onCancel={() => { setEditIndex(null); setTemplateData(null); setTab('records'); }}
                  addToast={addToast}
                  customFields={customFields}
                  serverMode={serverMode}
                  allTags={tags}
                  loading={serverLoading}
                  onFormChange={(data: any) => { formDraftRef.current = data; }}
                />
              </>
            )}
          </div>
        )}

            {tab === 'import' && (
              <Suspense fallback={<ImportSkeleton />}>
                <ImportCSV onImport={handleImport} addToast={addToast} existingRecords={currentRecords} customFields={customFields} />
              </Suspense>
            )}

            {tab === 'view' && viewIndex !== null && (
              <Suspense fallback={<ViewDetailSkeleton />}>
                <ViewDetail
                  record={currentRecords[viewIndex]}
                  relatedRecords={findRelated(currentRecords[viewIndex]?.related)}
                  onEdit={() => handleEdit(viewIndex)}
                  customFields={customFields}
                  onNavigateToRelated={(rel: { code: string }) => {
                    const idx = currentRecords.findIndex(r => r.code === rel.code);
                    if (idx !== -1) setViewIndex(idx);
                  }}
                  onShowHistory={serverMode ? () => {
                    const r = currentRecords[viewIndex];
                    handleShowVersionHistory(r.id, r.code);
                  } : undefined}
                />
              </Suspense>
            )}

            {tab === 'preview' && (
              <Suspense fallback={<PreviewSkeleton />}>
                <LabelPreview selectedRecords={selectedRecords} onGoToRecords={() => setTab('records')} customFields={customFields} enabledCustomFieldKeys={enabledCustomFieldKeys} />
              </Suspense>
            )}

            {tab === 'history' && (
              <Suspense fallback={<HistorySkeleton />}>
                <HistoryTab printHistory={printHistory} clearHistory={clearHistory} />
              </Suspense>
            )}

            {tab === 'reports' && (
              <Suspense fallback={<ReportsSkeleton />}>
                <ReportsTab records={currentRecords}                 onFilter={(type: string, value: string) => {
                  setSearch(''); setFilterType(''); setFilterParty('');
                  setFilterDateFrom(''); setFilterDateTo('');
                  setFilterAmountMin(''); setFilterAmountMax('');
                  setSelectedTagFilter(null);
                  if (type === 'type') setFilterType(value);
                  else if (type === 'party') setFilterParty(value);
                  else setSearch(value);
                  setPage(1);
                  setTab('records');
                }} />
              </Suspense>
            )}

            {tab === 'dashboard' && (
              <Suspense fallback={<DashboardSkeleton />}>
                <DashboardTab records={currentRecords} customFields={customFields} tags={tags} activityLog={activityLog} onTabChange={setTab} />
              </Suspense>
            )}

            {tab === 'profile' && (
              <Suspense fallback={<ProfileSkeleton />}>
                <ProfileTab
                  authUser={authUser}
                  serverMode={serverMode}
                  recordCount={currentRecords.length}
                  onLogin={handleLoginGoToServer}
                  onBackup={handleBackup}
                  onOpenBackupModal={() => setShowBackupModal(true)}
                  addToast={addToast}
                />
              </Suspense>
            )}

            {tab === 'settings' && (
              <Suspense fallback={<SettingsSkeleton />}>
                <SettingsTab
                  customFields={customFields}
                  onAddField={handleAddCustomField}
                  onRemoveField={handleRemoveCustomField}
                  onEditField={handleEditCustomField}
                  newFieldName={newFieldName}
                  onNewFieldNameChange={setNewFieldName}
                  newFieldType={newFieldType}
                  onNewFieldTypeChange={setNewFieldType}
                  serverMode={serverMode}
                  authUser={authUser}
                  tags={tags}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  useVirtualScroll={useVirtualScroll}
                  onToggleVirtualScroll={() => setUseVirtualScroll(p => !p)}
                  theme={theme}
                  onThemeChange={setTheme}
                />
              </Suspense>
            )}
            </TransitionPage>
          </div>
        </main>

        <Toast toasts={toasts} onRemove={removeToast} />

        <ShortcutsHelp show={showShortcutsHelp} onClose={() => setShowShortcutsHelp(false)} />

        <PrintSettingsModal
          show={showPrintSettings}
          onClose={() => setShowPrintSettings(false)}
          printTemplate={printTemplate}
          setPrintTemplate={setPrintTemplate}
          printCols={printCols}
          setPrintCols={setPrintCols}
          printWidth={printWidth}
          setPrintWidth={setPrintWidth}
          printHeight={printHeight}
          setPrintHeight={setPrintHeight}
          printQr={printQr}
          setPrintQr={setPrintQr}
          printBarcode={printBarcode}
          setPrintBarcode={setPrintBarcode}
          customFields={customFields}
          enabledCustomFieldKeys={enabledCustomFieldKeys}
          onToggleCustomField={handleToggleCustomField}
        />

        <BackupModal
          show={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          recordCount={currentRecords.length}
          onBackup={handleBackup}
          onRestore={handleRestore}
          setBackupFile={setBackupFile}
          isViewer={isViewer}
        />

        {showRestoreConfirm && pendingRestore && (
          <div className="modal-overlay" onClick={() => { setShowRestoreConfirm(false); setPendingRestore(null); }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>بازیابی فیلدهای سفارشی</h3>
                <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => { setShowRestoreConfirm(false); setPendingRestore(null); }}></i>
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem', lineHeight: 1.8 }}>
                فایل پشتیبان شامل <strong>{pendingRestore.customFields.length} فیلد سفارشی</strong> است:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {pendingRestore.customFields.map(cf => (
                  <span key={cf.key} style={{ padding: '0.3rem 0.7rem', background: 'var(--hover-bg)', borderRadius: 8, fontSize: '0.85rem' }}>
                    {cf.fa || cf.label || cf.key}
                  </span>
                ))}
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1.5rem', lineHeight: 1.8 }}>
                آیا مایل به بازیابی این فیلدها هستید؟
              </p>
              <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => { setShowRestoreConfirm(false); setPendingRestore(null); }}>
                  فقط رکوردها
                </button>
                <button className="btn btn-primary" onClick={() => {
                  const pr = pendingRestore;
                  setShowRestoreConfirm(false);
                  setPendingRestore(null);
                  executeRestore(pr.records, pr.customFields);
                }}>
                  بازیابی با فیلدها
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDialog
          show={showDeleteConfirm}
          title="حذف رکوردها"
          message={`آیا از حذف ${selected.size} رکورد انتخاب شده اطمینان دارید؟ این عملیات قابل بازگشت نیست.`}
          confirmLabel="حذف شود"
          cancelLabel="انصراف"
          variant="danger"
          icon="ti-alert-triangle"
          loading={serverLoading}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        {showRenumberConfirm && (
          <div className="modal-overlay" onClick={() => setShowRenumberConfirm(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>بازنویسی کدها</h3>
                <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowRenumberConfirm(false)}></i>
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem', lineHeight: 1.8 }}>
                همه رکوردها بر اساس پروژه، نوع و سال مرتب شده و کدهای آنها بازنویسی می‌شوند.
                محتوای رکوردها تغییری نمی‌کند. ادامه می‌دهید؟
              </p>
              <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-outline" onClick={() => setShowRenumberConfirm(false)}>
                  انصراف
                </button>
                <button className="btn btn-primary" onClick={handleRenumber} disabled={serverLoading}>
                  {serverLoading ? <><LoadingSpinner size={18} /> در حال اجرا...</> : 'تایید و بازنویسی'}
                </button>
              </div>
            </div>
          </div>
        )}

        {showBulkEdit && (
          <div className="modal-overlay" onClick={() => setShowBulkEdit(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>ویرایش دسته‌جمعی</h3>
                <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowBulkEdit(false)}></i>
              </div>
              <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{selected.size} رکورد انتخاب شده</p>

              <div className="form-group">
                <label className="form-label">فیلد</label>
                <select className="form-input" value={bulkEditField} onChange={e => setBulkEditField(e.target.value)}>
                  <option value="">انتخاب کنید...</option>
                  {FIELDS.filter(f => f.key !== 'code' && f.key !== 'related').map(f => (
                    <option key={f.key} value={f.key}>{f.fa}</option>
                  ))}
                  {customFields.map((f: any) => (
                    <option key={f.key} value={f.key}>{f.fa}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">مقدار جدید</label>
                <input type="text" className="form-input" value={bulkEditValue} onChange={e => setBulkEditValue(e.target.value)} />
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

              <div className="form-group">
                <label className="form-label">
                  <i className="ti ti-color-picker" style={{ marginRight: 8 }}></i>
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
                    <i className="ti ti-x"></i>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <i className="ti ti-tags" style={{ marginRight: 8 }}></i>
                  افزودن برچسب
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tags.map((tag: string) => {
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

              <button className="btn btn-primary w-100" onClick={handleBulkEdit} disabled={serverLoading}>
                {serverLoading ? <LoadingSpinner size={18} /> : <i className="ti ti-check"></i>} اعمال به {selected.size} رکورد
              </button>
            </div>
          </div>
        )}

        {showScanner && (
          <QRScanner
            onScan={handleQRScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        {showPrintQueue && (
          <Suspense fallback={null}>
            <PrintQueue
              records={currentRecords}
              selectedRecords={selectedRecords}
              addToast={addToast}
              onClose={() => setShowPrintQueue(false)}
            />
          </Suspense>
        )}

        {versionHistoryRecord && (
          <Suspense fallback={null}>
            <RecordHistoryModal
              recordId={versionHistoryRecord.id}
              recordCode={versionHistoryRecord.code}
              onClose={() => setVersionHistoryRecord(null)}
              onRestore={handleRestoreVersion}
              addToast={addToast}
            />
          </Suspense>
        )}
      </div>
    </ErrorBoundary>
  );
}
