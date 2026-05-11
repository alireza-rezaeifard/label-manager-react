import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const FIELDS = [
  { key: "code",    label: "Code",    fa: "کد",      placeholder: "e.g. INV-2024-001" },
  { key: "project", label: "Project", fa: "پروژه",   placeholder: "e.g. Office Renovation" },
  { key: "type",    label: "Type",    fa: "نوع",      placeholder: "e.g. Invoice" },
  { key: "date",    label: "Date",    fa: "تاریخ",    placeholder: "e.g. 1403/02/15" },
  { key: "party",   label: "Party",   fa: "طرف حساب", placeholder: "e.g. Vendor Name" },
  { key: "amount",  label: "Amount",  fa: "مبلغ",     placeholder: "e.g. 5,000,000" },
  { key: "related", label: "Related", fa: "مرتبط",    placeholder: "e.g. Contract #42" },
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, ""]));
const CSV_TEMPLATE = [FIELDS.map(f => f.key).join(","), "INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,Contract #42"].join("\n");

const LABEL_PRINT_COLS = 3;
const LABEL_WIDTH = 180;
const LABEL_HEIGHT = 130;

function Checkbox({ checked, onChange }) {
  return (
    <div 
      className={`custom-checkbox ${checked ? 'checked' : ''}`}
      onClick={onChange}
    >
      {checked && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
    </div>
  );
}

function LabelCard({ record, selected, onToggle, onEdit }) {
  return (
    <div 
      className={`label-card ${selected ? 'selected' : ''} fade-in`}
      onClick={onToggle}
    >
      <div className="label-card-header">
        <div className="d-flex align-items-center gap-2">
          <Checkbox checked={selected} onChange={onToggle} />
          <span className={`code-badge ${selected ? '' : 'bg-light text-muted'}`}>
            {record.code || "—"}
          </span>
        </div>
      </div>
      <div className="label-card-body">
        <div className="label-fields-grid">
          {FIELDS.filter(f => f.key !== "code").map(f => (
            <div key={f.key} className="label-field-item">
              <span className="label-field-key">{f.fa}</span>
              <span className="label-field-value">{record[f.key] || "—"}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="label-card-footer">
        <button className="btn btn-outline btn-sm w-100" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <i className="ti ti-edit"></i> ویرایش
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState("records");
  const [records, setRecords] = useState([
    { code: "INV-001", project: "HQ Renovation", type: "Invoice", date: "1403/02/10", party: "BuildCo", amount: "12,500,000", related: "Contract #7" },
    { code: "REC-002", project: "IT Upgrade", type: "Receipt", date: "1403/02/12", party: "TechStore", amount: "3,200,000", related: "PO #31" },
    { code: "PAY-003", project: "Marketing", type: "Payment", date: "1403/02/14", party: "AdAgency", amount: "8,000,000", related: "Campaign Q2" },
  ]);
  const [selected, setSelected] = useState(new Set());
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editIndex, setEditIndex] = useState(null);
  const [importMsg, setImportMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const toggleSelect = useCallback((i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const toggleAll = () => {
    const filtered = filteredRecords();
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((_, i) => records.indexOf(filtered[i]))));
  };

  const filteredRecords = () => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(r => Object.values(r).some(v => v.toLowerCase().includes(q)));
  };

  const validate = () => {
    const errors = {};
    if (!form.code.trim()) errors.code = "فیلد ضروری است";
    if (!form.project.trim()) errors.project = "فیلد ضروری است";
    return errors;
  };

  const submitForm = () => {
    const errors = validate();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? { ...form } : r));
      setEditIndex(null);
    } else {
      setRecords(prev => [...prev, { ...form }]);
    }
    setForm(EMPTY_FORM);
    setFormErrors({});
    setTab("records");
  };

  const startEdit = (i) => {
    setForm({ ...records[i] });
    setEditIndex(i);
    setTab("add");
  };

  const deleteSelected = () => {
    setRecords(prev => prev.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const valid = res.data.filter(r => FIELDS.every(f => f.key in r));
        if (!valid.length) { setImportMsg("❌ هیچ ردیف معتبری یافت نشد."); return; }
        setRecords(prev => [...prev, ...valid]);
        setImportMsg(`✅ ${valid.length} رکورد با موفقیت وارد شد.`);
        setTab("records");
      },
      error: () => setImportMsg("❌ خطا در پردازش فایل."),
    });
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "labels_template.csv";
    a.click();
  };

  const printLabels = () => {
    const selectedRecords = records.filter((_, i) => selected.has(i));
    if (!selectedRecords.length) { alert("حداقل یک رکورد انتخاب کنید."); return; }
    
    const totalCols = LABEL_PRINT_COLS;
    const totalRows = Math.ceil(selectedRecords.length / totalCols);
    const gapSize = 12;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <title>برچسب‌ها</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Tahoma, Arial, sans-serif; padding: 15mm; background: #fff; direction: rtl; }
    .page { display: flex; flex-direction: column; gap: 0; }
    .label-row { display: flex; gap: ${gapSize}px; margin-bottom: ${gapSize}px; align-items: flex-start; direction: rtl; }
    .label-wrapper { position: relative; }
    .cut-indicator { position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 18px; color: #999; z-index: 100; }
    .label { width: ${LABEL_WIDTH + 20}px; min-height: ${LABEL_HEIGHT}px; border: 2px dashed #ccc; padding: 12px; display: flex; flex-direction: column; gap: 4px; break-inside: avoid; font-family: Tahoma; font-size: 11px; background: #fff; color: #333; direction: rtl; }
    .label-header { font-weight: bold; font-size: 13px; font-family: Consolas, monospace; text-align: center; padding-bottom: 8px; margin-bottom: 4px; border-bottom: 1px solid #eee; direction: ltr; unicode-bidi: embed; }
    .label-row-content { display: flex; flex-direction: column; gap: 3px; }
    .label-field { display: flex; justify-content: space-between; align-items: baseline; direction: rtl; }
    .label-key { font-weight: bold; color: #666; min-width: 55px; direction: rtl; }
    .label-value { text-align: right; max-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; direction: rtl; }
    .empty-cell { width: ${LABEL_WIDTH + 20}px; height: ${LABEL_HEIGHT}px; }
    @page { size: A4; margin: 10mm; }
    @media print { body { padding: 10mm !important; } .label { border: 1px solid #333 !important; } .cut-indicator { display: none !important; } .empty-cell { border: 1px dashed #ddd; } }
  </style>
</head>
<body>
  <div class="page">
    ${Array.from({ length: totalRows }, (_, row) => {
      const rowLabels = selectedRecords.slice(row * totalCols, (row + 1) * totalCols);
      return `<div class="label-row">` + 
        rowLabels.map((r) => `
          <div class="label-wrapper">
            <span class="cut-indicator">✂</span>
            <div class="label">
              <div class="label-header">${r.code}</div>
              <div class="label-row-content">
                ${FIELDS.filter(f => f.key !== "code").map(f => `
                  <div class="label-field">
                    <span class="label-key">${f.fa}:</span>
                    <span class="label-value">${r[f.key] || ""}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `).join('') +
        Array(totalCols - rowLabels.length).fill(`<div class="empty-cell"></div>`).join('') +
        `</div>`;
    }).join('')}
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;
    
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  const downloadExcel = () => {
    const selectedRecords = records.filter((_, i) => selected.has(i));
    if (!selectedRecords.length) { alert("حداقل یک رکورد انتخاب کنید."); return; }
    
    const data = selectedRecords.map(r => {
      const row = {};
      FIELDS.forEach(f => {
        row[f.fa] = r[f.key] || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = FIELDS.map(() => ({ wch: 18 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "برچسب‌ها");
    
    XLSX.writeFile(wb, "labels_export.xlsx");
  };

  const fr = filteredRecords();

  return (
    <div className="app-container">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />
      
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="ti ti-tags"></i>
          </div>
          <span className="sidebar-brand-text">Label Studio</span>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-section-title">Main Menu</div>
          
          <div className={`nav-item ${tab === 'records' ? 'active' : ''}`} onClick={() => { setTab("records"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); setSidebarOpen(false); }}>
            <i className="ti ti-files"></i>
            <span>سوابق</span>
          </div>
          
          <div className={`nav-item ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab("add"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); setSidebarOpen(false); }}>
            <i className="ti ti-plus"></i>
            <span>افزودن رکورد</span>
          </div>
          
          <div className={`nav-item ${tab === 'import' ? 'active' : ''}`} onClick={() => { setTab("import"); setImportMsg(""); setSidebarOpen(false); }}>
            <i className="ti ti-upload"></i>
            <span>ورود CSV</span>
          </div>
          
          <div className={`nav-item ${tab === 'preview' ? 'active' : ''}`} onClick={() => { setTab("preview"); setSidebarOpen(false); }}>
            <i className="ti ti-printer"></i>
            <span>پیش‌نمایش برچسب</span>
          </div>
        </nav>
        
        <div style={{ padding: "1rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Version 1.0.0</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button className="menu-toggle" onClick={toggleSidebar}>
              <i className="ti ti-menu-2"></i>
            </button>
            <div className="search-box">
              <i className="ti ti-search"></i>
              <input 
                type="text" 
                placeholder="جستجو..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div className="header-right">
            <button className="header-icon-btn">
              <i className="ti ti-bell"></i>
              <span className="badge">3</span>
            </button>
            <button className="header-icon-btn">
              <i className="ti ti-settings"></i>
            </button>
            <button className="theme-toggle" onClick={toggleTheme}>
              <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`}></i>
            </button>
            <div className="user-dropdown">
              <div className="user-avatar">A</div>
              <span style={{ fontWeight: 500 }}>Admin</span>
              <i className="ti ti-chevron-down"></i>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {tab === 'records' && 'مدیریت سوابق'}
                {tab === 'add' && (editIndex !== null ? 'ویرایش رکورد' : 'افزودن رکورد جدید')}
                {tab === 'import' && 'ورود از CSV'}
                {tab === 'preview' && 'پیش‌نمایش برچسب‌ها'}
              </h1>
              <p className="page-subtitle">ابزار مدیریت اسناد و چاپ برچسب</p>
            </div>
            
            {tab === 'preview' && selected.size > 0 && (
              <div className="d-flex gap-2">
                <button className="btn btn-outline" onClick={downloadExcel}>
                  <i className="ti ti-file-excel"></i> خروجی اکسل
                </button>
                <button className="btn btn-success" onClick={printLabels}>
                  <i className="ti ti-printer"></i> چاپ برچسب‌ها
                </button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card fade-in">
              <div className="stat-icon primary">
                <i className="ti ti-files"></i>
              </div>
              <div className="stat-value">{records.length}</div>
              <div className="stat-label">مجموع رکوردها</div>
            </div>
            <div className="stat-card fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="stat-icon success">
                <i className="ti ti-checkbox"></i>
              </div>
              <div className="stat-value">{selected.size}</div>
              <div className="stat-label">انتخاب شده</div>
            </div>
            <div className="stat-card fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="stat-icon info">
                <i className="ti ti-filter"></i>
              </div>
              <div className="stat-value">{fr.length}</div>
              <div className="stat-label">فیلتر شده</div>
            </div>
            <div className="stat-card fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="stat-icon danger">
                <i className="ti ti-printer"></i>
              </div>
              <div className="stat-value">{Math.ceil(selected.size / LABEL_PRINT_COLS)}</div>
              <div className="stat-label">ردیف برچسب</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-nav">
            <button className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => { setTab("records"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); }}>
              <i className="ti ti-files"></i> سوابق
            </button>
            <button className={`tab-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab("add"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); }}>
              <i className="ti ti-plus"></i> افزودن
            </button>
            <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => { setTab("import"); setImportMsg(""); }}>
              <i className="ti ti-upload"></i> ورود CSV
            </button>
            <button className={`tab-btn ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab("preview")}>
              <i className="ti ti-printer"></i> پیش‌نمایش
            </button>
          </div>

          {/* Records Tab */}
          {tab === 'records' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div></div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline" onClick={toggleAll}>
                    <i className="ti ti-checkbox"></i>
                    {selected.size === fr.length && fr.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه'}
                  </button>
                  {selected.size > 0 && (
                    <button className="btn btn-danger" onClick={deleteSelected}>
                      <i className="ti ti-trash"></i> حذف ({selected.size})
                    </button>
                  )}
                </div>
              </div>

              {fr.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="ti ti-file-off"></i>
                  </div>
                  <h3 style={{ marginBottom: "0.5rem" }}>هنوز رکوردی وجود ندارد</h3>
                  <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>رکورد جدید اضافه کنید یا فایل CSV وارد نمایید</p>
                  <button className="btn btn-primary" onClick={() => setTab("add")}>
                    <i className="ti ti-plus"></i> افزودن رکورد
                  </button>
                </div>
              ) : (
                <div className="card-grid">
                  {fr.map((r) => {
                    const realIdx = records.indexOf(r);
                    return (
                      <LabelCard 
                        key={realIdx}
                        record={r}
                        selected={selected.has(realIdx)}
                        onToggle={() => toggleSelect(realIdx)}
                        onEdit={() => startEdit(realIdx)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add/Edit Form Tab */}
          {tab === 'add' && (
            <div className="form-card fade-in">
              <div className="row">
                {FIELDS.map(f => (
                  <div key={f.key} className={`col-md-6 ${f.key === 'related' ? 'col-12' : ''}`}>
                    <div className="form-group">
                      <label className="form-label">
                        <i className="ti ti-apps" style={{ marginRight: 8 }}></i>
                        {f.label} <span style={{ opacity: 0.5 }}>({f.fa})</span>
                        {["code", "project"].includes(f.key) && <span className="text-danger"> *</span>}
                      </label>
                      <input
                        type="text"
                        className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                        value={form[f.key]}
                        onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setFormErrors(p => ({ ...p, [f.key]: "" })); }}
                        placeholder={f.placeholder}
                        style={{ direction: 'ltr', textAlign: 'left' }}
                      />
                      {formErrors[f.key] && (
                        <small style={{ color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>{formErrors[f.key]}</small>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex gap-3 mt-4">
                <button className="btn btn-primary" onClick={submitForm}>
                  <i className={`ti ${editIndex !== null ? 'ti-check' : 'ti-plus'}`}></i>
                  {editIndex !== null ? 'ذخیره تغییرات' : 'افزودن رکورد'}
                </button>
                <button className="btn btn-outline" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setEditIndex(null); setTab("records"); }}>
                  انصراف
                </button>
              </div>
            </div>
          )}

          {/* Import Tab */}
          {tab === 'import' && (
            <div className="fade-in">
              <div className="form-card mb-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="stat-icon primary" style={{ marginRight: "1rem" }}>
                    <i className="ti ti-file-type-csv"></i>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ marginBottom: "0.25rem" }}>قالب CSV</h4>
                    <p style={{ opacity: 0.7, margin: 0 }}>فایل الگو را دانلود و با داده‌های خود پر کنید</p>
                  </div>
                  <button className="btn btn-primary" onClick={downloadTemplate}>
                    <i className="ti ti-download"></i> دانلود قالب
                  </button>
                </div>
                <div style={{ background: "var(--bg-body)", padding: "1rem", borderRadius: 8, fontFamily: "monospace", fontSize: "0.85rem", overflowX: "auto", direction: "ltr" }}>
                  {FIELDS.map(f => f.key).join(", ")}
                </div>
              </div>

              <div 
                className="upload-zone"
                onClick={() => fileRef.current.click()}
              >
                <div className="upload-icon">
                  <i className="ti ti-upload"></i>
                </div>
                <h4 style={{ marginBottom: "0.5rem" }}>فایل CSV را آپلود کنید</h4>
                <p style={{ opacity: 0.7, margin: 0 }}>ستون‌ها: {FIELDS.map(f => f.key).join(", ")}</p>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="d-none" />
              </div>

              {importMsg && (
                <div className={`alert ${importMsg.startsWith("✅") ? 'alert-success' : 'alert-danger'}`}>
                  {importMsg}
                </div>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {tab === 'preview' && (
            <div className="fade-in">
              {selected.size === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="ti ti-selector"></i>
                  </div>
                  <h3 style={{ marginBottom: "0.5rem" }}>برچسبی انتخاب نشده</h3>
                  <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>در تب سوابق، رکوردها را انتخاب کنید</p>
                  <button className="btn btn-primary" onClick={() => setTab("records")}>
                    <i className="ti ti-arrow-right"></i> رفتن به سوابق
                  </button>
                </div>
              ) : (
                <div>
                  <div className="d-flex align-items-center gap-2 mb-4 p-3" style={{ background: "var(--card-bg)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
                    <i className="ti ti-scissors" style={{ fontSize: "1.5rem", color: "var(--primary)" }}></i>
                    <span>خطوط برش (✂) برای بریدن پس از چاپ - {LABEL_PRINT_COLS} عدد در هر ردیف</span>
                  </div>
                  
                  <div className="preview-grid" dir="rtl">
                    {records.filter((_, i) => selected.has(i)).map((r, i) => (
                      <div 
                        key={i}
                        className="preview-label"
                        style={{ direction: "rtl" }}
                      >
                        <span className="cut-marker">✂</span>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "1rem", textAlign: "center", paddingBottom: "0.5rem", marginBottom: "0.5rem", borderBottom: "1px solid var(--border-color)", direction: "ltr" }}>
                            {r.code}
                          </div>
                          {FIELDS.filter(f => f.key !== "code").map(f => (
                            <div key={f.key} className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem" }}>
                              <span style={{ opacity: 0.6, fontWeight: 600 }}>{f.fa}:</span>
                              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[f.key] || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}