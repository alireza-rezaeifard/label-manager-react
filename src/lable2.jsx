import { useState, useRef, useCallback } from "react";
import Papa from "papaparse";

const FIELDS = [
  { key: "code",    label: "Code",    fa: "کد",           icon: "ti-hash",              placeholder: "e.g. INV-2024-001" },
  { key: "project", label: "Project", fa: "پروژه",        icon: "ti-building",          placeholder: "e.g. Office Renovation" },
  { key: "type",    label: "Type",    fa: "نوع",           icon: "ti-tag",               placeholder: "e.g. Invoice" },
  { key: "date",    label: "Date",    fa: "تاریخ",         icon: "ti-calendar",          placeholder: "e.g. 1403/02/15" },
  { key: "party",   label: "Party",   fa: "طرف حساب",     icon: "ti-user",              placeholder: "e.g. Vendor Name" },
  { key: "amount",  label: "Amount",  fa: "مبلغ",          icon: "ti-currency-dollar",   placeholder: "e.g. 5,000,000" },
  { key: "related", label: "Related", fa: "مرتبط",         icon: "ti-link",              placeholder: "e.g. Contract #42" },
];

const EMPTY_FORM = Object.fromEntries(FIELDS.map(f => [f.key, ""]));

const CSV_TEMPLATE = [FIELDS.map(f => f.key).join(","), "INV-2024-001,Office Renovation,Invoice,1403/02/15,Vendor Co,5000000,Contract #42"].join("\n");

function Label({ record, selected, onToggle, index, onEdit }) {
  return (
    <div
      onClick={() => onToggle(index)}
      className="rounded-lg border-2 transition-all duration-200 cursor-pointer overflow-hidden bg-white hover:shadow-lg"
      style={{
        borderColor: selected ? "#2563eb" : "#e5e7eb",
        backgroundColor: selected ? "#eff6ff" : "#ffffff",
      }}
    >
      <div style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "inline-block",
                backgroundColor: "#2563eb",
                color: "white",
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                fontFamily: "'Courier New', monospace",
                fontSize: "0.95rem",
                fontWeight: "600",
              }}
            >
              {record.code || "—"}
            </div>
          </div>
          <div style={{ marginLeft: "0.5rem" }}>
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(index)}
              onClick={e => e.stopPropagation()}
              style={{
                width: "20px",
                height: "20px",
                cursor: "pointer",
                accentColor: "#2563eb",
              }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1rem" }}>
          {FIELDS.filter(f => f.key !== "code").map(f => (
            <div key={f.key}>
              <div
                style={{
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "0.35rem",
                  direction: "rtl",
                  textAlign: "right",
                }}
              >
                {f.fa}
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: "500",
                  color: "#1e293b",
                  wordBreak: "break-word",
                  direction: "rtl",
                  textAlign: "right",
                }}
              >
                {record[f.key] || "—"}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={e => { e.stopPropagation(); onEdit(index); }}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s",
          }}
          onMouseOver={e => e.target.style.backgroundColor = "#1d4ed8"}
          onMouseOut={e => e.target.style.backgroundColor = "#2563eb"}
        >
          <i className="ti ti-edit" style={{ marginRight: "0.5rem" }}></i> Edit
        </button>
      </div>
    </div>
  );
}

