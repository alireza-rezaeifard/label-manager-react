import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import ValidationRuleEditor from './ValidationRuleEditor';
import type { ValidationRule as ValidationRuleType } from '../types';
import {
  Server, Palette, Tags, ListChecks, Zap, Plus, Trash2, Pencil, Check, X,
  ChevronDown, Merge, Sun, Moon, Droplet, Contrast, Shield, Bot, Eye, EyeOff,
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'dropdown', label: 'لیست انتخابی' },
  { value: 'color', label: 'رنگ' },
];

const FIELD_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  text: { label: 'متن', color: '#6366f1' },
  number: { label: 'عدد', color: '#10b981' },
  date: { label: 'تاریخ', color: '#f59e0b' },
  dropdown: { label: 'لیست', color: '#06b6d4' },
  color: { label: 'رنگ', color: '#ef4444' },
};

const THEME_OPTIONS = [
  { key: 'light', icon: Sun, label: 'روشن' },
  { key: 'dark', icon: Moon, label: 'تیره' },
  { key: 'sepia', icon: Droplet, label: 'قهوه‌ای' },
  { key: 'high-contrast', icon: Contrast, label: 'کنتراست بالا' },
];

interface CustomFieldSettings {
  key: string;
  label: string;
  fa: string;
  fieldType: string;
  options?: string[];
  validationRules?: ValidationRuleType[];
}

