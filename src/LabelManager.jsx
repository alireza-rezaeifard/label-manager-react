import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

const FIELDS = [
  { key: "code",    label: "Code",    placeholder: "e.g. INV-2024-001" },
  { key: "project", label: "Project", placeholder: "e.g. Office Renovation" },
  { key: "type",    label: "Type",    placeholder: "e.g. Invoice" },
  { key: "date",    label: "Date",    placeholder: "e.g. 1403/02/15" },
  { key: "party",   label: "Party",   placeholder: "e.g. Vendor Name" },
  { key: "amount",  label: "Amount",  placeholder: "e.g. 5,000,000" },
  { key: "related", label: "Related", placeholder: "e.g. Contract #42" },
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, ""]));

const CSV_TEMPLATE = [FIELDS.map(f => f.key).join(","), "INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,Contract #42"].join("\n");

const LABEL_PRINT_COLS = 3;
const LABEL_WIDTH = 180;
const LABEL_HEIGHT = 130;
const LABEL_FONT = "Tahoma, Arial, sans-serif";

function LabelCard({ record, selected, onToggle, index, onEdit }) {
  return (
    <div
      onClick={() => onToggle(index)}
      className={`card h-100 cursor-pointer transition-all duration-200 hover:shadow-lg ${selected ? 'border-indigo-500 shadow-md' : 'shadow-sm'}`}
    >
      <div className="card-body p-3">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <span className={`badge fs-6 font-mono ${selected ? 'bg-indigo-500' : 'bg-secondary'}`}>
            {record.code || "—"}
          </span>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(index)}
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
        <div className="row g-2">
          {FIELDS.filter(f => f.key !== "code").map(f => (
            <div key={f.key} className="col-6">
              <small className="text-muted fw-bold">{f.label}</small>
              <div className="fw-medium text-truncate" style={{ fontSize: "0.85rem" }}>
                {record[f.key] || "—"}
              </div>
            </div>
          ))}
        </div>
        <button
          className="btn btn-sm btn-outline-primary w-100 mt-3"
          onClick={e => { e.stopPropagation(); onEdit(index); }}
        >
          <i className="ti ti-edit me-1"></i> Edit
        </button>
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
  const fileRef = useRef();

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

  const generateLabelHTML = (record) => {
    const rows = FIELDS.filter(f => f.key !== "code").map(f => `
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
        <span style="font-weight: bold; min-width: 60px; color: #555;">${f.label}:</span>
        <span style="max-width: 110px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${record[f.key] || ""}</span>
      </div>
    `).join('');
    
    return `
      <div style="
        width: ${LABEL_WIDTH}px;
        height: ${LABEL_HEIGHT}px;
        border: 1px solid #333;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        break-inside: avoid;
        font-family: ${LABEL_FONT};
        font-size: 11px;
        background: #fff;
        color: #000;
        box-sizing: border-box;
      ">
        <div style="
          font-weight: bold;
          font-size: 13px;
          border-bottom: 2px solid #ccc;
          padding-bottom: 4px;
          margin-bottom: 6px;
          text-align: center;
          font-family: monospace;
        ">${record.code}</div>
        <div style="display: flex; flex-direction: column; gap: 2px;">
          ${rows}
        </div>
      </div>
    `;
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
        rowLabels.map((r, idx) => `
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
    
    Object.keys(ws).forEach(cell => {
      if (cell !== '!cols' && cell !== '!ref') {
        ws[cell].s = {
          font: { name: "Tahoma", sz: 11 },
          alignment: { horizontal: "left", vertical: "middle" }
        };
      }
    });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Labels");
    
    XLSX.writeFile(wb, "labels_export.xlsx");
  };

  const fr = filteredRecords();

  return (
    <div className="min-vh-100 bg-gray-100">
      <header className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-5 mb-6 shadow-lg">
        <div className="container">
          <h1 className="mb-2 fw-bold fs-3">
            <i className="ti ti-tags me-3"></i>Label Studio
          </h1>
          <p className="mb-0 opacity-75">Document Archiving & Label Printing Tool</p>
        </div>
      </header>

      <main className="container pb-5">
        <ul className="nav nav-pills mb-5 gap-3 flex-wrap bg-white p-3 rounded-3 shadow-sm">
          <li className="nav-item">
            <button className={`nav-link px-4 py-2 rounded-pill fw-medium ${tab === "records" ? "active bg-indigo-500 text-white" : "text-dark bg-gray-100 hover:bg-gray-200"}`} onClick={() => { setTab("records"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); }}>
              <i className="ti ti-files me-2"></i> Records
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link px-4 py-2 rounded-pill fw-medium ${tab === "add" ? "active bg-indigo-500 text-white" : "text-dark bg-gray-100 hover:bg-gray-200"}`} onClick={() => { setTab("add"); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); }}>
              <i className="ti ti-plus me-2"></i> Add Record
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link px-4 py-2 rounded-pill fw-medium ${tab === "import" ? "active bg-indigo-500 text-white" : "text-dark bg-gray-100 hover:bg-gray-200"}`} onClick={() => { setTab("import"); setImportMsg(""); }}>
              <i className="ti ti-upload me-2"></i> Import CSV
            </button>
          </li>
          <li className="nav-item">
            <button className={`nav-link px-4 py-2 rounded-pill fw-medium ${tab === "preview" ? "active bg-indigo-500 text-white" : "text-dark bg-gray-100 hover:bg-gray-200"}`} onClick={() => setTab("preview")}>
              <i className="ti ti-printer me-2"></i> Preview Labels
            </button>
          </li>
        </ul>

        {tab === "records" && (
          <div>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="input-group shadow-sm">
                  <span className="input-group-text bg-white"><i className="ti ti-search"></i></span>
                  <input
                    className="form-control border-start-0"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search records..."
                  />
                </div>
              </div>
              <div className="col-md-6 d-flex gap-3 justify-content-md-end">
                <button className="btn btn-outline-secondary shadow-sm" onClick={toggleAll}>
                  <i className="ti ti-checkbox me-2"></i>
                  {selected.size === fr.length && fr.length > 0 ? "Deselect All" : "Select All"}
                </button>
                {selected.size > 0 && (
                  <button className="btn btn-danger shadow-sm" onClick={deleteSelected}>
                    <i className="ti ti-trash me-2"></i> Delete ({selected.size})
                  </button>
                )}
              </div>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card text-center border-0 shadow-sm h-100">
                  <div className="card-body py-4">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Total</small>
                    <div className="fw-bold fs-2 text-dark">{records.length}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center border-0 shadow-sm h-100">
                  <div className="card-body py-4">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Selected</small>
                    <div className="fw-bold fs-2 text-indigo-500">{selected.size}</div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card text-center border-0 shadow-sm h-100">
                  <div className="card-body py-4">
                    <small className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.7rem" }}>Filtered</small>
                    <div className="fw-bold fs-2 text-dark">{fr.length}</div>
                  </div>
                </div>
              </div>
            </div>

            {fr.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                <i className="ti ti-file-off display-4 d-block mb-4 text-muted"></i>
                <p className="text-muted fs-5">{search ? "No records match your search." : "No records yet. Add one or import a CSV."}</p>
              </div>
            ) : (
              <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                {fr.map((r) => {
                  const realIdx = records.indexOf(r);
                  return (
                    <div key={realIdx}>
                      <LabelCard record={r} selected={selected.has(realIdx)} onToggle={() => toggleSelect(realIdx)} index={realIdx} onEdit={startEdit} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "add" && (
          <div className="card shadow-lg border-0 rounded-4">
            <div className="card-body p-5">
              <h4 className="mb-5 fw-bold text-dark">
                <i className="ti ti-edit me-3 text-indigo-500"></i>
                {editIndex !== null ? "Edit Record" : "Add New Record"}
              </h4>
              <div className="row g-4">
                {FIELDS.map(f => (
                  <div key={f.key} className={`col-md-6 ${f.key === "related" ? "col-12" : ""}`}>
                    <label className="form-label fw-medium mb-2 text-dark">
                      <i className="ti ti-apps me-2 text-muted"></i>
                      {f.label}
                      {["code","project"].includes(f.key) && <span className="text-danger ms-1">*</span>}
                    </label>
                    <input
                      className={`form-control py-3 rounded-3 ${formErrors[f.key] ? "is-invalid" : ""}`}
                      value={form[f.key]}
                      onChange={e => { setForm(p => ({ ...p, [f.key]: e.target.value })); setFormErrors(p => ({ ...p, [f.key]: "" })); }}
                      placeholder={f.placeholder}
                      style={{ fontFamily: "Tahoma" }}
                    />
                    {formErrors[f.key] && <div className="invalid-feedback">{formErrors[f.key]}</div>}
                  </div>
                ))}
              </div>

              <div className="card mt-5 bg-gray-50 border-0 rounded-4">
                <div className="card-body p-4">
                  <h6 className="text-muted text-uppercase mb-4" style={{ fontSize: "0.8rem" }}>
                    <i className="ti ti-eye me-2"></i> Preview
                  </h6>
                  <div className="border rounded-4 p-4 bg-white shadow-sm" style={{ maxWidth: 300, fontFamily: "Tahoma" }}>
                    <div className="fw-bold mb-3 pb-3 border-bottom text-center font-mono fs-5">
                      {form.code || <span className="text-muted">CODE</span>}
                    </div>
                    {FIELDS.filter(f => f.key !== "code").map(f => (
                      <div key={f.key} className="d-flex justify-content-between mb-2 small">
                        <span className="text-muted fw-medium">{f.label}</span>
                        <span className={form[f.key] ? "text-dark" : "text-muted"}>{form[f.key] || f.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 d-flex gap-3">
                <button className="btn btn-primary btn-lg px-5 shadow-sm" onClick={submitForm}>
                  <i className={`ti ${editIndex !== null ? "ti-check" : "ti-plus"} me-2`}></i>
                  {editIndex !== null ? "Save Changes" : "Add Record"}
                </button>
                <button className="btn btn-outline-secondary btn-lg px-5" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setEditIndex(null); setTab("records"); }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div>
            <div className="card mb-4 shadow-sm border-0 rounded-4">
              <div className="card-body p-4">
                <div className="d-flex align-items-center mb-4">
                  <div className="bg-indigo-100 rounded-3 p-3 me-4">
                    <i className="ti ti-file-type-csv fs-2 text-indigo-500"></i>
                  </div>
                  <div className="flex-grow-1">
                    <h5 className="mb-2 fw-bold text-dark">CSV Template</h5>
                    <small className="text-muted">Download and fill with your data</small>
                  </div>
                  <button className="btn btn-outline-primary shadow-sm" onClick={downloadTemplate}>
                    <i className="ti ti-download me-2"></i> Download
                  </button>
                </div>
                <div className="bg-dark text-light rounded-3 p-3 font-mono overflow-auto" style={{ fontSize: "0.85rem" }}>
                  {FIELDS.map(f => f.key).join(", ")}
                </div>
              </div>
            </div>

            <div
              className="border border-2 border-dashed rounded-4 text-center py-5 bg-white transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50"
              style={{ cursor: "pointer" }}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("border-indigo-500", "bg-indigo-50"); }}
              onDragLeave={e => e.currentTarget.classList.remove("border-indigo-500", "bg-indigo-50")}
              onDrop={e => { e.preventDefault(); fileRef.current.files = e.dataTransfer.files; fileRef.current.dispatchEvent(new Event("change")); }}
            >
              <div className="bg-gradient-to-r from-indigo-100 to-purple-100 rounded-4 p-4 d-inline-block mb-4">
                <i className="ti ti-upload display-4 text-indigo-500 d-block"></i>
              </div>
              <h5 className="mb-3 fw-bold text-dark">Click to upload CSV</h5>
              <p className="text-muted mb-0">Columns: {FIELDS.map(f => f.key).join(", ")}</p>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="d-none" />
            </div>

            {importMsg && (
              <div className={`alert mt-4 ${importMsg.startsWith("✅") ? "alert-success" : "alert-danger"} shadow-sm`} role="alert">
                {importMsg}
              </div>
            )}
          </div>
        )}

        {tab === "preview" && (
          <div>
            <div className="card mb-4 shadow-sm border-0 rounded-4">
              <div className="card-body p-4 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-2 fw-bold text-dark">{selected.size === 0 ? "No labels selected" : `${selected.size} label(s) ready`}</h5>
                  <small className="text-muted">
                    {selected.size === 0 ? "Select records on the Records tab" : `${LABEL_PRINT_COLS} per row, ${Math.ceil(selected.size / LABEL_PRINT_COLS)} rows`}
                  </small>
                </div>
                {selected.size > 0 && (
                  <div className="d-flex gap-3">
                    <button className="btn btn-outline-primary shadow-sm" onClick={downloadExcel}>
                      <i className="ti ti-file-excel me-2"></i> Export Excel
                    </button>
                    <button className="btn btn-success shadow-sm" onClick={printLabels}>
                      <i className="ti ti-printer me-2"></i> Print Labels
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selected.size === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                <i className="ti ti-selector display-4 d-block mb-4 text-muted"></i>
                <h5 className="fw-bold text-dark mb-3">No labels selected</h5>
                <p className="text-muted mb-4">Go to Records tab and select the ones you want to print</p>
                <button className="btn btn-primary shadow-sm" onClick={() => setTab("records")}>
                  <i className="ti ti-arrow-right me-2"></i> Go to Records
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-4 shadow-sm p-5">
                <div className="mb-4 pb-4 border-bottom d-flex align-items-center gap-2">
                  <i className="ti ti-scissors text-muted fs-5"></i>
                  <h6 className="mb-0 text-muted fw-medium">Cut lines (✂) for cutting after printing</h6>
                </div>
                <div className="d-flex flex-wrap gap-4">
                  {records.filter((_, i) => selected.has(i)).map((r, i) => (
                    <div 
                      key={i} 
                      className="position-relative"
                      style={{
                        width: LABEL_WIDTH + 40,
                        padding: "16px",
                        border: "2px dashed #ccc",
                        background: "white",
                        boxSizing: "border-box",
                      }}
                    >
                      <span 
                        className="position-absolute text-muted"
                        style={{ 
                          top: -20, 
                          left: "50%", 
                          transform: "translateX(-50%)",
                          fontSize: 18,
                        }}
                      >✂</span>
                      <div>
                        <div className="fw-bold text-center pb-3 mb-3 border-bottom font-mono fs-6">
                          {r.code}
                        </div>
                        {FIELDS.filter(f => f.key !== "code").map(f => (
                          <div key={f.key} className="d-flex justify-content-between mb-2" style={{ fontSize: 11 }}>
                            <span className="text-muted fw-bold" style={{ minWidth: 55 }}>{f.label}:</span>
                            <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r[f.key] || "—"}
                            </span>
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
      </main>
    </div>
  );
}