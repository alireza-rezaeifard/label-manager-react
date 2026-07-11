import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { api } from '../utils/api';
import { FIELDS } from '../data/fields';
import type { RecordItem, Template, CustomField } from '../types';

const RECORD_CUSTOM_FIELDS_CACHE_KEY = 'label-studio-record-cfields-cache';
const RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY = 'label-studio-record-cfields-code-cache';
const TEMPLATES_KEY = 'label-studio-record-templates';

function loadRecordCustomFieldsCache() {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveRecordCustomFieldsCache(data: Record<string, unknown>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CACHE_KEY, JSON.stringify(data)); } catch {}
}
function loadRecordCustomFieldsCodeCache() {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY) || '{}'); } catch { return {}; }
}
function saveRecordCustomFieldsCodeCache(data: Record<string, unknown>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY, JSON.stringify(data)); } catch {}
}
function loadTemplates() {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
function saveTemplates(t: Template[]) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); } catch {}
}

interface UseRecordFormDeps {
  currentRecords: RecordItem[];
  serverMode: boolean;
  currentWorkspaceId: number | null;
  customFields: CustomField[];
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setServerRecords: (fn: ((prev: RecordItem[]) => RecordItem[]) | RecordItem[]) => void;
  setServerLoading: (l: boolean) => void;
  refreshServerRecords: () => Promise<void>;
  setRecords: (fn: ((prev: RecordItem[]) => RecordItem[]) | RecordItem[]) => void;
  setRefreshKey: (fn: ((prev: number) => number) | number) => void;
  setTab: (t: string) => void;
  setPage: (p: number | ((prev: number) => number)) => void;
}

export function useRecordForm(deps: UseRecordFormDeps) {
  const {
    currentRecords, serverMode, currentWorkspaceId,
    customFields, addToast,
    setServerRecords, setServerLoading, refreshServerRecords,
    setRecords, setRefreshKey, setTab, setPage,
  } = deps;

  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [templateData, setTemplateData] = useState<RecordItem | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateKey, setTemplateKey] = useState(0);
  const formDraftRef = useRef<RecordItem | null>(null);

  const [templates, setTemplatesState] = useState<Template[]>(() => {
    try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
  });

  const setTemplates = useCallback((updated: Template[]) => {
    setTemplatesState(updated);
    saveTemplates(updated);
  }, []);

  const editRecord = editIndex !== null ? currentRecords[editIndex] : templateData;

  const availLabels = editIndex !== null
    ? currentRecords.filter(r => r.code !== currentRecords[editIndex]?.code)
    : currentRecords;

  const fieldSuggestions = useMemo(() => {
    const textKeys = ['project', 'type', 'party'];
    customFields.forEach((f: CustomField) => {
      if (!f.fieldType || f.fieldType === 'text' || f.fieldType === 'string') {
        if (!textKeys.includes(f.key)) textKeys.push(f.key);
      }
    });
    const map: Record<string, string[]> = {};
    for (const key of textKeys) {
      const vals = new Set<string>();
      for (const r of currentRecords) {
        const v = r[key];
        if (v && typeof v === 'string' && v.trim()) vals.add(v.trim());
      }
      if (vals.size > 0) map[key] = [...vals].sort();
    }
    return map;
  }, [currentRecords, customFields]);

  const handleSubmit = useCallback(async (recordData: RecordItem) => {
    if (editIndex !== null) {
      // UPDATE path
      if (serverMode) {
        const record = currentRecords[editIndex];
        if (!record) { addToast('رکورد یافت نشد', 'error'); return; }
        if (record.locked_by) {
          addToast(`این رکورد توسط ${record.locked_by} قفل شده و قابل ویرایش نیست`, 'warning');
          return;
        }
        setServerLoading(true);
        try {
          const updated = await api.updateRecord(record.id, recordData);
          const cfields: Record<string, unknown> = {};
          customFields.forEach((f: CustomField) => { if (recordData[f.key] !== undefined) cfields[f.key] = recordData[f.key]; });
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
        setRecords((prev: RecordItem[]) => {
          const next = [...prev];
          if (editIndex < next.length) next[editIndex] = recordData;
          return next;
        });
        setRefreshKey(k => k + 1);
        setEditIndex(null);
        setTemplateData(null);
        addToast('رکورد با موفقیت ویرایش شد', 'success');
        setTab('records');
      }
    } else {
      // CREATE path
      if (serverMode) {
        setServerLoading(true);
        try {
          const created = await api.createRecord({ ...recordData, workspace_id: currentWorkspaceId });
          const cfields: Record<string, unknown> = {};
          customFields.forEach((f: CustomField) => { if (recordData[f.key] !== undefined) cfields[f.key] = recordData[f.key]; });
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
        setRecords((prev: RecordItem[]) => [recordData, ...prev]);
        setRefreshKey(k => k + 1);
        setTemplateData(null);
        addToast('رکورد با موفقیت اضافه شد', 'success');
        setTab('records');
        setPage(1);
      }
    }
  }, [editIndex, serverMode, currentRecords, currentWorkspaceId, customFields, addToast, setServerRecords, setServerLoading, refreshServerRecords, setRecords, setRefreshKey, setTab, setPage]);

  const handleSaveTemplate = useCallback(() => {
    if (!templateName.trim()) { addToast('نام الگو را وارد کنید', 'error'); return; }
    if (templates.some((t: Template) => t.name === templateName.trim())) {
      addToast('این الگو قبلا وجود دارد', 'error');
      return;
    }
    const sourceRecord = editIndex !== null ? currentRecords[editIndex] : (templateData || formDraftRef.current);
    if (!sourceRecord || !sourceRecord.code) {
      addToast('ابتدا یک رکورد را باز کنید یا فیلدها را پر کنید', 'error');
      return;
    }
    const newTemplate: Template = { name: templateName.trim(), fields: { ...sourceRecord } };
    setTemplates([...templates, newTemplate]);
    setTemplateName('');
    setShowTemplates(false);
    addToast(`الگوی "${newTemplate.name}" ذخیره شد`, 'success');
  }, [templateName, templates, editIndex, currentRecords, templateData, setTemplates, addToast]);

  const handleLoadTemplate = useCallback((tmpl: Template) => {
    setShowTemplates(false);
    if (tmpl.fields && tmpl.fields.code) {
      setTemplateData(tmpl.fields);
      setTemplateKey(k => k + 1);
      setEditIndex(null);
      setTab('add');
      addToast(`الگوی "${tmpl.name}" اعمال شد`, 'success');
    } else {
      addToast('این الگو معتبر نیست (قدیمی یا خالی). لطفا حذف کنید و دوباره ذخیره نمایید', 'error');
    }
  }, [setTab, addToast]);

  const handleDeleteTemplate = useCallback((name: string) => {
    setTemplates(templates.filter((t: Template) => t.name !== name));
    addToast(`الگوی "${name}" حذف شد`, 'success');
  }, [templates, setTemplates, addToast]);

  const resetForm = useCallback(() => {
    setEditIndex(null);
  }, []);

  return {
    editIndex, setEditIndex,
    templateData, setTemplateData,
    templateName, setTemplateName,
    showTemplates, setShowTemplates,
    templateKey, setTemplateKey,
    formDraftRef,
    templates,
    editRecord,
    availLabels,
    fieldSuggestions,
    handleSubmit,
    handleSaveTemplate,
    handleLoadTemplate,
    handleDeleteTemplate,
    resetForm,
  };
}