interface Props {
  customFields: CustomFieldSettings[];
  onAddField: () => void;
  onRemoveField: (key: string) => void;
  onEditField: (key: string, updatedField: { label: string; fa: string; fieldType: string; options?: string[]; validationRules?: ValidationRuleType[] }) => void;
  newFieldName: string;
  onNewFieldNameChange: (value: string) => void;
  newFieldType: string;
  onNewFieldTypeChange: (value: string) => void;
  serverMode: boolean;
  authUser: { username?: string } | null;
  tags: string[];
  onAddTag: (name: string) => void;
  onRemoveTag: (name: string) => void;
  useVirtualScroll: boolean;
  onToggleVirtualScroll: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  aiApiUrl: string;
  onAiApiUrlChange: (value: string) => void;
  aiApiKey: string;
  onAiApiKeyChange: (value: string) => void;
  aiModel: string;
  onAiModelChange: (value: string) => void;
  aiCorsProxy: string;
  onAiCorsProxyChange: (value: string) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

function SectionHeader({ numeral, title, icon: Icon }: {
  numeral: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="st-section-header">
      <div className="st-section-badge"><Icon className="st-section-badge-icon" /></div>
      <span className="st-section-numeral">{numeral}</span>
      <h4 className="st-section-title">{title}</h4>
      <div className="st-section-rule" />
    </div>
  );
}

export default function SettingsTab({
  customFields, onAddField, onRemoveField, onEditField, newFieldName, onNewFieldNameChange,
  newFieldType, onNewFieldTypeChange,
  serverMode, authUser,
  tags, onAddTag, onRemoveTag,
  useVirtualScroll, onToggleVirtualScroll,
  theme, onThemeChange,
  aiApiUrl, onAiApiUrlChange, aiApiKey, onAiApiKeyChange,
  aiModel, onAiModelChange,
  aiCorsProxy, onAiCorsProxyChange,
  addToast,
}: Props) {
  const [newTag, setNewTag] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('text');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editValidationRules, setEditValidationRules] = useState<ValidationRuleType[]>([]);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editTagValue, setEditTagValue] = useState('');
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<string | null>(null);
  const [mergeTarget, setMergeTarget] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  const fetchModels = async () => {
    if (!aiApiUrl || !aiApiKey) {
      addToast('ابتدا API URL و API Key را وارد کنید', 'error');
      return;
    }
    setModelsLoading(true);
    try {
      const { fetchAvailableModels } = await import('../utils/taxBookExport');
      const models = await fetchAvailableModels(aiApiUrl, aiApiKey);
      setAvailableModels(models);
      if (models.length > 0) {
        addToast(`${models.length} مدل یافت شد`, 'success');
      } else {
        addToast('مدلی یافت نشد — نام مدل را دستی تایپ کنید', 'warning');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ناشناخته';
      addToast('خطا در دریافت مدل‌ها: ' + msg, 'error');
    } finally {
      setModelsLoading(false);
    }
  };

  const startEdit = (f: CustomFieldSettings) => {
    setEditingKey(f.key);
    setEditName(f.fa || f.label || '');
    setEditType(f.fieldType || 'text');
    setEditOptions(f.options || []);
    setEditValidationRules(f.validationRules || []);
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
    setEditType('text');
    setEditOptions([]);
    setEditValidationRules([]);
  };

  const saveEdit = () => {
    if (!editName.trim() || editingKey == null) return;
    const options = editType === 'dropdown' ? editOptions : undefined;
    onEditField(editingKey, {
      label: editName.trim(), fa: editName.trim(),
      fieldType: editType, options,
      validationRules: editValidationRules.length > 0 ? editValidationRules : undefined,
    });
    cancelEdit();
  };

  const startTagEdit = (tag: string) => {
    setEditingTag(tag);
    setEditTagValue(tag);
  };

  const saveTagEdit = () => {
    if (!editingTag || !editTagValue.trim()) return;
    if (editTagValue.trim() !== editingTag) {
      onAddTag(editTagValue.trim());
      onRemoveTag(editingTag);
    }
    setEditingTag(null);
    setEditTagValue('');
  };

  const handleMerge = () => {
    if (!mergeSource || !mergeTarget.trim()) return;
    if (mergeTarget === mergeSource) return;
    if (tags.includes(mergeTarget.trim()) && mergeTarget.trim() !== mergeSource) {
      onRemoveTag(mergeSource);
    } else {
      onAddTag(mergeTarget.trim());
      onRemoveTag(mergeSource);
    }
    setMergeMode(false);
    setMergeSource(null);
    setMergeTarget('');
  };

  return (
    <div className="st fade-in">
      {/* ── Account Settings ── */}
      <div className="st-panel">
        <SectionHeader numeral="I" title="تنظیمات حساب کاربری" icon={Shield} />
        <div className="st-account-settings">
          <div className="st-account-field">
            <label className="st-account-label">نام کاربری</label>
            <input
              type="text"
              className="st-input"
              value={authUser?.username || ''}
              readOnly
              dir="rtl"
            />
          </div>
          <div className="st-account-field">
            <label className="st-account-label">ایمیل</label>
            <input
              type="email"
              className="st-input"
              placeholder="example@email.com"
              dir="rtl"
            />
          </div>
          <div className="st-account-field">
            <label className="st-account-label">شماره تلفن</label>
            <input
              type="tel"
              className="st-input"
              placeholder="09123456789"
              dir="rtl"
            />
          </div>
          <div className="st-account-field">
            <label className="st-account-label">تغییر رمز عبور</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
              <input
                type="password"
                className="st-input"
                placeholder="رمز عبور فعلی"
                dir="rtl"
              />
              <input
                type="password"
                className="st-input"
                placeholder="رمز عبور جدید"
                dir="rtl"
              />
              <input
                type="password"
                className="st-input"
                placeholder="تکرار رمز عبور جدید"
                dir="rtl"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="st-btn primary" onClick={() => addToast('تغییرات ذخیره شدند', 'success')}>
              ذخیره تغییرات
            </button>
            <button className="st-btn" onClick={() => addToast('لغو شد', 'info')}>لغو</button>
          </div>
        </div>
      </div>

      {/* ── Server Connection ── */}
      <div className="st-panel">
        <SectionHeader numeral="II" title="اتصال به سرور" icon={Server} />
        <div className="st-server-status">
          <div className="st-server-info">
            <span className="st-server-dot" style={{ background: serverMode ? 'var(--success)' : 'var(--text-color)' }} />
            <span className="st-server-text">
              {serverMode ? `متصل به عنوان ${authUser?.username || 'کاربر'}` : 'حالت محلی (localStorage)'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Theme ── */}
      <div className="st-panel">
        <SectionHeader numeral="III" title="پوسته (Theme)" icon={Palette} />
        <div className="st-themes">
          {THEME_OPTIONS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.key} className={`st-theme ${theme === t.key ? 'active' : ''}`} onClick={() => onThemeChange(t.key)}>
                <div className="st-theme-icon-wrap">
                  <Icon className="st-theme-icon" />
                </div>
                <span className="st-theme-label">{t.label}</span>
                {theme === t.key && <div className="st-theme-check"><Check className="st-theme-check-icon" /></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tags ── */}
      <div className="st-panel">
        <SectionHeader numeral="IV" title="برچسب‌ها (Tags)" icon={Tags} />

        {tags.length > 0 && (
          <div className="st-tags">
            {tags.map(tag => (
              <span key={tag}
                className={`st-tag ${mergeSource === tag ? 'merge-source' : ''} ${mergeMode ? 'merge-mode' : ''}`}
                onClick={() => {
                  if (mergeMode) {
                    if (!mergeSource) setMergeSource(tag);
                    else if (tag !== mergeSource) { setMergeTarget(tag); }
                  }
                }}
              >
                {editingTag === tag ? (
                  <input type="text" value={editTagValue} onChange={e => setEditTagValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTagEdit(); if (e.key === 'Escape') setEditingTag(null); }}
                    onBlur={saveTagEdit}
                    className="st-tag-input" autoFocus />
                ) : tag}
                {!mergeMode && (
                  <Pencil className="st-tag-icon" onClick={(e) => { e.stopPropagation(); startTagEdit(tag); }} />
                )}
                {!mergeMode && (
                  <X className="st-tag-icon" onClick={() => onRemoveTag(tag)} />
                )}
              </span>
            ))}
          </div>
        )}

        <div className="st-add-row">
          <input type="text" className="st-input" value={newTag}
            onChange={e => setNewTag(e.target.value)}
            placeholder="نام برچسب جدید..."
            onKeyDown={e => { if (e.key === 'Enter') { onAddTag(newTag); setNewTag(''); } }} />
          <button className="st-btn primary" onClick={() => { onAddTag(newTag); setNewTag(''); }}>
            <Plus className="h-4 w-4" /> افزودن
          </button>
        </div>

        {tags.length >= 2 && (
          <button className={`st-btn ${mergeMode ? 'danger' : ''}`} onClick={() => { setMergeMode(!mergeMode); setMergeSource(null); setMergeTarget(''); }}>
            <Merge className="h-4 w-4" /> ادغام
          </button>
        )}

        {mergeMode && (
          <div className="st-merge-box">
            <p className="st-merge-hint">
              {mergeSource ? `برچسب "${mergeSource}" به کجا ادغام شود؟` : 'برچسب مبدأ را انتخاب کنید'}
            </p>
            {mergeSource && (
              <div className="st-merge-row">
                <input type="text" className="st-input" value={mergeTarget}
                  onChange={e => setMergeTarget(e.target.value)}
                  placeholder="نام برچسب مقصد..."
                  onKeyDown={e => { if (e.key === 'Enter') handleMerge(); }} />
                <button className="st-btn primary" onClick={handleMerge}>
                  <Check className="h-4 w-4" /> تأیید
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Custom Fields ── */}
      <div className="st-panel">
        <SectionHeader numeral="V" title="فیلدهای سفارشی" icon={ListChecks} />

        {customFields.length > 0 && (
          <div className="st-fields">
            {customFields.map(f => {
              const badge = FIELD_TYPE_BADGES[f.fieldType] || FIELD_TYPE_BADGES.text;
              const isEditing = editingKey === f.key;

              if (isEditing) {
                return (
                  <div key={f.key} className="st-field-edit">
                    <div className="st-field-edit-row">
                      <input type="text" className="st-input" value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="نام فیلد" style={{ flex: 1, minWidth: 120 }} />
                      <div style={{ width: 180 }}>
                        <SearchableSelect
                          value={FIELD_TYPES.find(t => t.value === editType)?.label || editType}
                          options={FIELD_TYPES.map(t => t.label)}
                          onChange={(label) => { const found = FIELD_TYPES.find(t => t.label === label); if (found) setEditType(found.value); }}
                          dir="rtl"
                        />
                      </div>
                    </div>
                    {editType === 'dropdown' && (
                      <div className="st-field-edit-opts">
                        {editOptions.length > 0 && (
                          <div className="st-field-opt-tags">
                            {editOptions.map((opt, i) => (
                              <span key={i} className="st-opt-tag">
                                {opt}
                                <X className="st-opt-tag-x" onClick={() => setEditOptions(editOptions.filter((_, j) => j !== i))} />
                              </span>
                            ))}
                          </div>
                        )}
                        <input type="text" className="st-input"
                          placeholder="گزینه را تایپ کنید و Enter بزنید..."
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val && !editOptions.includes(val)) { setEditOptions([...editOptions, val]); (e.target as HTMLInputElement).value = ''; }
                            }
                          }} />
                      </div>
                    )}
                    <div className="vre-section">
                      <label className="vre-section-label"><Shield className="h-3.5 w-3.5" /> اعتبارسنجی</label>
                      <ValidationRuleEditor
                        rules={editValidationRules}
                        onChange={setEditValidationRules}
                        fieldType={editType}
                      />
                    </div>
                    <div className="st-field-edit-actions">
                      <button className="st-btn-sm primary" onClick={saveEdit}><Check className="h-3.5 w-3.5" /> ذخیره</button>
                      <button className="st-btn-sm" onClick={cancelEdit}><X className="h-3.5 w-3.5" /> لغو</button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={f.key} className="st-field-row">
                  <div className="st-field-info">
                    <span className="st-field-name">{f.fa}</span>
                    <span className="st-field-badge" style={{ background: badge.color }}>{badge.label}</span>
                    {f.fieldType === 'dropdown' && f.options && f.options.length > 0 && (
                      <span className="st-field-opts-count">({f.options.length} گزینه)</span>
                    )}
                    {f.validationRules && f.validationRules.length > 0 && (
                      <span className="st-field-badge" style={{ background: '#10b981' }}>{f.validationRules.length} قانون</span>
                    )}
                  </div>
                  <div className="st-field-actions">
                    <Pencil className="st-field-action-icon" onClick={() => startEdit(f)} />
                    <Trash2 className="st-field-action-icon danger" onClick={() => onRemoveField(f.key)} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="st-add-row">
          <input type="text" className="st-input" value={newFieldName}
            onChange={e => onNewFieldNameChange(e.target.value)}
            placeholder="نام فیلد جدید..."
            style={{ flex: 1, minWidth: 140 }}
            onKeyDown={e => e.key === 'Enter' && onAddField()} />
          <div style={{ width: 160 }}>
            <SearchableSelect
              value={FIELD_TYPES.find(t => t.value === newFieldType)?.label || newFieldType}
              options={FIELD_TYPES.map(t => t.label)}
              onChange={(label) => { const found = FIELD_TYPES.find(t => t.label === label); if (found) onNewFieldTypeChange(found.value); }}
              dir="rtl"
            />
          </div>
          <button className="st-btn primary" onClick={onAddField}>
            <Plus className="h-4 w-4" /> افزودن
          </button>
        </div>
      </div>

      {/* ── Performance ── */}
      <div className="st-panel">
        <SectionHeader numeral="VI" title="عملکرد (Performance)" icon={Zap} />
        <div className="st-toggle-row">
          <div>
            <div className="st-toggle-label">نمایش مجازی (Virtual Scroll)</div>
            <div className="st-toggle-desc">حافظه و پردازش کمتر برای هزاران رکورد</div>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={useVirtualScroll} onChange={onToggleVirtualScroll} />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* ── AI Configuration ── */}
      <div className="st-panel">
        <SectionHeader numeral="VII" title="پیکربندی AI (هوش مصنوعی)" icon={Bot} />
        <p style={{ fontSize: '0.8125rem', opacity: 0.6, margin: '0 0 1rem 0' }}>
          برای تبدیل هوشمند رکوردها به قالب دفاتر قانونی الکترونیکی، اطلاعات API را وارد کنید.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label className="st-toggle-label" style={{ marginBottom: '0.375rem', display: 'block' }}>API URL</label>
            <input
              type="url"
              className="st-input"
              value={aiApiUrl}
              onChange={e => onAiApiUrlChange(e.target.value)}
              placeholder="https://openrouter.ai/api/v1/chat/completions"
              dir="ltr"
            />
            <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.25rem', direction: 'ltr', textAlign: 'left' }}>
              نمونه: openrouter.ai/api/v1/chat/completions | api.openai.com/v1/chat/completions | localhost:20128/v1/chat/completions
            </div>
          </div>
          <div>
            <label className="st-toggle-label" style={{ marginBottom: '0.375rem', display: 'block' }}>API Key</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                className="st-input"
                value={aiApiKey}
                onChange={e => onAiApiKeyChange(e.target.value)}
                placeholder="sk-..."
                dir="ltr"
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)', opacity: 0.5,
                  padding: '0.25rem',
                }}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="st-toggle-label" style={{ marginBottom: '0.375rem', display: 'block' }}>مدل</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="st-input"
                  value={aiModel}
                  onChange={e => onAiModelChange(e.target.value)}
                  placeholder="gpt-4o / deepseek-chat / ..."
                  dir="ltr"
                  list="ai-models-list"
                />
                <datalist id="ai-models-list">
                  {availableModels.map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <button
                className="st-btn"
                onClick={fetchModels}
                disabled={modelsLoading || !aiApiUrl || !aiApiKey}
                title="دریافت خودکار مدل‌ها از API"
                style={{ flexShrink: 0 }}
              >
                {modelsLoading ? (
                  <span className="spinner-border spinner-border-sm" role="status" />
                ) : (
                  'دریافت مدل‌ها'
                )}
              </button>
            </div>
            {availableModels.length > 0 && (
              <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.25rem' }}>
                {availableModels.length} مدل موجود
              </div>
            )}
          </div>
          <div>
            <label className="st-toggle-label" style={{ marginBottom: '0.375rem', display: 'block' }}>CORS Proxy (اختیاری)</label>
            <input
              type="text"
              className="st-input"
              value={aiCorsProxy}
              onChange={e => onAiCorsProxyChange(e.target.value)}
              placeholder="http://localhost:3002/"
              dir="ltr"
            />
            <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.25rem', direction: 'ltr', textAlign: 'left' }}>
              اگر خطای CORS دارید: proxy-server.cjs را اجرا کنید و http://localhost:3002/ را اینجا وارد کنید. API URL را تغییر ندهید.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button className="st-btn primary" onClick={() => addToast('تنظیمات AI ذخیره شد', 'success')}>
              <Check className="h-4 w-4" /> ذخیره
            </button>
            {aiApiUrl && aiApiKey && aiModel && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                پیکربندی شده
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* ══════════════════════════════════════════════════════════════
           Settings — Classic Badge Theme
           ══════════════════════════════════════════════════════════════ */

        .st {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Panel ── */
        .st-panel {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 1.5rem;
        }

        /* ── Section Header ── */
        .st-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .st-section-badge {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: linear-gradient(135deg, var(--primary), var(--persian-teal));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .st-section-badge-icon {
          width: 13px;
          height: 13px;
          color: white;
        }

        .st-section-numeral {
          font-family: 'Georgia', serif;
          font-size: 0.5625rem;
          font-weight: 700;
          color: var(--primary);
          background: rgba(var(--primary-rgb), 0.06);
          padding: 0.1rem 0.35rem;
          border-radius: 3px;
          border: 1px solid rgba(var(--primary-rgb), 0.1);
        }

        .st-section-title {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .st-section-rule {
          flex: 1;
          height: 1px;
          background: var(--border-color);
        }

        /* ── Account Settings ── */
        .st-account-settings {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .st-account-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .st-account-label {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-color);
        }

        /* ── Server Status ── */
        .st-server-status {
          padding: 0.75rem 1rem;
          background: var(--hover-bg);
          border-radius: 8px;
        }

        .st-server-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .st-server-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .st-server-text {
          font-size: 0.8125rem;
          font-weight: 500;
        }

        /* ── Themes ── */
        .st-themes {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.625rem;
        }

        .st-theme {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem 0.75rem;
          border-radius: 10px;
          border: 1.5px solid var(--border-color);
          background: transparent;
          color: var(--text-color);
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
          font-family: inherit;
        }

        .st-theme:hover {
          border-color: var(--primary);
        }

        .st-theme.active {
          border-color: var(--primary);
          background: rgba(var(--primary-rgb), 0.04);
        }

        .st-theme-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: var(--hover-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }

        .st-theme.active .st-theme-icon-wrap {
          background: linear-gradient(135deg, var(--primary), var(--persian-teal));
          color: white;
          box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
        }

        .st-theme-icon {
          width: 20px;
          height: 20px;
        }

        .st-theme-label {
          font-size: 0.75rem;
          font-weight: 600;
        }

        .st-theme-check {
          position: absolute;
          top: 6px;
          left: 6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .st-theme-check-icon {
          width: 10px;
          height: 10px;
          color: white;
        }

        /* ── Tags ── */
        .st-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .st-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          background: var(--primary);
          color: white;
          font-size: 0.8125rem;
          cursor: default;
          transition: all 0.15s;
        }

        .st-tag.merge-source {
          background: var(--danger);
        }

        .st-tag.merge-mode {
          cursor: pointer;
          opacity: 0.7;
        }

        .st-tag.merge-mode:hover {
          opacity: 1;
        }

        .st-tag-input {
          background: transparent;
          border: none;
          color: white;
          font-size: 0.8125rem;
          width: auto;
          min-width: 50px;
          outline: none;
          padding: 0;
          font-family: inherit;
        }

        .st-tag-icon {
          width: 14px;
          height: 14px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }

        .st-tag-icon:hover {
          opacity: 1;
        }

        /* ── Merge ── */
        .st-merge-box {
          margin-top: 1rem;
          padding: 1rem;
          background: var(--hover-bg);
          border-radius: 8px;
        }

        .st-merge-hint {
          font-size: 0.8125rem;
          opacity: 0.7;
          margin-bottom: 0.75rem;
        }

        .st-merge-row {
          display: flex;
          gap: 0.5rem;
        }

        /* ── Custom Fields ── */
        .st-fields {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .st-field-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: var(--hover-bg);
          border-radius: 8px;
          transition: background 0.15s;
        }

        .st-field-row:hover {
          background: var(--border-color);
        }

        .st-field-info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .st-field-name {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .st-field-badge {
          font-size: 0.625rem;
          padding: 0.15rem 0.5rem;
          border-radius: 10px;
          color: white;
          font-weight: 600;
        }

        .st-field-opts-count {
          font-size: 0.75rem;
          opacity: 0.5;
        }

        .st-field-actions {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .st-field-action-icon {
          width: 18px;
          height: 18px;
          cursor: pointer;
          opacity: 0.4;
          transition: all 0.15s;
        }

        .st-field-action-icon:hover {
          opacity: 0.8;
        }

        .st-field-action-icon.danger {
          color: var(--danger);
        }

        .st-field-edit {
          padding: 1rem;
          background: var(--hover-bg);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .st-field-edit-row {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          flex-wrap: wrap;
        }

        .st-field-edit-opts {
          margin-bottom: 0.75rem;
        }

        .st-field-opt-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.5rem;
        }

        .st-opt-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.3rem 0.6rem;
          background: var(--primary);
          color: white;
          border-radius: 6px;
          font-size: 0.75rem;
        }

        .st-opt-tag-x {
          width: 12px;
          height: 12px;
          cursor: pointer;
        }

        .st-field-edit-actions {
          display: flex;
          gap: 0.5rem;
        }

        .vre-section {
          margin: 0.75rem 0;
          padding: 0.625rem;
          background: var(--bg-body);
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .vre-section-label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--text-color);
          opacity: 0.7;
        }

        /* ── Toggle Row ── */
        .st-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.5rem 0;
        }

        .st-toggle-label {
          font-weight: 600;
          font-size: 0.875rem;
        }

        .st-toggle-desc {
          opacity: 0.5;
          font-size: 0.8125rem;
          margin-top: 0.125rem;
        }

        /* ── Shared Inputs ── */
        .st-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
          margin-bottom: 0;
          transition: border-color 0.15s;
        }

        .st-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .st-input::placeholder {
          color: var(--text-color);
          opacity: 0.3;
        }

        .st-add-row {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        /* ── Buttons ── */
        .st-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .st-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .st-btn.primary {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .st-btn.primary:hover {
          background: var(--primary-hover);
        }

        .st-btn.danger {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }

        .st-btn-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.4rem 0.875rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .st-btn-sm:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .st-btn-sm.primary {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .st-themes {
            grid-template-columns: repeat(2, 1fr);
          }

          .st-add-row {
            flex-direction: column;
          }

          .st-add-row > div {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}