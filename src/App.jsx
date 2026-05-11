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
  { key: "related", label: "Related", fa: "مرتبط",    placeholder: "e.g. Contract #42", isRelated: true },
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, []]));

const CSV_TEMPLATE = [FIELDS.map(f => f.key).join(","), "INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,\"CONTRACT-001,CONTRACT-002\""].join("\n");

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

function MultiSelectDropdown({ options, selected, onChange, label }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter(s => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return "انتخاب کنید...";
    if (selected.length === 1) return selected[0];
    return `${selected.length} مورد انتخاب شده`;
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
      <div 
        className="selected-values"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.875rem 1rem',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          background: 'var(--card-bg)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          direction: 'rtl',
        }}
      >
        <span style={{ color: selected.length ? 'var(--text-color)' : 'var(--text-color)', opacity: selected.length ? 1 : 0.5 }}>
          {getDisplayText()}
        </span>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '1rem' }}></i>
      </div>
      
      {isOpen && (
        <div 
          className="dropdown-menu show"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 10,
            marginTop: '0.5rem',
            zIndex: 1000,
            maxHeight: 300,
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            direction: 'rtl',
          }}
        >
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="جستجو..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color)', opacity: 0.5 }}>
                رکوردی یافت نشد
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.code}
                  onClick={() => toggleOption(opt.code)}
                  style={{
                    padding: '0.75rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: selected.includes(opt.code) ? 'rgba(115, 103, 240, 0.1)' : 'transparent',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div 
                    className={`custom-checkbox ${selected.includes(opt.code) ? 'checked' : ''}`}
                    style={{ marginLeft: 0 }}
                  >
                    {selected.includes(opt.code) && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{opt.code}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{opt.project}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      
      {selected.length > 0 && (
        <div className="selected-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {selected.map(code => (
            <span 
              key={code}
              className="tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.35rem 0.75rem',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: 6,
                fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            >
              {code}
              <i 
                className="ti ti-x" 
                style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={(e) => { e.stopPropagation(); toggleOption(code); }}
              ></i>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LabelCard({ record, selected, onToggle, onEdit, onView, getRelatedLabels }) {
  const relatedLabels = getRelatedLabels ? getRelatedLabels(record.related) : [];
  
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
          {FIELDS.filter(f => f.key !== "code" && f.key !== "related").map(f => (
            <div key={f.key} className="label-field-item">
              <span className="label-field-key">{f.fa}</span>
              <span className="label-field-value">{record[f.key] || "—"}</span>
            </div>
          ))}
        </div>
        {relatedLabels.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <span className="label-field-key" style={{ display: 'block', marginBottom: '0.5rem' }}>مرتبط با:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {relatedLabels.map(label => (
                <span 
                  key={label.code}
                  style={{
                    padding: '0.25rem 0.6rem',
                    background: 'rgba(115, 103, 240, 0.1)',
                    color: 'var(--primary)',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                  }}
                >
                  {label.code}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="label-card-footer">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onView(); }}>
            <i className="ti ti-eye"></i> مشاهده
          </button>
          <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <i className="ti ti-edit"></i> ویرایش
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState("records");
  const [records, setRecords] = useState([
    { code: "INV-001", project: "HQ Renovation", type: "Invoice", date: "1403/02/10", party: "BuildCo", amount: "12,500,000", related: ["CONTRACT-001"] },
    { code: "REC-002", project: "IT Upgrade", type: "Receipt", date: "1403/02/12", party: "TechStore", amount: "3,200,000", related: [] },
    { code: "PAY-003", project: "Marketing", type: "Payment", date: "1403/02/14", party: "AdAgency", amount: "8,000,000", related: ["CONTRACT-001", "CONTRACT-002"] },
    { code: "CONTRACT-001", project: "Office Contract", type: "Contract", date: "1403/01/01", party: "Legal Dept", amount: "50,000,000", related: [] },
    { code: "CONTRACT-002", project: "IT Contract", type: "Contract", date: "1403/01/15", party: "Tech Corp", amount: "100,000,000", related: [] },
  ]);
  const [selected, setSelected] = useState(new Set());
  const [form, setForm] = useState({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" });
  const [formErrors, setFormErrors] = useState({});
  const [editIndex, setEditIndex] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);
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
    return records.filter(r => Object.values(r).some(v => 
      Array.isArray(v) ? v.some(item => item.toLowerCase().includes(q)) : v.toLowerCase().includes(q)
    ));
  };

  const getRelatedLabels = (relatedCodes) => {
    if (!relatedCodes || relatedCodes.length === 0) return [];
    return records.filter(r => relatedCodes.includes(r.code));
  };

  const getAvailableLabels = (excludeCode = null) => {
    return records.filter(r => r.code !== excludeCode);
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
    
    const recordData = {
      code: form.code,
      project: form.project,
      type: form.type,
      date: form.date,
      party: form.party,
      amount: form.amount,
      related: form.related,
    };
    
    if (editIndex !== null) {
      setRecords(prev => prev.map((r, i) => i === editIndex ? recordData : r));
      setEditIndex(null);
    } else {
      setRecords(prev => [...prev, recordData]);
    }
    setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" });
    setFormErrors({});
    setTab("records");
  };

  const startView = (i) => {
    setViewIndex(i);
    setTab("view");
  };

  const startEdit = (i) => {
    const record = records[i];
    setForm({
      code: record.code,
      project: record.project,
      type: record.type,
      date: record.date,
      party: record.party,
      amount: record.amount,
      related: record.related || [],
    });
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
        const valid = res.data.filter(r => r.code && r.project);
        if (!valid.length) { setImportMsg("❌ هیچ ردیف معتبری یافت نشد."); return; }
        
        const importedRecords = valid.map(r => ({
          code: r.code || "",
          project: r.project || "",
          type: r.type || "",
          date: r.date || "",
          party: r.party || "",
          amount: r.amount || "",
          related: r.related ? r.related.split(',').map(s => s.trim()).filter(Boolean) : [],
        }));
        
        setRecords(prev => [...prev, ...importedRecords]);
        setImportMsg(`✅ ${importedRecords.length} رکورد با موفقیت وارد شد.`);
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
    .label-related { display: flex; flex-wrap: wrap; gap: 3px; justify-content: flex-end; margin-top: 4px; direction: ltr; }
    .label-related-badge { background: #7c3aed; color: #fff; padding: 1px 5px; border-radius: 3px; font-size: 9px; font-family: monospace; }
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
                  ${f.key === "related" ? `
                    ${r.related && r.related.length > 0 ? `
                      <div class="label-field" style="margin-top: 4px;">
                        <span class="label-key">${f.fa}:</span>
                        <div class="label-related">
                          ${r.related.map(c => `<span class="label-related-badge">${c}</span>`).join('')}
                        </div>
                      </div>
                    ` : ''}
                  ` : `
                    <div class="label-field">
                      <span class="label-key">${f.fa}:</span>
                      <span class="label-value">${r[f.key] || ""}</span>
                    </div>
                  `}`
                ).join('')}
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
        if (f.key === "related") {
          row[f.fa] = r.related ? r.related.join(', ') : "";
        } else {
          row[f.fa] = r[f.key] || "";
        }
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = FIELDS.map(() => ({ wch: 20 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "برچسب‌ها");
    
    XLSX.writeFile(wb, "labels_export.xlsx");
  };

  const fr = filteredRecords();
  const availableLabels = getAvailableLabels(editIndex !== null ? records[editIndex]?.code : null);

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
          
          <div className={`nav-item ${tab === 'records' ? 'active' : ''}`} onClick={() => { setTab("records"); setEditIndex(null); setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" }); setFormErrors({}); setSidebarOpen(false); }}>
            <i className="ti ti-files"></i>
            <span>سوابق</span>
          </div>
          
          <div className={`nav-item ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab("add"); setEditIndex(null); setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" }); setFormErrors({}); setSidebarOpen(false); }}>
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
          
          <div className="nav-section-title" style={{ marginTop: '1rem' }}>System</div>
          
          <div className={`nav-item ${tab === 'view' ? 'active' : ''}`} onClick={() => { setViewIndex(null); setTab("records"); setSidebarOpen(false); }}>
            <i className="ti ti-layout-dashboard"></i>
            <span>داشبورد</span>
          </div>
        </nav>
        
        <div style={{ padding: "1rem", borderTop: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: "0.75rem", opacity: 0.6 }}>Version 2.0.0</div>
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
              <span className="badge">{records.length}</span>
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
                {tab === 'view' && 'جزئیات برچسب'}
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

            {tab === 'view' && viewIndex !== null && (
              <button className="btn btn-outline" onClick={() => { setViewIndex(null); setTab("records"); setSelected(new Set([viewIndex])); }}>
                <i className="ti ti-arrow-right"></i> بازگشت
              </button>
            )}

            {(tab === 'records' || tab === 'add' || tab === 'import') && (
              <button className="btn btn-outline" onClick={() => setTab("preview")}>
                <i className="ti ti-printer"></i> پیش‌نمایش
              </button>
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
          {tab !== 'view' && (
          <div className="tab-nav">
            <button className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => { setTab("records"); setEditIndex(null); setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" }); setFormErrors({}); }}>
              <i className="ti ti-files"></i> سوابق
            </button>
            <button className={`tab-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab("add"); setEditIndex(null); setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" }); setFormErrors({}); }}>
              <i className="ti ti-plus"></i> افزودن
            </button>
            <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => { setTab("import"); setImportMsg(""); }}>
              <i className="ti ti-upload"></i> ورود CSV
            </button>
          </div>
          )}

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
                        onView={() => startView(realIdx)}
                        getRelatedLabels={getRelatedLabels}
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
                {FIELDS.filter(f => !f.isRelated).map(f => (
                  <div key={f.key} className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">
                        <i className="ti ti-apps" style={{ marginRight: 8 }}></i>
                        {f.label} <span style={{ opacity: 0.5 }}>({f.fa})</span>
                        {["code", "project"].includes(f.key) && <span className="text-danger"> *</span>}
                      </label>
                      {f.key === "date" ? (
                        <input
                          type="text"
                          className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                          value={form.date}
                          onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setFormErrors(p => ({ ...p, [f.key]: "" })); }}
                          placeholder={f.placeholder}
                          style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                      ) : (
                        <input
                          type="text"
                          className={`form-input ${formErrors[f.key] ? 'border-danger' : ''}`}
                          value={form[f.key]}
                          onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setFormErrors(p => ({ ...p, [f.key]: "" })); }}
                          placeholder={f.placeholder}
                          style={{ direction: 'ltr', textAlign: 'left' }}
                        />
                      )}
                      {formErrors[f.key] && (
                        <small style={{ color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>{formErrors[f.key]}</small>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Related Multi-Select */}
                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label">
                      <i className="ti ti-link" style={{ marginRight: 8 }}></i>
                      {FIELDS.find(f => f.key === "related").label} <span style={{ opacity: 0.5 }}>({FIELDS.find(f => f.key === "related").fa})</span>
                    </label>
                    <MultiSelectDropdown
                      options={availableLabels}
                      selected={form.related}
                      onChange={(selected) => setForm(p => ({ ...p, related: selected }))}
                      label={FIELDS.find(f => f.key === "related").label}
                    />
                    <small style={{ color: 'var(--text-color)', opacity: 0.5, marginTop: '0.5rem', display: 'block' }}>
                      می‌توانید چندین رکورد مرتبط را انتخاب کنید
                    </small>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-3 mt-4">
                <button className="btn btn-primary" onClick={submitForm}>
                  <i className={`ti ${editIndex !== null ? 'ti-check' : 'ti-plus'}`}></i>
                  {editIndex !== null ? 'ذخیره تغییرات' : 'افزودن رکورد'}
                </button>
                <button className="btn btn-outline" onClick={() => { setForm({ ...EMPTY_FORM, code: "", project: "", type: "", date: "", party: "", amount: "" }); setFormErrors({}); setEditIndex(null); setTab("records"); }}>
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
                  {FIELDS.map(f => f.key).join(", ")}<br/>
                  <span style={{ opacity: 0.6 }}># برای فیلد related از کاما برای جداسازی چندین کد استفاده کنید</span>
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

          {/* View Detail Tab */}
          {tab === 'view' && viewIndex !== null && (
            <div className="form-card fade-in">
              {(() => {
                const record = records[viewIndex];
                const relatedRecords = getRelatedLabels(record.related);
                return (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="stat-icon primary" style={{ width: 50, height: 50, fontSize: '1.5rem' }}>
                          <i className="ti ti-tag"></i>
                        </div>
                        <div>
                          <h3 style={{ margin: 0, fontFamily: 'monospace', direction: 'ltr' }}>{record.code}</h3>
                          <span style={{ opacity: 0.6 }}>{record.type || '—'} - {record.project}</span>
                        </div>
                      </div>
                      <button className="btn btn-outline" onClick={() => startEdit(viewIndex)}>
                        <i className="ti ti-edit"></i> ویرایش
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                      {FIELDS.filter(f => f.key !== 'code' && f.key !== 'related').map(f => (
                        <div key={f.key} style={{ background: 'var(--bg-body)', padding: '1rem', borderRadius: 8 }}>
                          <div style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '0.25rem' }}>{f.fa}</div>
                          <div style={{ fontWeight: 600, direction: f.key === 'amount' ? 'ltr' : 'rtl' }}>{record[f.key] || '—'}</div>
                        </div>
                      ))}
                    </div>

                    {relatedRecords.length > 0 && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="ti ti-link" style={{ color: 'var(--primary)' }}></i>
                          برچسب‌های مرتبط ({relatedRecords.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {relatedRecords.map(rel => (
                            <div 
                              key={rel.code}
                              onClick={() => {
                                const idx = records.indexOf(rel);
                                if (idx !== -1) setViewIndex(idx);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '1rem',
                                background: 'var(--bg-body)',
                                borderRadius: 8,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-body)'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div className="stat-icon info" style={{ width: 36, height: 36 }}>
                                  <i className="ti ti-tag"></i>
                                </div>
                                <div>
                                  <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{rel.code}</div>
                                  <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{rel.project}</div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{rel.type}</span>
                                <i className="ti ti-arrow-left" style={{ opacity: 0.5 }}></i>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {relatedRecords.length === 0 && (
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', opacity: 0.5, textAlign: 'center' }}>
                        <i className="ti ti-link-off" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                        <p style={{ margin: 0 }}>هیچ برچسب مرتبطی وجود ندارد</p>
                      </div>
                    )}
                  </div>
                );
              })()}
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
                        style={{ direction: "rtl", minHeight: 200 }}
                      >
                        <span className="cut-marker">✂</span>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "1rem", textAlign: "center", paddingBottom: "0.5rem", marginBottom: "0.5rem", borderBottom: "1px solid var(--border-color)", direction: "ltr" }}>
                            {r.code}
                          </div>
                          {FIELDS.filter(f => f.key !== "code").map(f => (
                            <div key={f.key} className="d-flex justify-content-between mb-1" style={{ fontSize: "0.85rem" }}>
                              <span style={{ opacity: 0.6, fontWeight: 600 }}>{f.fa}:</span>
                              {f.key === "related" ? (
                                r.related && r.related.length > 0 ? (
                                  <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                                    {r.related.map(code => (
                                      <span key={code} style={{ background: "var(--primary)", color: "white", padding: "0.1rem 0.4rem", borderRadius: 4, fontSize: "0.7rem", fontFamily: "monospace" }}>{code}</span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ opacity: 0.3 }}>—</span>
                                )
                              ) : (
                                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r[f.key] || "—"}</span>
                              )}
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