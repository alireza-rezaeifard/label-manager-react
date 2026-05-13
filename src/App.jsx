import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRecords } from './hooks/useRecords';
import { useToast } from './hooks/useToast';
import { FIELDS, LABEL_PRINT_COLS, LABEL_WIDTH, LABEL_HEIGHT, PAGE_SIZE } from './data/fields';
import * as exportUtils from './utils/exporters';
import { api, isAuthenticated, getAuthUser } from './utils/api';

import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import RecordCard from './components/RecordCard';
import RecordForm from './components/RecordForm';
import ImportCSV from './components/ImportCSV';
import LabelPreview from './components/LabelPreview';
import ViewDetail from './components/ViewDetail';
import Toast from './components/Toast';
import ReportsTab from './components/ReportsTab';
import LoginPage from './components/LoginPage';
import ProfileTab from './components/ProfileTab';
import HistoryTab from './components/HistoryTab';
import SettingsTab from './components/SettingsTab';
import PrintSettingsModal from './components/PrintSettingsModal';
import BackupModal from './components/BackupModal';
import QRScanner from './components/QRScanner';
import WorkspaceSwitcher from './components/WorkspaceSwitcher';
import VirtualizedRecordGrid from './components/VirtualizedRecordGrid';
import ShortcutsHelp from './components/ShortcutsHelp';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DayPicker } from "@daypicker/persian";
import { faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { toJalaliDate } from './utils/formatters';

const HISTORY_KEY = 'label-studio-print-history';
const CUSTOM_FIELDS_KEY = 'label-studio-custom-fields';
const TAGS_KEY = 'label-studio-tags';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* localStorage may be full */ }
}
function loadCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]'); } catch { return []; }
}
function saveCustomFields(f) {
  try { localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(f)); } catch { /* localStorage may be full */ }
}
function loadTags() {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]'); } catch { return []; }
}
function saveTags(t) {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); } catch { /* localStorage may be full */ }
}

function getTabFromHash() {
  const hash = window.location.hash.replace('#', '');
  const validTabs = ['records', 'add', 'import', 'preview', 'view', 'history', 'profile', 'settings', 'reports'];
  return validTabs.includes(hash) ? hash : null;
}

