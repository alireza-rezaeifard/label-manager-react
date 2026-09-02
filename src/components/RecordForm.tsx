import { useState, useRef, useEffect } from "react";
import type React from "react";
import { DayPicker } from "@daypicker/persian";
import { faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { FIELDS } from "../data/fields";
import { toJalaliDate } from "../utils/formatters";
import { api } from "../utils/api";
import { PriceInput } from "@/components/ui/price-input"
import { useControllableState } from "@/hooks/useControllableState"
import { extractTextFromImage } from "../utils/ocr";
import MultiSelectDropdown from "./MultiSelectDropdown";
import SearchableSelect from "./SearchableSelect";
import LoadingSpinner from "./LoadingSpinner";
import AutocompleteInput from "./AutocompleteInput";
import type { RecordItem, ValidationRule } from "../types";
import { useDebounce } from "../hooks/useDebounce";
import {
  Grid3X3, Calendar, Palette, ImageIcon, Link2, Tags, Trash2, Check, Plus, Pencil,
  FileText, Hash, Building2, Type, CalendarDays, Users, DollarSign, ScanText, Shield,
} from 'lucide-react';

interface RecordFormState {
  code: string;
  project: string;
  type: string;
  date: string;
  party: string;
  amount: string;
  related: string[];
  tags: string[];
  image: string;
  color: string;
  [key: string]: unknown;
}

interface FormField {
  key: string;
  label: string;
  fa: string;
  placeholder?: string;
  isRelated?: boolean;
  isCustom?: boolean;
  fieldType?: string;
  options?: string[];
  validationRules?: ValidationRule[];
}

const FIELD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  code: Hash,
  project: Building2,
  type: Type,
  date: CalendarDays,
  party: Users,
  amount: DollarSign,
};

interface RecordFormProps {
  editRecord: RecordItem | null;
  editIndex: number | null;
  availableLabels: { code: string; project: string }[];
  isDuplicateCode: (code: string, index: number | null) => boolean;
  checkDuplicateCode?: (code: string, excludeId?: string | null) => Promise<boolean>;
  onSubmit: (record: RecordItem) => void;
  onCancel: () => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  customFields?: FormField[];
  serverMode: boolean;
  allTags?: string[];
  onFormChange?: (form: RecordFormState) => void;
  loading?: boolean;
  fieldSuggestions?: Record<string, string[]>;
}

