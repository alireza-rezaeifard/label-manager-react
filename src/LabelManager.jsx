import { useState, useRef, useCallback, useEffect } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const FIELDS = [
  { key: "code",    label: "Code",    placeholder: "e.g. INV-2024-001", icon: "ti-hash" },
  { key: "project", label: "Project", placeholder: "e.g. Office Renovation", icon: "ti-briefcase" },
  { key: "type",    label: "Type",    placeholder: "e.g. Invoice", icon: "ti-category" },
  { key: "date",    label: "Date",    placeholder: "e.g. 1403/02/15", icon: "ti-calendar" },
  { key: "party",   label: "Party",   placeholder: "e.g. Vendor Name", icon: "ti-user" },
  { key: "amount",  label: "Amount",  placeholder: "e.g. 5,000,000", icon: "ti-coin" },
  { key: "related", label: "Related", placeholder: "e.g. Contract #42", icon: "ti-link" },
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, ""]));

const CSV_TEMPLATE = [FIELDS.map(f => f.key).join(","), "INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,Contract #42"].join("\n");

const LABEL_PRINT_COLS = 3;
const LABEL_WIDTH = 180;
const LABEL_HEIGHT = 130;

function LabelCard({ record, selected, onToggle, index, onEdit }) {
  return (
    <div
      onClick={() => onToggle(index)}
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 cursor-pointer
        ${selected
          ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 shadow-lg shadow-primary-500/20'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-[#2f3349] hover:shadow-xl hover:border-primary-400 dark:hover:border-primary-500/50'
        }`}
    >
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1">Record Code</span>
            <span className={`font-mono text-base font-bold ${selected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {record.code || "—"}
            </span>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${selected ? 'bg-primary-500 border-primary-500' : 'border-slate-300 dark:border-slate-600 bg-transparent'}`}>
            {selected && <i className="ti ti-check text-white text-xs"></i>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
          {FIELDS.filter(f => f.key !== "code").slice(0, 4).map(f => (
            <div key={f.key}>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{f.label}</p>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate">
                {record[f.key] || "—"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/50 flex gap-2">
          <button
            className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={e => { e.stopPropagation(); onEdit(index); }}
          >
            <i className="ti ti-edit mr-1"></i> Edit
          </button>
          <button
            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors
              ${selected
                ? 'bg-primary-500 border-primary-500 text-white'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            onClick={e => { e.stopPropagation(); onToggle(index); }}
          >
            {selected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LabelManager() {
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const fileRef = useRef();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
    if (!form.code.trim()) errors.code = "Required";
    if (!form.project.trim()) errors.project = "Required";
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
        if (!valid.length) { setImportMsg("❌ No valid rows found. Check column names."); return; }
        setRecords(prev => [...prev, ...valid]);
        setImportMsg(`✅ Imported ${valid.length} record(s) successfully.`);
        setTab("records");
      },
      error: () => setImportMsg("❌ Failed to parse CSV."),
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
    if (!selectedRecords.length) { alert("Select at least one record to print."); return; }
    
    const totalCols = LABEL_PRINT_COLS;
    const totalRows = Math.ceil(selectedRecords.length / totalCols);
    const gapSize = 12;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Labels</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: Tahoma, Arial, sans-serif;
      padding: 15mm;
      background: #fff;
    }
    .page {
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .label-row {
      display: flex;
      gap: ${gapSize}px;
      margin-bottom: ${gapSize}px;
      align-items: flex-start;
    }
    .label-wrapper {
      position: relative;
    }
    .label-wrapper::before {
      content: '';
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 16px;
      color: #ccc;
      z-index: 10;
    }
    .label {
      width: ${LABEL_WIDTH + 20}px;
      min-height: ${LABEL_HEIGHT}px;
      border: 2px dashed #ccc;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      break-inside: avoid;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 11px;
      background: #fff;
      color: #333;
    }
    .label-header {
      font-weight: bold;
      font-size: 13px;
      font-family: Consolas, monospace;
      text-align: center;
      padding-bottom: 8px;
      margin-bottom: 4px;
      border-bottom: 1px solid #eee;
    }
    .label-row-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .label-field {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .label-key {
      font-weight: bold;
      color: #666;
      min-width: 55px;
    }
    .label-value {
      text-align: right;
      max-width: 100px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .cut-indicator {
      position: absolute;
      top: -18px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 18px;
      color: #999;
      z-index: 100;
    }
    .empty-cell {
      width: ${LABEL_WIDTH + 20}px;
      height: ${LABEL_HEIGHT}px;
    }
    @page {
      size: A4;
      margin: 10mm;
    }
    @media print {
      body { padding: 10mm !important; }
      .label { border: 1px solid #333 !important; box-shadow: none !important; }
      .cut-indicator { display: none !important; }
      .empty-cell { border: 1px dashed #ddd; }
    }
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
                    <span class="label-key">${f.label}:</span>
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
    if (!selectedRecords.length) { alert("Select at least one record to export."); return; }
    
    const data = selectedRecords.map(r => {
      const row = {};
      FIELDS.forEach(f => {
        row[f.label] = r[f.key] || "";
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = FIELDS.map(() => ({ wch: 18 }));
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Labels");
    
    XLSX.writeFile(wb, "labels_export.xlsx");
  };

  const fr = filteredRecords();

  const navItems = [
    { id: 'records', label: 'Records', icon: 'ti-smart-home' },
    { id: 'add', label: 'Add New', icon: 'ti-plus' },
    { id: 'import', label: 'Import CSV', icon: 'ti-upload' },
    { id: 'preview', label: 'Print Preview', icon: 'ti-printer' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#161d31]">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#2f3349] border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-64'} lg:static lg:translate-x-0`}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
              <i className="ti ti-tags text-white text-xl"></i>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100">Studio</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400">
            <i className="ti ti-x text-2xl"></i>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          <p className="px-4 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Main Menu</p>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setTab(item.id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                ${tab === item.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-md shadow-primary-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-primary-600'
                }`}
            >
              <i className={`ti ${item.icon} text-lg`}></i>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-8 left-0 w-full px-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">Label Studio v1.0</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Modern Document Archiving</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Navbar */}
        <header className="h-20 flex items-center justify-between px-4 lg:px-8 bg-white/80 dark:bg-[#2f3349]/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/50 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 dark:text-slate-400">
              <i className="ti ti-menu-2 text-2xl"></i>
            </button>
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl px-4 py-2 w-72 lg:w-96 border border-transparent focus-within:border-primary-500 transition-all">
              <i className="ti ti-search text-slate-400 mr-2"></i>
              <input
                type="text"
                placeholder="Search anything..."
                className="bg-transparent border-none outline-none text-sm w-full dark:text-slate-200"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'} text-xl`}></i>
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <div className="flex items-center gap-3 ml-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Admin User</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-tighter">System Administrator</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <i className="ti ti-user text-slate-500 text-xl"></i>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Page Title */}
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-1">
                {navItems.find(i => i.id === tab)?.label}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tab === 'records' && 'Manage and organize your document labels.'}
                {tab === 'add' && (editIndex !== null ? 'Update existing label information.' : 'Create a new document label entry.')}
                {tab === 'import' && 'Batch upload labels from a CSV file.'}
                {tab === 'preview' && 'Review and print selected labels.'}
              </p>
            </div>

            {tab === "records" && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Records', value: records.length, icon: 'ti-files', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-500/10' },
                    { label: 'Selected', value: selected.size, icon: 'ti-checkbox', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-500/10' },
                    { label: 'Search Results', value: fr.length, icon: 'ti-filter', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-[#2f3349] p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                        <i className={`ti ${stat.icon} text-2xl`}></i>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">{stat.label}</p>
                        <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-[#2f3349] p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAll}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <i className="ti ti-select mr-2"></i>
                      {selected.size === fr.length && fr.length > 0 ? "Deselect All" : "Select All"}
                    </button>
                    {selected.size > 0 && (
                      <button
                        onClick={deleteSelected}
                        className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                      >
                        <i className="ti ti-trash mr-2"></i>
                        Delete ({selected.size})
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTab('add')}
                      className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/25"
                    >
                      <i className="ti ti-plus mr-2"></i> Add Record
                    </button>
                  </div>
                </div>

                {/* Records Grid */}
                {fr.length === 0 ? (
                  <div className="bg-white dark:bg-[#2f3349] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-16 text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <i className="ti ti-file-off text-4xl text-slate-300"></i>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">No records found</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      {search ? "No records match your search criteria. Try a different term." : "Start by adding your first record or importing from a CSV."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {fr.map((r) => {
                      const realIdx = records.indexOf(r);
                      return (
                        <LabelCard
                          key={realIdx}
                          record={r}
                          selected={selected.has(realIdx)}
                          onToggle={toggleSelect}
                          index={realIdx}
                          onEdit={startEdit}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === "add" && (
              <div className="bg-white dark:bg-[#2f3349] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-8">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600">
                      <i className={`ti ${editIndex !== null ? 'ti-edit' : 'ti-plus'} text-2xl`}></i>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {editIndex !== null ? 'Edit Label Record' : 'Create New Label'}
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {FIELDS.map(f => (
                      <div key={f.key} className={f.key === "related" ? "md:col-span-2" : ""}>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 ml-1">
                          {f.label}
                          {["code","project"].includes(f.key) && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                            <i className={`ti ${f.icon} text-lg`}></i>
                          </div>
                          <input
                            className={`w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-primary-500/10
                              ${formErrors[f.key]
                                ? 'border-red-300 dark:border-red-900 focus:border-red-500'
                                : 'border-slate-100 dark:border-slate-700 focus:border-primary-500'}`}
                            value={form[f.key]}
                            onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setFormErrors(p => ({ ...p, [f.key]: "" })); }}
                            placeholder={f.placeholder}
                          />
                        </div>
                        {formErrors[f.key] && <p className="mt-2 text-xs font-medium text-red-500 ml-1">{formErrors[f.key]}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 flex gap-4">
                    <button
                      onClick={submitForm}
                      className="px-8 py-4 bg-primary-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary-500/25 hover:bg-primary-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
                    >
                      <i className={`ti ${editIndex !== null ? 'ti-check' : 'ti-plus'} mr-2`}></i>
                      {editIndex !== null ? 'Update Record' : 'Save Record'}
                    </button>
                    <button
                      onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setEditIndex(null); setTab("records"); }}
                      className="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "import" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#2f3349] p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-600">
                        <i className="ti ti-file-type-csv text-2xl"></i>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">CSV Template</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Download the standard format to fill your data.</p>
                      </div>
                    </div>
                    <button onClick={downloadTemplate} className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">
                      <i className="ti ti-download mr-2"></i> Download Template
                    </button>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
                    <div className="text-slate-500 mb-2">// Required column headers</div>
                    <div className="text-primary-400">{FIELDS.map(f => f.key).join(", ")}</div>
                  </div>
                </div>

                <div
                  className="bg-white dark:bg-[#2f3349] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-16 text-center hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer group"
                  onClick={() => fileRef.current.click()}
                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-primary-500", "bg-primary-50/10"); }}
                  onDragLeave={e => e.currentTarget.classList.remove("border-primary-500", "bg-primary-50/10")}
                  onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; fileRef.current.dispatchEvent(new Event("change")); }}
                >
                  <div className="w-20 h-20 bg-primary-50 dark:bg-primary-500/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <i className="ti ti-cloud-upload text-4xl text-primary-600"></i>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Drop your CSV here</h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-0">or click to browse from your computer</p>
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
                </div>

                {importMsg && (
                  <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${importMsg.startsWith("✅") ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-900/50 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-900/50 dark:text-red-400'}`}>
                    <i className={`ti ${importMsg.startsWith("✅") ? 'ti-circle-check' : 'ti-alert-circle'} text-xl`}></i>
                    <span className="text-sm font-semibold">{importMsg}</span>
                  </div>
                )}
              </div>
            )}

            {tab === "preview" && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-[#2f3349] p-6 lg:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selected.size > 0 ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10' : 'bg-slate-50 text-slate-300 dark:bg-slate-800'}`}>
                      <i className="ti ti-printer text-2xl"></i>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        {selected.size === 0 ? "No labels selected" : `${selected.size} Labels Ready`}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selected.size === 0 ? "Go back to records and select items to print." : `Layout: ${LABEL_PRINT_COLS} columns per row.`}
                      </p>
                    </div>
                  </div>
                  {selected.size > 0 && (
                    <div className="flex gap-3">
                      <button onClick={downloadExcel} className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        <i className="ti ti-file-excel mr-2"></i> Excel
                      </button>
                      <button onClick={printLabels} className="flex-1 md:flex-none px-8 py-3 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/25 hover:bg-primary-700 transition-colors">
                        <i className="ti ti-printer mr-2"></i> Print Labels
                      </button>
                    </div>
                  )}
                </div>

                {selected.size === 0 ? (
                  <div className="bg-white dark:bg-[#2f3349] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-20 text-center">
                    <i className="ti ti-selection text-5xl text-slate-200 dark:text-slate-700 mb-6 block"></i>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">No labels to preview</h3>
                    <button onClick={() => setTab('records')} className="text-primary-600 font-bold hover:underline">
                      Go to Records <i className="ti ti-arrow-right ml-1"></i>
                    </button>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#2f3349] rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
                    <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-100 dark:border-slate-800">
                      <i className="ti ti-scissors text-slate-400"></i>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Print Preview (with cut lines)</span>
                    </div>
                    <div className="flex flex-wrap gap-10 justify-center">
                      {records.filter((_, i) => selected.has(i)).map((r, i) => (
                        <div
                          key={i}
                          className="relative p-6 border-2 border-dashed border-slate-200 bg-white shadow-sm"
                          style={{ width: LABEL_WIDTH + 40, boxSizing: "border-box" }}
                        >
                          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-slate-400 text-xl">✂</span>
                          <div className="text-center pb-4 mb-4 border-b-2 border-slate-100 font-mono font-bold text-slate-800">
                            {r.code}
                          </div>
                          <div className="space-y-2">
                            {FIELDS.filter(f => f.key !== "code").map(f => (
                              <div key={f.key} className="flex justify-between text-[10px]">
                                <span className="font-bold text-slate-400 uppercase">{f.label}</span>
                                <span className="text-slate-800 font-medium truncate max-w-[100px] text-right">{r[f.key] || "—"}</span>
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
    </div>
  );
}