function generateExcelXml(records) {
  const headers = FIELDS.map(f => f.label);
  const faHeaders = FIELDS.map(f => f.fa);

  const rows = records.map(r =>
    "    <Row>\n" +
    FIELDS.map(f =>
      `      <Cell><Data ss:Type="String">${r[f.key] || ""}</Data></Cell>`
    ).join("\n") +
    "\n    </Row>"
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header" ss:Name="Header">
      <Font ss:Bold="1" ss:Size="12" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#2563EB" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#1D4ED8"/>
      </Borders>
    </Style>
    <Style ss:ID="FaHeader" ss:Name="FaHeader">
      <Font ss:Bold="1" ss:Size="11" ss:Color="#1E293B"/>
      <Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#BFDBFE"/>
      </Borders>
    </Style>
    <Style ss:ID="Data" ss:Name="Data">
      <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
      </Borders>
    </Style>
  </Styles>
  <Worksheet ss:Name="Labels">
    <Table>
      <Column ss:Width="120"/>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Column ss:Width="110"/>
      <Column ss:Width="130"/>
      <Row ss:StyleID="Header">
${headers.map(h => `        <Cell><Data ss:Type="String">${h}</Data></Cell>`).join("\n")}
      </Row>
      <Row ss:StyleID="FaHeader">
${faHeaders.map(h => `        <Cell><Data ss:Type="String">${h}</Data></Cell>`).join("\n")}
      </Row>
${rows.map(row => row.replace(/<Row>/, '<Row ss:StyleID="Data">'))}
    </Table>
  </Worksheet>
</Workbook>`;
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
  const [showCode, setShowCode] = useState(false);
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
        if (!valid.length) { setImportMsg("No valid rows found. Check column names."); return; }
        setRecords(prev => [...prev, ...valid]);
        setImportMsg(`Imported ${valid.length} record(s) successfully.`);
        setTab("records");
      },
      error: () => setImportMsg("Failed to parse CSV."),
    });
    e.target.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "labels_template.csv";
    a.click();
  };

  const exportExcel = () => {
    const data = records.filter((_, i) => selected.has(i));
    const exportRecords = data.length > 0 ? data : records;
    if (exportRecords.length === 0) { alert("No records to export."); return; }
    const xml = generateExcelXml(exportRecords);
    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "labels_export.xls";
    a.click();
  };

  const getOutputCode = () => {
    const data = records.filter((_, i) => selected.has(i));
    const exportRecords = data.length > 0 ? data : records;
    return JSON.stringify(exportRecords, null, 2);
  };

  const copyOutputCode = () => {
    navigator.clipboard.writeText(getOutputCode());
  };

  const printLabels = () => {
    const selectedRecords = records.filter((_, i) => selected.has(i));
    if (!selectedRecords.length) { alert("Select at least one record to print."); return; }
    const win = window.open("", "_blank");
    const html = `<!DOCTYPE html><html><head><title>Labels</title><meta charset="utf-8"><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; }
      .page { padding: 8mm; }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
      .label-cell { position: relative; }
      .label { width: 100%; min-height: 130px; border: 2px solid #333; padding: 10px; display: flex; flex-direction: column; gap: 4px; break-inside: avoid; font-size: 9px; background: #fff; color: #000; }
      .label .code { font-weight: 700; font-size: 11px; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 2px; font-family: 'Courier New', monospace; }
      .label .row { display: flex; gap: 4px; align-items: flex-start; }
      .label .fa { font-weight: 700; min-width: 55px; direction: rtl; text-align: right; flex-shrink: 0; }
      .label .val { flex-grow: 1; text-align: left; word-break: break-word; }

      .cut-h { position: absolute; bottom: 0; left: 0; right: 0; height: 0; border-bottom: 1px dashed #999; }
      .cut-v { position: absolute; top: 0; bottom: 0; right: 0; width: 0; border-right: 1px dashed #999; }
      .scissors-h { position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #999; }
      .scissors-v { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); font-size: 10px; color: #999; writing-mode: vertical-rl; }

      @media print {
        @page { margin: 0; size: A4; }
        .cut-h, .cut-v, .scissors-h, .scissors-v { display: block; }
        .label { border: 1px solid #333; }
      }
    </style></head><body><div class="page"><div class="grid">
    ${selectedRecords.map((r, idx) => {
      const isLastInRow = (idx + 1) % 3 === 0;
      const isLastRow = idx >= selectedRecords.length - (selectedRecords.length % 3 || 3);
      const showVCut = !isLastInRow;
      const showHCut = !isLastRow;
      return `<div class="label-cell">
        <div class="label">
          <div class="code">${r.code}</div>
          ${FIELDS.filter(f => f.key !== "code").map(f => `<div class="row"><span class="fa">${f.fa}:</span><span class="val">${r[f.key] || ""}</span></div>`).join("")}
        </div>
        ${showVCut ? '<div class="cut-v"></div><div class="scissors-v">\u2702</div>' : ''}
        ${showHCut ? '<div class="cut-h"></div><div class="scissors-h">\u2702</div>' : ''}
      </div>`;
    }).join("")}
    </div></div><script>window.onload=()=>{window.print();}<\/script></body></html>`;
    win.document.write(html);
    win.document.close();
  };

  const fr = filteredRecords();

  const btnBase = {
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.9rem",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
  };

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh", paddingTop: "2rem", paddingBottom: "2rem" }}>
      <div style={{ maxWidth: "1200px", marginLeft: "auto", marginRight: "auto", paddingLeft: "1rem", paddingRight: "1rem" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.5rem" }}>
            <i className="ti ti-tags" style={{ marginRight: "0.75rem", color: "#2563eb" }}></i>
            Label Studio
          </h1>
          <p style={{ fontSize: "1rem", color: "#64748b" }}>Document archiving and label printing system</p>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", borderBottom: "2px solid #e5e7eb", paddingBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { id: "records", icon: "ti-files", label: "Records" },
            { id: "add", icon: "ti-plus", label: "Add Record" },
            { id: "import", icon: "ti-upload", label: "Import CSV" },
            { id: "preview", icon: "ti-printer", label: "Preview Labels" },
            { id: "output", icon: "ti-code", label: "Output Code" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setEditIndex(null); setForm(EMPTY_FORM); setFormErrors({}); }}
              style={{
                ...btnBase,
                backgroundColor: tab === t.id ? "#2563eb" : "transparent",
                color: tab === t.id ? "white" : "#64748b",
              }}
              onMouseOver={e => { if (tab !== t.id) e.target.style.backgroundColor = "#f1f5f9"; }}
              onMouseOut={e => { if (tab !== t.id) e.target.style.backgroundColor = "transparent"; }}
            >
              <i className={`ti ${t.icon}`}></i>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "records" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>
              <div style={{ position: "relative" }}>
                <i className="ti ti-search" style={{ position: "absolute", left: "1rem", top: "0.75rem", color: "#94a3b8" }}></i>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search records..."
                  style={{
                    width: "100%",
                    paddingLeft: "2.75rem",
                    paddingRight: "1rem",
                    paddingTop: "0.75rem",
                    paddingBottom: "0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.95rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={toggleAll}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    backgroundColor: "#f1f5f9",
                    color: "#1e293b",
                    border: "1px solid #cbd5e1",
                    borderRadius: "0.5rem",
                    cursor: "pointer",
                    fontWeight: "500",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={e => e.target.style.backgroundColor = "#e2e8f0"}
                  onMouseOut={e => e.target.style.backgroundColor = "#f1f5f9"}
                >
                  <i className="ti ti-checkbox" style={{ marginRight: "0.5rem" }}></i>
                  {selected.size === fr.length && fr.length > 0 ? "Deselect all" : "Select all"}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={deleteSelected}
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      backgroundColor: "#ef4444",
                      color: "white",
                      border: "none",
                      borderRadius: "0.5rem",
                      cursor: "pointer",
                      fontWeight: "500",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={e => e.target.style.backgroundColor = "#dc2626"}
                    onMouseOut={e => e.target.style.backgroundColor = "#ef4444"}
                  >
                    <i className="ti ti-trash" style={{ marginRight: "0.5rem" }}></i>
                    Delete ({selected.size})
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Total", value: records.length },
                { label: "Selected", value: selected.size },
                { label: "Filtered", value: fr.length },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "white",
                    padding: "1.5rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.5rem" }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: "2rem", fontWeight: "700", color: stat.label === "Selected" ? "#2563eb" : "#1e293b" }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {fr.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "3rem", color: "#94a3b8" }}>
                <i className="ti ti-file-off" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
                <p style={{ fontSize: "1rem" }}>
                  {search ? "No records match your search." : "No records yet. Add one or import a CSV."}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
                {fr.map((r, visIdx) => {
                  const realIdx = records.indexOf(r);
                  return (
                    <Label
                      key={realIdx}
                      record={r}
                      selected={selected.has(realIdx)}
                      onToggle={() => toggleSelect(realIdx)}
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
          <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "2rem" }}>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", marginBottom: "2rem" }}>
              <i className="ti ti-edit" style={{ marginRight: "0.75rem", color: "#2563eb" }}></i>
              {editIndex !== null ? "Edit Record" : "Add New Record"}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              {FIELDS.map(f => (
                <div key={f.key} style={{ gridColumn: f.key === "related" ? "1 / -1" : "auto" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.5rem" }}>
                    <i className={`ti ${f.icon}`} style={{ marginRight: "0.5rem", color: "#94a3b8" }}></i>
                    {f.label}
                    <span style={{ color: "#94a3b8", fontWeight: "400" }}> ({f.fa})</span>
                    {["code", "project"].includes(f.key) && <span style={{ color: "#ef4444" }}> *</span>}
                  </label>
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={e => {
                      setForm(p => ({ ...p, [f.key]: e.target.value }));
                      setFormErrors(p => ({ ...p, [f.key]: "" }));
                    }}
                    placeholder={f.placeholder}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      border: formErrors[f.key] ? "1px solid #ef4444" : "1px solid #e5e7eb",
                      fontSize: "0.95rem",
                      boxSizing: "border-box",
                      backgroundColor: formErrors[f.key] ? "#fee2e2" : "white",
                    }}
                  />
                  {formErrors[f.key] && (
                    <div style={{ fontSize: "0.8rem", color: "#ef4444", marginTop: "0.25rem" }}>
                      {formErrors[f.key]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.5rem", padding: "1.5rem", marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "0.85rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1rem" }}>
                <i className="ti ti-eye" style={{ marginRight: "0.5rem" }}></i> Preview
              </h3>
              <div style={{ backgroundColor: "white", borderRadius: "0.5rem", border: "1px solid #e5e7eb", padding: "1rem", maxWidth: "280px" }}>
                <div style={{ fontWeight: "700", fontSize: "0.95rem", paddingBottom: "0.75rem", marginBottom: "0.75rem", borderBottom: "1px solid #e5e7eb", fontFamily: "'Courier New', monospace" }}>
                  {form.code || "CODE"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {FIELDS.filter(f => f.key !== "code").map(f => (
                    <div key={f.key}>
                      <div style={{ fontSize: "0.7rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                        {f.fa}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: form[f.key] ? "#1e293b" : "#cbd5e1", wordBreak: "break-word" }}>
                        {form[f.key] || f.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={submitForm}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={e => e.target.style.backgroundColor = "#1d4ed8"}
                onMouseOut={e => e.target.style.backgroundColor = "#2563eb"}
              >
                <i className={`ti ${editIndex !== null ? "ti-check" : "ti-plus"}`} style={{ marginRight: "0.5rem" }}></i>
                {editIndex !== null ? "Save changes" : "Add record"}
              </button>
              <button
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setFormErrors({});
                  setEditIndex(null);
                  setTab("records");
                }}
                style={{
                  flex: 1,
                  padding: "0.875rem 1.5rem",
                  backgroundColor: "#f1f5f9",
                  color: "#1e293b",
                  border: "1px solid #cbd5e1",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseOver={e => e.target.style.backgroundColor = "#e2e8f0"}
                onMouseOut={e => e.target.style.backgroundColor = "#f1f5f9"}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {tab === "import" && (
          <div>
            <div style={{ backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", padding: "1.5rem", marginBottom: "2rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                <div style={{ backgroundColor: "#dbeafe", borderRadius: "0.5rem", padding: "1rem" }}>
                  <i className="ti ti-file-type-csv" style={{ fontSize: "1.5rem", color: "#2563eb" }}></i>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.25rem" }}>
                    CSV Template
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "#64748b" }}>Download and fill with your data</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  style={{
                    ...btnBase,
                    backgroundColor: "#2563eb",
                    color: "white",
                  }}
                  onMouseOver={e => e.target.style.backgroundColor = "#1d4ed8"}
                  onMouseOut={e => e.target.style.backgroundColor = "#2563eb"}
                >
                  <i className="ti ti-download"></i> Download
                </button>
              </div>
              <div style={{ backgroundColor: "#f9fafb", borderRadius: "0.375rem", padding: "0.75rem", fontSize: "0.8rem", fontFamily: "'Courier New', monospace", overflowX: "auto", color: "#64748b" }}>
                {FIELDS.map(f => f.key).join(", ")}
              </div>
            </div>

            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = "#dbeafe";
                e.currentTarget.style.borderColor = "#2563eb";
              }}
              onDragLeave={e => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              onDrop={e => {
                e.preventDefault();
                fileRef.current.files = e.dataTransfer.files;
                fileRef.current.dispatchEvent(new Event("change"));
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#cbd5e1";
              }}
              style={{
                borderRadius: "0.75rem",
                border: "2px dashed #cbd5e1",
                backgroundColor: "white",
                padding: "3rem 1rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s",
                marginBottom: "1.5rem",
              }}
            >
              <i className="ti ti-upload" style={{ fontSize: "2rem", color: "#94a3b8", display: "block", marginBottom: "1rem" }}></i>
              <h4 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#1e293b", marginBottom: "0.5rem" }}>
                Click to upload CSV
              </h4>
              <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                Columns: {FIELDS.map(f => f.key).join(", ")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleCSV}
                style={{ display: "none" }}
              />
            </div>

            {importMsg && (
              <div
                style={{
                  borderRadius: "0.5rem",
                  padding: "1rem",
                  backgroundColor: importMsg.includes("successfully") ? "#dcfce7" : "#fee2e2",
                  color: importMsg.includes("successfully") ? "#166534" : "#991b1b",
                  border: `1px solid ${importMsg.includes("successfully") ? "#86efac" : "#fca5a5"}`,
                }}
              >
                {importMsg}
              </div>
            )}
          </div>
        )}

        {tab === "preview" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", fontSize: "0.95rem", color: "#64748b", flexWrap: "wrap", gap: "1rem" }}>
              <span>
                {selected.size === 0
                  ? "Select records on the Records tab to preview and print."
                  : `${selected.size} label(s) ready to print`}
              </span>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {selected.size > 0 && (
                  <>
                    <button
                      onClick={printLabels}
                      style={{
                        ...btnBase,
                        backgroundColor: "#16a34a",
                        color: "white",
                      }}
                      onMouseOver={e => e.target.style.backgroundColor = "#15803d"}
                      onMouseOut={e => e.target.style.backgroundColor = "#16a34a"}
                    >
                      <i className="ti ti-printer"></i> Print labels
                    </button>
                    <button
                      onClick={exportExcel}
                      style={{
                        ...btnBase,
                        backgroundColor: "#16a34a",
                        color: "white",
                      }}
                      onMouseOver={e => e.target.style.backgroundColor = "#15803d"}
                      onMouseOut={e => e.target.style.backgroundColor = "#16a34a"}
                    >
                      <i className="ti ti-file-spreadsheet"></i> Export Excel
                    </button>
                  </>
                )}
              </div>
            </div>

            {selected.size === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "3rem", backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", color: "#94a3b8" }}>
                <i className="ti ti-selector" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1e293b" }}>
                  No labels selected
                </h4>
                <p style={{ marginBottom: "1rem" }}>Go to Records tab and select the ones you want to print.</p>
                <button
                  onClick={() => setTab("records")}
                  style={{
                    ...btnBase,
                    backgroundColor: "#2563eb",
                    color: "white",
                  }}
                >
                  <i className="ti ti-arrow-right"></i> Go to records
                </button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "1rem" }}>
                  Print preview — 3 per row, {Math.ceil(selected.size / 3)} rows
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0", backgroundColor: "#f9fafb", padding: "1rem", borderRadius: "0.75rem" }}>
                  {records.filter((_, i) => selected.has(i)).map((r, i, arr) => {
                    const isLastInRow = (i + 1) % 3 === 0;
                    const isLastRow = i >= arr.length - (arr.length % 3 || 3);
                    return (
                      <div key={i} style={{ position: "relative" }}>
                        <div
                          style={{
                            border: "1px solid #cbd5e1",
                            borderRadius: "0.375rem",
                            padding: "0.75rem",
                            backgroundColor: "white",
                            fontSize: "0.85rem",
                            margin: "0.5rem",
                          }}
                        >
                          <div style={{ fontWeight: "700", paddingBottom: "0.5rem", marginBottom: "0.5rem", borderBottom: "1px solid #e5e7eb", fontFamily: "'Courier New', monospace", fontSize: "0.9rem" }}>
                            {r.code}
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                            {FIELDS.filter(f => f.key !== "code").map(f => (
                              <div key={f.key} style={{ fontSize: "0.75rem" }}>
                                <div style={{ fontWeight: "700", color: "#94a3b8", marginBottom: "0.15rem", direction: "rtl", textAlign: "right" }}>
                                  {f.fa}
                                </div>
                                <div style={{ color: "#1e293b", wordBreak: "break-word" }}>
                                  {r[f.key] || "—"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        {!isLastInRow && (
                          <div style={{
                            position: "absolute",
                            right: "-4px",
                            top: "0",
                            bottom: "0",
                            width: "0",
                            borderRight: "2px dashed #94a3b8",
                          }}>
                            <div style={{
                              position: "absolute",
                              top: "50%",
                              right: "-6px",
                              transform: "translateY(-50%)",
                              fontSize: "12px",
                              color: "#94a3b8",
                            }}>&#9986;</div>
                          </div>
                        )}
                        {!isLastRow && (
                          <div style={{
                            position: "absolute",
                            bottom: "-4px",
                            left: "0",
                            right: "0",
                            height: "0",
                            borderBottom: "2px dashed #94a3b8",
                          }}>
                            <div style={{
                              position: "absolute",
                              left: "50%",
                              bottom: "-6px",
                              transform: "translateX(-50%)",
                              fontSize: "12px",
                              color: "#94a3b8",
                            }}>&#9986;</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "output" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#1e293b", marginBottom: "0.25rem" }}>
                  <i className="ti ti-code" style={{ marginRight: "0.75rem", color: "#2563eb" }}></i>
                  Output Code
                </h2>
                <p style={{ fontSize: "0.9rem", color: "#64748b" }}>
                  {selected.size > 0
                    ? `Showing JSON for ${selected.size} selected record(s)`
                    : `Showing JSON for all ${records.length} record(s)`}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={copyOutputCode}
                  style={{
                    ...btnBase,
                    backgroundColor: "#2563eb",
                    color: "white",
                  }}
                  onMouseOver={e => e.target.style.backgroundColor = "#1d4ed8"}
                  onMouseOut={e => e.target.style.backgroundColor = "#2563eb"}
                >
                  <i className="ti ti-copy"></i> Copy to Clipboard
                </button>
                <button
                  onClick={exportExcel}
                  style={{
                    ...btnBase,
                    backgroundColor: "#16a34a",
                    color: "white",
                  }}
                  onMouseOver={e => e.target.style.backgroundColor = "#15803d"}
                  onMouseOut={e => e.target.style.backgroundColor = "#16a34a"}
                >
                  <i className="ti ti-file-spreadsheet"></i> Export Excel
                </button>
              </div>
            </div>

            {records.length === 0 ? (
              <div style={{ textAlign: "center", paddingTop: "3rem", paddingBottom: "3rem", backgroundColor: "white", borderRadius: "0.75rem", border: "1px solid #e5e7eb", color: "#94a3b8" }}>
                <i className="ti ti-code-off" style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}></i>
                <h4 style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#1e293b" }}>
                  No records to display
                </h4>
                <p style={{ marginBottom: "1rem" }}>Add some records first to see the output code.</p>
                <button
                  onClick={() => setTab("add")}
                  style={{
                    ...btnBase,
                    backgroundColor: "#2563eb",
                    color: "white",
                  }}
                >
                  <i className="ti ti-plus"></i> Add Record
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <pre
                  style={{
                    backgroundColor: "#1e293b",
                    color: "#e2e8f0",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    fontSize: "0.85rem",
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    lineHeight: "1.6",
                    overflowX: "auto",
                    maxHeight: "600px",
                    overflowY: "auto",
                    border: "1px solid #334155",
                  }}
                >
                  <code>{getOutputCode()}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