export default function RecordForm({ editRecord, editIndex, availableLabels, isDuplicateCode, checkDuplicateCode, onSubmit, onCancel, addToast, customFields = [], serverMode, allTags = [], onFormChange, loading, fieldSuggestions }: RecordFormProps) {
  const allFields: FormField[] = [...FIELDS.filter((f: FormField) => !f.isRelated), ...customFields];
  const relatedField = FIELDS.find((f: FormField) => f.isRelated);

  const getInitialForm = (): RecordFormState => {
    if (editRecord) {
      const form: RecordFormState = { code: "", project: "", type: "", date: "", party: "", amount: "", related: [], tags: [], image: "", color: "" };
      allFields.forEach((f: FormField) => {
        form[f.key] = f.key === 'amount'
        ? (() => {
            const normalized = String(editRecord[f.key] || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
            const numStr = normalized.replace(/[^0-9]/g, '');
            return numStr ? Number(numStr).toLocaleString('en-US') : '';
          })()
        : (editRecord[f.key] || (f.isRelated ? [] : ""));
      });
      form.related = editRecord.related || [];
      form.tags = editRecord.tags || [];
      form.image = editRecord.image || "";
      form.color = editRecord.color || "";
      return form;
    }
    const form: RecordFormState = { code: "", project: "", type: "", date: "", party: "", amount: "", related: [], tags: [], image: "", color: "#0f766e" };
    customFields.forEach((f: FormField) => { form[f.key] = ""; });
    return form;
  };

  const [form, setForm] = useState<RecordFormState>(getInitialForm());
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const prevEditKey = useRef<string | number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const debouncedCode = useDebounce(form.code, 500);

  const currentKey = editRecord?.code ?? editIndex;
  if (currentKey !== prevEditKey.current) {
    prevEditKey.current = currentKey;
    setForm(getInitialForm());
    setFormErrors({});
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (onFormChange) onFormChange(form);
  }, [form, onFormChange]);

  // Duplicate-code check: derive check state from debouncedCode at render
  // time, then async-verify (avoids setState-in-effect cascading renders).
  const [prevDebouncedCode, setPrevDebouncedCode] = useState(debouncedCode);
  if (debouncedCode !== prevDebouncedCode) {
    setPrevDebouncedCode(debouncedCode);
    const code = debouncedCode.trim();
    if (!code) {
      setCodeDuplicate(false);
      setCodeChecking(false);
    } else if (isDuplicateCode(code, editIndex)) {
      setCodeDuplicate(true);
      setCodeChecking(false);
    } else if (checkDuplicateCode && serverMode) {
      setCodeChecking(true);
      const excludeId = editRecord?.id ? String(editRecord.id) : null;
      checkDuplicateCode(code, excludeId)
        .then(dup => setCodeDuplicate(dup))
        .catch(() => setCodeDuplicate(false))
        .finally(() => setCodeChecking(false));
    } else {
      setCodeDuplicate(false);
    }
  }

  const setField = (key: string, value: unknown) => {
    setForm((p: RecordFormState) => ({ ...p, [key]: value }));
    setFormErrors((p: Record<string, string | undefined>) => ({ ...p, [key]: "" }));
  };

  const validateField = (key: string, currentForm: RecordFormState) => {
    if (key === 'code' && !currentForm.code.trim()) return "فیلد ضروری است";
    if (key === 'code' && currentForm.code.trim() && isDuplicateCode(currentForm.code.trim(), editIndex)) return "این کد تکراری است";
    if (key === 'project' && !currentForm.project.trim()) return "فیلد ضروری است";
    const field = allFields.find(f => f.key === key);
    if (field?.validationRules) {
      const value = String(currentForm[key] || '');
      for (const rule of field.validationRules) {
        if (rule.type === 'required' && !value.trim()) return rule.message || 'این فیلد ضروری است';
        if (rule.type === 'min' && Number(value) < Number(rule.value)) return rule.message || `حداقل مقدار ${rule.value} است`;
        if (rule.type === 'max' && Number(value) > Number(rule.value)) return rule.message || `حداکثر مقدار ${rule.value} است`;
        if (rule.type === 'minLength' && value.length < Number(rule.value)) return rule.message || `حداقل ${rule.value} کاراکتر`;
        if (rule.type === 'maxLength' && value.length > Number(rule.value)) return rule.message || `حداکثر ${rule.value} کاراکتر`;
        if (rule.type === 'regex' && rule.value) {
          try {
            const regex = new RegExp(String(rule.value));
            if (!regex.test(value)) return rule.message || 'فرت نامعتبر است';
          } catch { /* skip invalid regex */ }
        }
        if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (value && !emailRegex.test(value)) return rule.message || 'فرمت ایمیل نامعتبر است';
        }
      }
    }
    return "";
  };

  const handleBlur = (key: string) => {
    const error = validateField(key, form);
    if (error) setFormErrors(p => ({ ...p, [key]: error }));
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = "فیلد ضروری است";
    if (!form.project.trim()) errors.project = "فیلد ضروری است";
    if (form.code.trim() && isDuplicateCode(form.code.trim(), editIndex)) {
      errors.code = "این کد تکراری است";
      addToast("کد تکراری است. لطفا کد دیگری وارد کنید.", "error");
    }
    for (const field of allFields) {
      if (field.validationRules) {
        const error = validateField(field.key, form);
        if (error) errors[field.key] = error;
      }
    }
    return errors;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast("حجم تصویر باید کمتر از ۲ مگابایت باشد", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target as FileReader).result as string;
      if (serverMode) {
        setImageUploading(true);
        try {
          const result = await api.uploadImage(base64);
          setField("image", result.url);
          addToast("تصویر با موفقیت آپلود شد", "success");
        } catch (err: unknown) {
          addToast("خطا در آپلود تصویر: " + (err instanceof Error ? err.message : String(err)), "error");
        } finally {
          setImageUploading(false);
        }
      } else {
        setField("image", base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleOcrExtract = async () => {
    const input = fileInputRef.current;
    if (!input?.files?.length) { addToast("ابتدا یک تصویر انتخاب کنید", "error"); return; }
    const file = input.files[0];
    setOcrProcessing(true);
    setOcrResult(null);
    try {
      const result = await extractTextFromImage(file);
      setOcrResult(result.text);
      if (result.fields.code) setField("code", result.fields.code);
      if (result.fields.party) setField("party", result.fields.party);
      if (result.fields.amount) setField("amount", result.fields.amount);
      if (result.fields.project) setField("project", result.fields.project);
      if (result.fields.date) setField("date", result.fields.date);
      if (result.fields.type) setField("type", result.fields.type);
      const filled = Object.keys(result.fields).filter(k => result.fields[k]).length;
      addToast(`${filled} فیلد از تصویر استخراج شد`, "success");
    } catch (err: any) {
      addToast("خطا در پردازش تصویر: " + (err.message || "خطای ناشناخته"), "error");
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleSubmit = () => {
    const errors = validate();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    const recordData: RecordItem = {
      code: form.code, project: form.project, type: form.type, date: form.date,
      party: form.party, amount: String(form.amount || '').replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^0-9]/g, ''), related: form.related, tags: form.tags,
      image: form.image, color: form.color,
    };
    customFields.forEach((f: FormField) => { recordData[f.key] = form[f.key] || ""; });
    onSubmit(recordData);
  };

  const isEditing = editIndex !== null;

  return (
    <div className="rf fade-in">
      {/* ── Page Header ── */}
      <div className="rf-header">
        <div className="rf-header-left">
          <div className="rf-emblem">
            {isEditing ? <Pencil className="rf-emblem-icon" /> : <Plus className="rf-emblem-icon" />}
          </div>
          <div>
            <h2 className="rf-title">{isEditing ? 'ویرایش رکورد' : 'افزودن رکورد'}</h2>
            <p className="rf-subtitle">
              {isEditing ? 'ویرایش اطلاعات رکورد موجود' : 'اطلاعات رکورد جدید را وارد کنید'}
            </p>
          </div>
        </div>
        <div className="rf-header-badge">
          <FileText className="rf-header-badge-icon" />
          <span>{isEditing ? 'ویرایش' : 'جدید'}</span>
        </div>
      </div>

      {/* ── Form Card ── */}
      <div className="rf-card">
        <div className="row">
          {allFields.map((f: FormField, idx: number) => {
            const FieldIcon = FIELD_ICONS[f.key] || Grid3X3;
            return (
              <div key={f.key} className="col-md-6">
                <div className="rf-field">
                  <label className="rf-label">
                    <span className="rf-label-badge">{String(idx + 1).padStart(2, '0')}</span>
                    <FieldIcon className="rf-label-icon" />
                    <span>{f.label}</span>
                    {f.isCustom && <span className="rf-label-star">&#9733;</span>}
                    <span className="rf-label-fa">({f.fa})</span>
                    {["code", "project"].includes(f.key) && <span className="rf-required">*</span>}
                  </label>

                  {f.key === "date" && !f.isCustom ? (
                    <div className="rf-date-wrap" ref={datePickerRef}>
                      <div className="rf-date-inner">
                        <input type="text" className={`rf-input ${formErrors[f.key] ? 'error' : ''}`}
                          value={form.date || ""}
                          onChange={e => setField("date", e.target.value)}
                          onBlur={() => handleBlur(f.key)}
                          onClick={() => setShowDatePicker(true)}
                          placeholder="1403/02/15" style={{ direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem', cursor: 'pointer' }} />
                        <Calendar className="rf-date-icon"
                          onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }} />
                      </div>
                      {showDatePicker && (
                        <div className="rf-datepicker">
                          <DayPicker locale={faIR} dir="rtl" mode="single"
                            selected={form.date ? new Date(form.date) : undefined}
                            onSelect={(date) => { if (date) setField("date", toJalaliDate(date)); setShowDatePicker(false); }}
                          />
                        </div>
                      )}
                    </div>
                  ) : f.isCustom && f.fieldType === 'number' ? (
                    <input type="number" className={`rf-input ${formErrors[f.key] ? 'error' : ''}`}
                      value={form[f.key] as string} onChange={e => setField(f.key, e.target.value)}
                      onBlur={() => handleBlur(f.key)}
                      placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left' }} />
                  ) : f.isCustom && f.fieldType === 'date' ? (
                    <div className="rf-date-wrap" ref={datePickerRef}>
                      <div className="rf-date-inner">
                        <input type="text" className={`rf-input ${formErrors[f.key] ? 'error' : ''}`}
                          value={(form[f.key] as string) || ""}
                          onChange={e => setField(f.key, e.target.value)}
                          onBlur={() => handleBlur(f.key)}
                          onClick={() => setShowDatePicker(true)}
                          placeholder="1403/02/15" style={{ direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem', cursor: 'pointer' }} />
                        <Calendar className="rf-date-icon"
                          onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }} />
                      </div>
                      {showDatePicker && (
                        <div className="rf-datepicker">
                          <DayPicker locale={faIR} dir="rtl" mode="single"
                            selected={form[f.key] ? new Date(form[f.key] as string) : undefined}
                            onSelect={(date) => { if (date) setField(f.key, toJalaliDate(date)); setShowDatePicker(false); }}
                          />
                        </div>
                      )}
                    </div>
                  ) : f.isCustom && f.fieldType === 'color' ? (
                    <div className="rf-color-row">
                      <input type="color" value={(form[f.key] as string) || '#0f766e'}
                        onChange={e => setField(f.key, e.target.value)}
                        className="rf-color-picker" />
                      <input type="text" className="rf-input" value={(form[f.key] as string) || ''}
                        onChange={e => setField(f.key, e.target.value)}
                        placeholder="#0f766e" style={{ marginBottom: 0, fontFamily: 'monospace' }} />
                    </div>
                  ) : f.isCustom && f.fieldType === 'dropdown' ? (
                    <SearchableSelect
                      value={form[f.key] as string || ''}
                      options={f.options || []}
                      onChange={(val) => setField(f.key, val)}
                      placeholder="انتخاب کنید..."
                      dir="ltr"
                    />
                  ) : f.key === "amount" ? (
                    <input type="text" className={`rf-input ${formErrors[f.key] ? 'error' : ''}`}
                      value={(form[f.key] as string) || ''}
                      onChange={e => {
                        const raw = e.target.value;
                        const normalized = raw.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
                        const digitsOnly = normalized.replace(/[^0-9]/g, '');
                        setField('amount', digitsOnly ? Number(digitsOnly).toLocaleString('en-US') : '');
                      }}
                      onBlur={() => handleBlur(f.key)}
                      placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left' }} />
                  ) : f.key === "code" ? (
                    <div className="rf-code-wrap">
                      {fieldSuggestions?.[f.key]?.length ? (
                        <AutocompleteInput
                          value={form[f.key] as string}
                          onChange={v => { setField(f.key, v); setCodeDuplicate(false); }}
                          onBlur={() => handleBlur(f.key)}
                          suggestions={fieldSuggestions[f.key]}
                          placeholder={f.placeholder || f.fa}
                          error={(formErrors[f.key] || codeDuplicate) ? 'true' : undefined}
                          className={`rf-input ${codeChecking ? 'warning' : ''}`}
                          dir="ltr"
                          style={{ paddingRight: codeChecking ? '2rem' : undefined }}
                        />
                      ) : (
                        <input type="text" className={`rf-input ${formErrors[f.key] || codeDuplicate ? 'error' : ''} ${codeChecking ? 'warning' : ''}`}
                          value={form[f.key] as string} onChange={e => { setField(f.key, e.target.value); setCodeDuplicate(false); }}
                          onBlur={() => handleBlur(f.key)}
                          placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left', paddingRight: codeChecking ? '2rem' : undefined }} />
                      )}
                      {codeChecking && (
                        <div className="rf-code-spinner"><LoadingSpinner size={16} /></div>
                      )}
                    </div>
                  ) : (
                    fieldSuggestions?.[f.key]?.length ? (
                      <AutocompleteInput
                        value={form[f.key] as string}
                        onChange={v => setField(f.key, v)}
                        onBlur={() => handleBlur(f.key)}
                        suggestions={fieldSuggestions[f.key]}
                        placeholder={f.placeholder || f.fa}
                        error={formErrors[f.key] ? 'true' : undefined}
                        className={`rf-input`}
                        dir="ltr"
                      />
                    ) : (
                      <input type="text" className={`rf-input ${formErrors[f.key] ? 'error' : ''}`}
                        value={form[f.key] as string} onChange={e => setField(f.key, e.target.value)}
                        onBlur={() => handleBlur(f.key)}
                        placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left' }}
                        autoComplete="off" />
                    )
                  )}

                  {formErrors[f.key] && <span className="rf-error">{formErrors[f.key]}</span>}
                  {f.key === 'code' && !formErrors[f.key] && codeDuplicate && <span className="rf-error">این کد تکراری است</span>}
                </div>
              </div>
            );
          })}

          {/* Color */}
          <div className="col-md-6">
            <div className="rf-field">
              <label className="rf-label">
                <span className="rf-label-badge">&#9670;</span>
                <Palette className="rf-label-icon" />
                <span>رنگ برچسب</span>
                <span className="rf-label-fa">(اختیاری)</span>
              </label>
              <div className="rf-color-row">
                <input type="color" value={form.color || '#0f766e'}
                  onChange={e => setField('color', e.target.value)}
                  className="rf-color-picker" />
                <input type="text" className="rf-input" value={form.color || ''}
                  onChange={e => setField('color', e.target.value)}
                  placeholder="#0f766e" style={{ marginBottom: 0, fontFamily: 'monospace' }} />
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="col-12">
            <div className="rf-field">
              <label className="rf-label">
                <span className="rf-label-badge">&#9670;</span>
                <ImageIcon className="rf-label-icon" />
                <span>تصویر</span>
                <span className="rf-label-fa">(اختیاری)</span>
              </label>
              <div className="rf-image-row">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="rf-input" style={{ padding: '0.75rem', flex: 1 }} />
                <button className="rf-btn ocr" onClick={handleOcrExtract} disabled={ocrProcessing} title="استخراج متن از تصویر">
                  {ocrProcessing ? <LoadingSpinner size={16} /> : <ScanText className="h-4 w-4" />}
                  {ocrProcessing ? 'در حال پردازش...' : 'استخراج'}
                </button>
              </div>
              {imageUploading && <span className="rf-info">در حال آپلود...</span>}
              {ocrResult && <span className="rf-info" style={{ color: 'var(--success)' }}>متن استخراج شد: {ocrResult.slice(0, 100)}{ocrResult.length > 100 ? '...' : ''}</span>}
              {form.image && (
                <div className="rf-image-preview">
                  <img src={form.image} alt="preview" className="rf-image" />
                  <button className="rf-remove-btn" onClick={() => setField("image", "")}>
                    <Trash2 className="h-4 w-4" /> حذف
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Related */}
          <div className="col-12">
            <div className="rf-field">
              <label className="rf-label">
                <span className="rf-label-badge">&#9670;</span>
                <Link2 className="rf-label-icon" />
                <span>{relatedField?.label}</span>
                <span className="rf-label-fa">({relatedField?.fa})</span>
              </label>
              <MultiSelectDropdown
                options={availableLabels}
                selected={form.related}
                onChange={(selected: string[]) => setField("related", selected)}
              />
              <span className="rf-hint">می‌توانید چندین رکورد مرتبط را انتخاب کنید</span>
            </div>
          </div>

          {/* Tags */}
          <div className="col-12">
            <div className="rf-field">
              <label className="rf-label">
                <span className="rf-label-badge">&#9670;</span>
                <Tags className="rf-label-icon" />
                <span>برچسب‌ها</span>
                <span className="rf-label-fa">(اختیاری)</span>
              </label>
              <div className="rf-tags">
                {allTags.map((tag: string) => {
                  const active = form.tags.includes(tag);
                  return (
                    <button key={tag} className={`rf-tag ${active ? 'active' : ''}`} onClick={() => {
                      const next = active ? form.tags.filter((t: string) => t !== tag) : [...form.tags, tag];
                      setField('tags', next);
                    }}>
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="rf-actions">
          <button className="rf-btn primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <LoadingSpinner size={18} /> : isEditing ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {loading ? 'در حال ذخیره...' : (isEditing ? 'ذخیره تغییرات' : 'افزودن رکورد')}
          </button>
          <button className="rf-btn" onClick={onCancel}>انصراف</button>
        </div>
      </div>

      <style>{`
        /* ══════════════════════════════════════════════════════════════
           Record Form — Classic Badge Theme
           ══════════════════════════════════════════════════════════════ */

        .rf {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* ── Header ── */
        .rf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .rf-header-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .rf-emblem {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), #14b8a6);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
          flex-shrink: 0;
        }

        .rf-emblem-icon {
          width: 22px;
          height: 22px;
          color: white;
        }

        .rf-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-color);
          letter-spacing: -0.02em;
        }

        .rf-subtitle {
          margin: 0.125rem 0 0;
          font-size: 0.8125rem;
          color: var(--text-color);
          opacity: 0.45;
        }

        .rf-header-badge {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          background: rgba(15, 118, 110, 0.06);
          border: 1px solid rgba(15, 118, 110, 0.12);
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary);
        }

        .rf-header-badge-icon {
          width: 14px;
          height: 14px;
        }

        /* ── Card ── */
        .rf-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          padding: 2rem;
        }

        /* ── Field ── */
        .rf-field {
          margin-bottom: 1.25rem;
        }

        .rf-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-weight: 600;
          font-size: 0.8125rem;
          color: var(--text-color);
        }

        .rf-label-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          height: 18px;
          padding: 0 4px;
          border-radius: 4px;
          background: var(--hover-bg);
          border: 1px solid var(--border-color);
          font-family: 'Georgia', serif;
          font-size: 0.5625rem;
          font-weight: 700;
          color: var(--text-color);
          opacity: 0.45;
        }

        .rf-label-icon {
          width: 15px;
          height: 15px;
          color: var(--primary);
          opacity: 0.7;
        }

        .rf-label-fa {
          opacity: 0.4;
          font-weight: 400;
          font-size: 0.75rem;
        }

        .rf-required {
          color: var(--danger);
          font-weight: 700;
        }

        .rf-label-star {
          color: var(--warning);
          font-size: 0.75rem;
        }

        /* ── Input ── */
        .rf-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
          transition: all 0.15s;
        }

        .rf-input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.08);
        }

        .rf-input.error {
          border-color: var(--danger);
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.06);
        }

        .rf-input.warning {
          border-color: var(--warning);
        }

        .rf-input::placeholder {
          color: var(--text-color);
          opacity: 0.3;
        }

        /* ── Date Picker ── */
        .rf-date-wrap {
          position: relative;
        }

        .rf-date-inner {
          position: relative;
        }

        .rf-date-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          opacity: 0.5;
          width: 16px;
          height: 16px;
          transition: opacity 0.15s;
        }

        .rf-date-icon:hover {
          opacity: 0.8;
        }

        .rf-datepicker {
          position: absolute;
          top: 100%;
          right: 0;
          z-index: 1000;
          margin-top: 0.5rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
        }

        /* ── Color ── */
        .rf-color-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .rf-color-picker {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          cursor: pointer;
          padding: 2px;
          background: none;
          flex-shrink: 0;
        }

        /* ── Code ── */
        .rf-code-wrap {
          position: relative;
        }

        .rf-code-spinner {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
        }

        /* ── Error ── */
        .rf-error {
          display: block;
          color: var(--danger);
          font-size: 0.75rem;
          margin-top: 0.375rem;
        }

        .rf-info {
          display: block;
          color: var(--primary);
          font-size: 0.75rem;
          margin-top: 0.375rem;
        }

        .rf-hint {
          display: block;
          color: var(--text-color);
          opacity: 0.4;
          font-size: 0.75rem;
          margin-top: 0.5rem;
        }

        /* ── Image ── */
        .rf-image-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .rf-btn.ocr {
          white-space: nowrap;
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
          background: linear-gradient(135deg, var(--primary), #14b8a6);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-family: inherit;
          font-weight: 600;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .rf-btn.ocr:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
          transform: translateY(-1px);
        }

        .rf-btn.ocr:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .rf-image-preview {
          margin-top: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .rf-image {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }

        .rf-remove-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rf-remove-btn:hover {
          border-color: var(--danger);
          color: var(--danger);
        }

        /* ── Tags ── */
        .rf-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .rf-tag {
          padding: 0.375rem 0.875rem;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-color);
          font-size: 0.8125rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rf-tag:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .rf-tag.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        /* ── Actions ── */
        .rf-actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border-color);
        }

        .rf-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.5rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.875rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rf-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .rf-btn.primary {
          background: linear-gradient(135deg, var(--primary), #14b8a6);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
        }

        .rf-btn.primary:hover {
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.4);
          transform: translateY(-1px);
        }

        .rf-btn.primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .rf-card {
            padding: 1.25rem;
          }

          .rf-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
