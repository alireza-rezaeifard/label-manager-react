import { useState, useRef, useEffect } from "react";
import { DayPicker } from "@daypicker/persian";
import { faIR } from "@daypicker/persian";
import "@daypicker/react/style.css";
import { FIELDS, EMPTY_FORM } from "../data/fields";
import { toJalaliDate } from "../utils/formatters";
import MultiSelectDropdown from "./MultiSelectDropdown";

export default function RecordForm({ editRecord, editIndex, availableLabels, isDuplicateCode, onSubmit, onCancel, addToast }) {
  const getInitialForm = () => {
    if (editRecord) {
      return {
        code: editRecord.code || "",
        project: editRecord.project || "",
        type: editRecord.type || "",
        date: editRecord.date || "",
        party: editRecord.party || "",
        amount: editRecord.amount || "",
        related: editRecord.related || [],
      };
    }
    return { ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" };
  };

  const [form, setForm] = useState(getInitialForm);
  const [formErrors, setFormErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef(null);

  const prevEditKey = useRef(null);
  const currentKey = editRecord?.code ?? editIndex;
  if (currentKey !== prevEditKey.current) {
    prevEditKey.current = currentKey;
    setForm(getInitialForm());
    setFormErrors({});
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const setField = (key, value) => {
    setForm(p => ({ ...p, [key]: value }));
    setFormErrors(p => ({ ...p, [key]: "" }));
  };

  const validate = () => {
    const errors = {};
    if (!form.code.trim()) errors.code = "فیلد ضروری است";
    if (!form.project.trim()) errors.project = "فیلد ضروری است";

    if (form.code.trim() && isDuplicateCode(form.code.trim(), editIndex)) {
      errors.code = "این کد تکراری است";
      addToast("کد تکراری است. لطفا کد دیگری وارد کنید.", "error");
    }

    return errors;
  };

  const handleSubmit = () => {
    const errors = validate();
    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }
    onSubmit({
      code: form.code,
      project: form.project,
      type: form.type,
      date: form.date,
      party: form.party,
      amount: form.amount,
      related: form.related,
    });
  };

  const nonRelatedFields = FIELDS.filter(f => !f.isRelated);
  const relatedField = FIELDS.find(f => f.isRelated);

  return (
    <div className="form-card fade-in">
      <div className="row">
        {nonRelatedFields.map(f => (
          <div key={f.key} className="col-md-6">
            <div className="form-group">
              <label className="form-label">
                <i className="ti ti-apps" style={{ marginRight: 8 }}></i>
                {f.label} <span style={{ opacity: 0.5 }}>({f.fa})</span>
                {["code", "project"].includes(f.key) && <span className="text-danger"> *</span>}
              </label>
              {f.key === "date" ? (
                <div style={{ position: 'relative' }} ref={datePickerRef}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                      value={form.date || ""}
                      onChange={e => setField("date", e.target.value)}
                      placeholder="1403/02/15"
                      style={{ direction: 'ltr', textAlign: 'left', paddingLeft: '2.5rem' }}
                    />
                    <i
                      className="ti ti-calendar"
                      style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', opacity: 0.6 }}
                      onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker); }}
                    ></i>
                  </div>
                  {showDatePicker && (
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, zIndex: 1000,
                      marginTop: '0.5rem', background: 'var(--card-bg)',
                      border: '1px solid var(--border-color)', borderRadius: 10,
                      boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                    }}>
                      <DayPicker
                        locale={faIR}
                        dir="rtl"
                        mode="single"
                        selected={form.date ? new Date(form.date) : undefined}
                        onSelect={(date) => {
                          if (date) setField("date", toJalaliDate(date));
                          setShowDatePicker(false);
                        }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                  value={form[f.key]}
                  onChange={e => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ direction: 'ltr', textAlign: 'left' }}
                />
              )}
              {formErrors[f.key] && (
                <small style={{ color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                  {formErrors[f.key]}
                </small>
              )}
            </div>
          </div>
        ))}

        <div className="col-12">
          <div className="form-group">
            <label className="form-label">
              <i className="ti ti-link" style={{ marginRight: 8 }}></i>
              {relatedField.label} <span style={{ opacity: 0.5 }}>({relatedField.fa})</span>
            </label>
            <MultiSelectDropdown
              options={availableLabels}
              selected={form.related}
              onChange={(selected) => setField("related", selected)}
            />
            <small style={{ color: 'var(--text-color)', opacity: 0.5, marginTop: '0.5rem', display: 'block' }}>
              می‌توانید چندین رکورد مرتبط را انتخاب کنید
            </small>
          </div>
        </div>
      </div>

      <div className="d-flex gap-3 mt-4">
        <button className="btn btn-primary" onClick={handleSubmit}>
          <i className={`ti ${editIndex !== null ? 'ti-check' : 'ti-plus'}`}></i>
          {editIndex !== null ? 'ذخیره تغییرات' : 'افزودن رکورد'}
        </button>
        <button className="btn btn-outline" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </div>
  );
}
