import { useState, useRef, useEffect } from "react";
import type React from "react";
import { DayPicker } from "@daypicker/persian";
import { faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { FIELDS } from "../data/fields";
import { toJalaliDate } from "../utils/formatters";
import { api } from "../utils/api";
import MultiSelectDropdown from "./MultiSelectDropdown";
import SearchableSelect from "./SearchableSelect";
import LoadingSpinner from "./LoadingSpinner";
import type { RecordItem } from "../types";
import { useDebounce } from "../hooks/useDebounce";

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
}

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
}

export default function RecordForm({ editRecord, editIndex, availableLabels, isDuplicateCode, checkDuplicateCode, onSubmit, onCancel, addToast, customFields = [], serverMode, allTags = [], onFormChange, loading }: RecordFormProps) {
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
    const form: RecordFormState = { code: "", project: "", type: "", date: "", party: "", amount: "", related: [], tags: [], image: "", color: "#7367f0" };
    customFields.forEach((f: FormField) => { form[f.key] = ""; });
    return form;
  };

  const [form, setForm] = useState<RecordFormState>(getInitialForm());
  const [formErrors, setFormErrors] = useState<Record<string, string | undefined>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const [codeChecking, setCodeChecking] = useState(false);
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

  useEffect(() => {
    const code = debouncedCode.trim();
    if (!code) {
      setCodeDuplicate(false);
      setCodeChecking(false);
      return;
    }
    if (isDuplicateCode(code, editIndex)) {
      setCodeDuplicate(true);
      setCodeChecking(false);
      return;
    }
    if (checkDuplicateCode && serverMode) {
      setCodeChecking(true);
      const excludeId = editRecord?.id ? String(editRecord.id) : null;
      checkDuplicateCode(code, excludeId)
        .then(dup => setCodeDuplicate(dup))
        .catch(() => setCodeDuplicate(false))
        .finally(() => setCodeChecking(false));
    } else {
      setCodeDuplicate(false);
    }
  }, [debouncedCode, editIndex, serverMode, isDuplicateCode, checkDuplicateCode, editRecord?.id]);

  const setField = (key: string, value: unknown) => {
    setForm((p: RecordFormState) => ({ ...p, [key]: value }));
    setFormErrors((p: Record<string, string | undefined>) => ({ ...p, [key]: "" }));
  };

  const validateField = (key: string, currentForm: RecordFormState) => {
    if (key === 'code' && !currentForm.code.trim()) {
      return "فیلد ضروری است";
    }
    if (key === 'code' && currentForm.code.trim() && isDuplicateCode(currentForm.code.trim(), editIndex)) {
      return "این کد تکراری است";
    }
    if (key === 'project' && !currentForm.project.trim()) {
      return "فیلد ضروری است";
    }
    return "";
  };

  const handleBlur = (key: string) => {
    const error = validateField(key, form);
    if (error) {
      setFormErrors(p => ({ ...p, [key]: error }));
    }
  };

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.code.trim()) errors.code = "فیلد ضروری است";
    if (!form.project.trim()) errors.project = "فیلد ضروری است";
    if (form.code.trim() && isDuplicateCode(form.code.trim(), editIndex)) {
      errors.code = "این کد تکراری است";
      addToast("کد تکراری است. لطفا کد دیگری وارد کنید.", "error");
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

  return (
    <div className="form-card fade-in">
      <div className="row">
        {allFields.map((f: FormField) => (
          <div key={f.key} className="col-md-6">
            <div className="form-group">
              <label className="form-label">
                <i className="ti ti-apps" style={{ marginRight: 8 }}></i>
                {f.label} {f.isCustom ? '⭐' : ''}
                <span style={{ opacity: 0.5 }}>({f.fa})</span>
                {["code", "project"].includes(f.key) && <span className="text-danger"> *</span>}
              </label>
              {f.key === "date" && !f.isCustom ? (
                <div style={{ position: 'relative' }} ref={datePickerRef}>
                  <div style={{ position: 'relative' }}>
                    <input type="text" className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                      value={form.date || ""}
                      onChange={e => setField("date", e.target.value)}
                      onBlur={() => handleBlur(f.key)}
                      onClick={() => setShowDatePicker(true)}
                      placeholder="1403/02/15" style={{ direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem', cursor: 'pointer' }} />
                    <i className="ti ti-calendar"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}>
                    </i>
                  </div>
                  {showDatePicker && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                      <DayPicker locale={faIR} dir="rtl" mode="single"
                        selected={form.date ? new Date(form.date) : undefined}
                        onSelect={(date) => { if (date) setField("date", toJalaliDate(date)); setShowDatePicker(false); }}
                      />
                    </div>
                  )}
                </div>
              ) : f.isCustom && f.fieldType === 'number' ? (
                <input type="number" className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                  value={form[f.key] as string} onChange={e => setField(f.key, e.target.value)}
                  onBlur={() => handleBlur(f.key)}
                  placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left' }} />
              ) : f.isCustom && f.fieldType === 'date' ? (
                <div style={{ position: 'relative' }} ref={datePickerRef}>
                  <div style={{ position: 'relative' }}>
                    <input type="text" className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                      value={(form[f.key] as string) || ""}
                      onChange={e => setField(f.key, e.target.value)}
                      onBlur={() => handleBlur(f.key)}
                      onClick={() => setShowDatePicker(true)}
                      placeholder="1403/02/15" style={{ direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem', cursor: 'pointer' }} />
                    <i className="ti ti-calendar"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}>
                    </i>
                  </div>
                  {showDatePicker && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 1000, marginTop: '0.5rem', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}>
                      <DayPicker locale={faIR} dir="rtl" mode="single"
                        selected={form[f.key] ? new Date(form[f.key] as string) : undefined}
                        onSelect={(date) => { if (date) setField(f.key, toJalaliDate(date)); setShowDatePicker(false); }}
                      />
                    </div>
                  )}
                </div>
              ) : f.isCustom && f.fieldType === 'color' ? (
                <div className="d-flex gap-2 align-items-center">
                  <input type="color" value={(form[f.key] as string) || '#7367f0'}
                    onChange={e => setField(f.key, e.target.value)}
                    style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2, background: 'none' }} />
                  <input type="text" className="form-input" value={(form[f.key] as string) || ''}
                    onChange={e => setField(f.key, e.target.value)}
                    placeholder="#7367f0" style={{ marginBottom: 0, fontFamily: 'monospace' }} />
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
                <input type="text" className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
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
                <div style={{ position: 'relative' }}>
                  <input type="text" className={`form-input ${formErrors[f.key] || codeDuplicate ? 'border-danger' : ''} ${codeChecking ? 'border-warning' : ''}`}
                    value={form[f.key] as string} onChange={e => { setField(f.key, e.target.value); setCodeDuplicate(false); }}
                    onBlur={() => handleBlur(f.key)}
                    placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left', paddingRight: codeChecking ? '2rem' : undefined }} />
                  {codeChecking && (
                    <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                      <LoadingSpinner size={16} />
                    </div>
                  )}
                </div>
              ) : (
                <input type="text" className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                  value={form[f.key] as string} onChange={e => setField(f.key, e.target.value)}
                  onBlur={() => handleBlur(f.key)}
                  placeholder={f.placeholder || f.fa} style={{ direction: 'ltr', textAlign: 'left' }} />
              )}
              {formErrors[f.key] && (
                <small style={{ color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>{formErrors[f.key]}</small>
              )}
              {f.key === 'code' && !formErrors[f.key] && codeDuplicate && (
                <small style={{ color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>این کد تکراری است</small>
              )}
            </div>
          </div>
        ))}

          <div className="col-md-6">
            <div className="form-group">
              <label className="form-label">
                <i className="ti ti-color-picker" style={{ marginRight: 8 }}></i>
                رنگ برچسب <span style={{ opacity: 0.5 }}>(اختیاری)</span>
              </label>
              <div className="d-flex gap-2 align-items-center">
                <input type="color" value={form.color || '#7367f0'}
                  onChange={e => setField('color', e.target.value)}
                  style={{ width: 48, height: 48, borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer', padding: 2, background: 'none' }} />
                <input type="text" className="form-input" value={form.color || ''}
                  onChange={e => setField('color', e.target.value)}
                  placeholder="#7367f0" style={{ marginBottom: 0, fontFamily: 'monospace' }} />
              </div>
            </div>
          </div>

          <div className="col-12">
          <div className="form-group">
            <label className="form-label">
              <i className="ti ti-photo" style={{ marginRight: 8 }}></i>
              تصویر <span style={{ opacity: 0.5 }}>(اختیاری)</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="form-input" style={{ padding: '0.75rem' }} />
            {imageUploading && <small style={{ color: 'var(--primary)', marginTop: '0.25rem', display: 'block' }}>در حال آپلود...</small>}
            {form.image && (
              <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={form.image} alt="preview" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-color)' }} />
                <button className="btn btn-outline btn-sm" onClick={() => setField("image", "")}>
                  <i className="ti ti-trash"></i> حذف
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-12">
          <div className="form-group">
            <label className="form-label">
              <i className="ti ti-link" style={{ marginRight: 8 }}></i>
              {relatedField?.label} <span style={{ opacity: 0.5 }}>({relatedField?.fa})</span>
            </label>
            <MultiSelectDropdown
              options={availableLabels}
              selected={form.related}
              onChange={(selected: string[]) => setField("related", selected)}
            />
            <small style={{ color: 'var(--text-color)', opacity: 0.5, marginTop: '0.5rem', display: 'block' }}>
              می‌توانید چندین رکورد مرتبط را انتخاب کنید
            </small>
          </div>
        </div>

        <div className="col-12">
          <div className="form-group">
            <label className="form-label">
              <i className="ti ti-tags" style={{ marginRight: 8 }}></i>
              برچسب‌ها <span style={{ opacity: 0.5 }}>(اختیاری)</span>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {allTags.map((tag: string) => {
                const active = form.tags.includes(tag);
                return (
                  <span key={tag} onClick={() => {
                    const next = active ? form.tags.filter((t: string) => t !== tag) : [...form.tags, tag];
                    setField('tags', next);
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
        </div>
      </div>

      <div className="d-flex gap-3 mt-4">
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? <LoadingSpinner size={18} /> : <i className={`ti ${editIndex !== null ? 'ti-check' : 'ti-plus'}`}></i>}
          {loading ? 'در حال ذخیره...' : (editIndex !== null ? 'ذخیره تغییرات' : 'افزودن رکورد')}
        </button>
        <button className="btn btn-outline" onClick={onCancel}>انصراف</button>
      </div>
    </div>
  );
}