export default function App() {
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('local_mode') === 'true');
  const [authUser, setAuthUser] = useState(() => localMode ? null : getAuthUser());
  const [serverMode, setServerMode] = useState(() => localMode ? false : !!getAuthUser());

  const {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    undo, undoStack,
    isDuplicateCode,
  } = useRecords();

  const [serverRecords, setServerRecords] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchedRef = useRef(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState(() => getTabFromHash() || 'records');
  const [selected, setSelected] = useState(new Set());
  const [editIndex, setEditIndex] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sortBy, setSortBy] = useState(null);
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
  const [dragIndex, setDragIndex] = useState(null);

  const [customFields, setCustomFields] = useState(loadCustomFields);
  const [newFieldName, setNewFieldName] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupFile, setBackupFile] = useState(null);

  const [tags, setTags] = useState(loadTags);
  const [selectedTagFilter, setSelectedTagFilter] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [bulkEditField, setBulkEditField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(() => {
    const saved = localStorage.getItem('current_workspace_id');
    return saved ? parseInt(saved, 10) : null;
  });

  const { toasts, addToast, removeToast } = useToast();

  const [useVirtualScroll, setUseVirtualScroll] = useState(() => {
    try { return localStorage.getItem('use_virtual_scroll') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('use_virtual_scroll', String(useVirtualScroll)); } catch { /* may be full */ }
  }, [useVirtualScroll]);

  const currentRecords = serverMode ? serverRecords : records;

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

      api.getAllRecords(currentWorkspaceId).then(data => setServerRecords(data)).catch(() => {});
    }
  }, [serverMode, currentWorkspaceId]);

  useEffect(() => {
    const handler = () => {
      const ht = getTabFromHash();
      if (ht) setTab(ht);
    };
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const prevTabRef = useRef(tab);
  useEffect(() => {
    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      const valid = ['records', 'add', 'import', 'preview', 'view', 'history', 'profile', 'settings', 'reports'];
      if (valid.includes(tab)) {
        window.location.hash = tab;
      }
    }
  }, [tab]);

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light');
  const toggleSidebar = () => setSidebarOpen(p => !p);
  const resetForm = () => setEditIndex(null);

  const handleTabChange = useCallback((t) => {
    setTab(t);
    setEditIndex(null);
  }, []);

  const toggleSelect = useCallback((i) => {
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

  const getSortedRecords = useCallback(() => {
    let result = currentRecords;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = currentRecords.filter(r =>
        Object.values(r).some(v =>
          Array.isArray(v)
            ? v.some(item => String(item).toLowerCase().includes(q))
            : String(v).toLowerCase().includes(q)
        )
      );
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
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = String(a[sortBy] || '').toLowerCase();
        const bVal = String(b[sortBy] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [search, sortBy, sortOrder, currentRecords, filterType, filterParty, selectedTagFilter, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const sortedRecords = useMemo(() => getSortedRecords(), [getSortedRecords]);
  const totalPages = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = useMemo(
    () => sortedRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedRecords, safePage]
  );

  const recordToIndex = useMemo(
    () => new Map(currentRecords.map((r, i) => [r, i])),
    [currentRecords]
  );

  const serverOp = async (fn) => {
    if (!serverMode) return true;
    setServerLoading(true);
    try { await fn(); setServerLoading(false); return true; }
    catch (err) { addToast(err.message, 'error'); setServerLoading(false); return false; }
  };

  const handleSubmit = async (recordData) => {
    if (editIndex !== null) {
      if (serverMode) {
        const record = currentRecords[editIndex];
        if (!record) { addToast('رکورد یافت نشد', 'error'); return; }
        setServerLoading(true);
        try {
          await api.updateRecord(record.id, recordData);
          const refreshed = await api.getAllRecords(currentWorkspaceId);
          setServerRecords(refreshed);
          setRefreshKey(k => k + 1);
          setServerLoading(false);
          setEditIndex(null);
          addToast('رکورد با موفقیت ویرایش شد', 'success');
          setTab('records');
        } catch (err) {
          setServerLoading(false);
          addToast('خطا در ویرایش: ' + err.message, 'error');
        }
      } else {
        updateRecord(editIndex, recordData);
        setEditIndex(null);
        addToast('رکورد با موفقیت ویرایش شد', 'success');
        setTab('records');
      }
    } else {
      if (serverMode) {
        setServerLoading(true);
        try {
          await api.createRecord({ ...recordData, workspace_id: currentWorkspaceId });
          const refreshed = await api.getAllRecords(currentWorkspaceId);
          setServerRecords(refreshed);
          setRefreshKey(k => k + 1);
          setServerLoading(false);
          addToast('رکورد با موفقیت اضافه شد', 'success');
          setTab('records');
        } catch (err) {
          setServerLoading(false);
          addToast('خطا در ایجاد: ' + err.message, 'error');
        }
      } else {
        addRecord(recordData);
        addToast('رکورد با موفقیت اضافه شد', 'success');
        setTab('records');
      }
    }
  };

  const handleEdit = (i) => { setEditIndex(i); setTab('add'); };
  const handleView = (i) => { setViewIndex(i); setTab('view'); };

  const handleDelete = async () => {
    const count = selected.size;
    if (count === 0) return;

    if (serverMode) {
      const ids = [...selected].map(i => currentRecords[i]?.id).filter(Boolean);
      if (ids.length === 0) { addToast('هیچ رکوردی برای حذف انتخاب نشده', 'error'); return; }
      setServerLoading(true);
      try {
        await api.deleteRecords(ids);
        const refreshed = await api.getAllRecords(currentWorkspaceId);
        setServerRecords(refreshed);
        setRefreshKey(k => k + 1);
        setSelected(new Set());
        setServerLoading(false);
        addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
      } catch (err) {
        setServerLoading(false);
        addToast('خطا در حذف: ' + err.message, 'error');
      }
    } else {
      deleteRecords(selected);
      setSelected(new Set());
      addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
    }
  };

  const handleImport = async (imported) => {
    let ok = true;
    if (serverMode) {
      ok = await serverOp(async () => {
        for (const r of imported) {
          const created = await api.createRecord({ ...r, workspace_id: currentWorkspaceId });
          setServerRecords(p => [created, ...p]);
        }
      });
    } else {
      setRecords(p => [...p, ...imported]);
    }
    if (ok) setTab('records');
  };

  const handleReorder = (from, to) => {
    if (serverMode) return;
    reorderRecords(from, to);
  };

  const handleQRScan = (code) => {
    setShowScanner(false);
    const idx = currentRecords.findIndex(r => r.code === code);
    if (idx === -1) {
      addToast(`کد "${code}" یافت نشد`, 'error');
      return;
    }
    handleView(idx);
  };

  const handlePrint = () => {
    const sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    exportUtils.printLabels(sel, FIELDS, printCols, printWidth, printHeight, printTemplate, printQr, printBarcode);
    const entry = {
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR'),
      count: sel.length, codes: sel.map(r => r.code),
    };
    const updated = [entry, ...printHistory].slice(0, 50);
    setPrintHistory(updated); saveHistory(updated);
  };

  const handleExcel = () => {
    const sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    exportUtils.downloadExcel(sel, FIELDS);
    addToast('فایل اکسل با موفقیت ساخته شد', 'success');
  };

  const handleCSVExport = () => {
    const sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    exportUtils.downloadCSV(sel, FIELDS);
    addToast('فایل CSV با موفقیت ساخته شد', 'success');
  };

  const handlePDF = async () => {
    const el = document.getElementById('preview-grid');
    if (!el) return;
    try { await exportUtils.downloadPDF(el); addToast('فایل PDF با موفقیت ساخته شد', 'success'); }
    catch { addToast('خطا در ساخت PDF', 'error'); }
  };

  const handleDragStart = (e, idx) => { setDragIndex(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIdx) {
      handleReorder(dragIndex, dropIdx);
      setSelected(new Set());
    }
    setDragIndex(null);
  };

  const clearHistory = () => { setPrintHistory([]); saveHistory([]); addToast('تاریخچه پاک شد', 'success'); };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(currentRecords, null, 2)], { type: 'application/json' });
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
      if (!Array.isArray(data)) throw new Error('فرمت فایل نامعتبر');

      if (serverMode) {
        setServerLoading(true);
        try {
          await api.restore(data);
          await api.getAllRecords(currentWorkspaceId).then(setServerRecords);
          setRefreshKey(k => k + 1);
          setServerLoading(false);
          setShowBackupModal(false);
          addToast(`${data.length} رکورد با موفقیت بازیابی شد`, 'success');
        } catch (err) {
          setServerLoading(false);
          addToast('خطا در بازیابی: ' + err.message, 'error');
        }
      } else {
        setRecords(data);
        setShowBackupModal(false);
        addToast(`${data.length} رکورد با موفقیت بازیابی شد`, 'success');
      }
    } catch (err) {
      addToast('خطا در بازیابی: ' + err.message, 'error');
    }
  };

  const handleLogin = (user) => {
    if (user === null) {
      setLocalMode(true);
      localStorage.setItem('local_mode', 'true');
      setServerMode(false);
      setAuthUser(null);
      setTab('records');
    } else {
      setLocalMode(false);
      localStorage.setItem('local_mode', 'false');
      fetchedRef.current = false;
      setAuthUser(user);
      setServerMode(true);
      setTab('records');
      setServerLoading(true);
      api.getWorkspaces().then(wsList => {
        setWorkspaces(wsList);
        if (wsList.length > 0) {
          const wsId = wsList[0].id;
          setCurrentWorkspaceId(wsId);
          localStorage.setItem('current_workspace_id', String(wsId));
          api.getAllRecords(wsId).then(data => setServerRecords(data)).catch(() => {}).finally(() => setServerLoading(false));
        } else {
          setServerLoading(false);
        }
      }).catch(() => setServerLoading(false));
    }
  };

  const handleLoginGoToServer = () => {
    fetchedRef.current = false;
    setLocalMode(false);
    localStorage.removeItem('local_mode');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    fetchedRef.current = false;
    setLocalMode(true);
    localStorage.setItem('local_mode', 'true');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
    addToast('خروج با موفقیت انجام شد', 'success');
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFields.some(f => f.key === key)) { addToast('این فیلد قبلا اضافه شده', 'error'); return; }
    const field = { key, label: newFieldName.trim(), fa: newFieldName.trim(), placeholder: '', isCustom: true };
    const updated = [...customFields, field];
    setCustomFields(updated);
    saveCustomFields(updated);
    setNewFieldName('');
    addToast('فیلد جدید اضافه شد', 'success');
  };

  const handleRemoveCustomField = (key) => {
    const updated = customFields.filter(f => f.key !== key);
    setCustomFields(updated);
    saveCustomFields(updated);
    addToast('فیلد حذف شد', 'success');
  };

  const handleAddTag = (tag) => {
    if (!tag.trim()) return;
    if (tags.includes(tag.trim())) { addToast('این برچسب قبلا اضافه شده', 'error'); return; }
    const updated = [...tags, tag.trim()];
    setTags(updated);
    saveTags(updated);
  };

  const handleRemoveTag = (tag) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    saveTags(updated);
    if (selectedTagFilter === tag) setSelectedTagFilter(null);
  };

  const handleWorkspaceSwitch = (wsId) => {
    setCurrentWorkspaceId(wsId);
    localStorage.setItem('current_workspace_id', String(wsId));
    setSelected(new Set());
    if (serverMode) {
      fetchedRef.current = false;
      setServerLoading(true);
      api.getAllRecords(wsId).then(data => {
        setServerRecords(data);
        setServerLoading(false);
      }).catch(() => setServerLoading(false));
    }
  };

  const handleCreateWorkspace = async (name, description) => {
    try {
      const ws = await api.createWorkspace(name, description);
      setWorkspaces(prev => [...prev, ws]);
      handleWorkspaceSwitch(ws.id);
      addToast(`فضای کاری "${name}" ایجاد شد`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleInviteMember = async (wsId, username) => {
    try {
      await api.inviteToWorkspace(wsId, username);
      addToast(`کاربر "${username}" دعوت شد`, 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleLeaveWorkspace = async (wsId) => {
    try {
      await api.leaveWorkspace(wsId);
      setWorkspaces(prev => prev.filter(w => w.id !== wsId));
      const remaining = workspaces.filter(w => w.id !== wsId);
      if (remaining.length > 0) {
        handleWorkspaceSwitch(remaining[0].id);
      }
      addToast('خروج از فضای کاری با موفقیت انجام شد', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const handleBulkEdit = () => {
    if (!bulkEditField || bulkEditValue === undefined) { addToast('فیلد و مقدار را وارد کنید', 'error'); return; }
    const selectedIndices = [...selected];
    if (serverMode) {
      setServerLoading(true);
      Promise.all(selectedIndices.map(i => {
        const record = currentRecords[i];
        if (!record) return Promise.resolve();
        return api.updateRecord(record.id, { ...record, [bulkEditField]: bulkEditValue });
      })).then(() => {
        return api.getAllRecords(currentWorkspaceId);
      }).then((data) => {
        setServerRecords(data);
        setServerLoading(false);
        setShowBulkEdit(false);
        setBulkEditField('');
        setBulkEditValue('');
        addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
      }).catch(() => {
        setServerLoading(false);
        addToast('خطا در ویرایش دسته‌جمعی', 'error');
      });
    } else {
      selectedIndices.forEach(i => {
        const record = currentRecords[i];
        if (record) updateRecord(i, { ...record, [bulkEditField]: bulkEditValue });
      });
      setShowBulkEdit(false);
      setBulkEditField('');
      setBulkEditValue('');
      addToast(`${selectedIndices.length} رکورد با موفقیت ویرایش شد`, 'success');
    }
  };

  const keyboardHandlers = {
    onNewRecord: () => { setEditIndex(null); setTab('add'); },
    onEdit: () => {
      const first = [...selected][0];
      if (first !== undefined && currentRecords[first]) {
        setEditIndex(first); setTab('add');
      } else {
        addToast('ابتدا یک رکورد را انتخاب کنید', 'error');
      }
    },
    onDuplicate: () => {
      const first = [...selected][0];
      if (first !== undefined && currentRecords[first]) {
        const dup = { ...currentRecords[first], code: currentRecords[first].code + '-COPY' };
        if (serverMode) {
          api.createRecord({ ...dup, workspace_id: currentWorkspaceId }).then(() => {
            api.getAllRecords(currentWorkspaceId).then(setServerRecords);
          }).catch(e => addToast(e.message, 'error'));
        } else {
          addRecord(dup);
        }
        addToast('رکورد کپی شد', 'success');
      } else {
        addToast('ابتدا یک رکورد را انتخاب کنید', 'error');
      }
    },
    onDelete: () => handleDelete(),
    onSearch: () => {
      const input = document.querySelector('.search-box input');
      if (input) { input.focus(); input.select(); }
    },
    onSave: () => {
      const form = document.querySelector('.form-card');
      if (form && tab === 'add') {
        const submitBtn = form.querySelector('.btn-primary');
        submitBtn?.click();
      }
    },
    onSelectAll: () => toggleAll(),
    onEscape: () => {
      if (showPrintSettings) { setShowPrintSettings(false); return; }
      if (showBackupModal) { setShowBackupModal(false); return; }
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
    onTabChange: (t) => { setEditIndex(null); setTab(t); },
  };

  const { showHelp: showShortcutsHelp, setShowHelp: setShowShortcutsHelp } = useKeyboardShortcuts(keyboardHandlers);

  const availLabels = editIndex !== null
    ? currentRecords.filter(r => r.code !== currentRecords[editIndex]?.code)
    : currentRecords;
  const editRecord = editIndex !== null ? currentRecords[editIndex] : null;
  const selectedRecords = currentRecords.filter((_, i) => selected.has(i));

  const findRelated = (codes) => {
    if (!codes || !codes.length) return [];
    return currentRecords.filter(r => codes.includes(r.code));
  };

  if (!serverMode && !authUser && !getAuthUser() && !localMode) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (serverMode && serverLoading && currentRecords.length === 0) {
    return <LoadingScreen message="در حال بارگذاری..." />;
  }

  const allTypes = [...new Set(currentRecords.map(r => r.type).filter(Boolean))];
  const allParties = [...new Set(currentRecords.map(r => r.party).filter(Boolean))];

  return (
    <ErrorBoundary>
      <div className="app-container">
        <Sidebar
          tab={tab}
          onTabChange={handleTabChange}
          sidebarOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onResetForm={resetForm}
        />

        <main className="main-content">
          <Header
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            theme={theme}
            onToggleTheme={toggleTheme}
            onToggleSidebar={toggleSidebar}
            onSettingsClick={() => setTab('settings')}
            onProfileClick={() => setTab('profile')}
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
                    <button className="btn btn-success btn-sm" onClick={handlePrint}>
                      <i className="ti ti-printer"></i> چاپ
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
                  />
                )}
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

            {tab !== 'view' && tab !== 'settings' && tab !== 'profile' && tab !== 'reports' && (
              <StatsCards records={currentRecords} selected={selected} filtered={sortedRecords} />
            )}

            {tab === 'records' && (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>مرتب‌سازی:</span>
                    {['code', 'project', 'date', 'amount'].map(f => (
                      <button key={f} className={`sort-btn ${sortBy === f ? 'active' : ''}`} onClick={() => handleSort(f)}>
                        {FIELDS.find(x => x.key === f)?.fa || f}
                        {sortBy === f && (
                          <i className={`ti ${sortOrder === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}></i>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={toggleAll}>
                      <i className="ti ti-checkbox"></i>
                      {selected.size === sortedRecords.length && sortedRecords.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه'}
                    </button>
                    {selected.size > 0 && (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => setShowBulkEdit(true)}>
                          <i className="ti ti-edit"></i> ویرایش دسته‌جمعی ({selected.size})
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                          <i className="ti ti-trash"></i> حذف ({selected.size})
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2 mb-4 flex-wrap">
                  <select className="form-input" style={{ width: 'auto', marginBottom: 0 }} value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}>
                    <option value="">همه انواع</option>
                    {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select className="form-input" style={{ width: 'auto', marginBottom: 0 }} value={filterParty} onChange={e => { setFilterParty(e.target.value); setPage(1); }}>
                    <option value="">همه طرف حساب‌ها</option>
                    {allParties.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <div style={{ position: 'relative', width: 'auto' }}>
                    <input type="text" className="form-input" readOnly
                      style={{ width: 130, marginBottom: 0, cursor: 'pointer', direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem' }}
                      value={filterDateFrom} onClick={() => setShowDateFromPicker(p => !p)}
                      placeholder="از تاریخ" title="از تاریخ" />
                    <i className="ti ti-calendar"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); setShowDateFromPicker(p => !p); }}>
                    </i>
                    {showDateFromPicker && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                        <DayPicker locale={faIR} dir="rtl" mode="single"
                          onSelect={(date) => { if (date) { setFilterDateFrom(toJalaliDate(date)); setPage(1); } setShowDateFromPicker(false); }}
                        />
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', width: 'auto' }}>
                    <input type="text" className="form-input" readOnly
                      style={{ width: 130, marginBottom: 0, cursor: 'pointer', direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem' }}
                      value={filterDateTo} onClick={() => setShowDateToPicker(p => !p)}
                      placeholder="تا تاریخ" title="تا تاریخ" />
                    <i className="ti ti-calendar"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); setShowDateToPicker(p => !p); }}>
                    </i>
                    {showDateToPicker && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1001, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                        <DayPicker locale={faIR} dir="rtl" mode="single"
                          onSelect={(date) => { if (date) { setFilterDateTo(toJalaliDate(date)); setPage(1); } setShowDateToPicker(false); }}
                        />
                      </div>
                    )}
                  </div>
                  <input type="number" className="form-input" placeholder="حداقل مبلغ"
                    style={{ width: 120, marginBottom: 0 }}
                    value={filterAmountMin} onChange={e => { setFilterAmountMin(e.target.value); setPage(1); }} />
                  <input type="number" className="form-input" placeholder="حداکثر مبلغ"
                    style={{ width: 120, marginBottom: 0 }}
                    value={filterAmountMax} onChange={e => { setFilterAmountMax(e.target.value); setPage(1); }} />
                  {(filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterAmountMin(''); setFilterAmountMax(''); setPage(1); }}>
                      <i className="ti ti-x"></i> پاک کردن فیلترها
                    </button>
                  )}
                  {tags.length > 0 && (
                    <div className="d-flex gap-1 flex-wrap align-items-center">
                      <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>برچسب:</span>
                      {tags.map(tag => (
                        <button key={tag}
                          className={`btn btn-sm ${selectedTagFilter === tag ? 'btn-primary' : 'btn-outline'}`}
                          onClick={() => setSelectedTagFilter(tag === selectedTagFilter ? null : tag)}
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {sortedRecords.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><i className="ti ti-file-off"></i></div>
                    <h3 style={{ marginBottom: '0.5rem' }}>هنوز رکوردی وجود ندارد</h3>
                    <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>رکورد جدید اضافه کنید یا فایل CSV وارد نمایید</p>
                    <button className="btn btn-primary" onClick={() => setTab('add')}>
                      <i className="ti ti-plus"></i> افزودن رکورد
                    </button>
                  </div>
                ) : useVirtualScroll ? (
                  <VirtualizedRecordGrid
                    records={sortedRecords}
                    recordToIndex={recordToIndex}
                    selected={selected}
                    onToggle={toggleSelect}
                    onEdit={handleEdit}
                    onView={handleView}
                    getRelatedLabels={findRelated}
                    onDragStart={handleDragStart}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnd={() => setDragIndex(null)}
                    onDrop={handleDrop}
                    setDragIndex={setDragIndex}
                  />
                ) : (
                  <>
                    <div className="card-grid" key={refreshKey}>
                      {pagedRecords.map((r) => {
                        const realIdx = recordToIndex.get(r);
                        if (realIdx === undefined) return null;
                        return (
                          <RecordCard
                            key={serverMode ? r.id : `r-${realIdx}`}
                            record={r}
                            selected={selected.has(realIdx)}
                            onToggle={() => toggleSelect(realIdx)}
                            onEdit={() => handleEdit(realIdx)}
                            onView={() => handleView(realIdx)}
                            getRelatedLabels={findRelated}
                            index={realIdx}
                            onDragStart={(e) => handleDragStart(e, realIdx)}
                            onDragOver={(e) => e.preventDefault()}
                            onDragEnd={() => setDragIndex(null)}
                            onDrop={(e) => handleDrop(e, realIdx)}
                          />
                        );
                      })}
                    </div>
                    <div className="pagination" style={totalPages <= 1 ? { justifyContent: 'center', opacity: 0.6 } : {}}>
                      <button className="pagination-btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>قبلی</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`pagination-btn ${p === safePage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                      ))}
                      <button className="pagination-btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>بعدی</button>
                      <span style={{ marginRight: '0.75rem', opacity: 0.6, fontSize: '0.85rem' }}>
                        {sortedRecords.length > 0 ? `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, sortedRecords.length)} از ${sortedRecords.length}` : '۰ رکورد'}
                      </span>
                    </div>
                  </>
                )}
                <div className="d-flex justify-content-center mt-4">
                  <button className="btn btn-outline btn-sm" onClick={() => setUseVirtualScroll(p => !p)}>
                    <i className={`ti ${useVirtualScroll ? 'ti-grid' : 'ti-list'}`}></i>
                    {useVirtualScroll ? 'حالت صفحه‌بندی' : 'حالت مجازی (سریع)'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'add' && (
              <RecordForm
                editRecord={editRecord}
                editIndex={editIndex}
                availableLabels={availLabels}
                isDuplicateCode={isDuplicateCode}
                onSubmit={handleSubmit}
                onCancel={() => { setEditIndex(null); setTab('records'); }}
                addToast={addToast}
                customFields={customFields}
                serverMode={serverMode}
                allTags={tags}
              />
            )}

            {tab === 'import' && (
              <ImportCSV onImport={handleImport} importMsg={''} setImportMsg={() => {}} addToast={addToast} />
            )}

            {tab === 'view' && viewIndex !== null && (
              <ViewDetail
                record={currentRecords[viewIndex]}
                relatedRecords={findRelated(currentRecords[viewIndex]?.related)}
                onEdit={() => handleEdit(viewIndex)}
                onNavigateToRelated={(rel) => {
                  const idx = currentRecords.findIndex(r => r.code === rel.code);
                  if (idx !== -1) setViewIndex(idx);
                }}
              />
            )}

            {tab === 'preview' && (
              <LabelPreview selectedRecords={selectedRecords} onGoToRecords={() => setTab('records')} />
            )}

            {tab === 'history' && (
              <HistoryTab printHistory={printHistory} clearHistory={clearHistory} />
            )}

            {tab === 'reports' && (
              <ReportsTab records={currentRecords} onFilter={(type, value) => {
                if (type === 'type') { setFilterType(value); setSelectedTagFilter(null); }
                else if (type === 'party') { setFilterParty(value); setFilterType(''); setSelectedTagFilter(null); }
                else { setFilterType(''); setFilterParty(''); setSelectedTagFilter(null); }
                setSearch(type === 'project' || type === 'monthly' ? value : '');
                setFilterDateFrom(''); setFilterDateTo('');
                setFilterAmountMin(''); setFilterAmountMax('');
                setPage(1);
                setTab('records');
              }} />
            )}

            {tab === 'profile' && (
              <ProfileTab
                authUser={authUser}
                serverMode={serverMode}
                recordCount={currentRecords.length}
                onLogin={handleLoginGoToServer}
                onBackup={handleBackup}
                onOpenBackupModal={() => setShowBackupModal(true)}
              />
            )}

            {tab === 'settings' && (
              <SettingsTab
                customFields={customFields}
                onAddField={handleAddCustomField}
                onRemoveField={handleRemoveCustomField}
                newFieldName={newFieldName}
                onNewFieldNameChange={setNewFieldName}
                serverMode={serverMode}
                authUser={authUser}
                tags={tags}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                useVirtualScroll={useVirtualScroll}
                onToggleVirtualScroll={() => setUseVirtualScroll(p => !p)}
              />
            )}
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
        />

        <BackupModal
          show={showBackupModal}
          onClose={() => setShowBackupModal(false)}
          recordCount={currentRecords.length}
          onBackup={handleBackup}
          onRestore={handleRestore}
          setBackupFile={setBackupFile}
        />

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
                  {customFields.map(f => (
                    <option key={f.key} value={f.key}>{f.fa}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">مقدار جدید</label>
                <input type="text" className="form-input" value={bulkEditValue} onChange={e => setBulkEditValue(e.target.value)} />
              </div>
              <button className="btn btn-primary w-100" onClick={handleBulkEdit}>
                <i className="ti ti-check"></i> اعمال به {selected.size} رکورد
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
      </div>
    </ErrorBoundary>
  );
}
