export const RECORD_CUSTOM_FIELDS_CACHE_KEY = 'label-studio-record-cfields-cache';
export const RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY = 'label-studio-record-cfields-code-cache';

export function loadRecordCustomFieldsCache(): Record<string, Record<string, unknown>> {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CACHE_KEY) || '{}'); } catch { return {}; }
}

export function saveRecordCustomFieldsCache(data: Record<string, Record<string, unknown>>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CACHE_KEY, JSON.stringify(data)); } catch { /* */ }
}

export function loadRecordCustomFieldsCodeCache(): Record<string, Record<string, unknown>> {
  try { return JSON.parse(localStorage.getItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY) || '{}'); } catch { return {}; }
}

export function saveRecordCustomFieldsCodeCache(data: Record<string, Record<string, unknown>>) {
  try { localStorage.setItem(RECORD_CUSTOM_FIELDS_CODE_CACHE_KEY, JSON.stringify(data)); } catch { /* */ }
}
