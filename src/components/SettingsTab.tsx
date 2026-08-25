import { useState } from 'react';
import SearchableSelect from './SearchableSelect';
import ValidationRuleEditor from './ValidationRuleEditor';
import type { ValidationRule as ValidationRuleType } from '../types';
import {
  Plus, Trash2, Pencil, Check, X,
  Merge, Shield, Eye, EyeOff, Loader2, SlidersHorizontal, CheckCircle2,
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'متن' },
  { value: 'number', label: 'عدد' },
  { value: 'date', label: 'تاریخ' },
  { value: 'dropdown', label: 'لیست انتخابی' },
  { value: 'color', label: 'رنگ' },
];

const FIELD_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  text: { label: 'متن', color: '#0f766e' },
  number: { label: 'عدد', color: '#10b981' },
  date: { label: 'تاریخ', color: '#f59e0b' },
  dropdown: { label: 'لیست', color: '#06b6d4' },
  color: { label: 'رنگ', color: '#ef4444' },
};

/* Mini page previews for the theme selector — real token colors per theme */
const THEME_PREVIEWS: Record<string, { bg: string; surface: string; ink: string; accent: string; label: string }> = {
  light: { bg: '#f4f2ec', surface: '#ffffff', ink: '#1f2937', accent: '#0f766e', label: 'روشن' },
  dark: { bg: '#151d29', surface: '#1f2a3a', ink: '#e7ecf3', accent: '#2dd4bf', label: 'تیره' },
  sepia: { bg: '#efe6d4', surface: '#faf3e4', ink: '#5a4a33', accent: '#a16207', label: 'سپیا' },
  'high-contrast': { bg: '#000000', surface: '#111111', ink: '#ffffff', accent: '#ffe14d', label: 'کنتراست بالا' },
};

const THEME_ORDER = ['light', 'dark', 'sepia', 'high-contrast'] as const;

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

function SectionHead({ numeral, title, desc }: { numeral: string; title: string; desc?: string }) {
  return (
    <div className="ds-section-head">
      <span className="ds-section-numeral">{numeral}</span>
      <h4 className="ds-section-title">{title}</h4>
      {desc && <span className="ds-section-desc">{desc}</span>}
      <div className="ds-section-rule" />
    </div>
  );
}

type Category = 'appearance' | 'tags' | 'fields' | 'performance' | 'ai';

