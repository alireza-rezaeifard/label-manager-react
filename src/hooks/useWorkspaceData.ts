import { useState, useCallback, useEffect, useRef } from 'react';
import { useSWR, invalidateCache } from './useSWR';
import { useWebSocket } from './useWebSocket';
import { api, getAuthUser } from '../utils/api';
import type { RecordItem, CustomField, Workspace, ActivityLogEntry } from '../types';

const HISTORY_KEY = 'label-studio-print-history';
const CUSTOM_FIELDS_KEY = 'label-studio-custom-fields';
const TAGS_KEY = 'label-studio-tags';

export function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
export function saveHistory(h: unknown[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch {}
}
export function loadCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]'); } catch { return []; }
}
export function saveCustomFields(f: CustomField[]) {
  try { localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(f)); } catch {}
}
export function loadTags() {
  try { return JSON.parse(localStorage.getItem(TAGS_KEY) || '[]'); } catch { return []; }
}
export function saveTags(t: string[]) {
  try { localStorage.setItem(TAGS_KEY, JSON.stringify(t)); } catch {}
}

export function useWorkspaceData() {
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('local_mode') === 'true');
  const [authUser, setAuthUser] = useState(() => localMode ? null : getAuthUser());
  const [serverMode, setServerMode] = useState(() => localMode ? false : !!getAuthUser());

  const [serverRecords, setServerRecords] = useState<RecordItem[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchedRef = useRef(false);
  const isRestoringRef = useRef(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const [printHistory, setPrintHistory] = useState(loadHistory);

  const [customFields, setCustomFields] = useState<CustomField[]>(() => loadCustomFields());

  useEffect(() => {
    saveCustomFields(customFields);
  }, [customFields]);

  const [enabledCustomFieldKeys, setEnabledCustomFieldKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('label-studio-enabled-cfields');
    if (saved) return JSON.parse(saved);
    const fields = loadCustomFields();
    return fields.map((f: CustomField) => f.key);
  });

  const [tags, setTags] = useState<string[]>(() => loadTags());

  useEffect(() => {
    saveTags(tags);
  }, [tags]);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<number | null>(() => {
    const saved = localStorage.getItem('current_workspace_id');
    return saved ? parseInt(saved, 10) : null;
  });

  // Activity log
  const { data: activityLog = [], revalidate: refreshActivity } = useSWR<ActivityLogEntry[]>(
    serverMode && currentWorkspaceId ? `activity:${currentWorkspaceId}` : null,
    () => api.getActivity(currentWorkspaceId!).then((data: ActivityLogEntry[]) => data || []),
    { revalidateOnMount: true, refreshInterval: 15000 }
  );

  const handleRefreshActivity = useCallback(() => {
    invalidateCache(`activity:${currentWorkspaceId}`);
    refreshActivity();
  }, [refreshActivity, currentWorkspaceId]);

  // SWR fetcher for records
  const fetchServerRecords = useCallback(async () => {
    if (!serverMode || !currentWorkspaceId) return [];
    const data = await api.getAllRecords(currentWorkspaceId);
    const cache = (() => {
      try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-cache') || '{}'); } catch { return {}; }
    })();
    const codeCache = (() => {
      try { return JSON.parse(localStorage.getItem('label-studio-record-cfields-code-cache') || '{}'); } catch { return {}; }
    })();
    const currentCustomFields = (() => {
      try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]'); } catch { return []; }
    })();
    const customKeys = new Set<string>(currentCustomFields.map((f: CustomField) => f.key));
    return data.map((serverRecord: RecordItem) => {
      const merged: RecordItem = { ...serverRecord };
      for (const key of customKeys) {
        const val = cache[serverRecord.id]?.[key] ?? codeCache[serverRecord.code]?.[key];
        if (val !== undefined) merged[key] = val;
      }
      return merged;
    });
  }, [serverMode, currentWorkspaceId]);

  const { data: swrData, isLoading: swrLoading, revalidate } = useSWR(
    serverMode && currentWorkspaceId ? `records:${currentWorkspaceId}` : null,
    fetchServerRecords,
  );

  useEffect(() => {
    if (swrData) setServerRecords(swrData);
  }, [swrData]);

  const refreshServerRecords = useCallback(async () => {
    if (!serverMode || !currentWorkspaceId || isRestoringRef.current) return;
    invalidateCache(`records:${currentWorkspaceId}`);
    await revalidate();
  }, [revalidate, serverMode, currentWorkspaceId]);

  const refreshServerRecordsRef = useRef(refreshServerRecords);
  refreshServerRecordsRef.current = refreshServerRecords;

  const { connectionStatus } = useWebSocket(serverMode ? currentWorkspaceId : null, refreshServerRecords);

  useEffect(() => {
    if (currentWorkspaceId) {
      try { localStorage.setItem('current_workspace_id', String(currentWorkspaceId)); } catch {}
    }
  }, [currentWorkspaceId]);

  // Fetch workspaces on mount
  useEffect(() => {
    if (serverMode && !fetchedRef.current) {
      fetchedRef.current = true;
      api.getWorkspaces().then(wsList => {
        setWorkspaces(wsList);
        if (!currentWorkspaceId && wsList.length > 0) {
          setCurrentWorkspaceId(wsList[0].id);
        }
      }).catch(() => {});
    }
  }, [serverMode, currentWorkspaceId]);

  // Sync custom fields from server
  useEffect(() => {
    if (serverMode && currentWorkspaceId) {
      api.getCustomFields(currentWorkspaceId).then(serverFields => {
        if (serverFields && serverFields.length > 0) {
          setCustomFields(prev => {
            const merged = [...serverFields];
            for (const local of prev) {
              if (!merged.find((f: CustomField) => f.key === local.key)) {
                merged.push(local);
              }
            }
            return merged;
          });
        }
      }).catch(() => {});
    }
  }, [serverMode, currentWorkspaceId]);

  // Sync enabledCustomFieldKeys with customFields
  useEffect(() => {
    setEnabledCustomFieldKeys(prev => {
      const next = new Set(prev);
      for (const f of customFields) next.add(f.key);
      const arr = [...next];
      localStorage.setItem('label-studio-enabled-cfields', JSON.stringify(arr));
      return arr;
    });
  }, [customFields]);

  // Theme effect
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

  // Print settings state
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printCols, setPrintCols] = useState(3);
  const [printWidth, setPrintWidth] = useState(100);
  const [printHeight, setPrintHeight] = useState(60);
  const [printTemplate, setPrintTemplate] = useState('classic');
  const [printQr, setPrintQr] = useState(false);
  const [printBarcode, setPrintBarcode] = useState(false);

  // Modal states
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{ records: RecordItem[]; customFields: CustomField[] } | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [showRenumberConfirm, setShowRenumberConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [versionHistoryRecord, setVersionHistoryRecord] = useState<{ id: string; code: string } | null>(null);
  const [showPrintQueue, setShowPrintQueue] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
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

  const toggleTheme = useCallback(() => setTheme((p: string) => p === 'light' ? 'dark' : 'light'), []);
  const toggleSidebar = useCallback(() => setSidebarOpen(p => !p), []);

  const clearHistory = useCallback(() => {
    setPrintHistory([]);
    saveHistory([]);
  }, []);

  const currentWs = workspaces.find(w => w.id === currentWorkspaceId);
  const currentWsRole = currentWs?.member_role;
  const isViewer = serverMode && currentWsRole === 'viewer';

  return {
    localMode, setLocalMode,
    authUser, setAuthUser,
    serverMode, setServerMode,
    serverRecords, setServerRecords,
    serverLoading, setServerLoading,
    refreshKey, setRefreshKey,
    fetchedRef, isRestoringRef,
    theme, setTheme, toggleTheme,
    printHistory, setPrintHistory, saveHistory, loadHistory, clearHistory,
    customFields, setCustomFields, saveCustomFields, loadCustomFields,
    enabledCustomFieldKeys, setEnabledCustomFieldKeys,
    tags, setTags, saveTags, loadTags,
    newFieldName, setNewFieldName,
    newFieldType, setNewFieldType,
    workspaces, setWorkspaces,
    currentWorkspaceId, setCurrentWorkspaceId,
    activityLog, handleRefreshActivity,
    fetchServerRecords, refreshServerRecords, refreshServerRecordsRef,
    swrLoading, connectionStatus,
    currentWs, currentWsRole, isViewer,
    sidebarOpen, setSidebarOpen, toggleSidebar,
    sidebarCompact, setSidebarCompact, toggleSidebarCompact,
    showPrintSettings, setShowPrintSettings,
    printCols, setPrintCols,
    printWidth, setPrintWidth,
    printHeight, setPrintHeight,
    printTemplate, setPrintTemplate,
    printQr, setPrintQr,
    printBarcode, setPrintBarcode,
    showBackupModal, setShowBackupModal,
    backupFile, setBackupFile,
    pendingRestore, setPendingRestore,
    showRestoreConfirm, setShowRestoreConfirm,
    showBulkEdit, setShowBulkEdit,
    showRenumberConfirm, setShowRenumberConfirm,
    showDeleteConfirm, setShowDeleteConfirm,
    showScanner, setShowScanner,
    versionHistoryRecord, setVersionHistoryRecord,
    showPrintQueue, setShowPrintQueue,
  };
}
