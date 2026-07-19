import { useCallback } from 'react';
import { api } from '../utils/api';
import type { CustomField } from '../types';

export function useCustomFields(
  serverMode: boolean,
  currentWorkspaceId: number | null,
  customFields: CustomField[],
  setCustomFields: (f: CustomField[] | ((prev: CustomField[]) => CustomField[])) => void,
  saveCustomFields: (f: CustomField[]) => void,
  tags: string[],
  setTags: (t: string[] | ((prev: string[]) => string[])) => void,
  saveTags: (t: string[]) => void,
  setEnabledCustomFieldKeys: (fn: (prev: string[]) => string[]) => void,
  _enabledCustomFieldKeys: string[],
  newFieldName: string,
  setNewFieldName: (n: string) => void,
  newFieldType: string,
  setNewFieldType: (t: string) => void,
  setSelectedTagFilter: React.Dispatch<React.SetStateAction<string | null>>,
  addToast: (msg: string, type?: string) => void,
  _invalidateCache: (pattern?: string) => void,
) {
  const handleToggleCustomField = useCallback((key: string) => {
    setEnabledCustomFieldKeys(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem('label-studio-enabled-cfields', JSON.stringify(next));
      return next;
    });
  }, [setEnabledCustomFieldKeys]);

  const handleAddCustomField = useCallback(() => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFields.some((f) => f.key === key)) { addToast('این فیلد قبلا اضافه شده', 'error'); return; }
    const field: CustomField = { key, label: newFieldName.trim(), fa: newFieldName.trim(), type: newFieldType, options: newFieldType === 'dropdown' ? [] : undefined };
    const updated = [...customFields, field];
    setCustomFields(updated);
    saveCustomFields(updated);
    if (serverMode) {
      api.createCustomField({ ...field, workspace_id: currentWorkspaceId }).catch(() => {});
    }
    setNewFieldName('');
    setNewFieldType('text');
    addToast('فیلد جدید اضافه شد', 'success');
  }, [newFieldName, customFields, newFieldType, serverMode, currentWorkspaceId, setCustomFields, saveCustomFields, setNewFieldName, setNewFieldType, addToast]);

  const handleRemoveCustomField = useCallback((key: string) => {
    const updated = customFields.filter((f) => f.key !== key);
    setCustomFields(updated);
    saveCustomFields(updated);
    if (serverMode) {
      api.deleteCustomField(key, currentWorkspaceId!).catch(() => {});
    }
    addToast('فیلد حذف شد', 'success');
  }, [customFields, serverMode, currentWorkspaceId, setCustomFields, saveCustomFields, addToast]);

  const handleEditCustomField = useCallback((key: string, updatedField: Partial<CustomField>) => {
    const updated = customFields.map((f) => f.key === key ? { ...f, ...updatedField, key } : f);
    setCustomFields(updated);
    saveCustomFields(updated);
    if (serverMode) {
      api.updateCustomField(key, { ...updatedField, key }, currentWorkspaceId!)
        .catch(() => addToast('خطا در بروزرسانی فیلد در سرور', 'error'));
    }
    addToast('فیلد ویرایش شد', 'success');
  }, [customFields, serverMode, currentWorkspaceId, setCustomFields, saveCustomFields, addToast]);

  const handleAddTag = useCallback((tag: string) => {
    if (!tag.trim()) return;
    if (tags.includes(tag.trim())) { addToast('این برچسب قبلا اضافه شده', 'error'); return; }
    const updated = [...tags, tag.trim()];
    setTags(updated);
    saveTags(updated);
  }, [tags, setTags, saveTags, addToast]);

  const handleRemoveTag = useCallback((tag: string) => {
    const updated = tags.filter(t => t !== tag);
    setTags(updated);
    saveTags(updated);
    setSelectedTagFilter((prev: string | null) => prev === tag ? null : prev);
  }, [tags, setTags, saveTags, setSelectedTagFilter]);

  return {
    handleToggleCustomField, handleAddCustomField,
    handleRemoveCustomField, handleEditCustomField,
    handleAddTag, handleRemoveTag,
  };
}