export default function SettingsTab({
  customFields, onAddField, onRemoveField, onEditField, newFieldName, onNewFieldNameChange,
  newFieldType, onNewFieldTypeChange,
  serverMode: _serverMode, authUser: _authUser,
  tags, onAddTag, onRemoveTag,
  useVirtualScroll, onToggleVirtualScroll,
  theme, onThemeChange,
  aiApiUrl, onAiApiUrlChange, aiApiKey, onAiApiKeyChange,
  aiModel, onAiModelChange,
  aiCorsProxy, onAiCorsProxyChange,
  addToast,
}: Props) {
  const [category, setCategory] = useState<Category>('appearance');
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
      addToast('خطا در دریافت مدلها: ' + msg, 'error');
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

  const categories: Array<{ key: Category; numeral: string; label: string }> = [
    { key: 'appearance', numeral: 'I', label: 'ظاهر' },
    { key: 'tags', numeral: 'II', label: 'برچسبها' },
    { key: 'fields', numeral: 'III', label: 'فیلدهای سفارشی' },
    { key: 'performance', numeral: 'IV', label: 'عملکرد' },
    { key: 'ai', numeral: 'V', label: 'هوش مصنوعی' },
  ];

  const aiConfigured = Boolean(aiApiUrl && aiApiKey && aiModel);

  return (
    <div className="ds fade-in">
      {/* ── Page head ── */}
      <div className="ds-page-head">
        <div>
          <div className="ds-page-eyebrow"><SlidersHorizontal className="h-3.5 w-3.5" /> تنظیمات</div>
          <h2 className="ds-page-title">تنظیمات برنامه</h2>
          <p className="ds-page-desc">ظاهر، برچسبها، فیلدها و اتصال هوش مصنوعی — تغییرات بلافاصله ذخیره میشوند.</p>
        </div>
        <span className="st-autosave-hint"><CheckCircle2 className="h-3.5 w-3.5" /> ذخیره خودکار</span>
      </div>

      <div className="ds-layout">
        {/* ── Category rail ── */}
        <nav className="ds-rail" aria-label="دستههای تنظیمات">
          {categories.map(c => (
            <button key={c.key} className={`ds-rail-item ${category === c.key ? 'active' : ''}`}
              onClick={() => setCategory(c.key)} aria-current={category === c.key ? 'page' : undefined}>
              <span className="ds-section-numeral">{c.numeral}</span>
              {c.label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className="ds-card">
          {/* ═══ ظاهر ═══ */}
          {category === 'appearance' && (
            <>
              <SectionHead numeral="I" title="ظاهر" desc="پوسته نمایش برنامه" />
              <div className="st-themes" role="radiogroup" aria-label="انتخاب پوسته">
                {THEME_ORDER.map(key => {
                  const p = THEME_PREVIEWS[key];
                  const active = theme === key;
                  return (
                    <button key={key} role="radio" aria-checked={active}
                      className={`st-theme ${active ? 'active' : ''}`}
                      onClick={() => onThemeChange(key)}>
                      <span className="st-theme-preview" style={{ background: p.bg }} aria-hidden="true">
                        <span className="st-theme-preview-bar" style={{ background: p.accent }} />
                        <span className="st-theme-preview-line" style={{ background: p.ink }} />
                        <span className="st-theme-preview-line st-theme-preview-line--short" style={{ background: p.ink, opacity: 0.4 }} />
                        <span className="st-theme-preview-card" style={{ background: p.surface, borderColor: p.ink + '22' }}>
                          <span style={{ width: 8, height: 8, borderRadius: 3, background: p.accent }} />
                          <span style={{ flex: 1, height: 3, borderRadius: 2, background: p.ink, opacity: 0.25 }} />
                        </span>
                      </span>
                      <span className="st-theme-label">{p.label}</span>
                      {active && <span className="st-theme-check"><Check className="st-theme-check-icon" /></span>}
                    </button>
                  );
                })}
              </div>
              <p className="st-theme-note">
                پوسته روی همین دستگاه ذخیره میشود و همه صفحات — از سوابق تا دستیار هوشمند — را یکجا تغییر میدهد.
              </p>
            </>
          )}

          {/* ═══ برچسبها ═══ */}
          {category === 'tags' && (
            <>
              <SectionHead numeral="II" title="برچسبها" desc="دستهبندی رکوردها" />
              {tags.length > 0 ? (
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
                          className="st-tag-input" autoFocus aria-label={`ویرایش برچسب ${tag}`} />
                      ) : tag}
                      {!mergeMode && (
                        <Pencil className="st-tag-icon" onClick={(e) => { e.stopPropagation(); startTagEdit(tag); }} />
                      )}
                      {!mergeMode && (
                        <X className="st-tag-icon" onClick={() => onRemoveTag(tag)} aria-label={`حذف برچسب ${tag}`} />
                      )}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="st-hint-block">هنوز برچسبی نساختهاید. برچسبها برای فیلتر کردن سریع رکوردها استفاده میشوند.</p>
              )}

              <div className="st-add-row">
                <input type="text" className="ds-input" value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  placeholder="نام برچسب جدید..."
                  aria-label="نام برچسب جدید"
                  onKeyDown={e => { if (e.key === 'Enter') { onAddTag(newTag); setNewTag(''); } }} />
                <button className="ds-btn ds-btn--primary" onClick={() => { onAddTag(newTag); setNewTag(''); }} disabled={!newTag.trim()}>
                  <Plus className="h-4 w-4" /> افزودن
                </button>
              </div>

              {tags.length >= 2 && (
                <div className="st-merge-area">
                  <button className={`ds-btn ds-btn--sm ${mergeMode ? 'ds-btn--danger' : ''}`}
                    onClick={() => { setMergeMode(!mergeMode); setMergeSource(null); setMergeTarget(''); }}>
                    <Merge className="h-3.5 w-3.5" /> {mergeMode ? 'لغو ادغام' : 'ادغام برچسبها'}
                  </button>
                  {mergeMode && (
                    <div className="st-merge-box">
                      <p className="st-merge-hint">
                        {mergeSource ? `برچسب «${mergeSource}» به کجا ادغام شود؟` : 'ابتدا برچسب مبدأ را از بالا انتخاب کنید'}
                      </p>
                      {mergeSource && (
                        <div className="st-merge-row">
                          <input type="text" className="ds-input" value={mergeTarget}
                            onChange={e => setMergeTarget(e.target.value)}
                            placeholder="نام برچسب مقصد..."
                            aria-label="نام برچسب مقصد"
                            onKeyDown={e => { if (e.key === 'Enter') handleMerge(); }} />
                          <button className="ds-btn ds-btn--primary" onClick={handleMerge}>
                            <Check className="h-4 w-4" /> ادغام
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ فیلدهای سفارشی ═══ */}
          {category === 'fields' && (
            <>
              <SectionHead numeral="III" title="فیلدهای سفارشی" desc="اطلاعات اضافه روی هر رکورد" />
              {customFields.length > 0 && (
                <div className="st-fields">
                  {customFields.map(f => {
                    const badge = FIELD_TYPE_BADGES[f.fieldType] || FIELD_TYPE_BADGES.text;
                    const isEditing = editingKey === f.key;

                    if (isEditing) {
                      return (
                        <div key={f.key} className="st-field-edit">
                          <div className="st-field-edit-row">
                            <input type="text" className="ds-input" value={editName}
                              onChange={e => setEditName(e.target.value)}
                              placeholder="نام فیلد" style={{ flex: 1, minWidth: 120 }}
                              aria-label="نام فیلد" />
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
                              <input type="text" className="ds-input"
                                placeholder="گزینه را تایپ کنید و Enter بزنید..."
                                aria-label="افزودن گزینه"
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = (e.target as HTMLInputElement).value.trim();
                                    if (val && !editOptions.includes(val)) { setEditOptions([...editOptions, val]); (e.target as HTMLInputElement).value = ''; }
                                  }
                                }} />
                            </div>
                          )}
                          <div className="st-vre-section">
                            <label className="st-vre-label"><Shield className="h-3.5 w-3.5" /> قوانین اعتبارسنجی</label>
                            <ValidationRuleEditor
                              rules={editValidationRules}
                              onChange={setEditValidationRules}
                              fieldType={editType}
                            />
                          </div>
                          <div className="st-field-edit-actions">
                            <button className="ds-btn ds-btn--sm ds-btn--primary" onClick={saveEdit}><Check className="h-3.5 w-3.5" /> ذخیره</button>
                            <button className="ds-btn ds-btn--sm" onClick={cancelEdit}><X className="h-3.5 w-3.5" /> لغو</button>
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
                            <span className="st-field-opts-count">({f.options.length.toLocaleString('fa-IR')} گزینه)</span>
                          )}
                          {f.validationRules && f.validationRules.length > 0 && (
                            <span className="st-field-badge" style={{ background: '#10b981' }}>{f.validationRules.length.toLocaleString('fa-IR')} قانون</span>
                          )}
                        </div>
                        <div className="st-field-actions">
                          <button className="st-field-action-btn" onClick={() => startEdit(f)} aria-label={`ویرایش ${f.fa}`}>
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button className="st-field-action-btn st-field-action-btn--danger" onClick={() => onRemoveField(f.key)} aria-label={`حذف ${f.fa}`}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="st-add-row">
                <input type="text" className="ds-input" value={newFieldName}
                  onChange={e => onNewFieldNameChange(e.target.value)}
                  placeholder="نام فیلد جدید..."
                  style={{ flex: 1, minWidth: 140 }}
                  aria-label="نام فیلد جدید"
                  onKeyDown={e => e.key === 'Enter' && onAddField()} />
                <div style={{ width: 160 }}>
                  <SearchableSelect
                    value={FIELD_TYPES.find(t => t.value === newFieldType)?.label || newFieldType}
                    options={FIELD_TYPES.map(t => t.label)}
                    onChange={(label) => { const found = FIELD_TYPES.find(t => t.label === label); if (found) onNewFieldTypeChange(found.value); }}
                    dir="rtl"
                  />
                </div>
                <button className="ds-btn ds-btn--primary" onClick={onAddField} disabled={!newFieldName.trim()}>
                  <Plus className="h-4 w-4" /> افزودن
                </button>
              </div>
            </>
          )}

          {/* ═══ عملکرد ═══ */}
          {category === 'performance' && (
            <>
              <SectionHead numeral="IV" title="عملکرد" desc="بهینهسازی نمایش" />
              <div className="st-toggle-row">
                <div>
                  <div className="st-toggle-label">نمایش مجازی</div>
                  <div className="st-toggle-desc">فقط رکوردهای قابل مشاهده رندر میشوند — برای لیستهای چند هزار رکوردی</div>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={useVirtualScroll} onChange={onToggleVirtualScroll} />
                  <span className="toggle-slider"></span>
                  <span className="sr-only">نمایش مجازی</span>
                </label>
              </div>
            </>
          )}

          {/* ═══ هوش مصنوعی ═══ */}
          {category === 'ai' && (
            <>
              <SectionHead numeral="V" title="هوش مصنوعی" desc="اتصال دستیار هوشمند به سرویس AI" />
              <p className="st-hint-block">
                برای تبدیل هوشمند رکوردها به قالب دفاتر قانونی الکترونیکی، اطلاعات API سرویس AI را وارد کنید.
                {aiConfigured && (
                  <span className="st-ai-status"><span className="st-ai-dot" /> پیکربندی شده</span>
                )}
              </p>
              <div className="st-ai-form">
                <div>
                  <label className="ds-field-label" htmlFor="ai-url">آدرس API</label>
                  <input id="ai-url" type="url" className="ds-input" dir="ltr"
                    value={aiApiUrl} onChange={e => onAiApiUrlChange(e.target.value)}
                    placeholder="https://openrouter.ai/api/v1/chat/completions" />
                  <p className="ds-field-hint" dir="ltr">openrouter.ai · api.openai.com · localhost:20128/v1/chat/completions</p>
                </div>
                <div>
                  <label className="ds-field-label" htmlFor="ai-key">کلید API</label>
                  <div className="st-pw-wrap">
                    <input id="ai-key" type={showApiKey ? 'text' : 'password'} className="ds-input" dir="ltr"
                      value={aiApiKey} onChange={e => onAiApiKeyChange(e.target.value)}
                      placeholder="sk-..." autoComplete="off" />
                    <button type="button" className="pf-pw-toggle" onClick={() => setShowApiKey(v => !v)}
                      aria-label={showApiKey ? 'پنهان کردن کلید' : 'نمایش کلید'}>
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="ds-field-label" htmlFor="ai-model">مدل</label>
                  <div className="st-model-row">
                    <input id="ai-model" type="text" className="ds-input" dir="ltr"
                      value={aiModel} onChange={e => onAiModelChange(e.target.value)}
                      placeholder="gpt-4o / deepseek-chat / ..."
                      list="ai-models-list" />
                    <datalist id="ai-models-list">
                      {availableModels.map(m => <option key={m} value={m} />)}
                    </datalist>
                    <button className="ds-btn" onClick={fetchModels} disabled={modelsLoading || !aiApiUrl || !aiApiKey}
                      title="دریافت خودکار مدلها از API">
                      {modelsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دریافت مدلها'}
                    </button>
                  </div>
                  {availableModels.length > 0 && (
                    <p className="ds-field-hint">{availableModels.length.toLocaleString('fa-IR')} مدل از سرویس شما یافت شد</p>
                  )}
                </div>
                <div>
                  <label className="ds-field-label" htmlFor="ai-proxy">پروکسی CORS (اختیاری)</label>
                  <input id="ai-proxy" type="text" className="ds-input" dir="ltr"
                    value={aiCorsProxy} onChange={e => onAiCorsProxyChange(e.target.value)}
                    placeholder="http://localhost:3002/" />
                  <p className="ds-field-hint">
                    فقط در صورت خطای CORS: پروکسی محلی را اجرا کنید و آدرس آن را وارد نمایید. آدرس API را تغییر ندهید.
                  </p>
                </div>
                <p className="st-ai-save-note">این تنظیمات بلافاصله در همین مرورگر ذخیره میشوند.</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
