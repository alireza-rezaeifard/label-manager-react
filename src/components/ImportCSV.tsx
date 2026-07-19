import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FIELDS, CSV_TEMPLATE } from '../data/fields';
import { downloadTemplate } from '../utils/exporters';
import type { ToastType, RecordItem } from '../types';

interface ImportRow {
  index: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
  valid: boolean;
}

export default function ImportCSV({ onImport, addToast, existingRecords = [], customFields = [] }: {
  onImport: (records: RecordItem[]) => void;
  addToast: (msg: string, type?: ToastType['type'], duration?: number) => void;
  existingRecords: RecordItem[];
  customFields?: { key: string; fa?: string; label?: string }[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState('csv');
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');

  function buildColumnMap(firstRow: Record<string, string>): Record<string, string> {
    const map: Record<string, string> = {};
    const lookup: Record<string, string> = {};

    for (const f of FIELDS) {
      lookup[f.key.toLowerCase()] = f.key;
      if (f.fa) lookup[f.fa.trim()] = f.key;
      if (f.label) lookup[f.label.trim().toLowerCase()] = f.key;
    }
    for (const f of customFields) {
      lookup[f.key.toLowerCase()] = f.key;
      if (f.fa) lookup[f.fa.trim()] = f.key;
      if (f.label) lookup[f.label.trim().toLowerCase()] = f.key;
    }

    for (const col of Object.keys(firstRow)) {
      const trimmed = col.trim();
      const lowered = trimmed.toLowerCase();
      map[col] = lookup[trimmed] || lookup[lowered] || trimmed;
    }
    return map;
  }

  function remapKeys(data: Record<string, string>[], colMap: Record<string, string>): Record<string, string>[] {
    return data.map(row => {
      const mapped: Record<string, string> = {};
      for (const [orig, canonical] of Object.entries(colMap)) {
        if (orig in row) {
          mapped[canonical] = row[orig];
        }
      }
      return mapped;
    });
  }

  const FIELD_KEYS = new Set(FIELDS.map(f => f.key));

  function validateRows(data: Record<string, string>[]): ImportRow[] {
    const codesInFile = new Set<string>();
    const existingCodes = new Set(existingRecords.map(r => r.code));
    const customFieldKeys = customFields.map(f => f.key);

    return data.map((r, i) => {
      const errors: string[] = [];
      const warnings: string[] = [];

      const code = String(r.code || '').trim();
      const project = String(r.project || '').trim();

      if (!code) errors.push('کد الزامی است');
      if (!project) errors.push('پروژه الزامی است');

      if (code && codesInFile.has(code)) {
        errors.push(`کد تکراری در فایل: ${code}`);
      } else if (code) {
        codesInFile.add(code);
      }

      if (code && existingCodes.has(code)) {
        warnings.push(`کد "${code}" از قبل وجود دارد`);
      }

      const amount = String(r.amount || '').trim();
      if (amount && isNaN(Number(amount.replace(/[,\s]/g, '')))) {
        warnings.push('مبلغ معتبر نیست');
      }

      const data: Record<string, string> = {
        code,
        project,
        type: String(r.type || '').trim(),
        date: String(r.date || '').trim(),
        party: String(r.party || '').trim(),
        amount,
        related: String(r.related || '').trim(),
      };
      for (const key of customFieldKeys) {
        data[key] = String(r[key] || '').trim();
      }
      for (const key of Object.keys(r)) {
        if (!FIELD_KEYS.has(key) && !(key in data)) {
          data[key] = String(r[key] || '').trim();
        }
      }

      return {
        index: i + 1,
        data,
        errors,
        warnings,
        valid: errors.length === 0,
      };
    });
  }

  function parseFile(file: File) {
    setFileName(file.name);

    const onData = (raw: Record<string, string>[]) => {
      if (raw.length === 0) {
        addToast('فایل خالی است', 'error');
        return;
      }
      const colMap = buildColumnMap(raw[0]);
      const mapped = remapKeys(raw, colMap);
      setRows(validateRows(mapped));
    };

    if (importMode === 'excel') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array((ev.target as FileReader).result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          onData(json);
        } catch {
          addToast('خطا در خواندن فایل اکسل', 'error');
        }
      };
      reader.onerror = () => addToast('خطا در خواندن فایل', 'error');
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => onData(res.data),
        error: () => addToast('خطا در پردازش فایل', 'error'),
      });
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
    (e.target as HTMLInputElement).value = '';
  };

  const handleDropZoneClick = () => {
    if (rows) {
      handleReset();
    } else {
      fileRef.current?.click();
    }
  };

  const validCount = rows ? rows.filter(r => r.valid).length : 0;
  const errorCount = rows ? rows.filter(r => r.errors.length > 0).length : 0;
  const warningCount = rows ? new Set(rows.filter(r => r.warnings.length > 0).map(r => r.index)).size : 0;

  const handleImport = async () => {
    if (!rows) return;
    setImporting(true);
    const validRows = rows.filter(r => r.valid).map(r => {
      const record: Record<string, any> = {
        code: r.data.code,
        project: r.data.project,
        type: r.data.type,
        date: r.data.date,
        party: r.data.party,
        amount: r.data.amount,
        related: r.data.related ? r.data.related.split(',').map(s => s.trim()).filter(Boolean) : [],
      };
      for (const key of Object.keys(r.data)) {
        if (!FIELD_KEYS.has(key) && r.data[key]) {
          record[key] = r.data[key];
        }
      }
      return record;
    });
    console.log('ImportCSV — sample record:', JSON.stringify(validRows[0], null, 2));
    await onImport(validRows);
    setImporting(false);
    setRows(null);
    setFileName('');
  };

  const handleReset = () => {
    setRows(null);
    setFileName('');
  };

  if (rows) {
    const totalRows = rows.length;
    const hasErrors = errorCount > 0;

    return (
      <div className="fade-in">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h4 style={{ marginBottom: '0.25rem' }}>
              <i className="ti ti-file-spreadsheet"></i> پیش‌نمایش ورود داده
            </h4>
            <p style={{ opacity: 0.7, margin: 0 }}>
              {fileName} — {totalRows} ردیف
            </p>
          </div>
          <div className="d-flex gap-2">
            {importing ? (
              <button className="btn btn-primary" disabled>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                {' '}در حال ورود...
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleImport} disabled={validCount === 0}>
                  <i className="ti ti-check"></i> ورود {validCount} رکورد
                </button>
                <button className="btn btn-outline-secondary" onClick={handleReset}>
                  <i className="ti ti-x"></i> لغو
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`import-summary ${hasErrors ? 'has-errors' : 'all-valid'}`}>
          <i className={`ti ${hasErrors ? 'ti-alert-triangle' : 'ti-check-circle'}`}></i>
          <span>
            {validCount} از {totalRows} رکورد معتبر هستند
            {errorCount > 0 && ` — ${errorCount} ردیف دارای خطا`}
            {warningCount > 0 && ` — ${warningCount} ردیف دارای اخطار`}
          </span>
        </div>

        <div className="import-preview-table-wrapper">
          <table className="import-preview-table">
            <thead>
              <tr>
                <th className="row-num">#</th>
                {FIELDS.map(f => (
                  <th key={f.key}>{f.fa}</th>
                ))}
                {customFields.map(f => (
                  <th key={f.key}>{f.fa || f.label || f.key}</th>
                ))}
                <th className="status-col">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                let rowClass = 'import-row';
                if (row.errors.length > 0) rowClass += ' import-row-error';
                else if (row.warnings.length > 0) rowClass += ' import-row-warning';
                else rowClass += ' import-row-valid';

                return (
                  <tr key={idx} className={rowClass}>
                    <td className="row-num">{row.index}</td>
                    {FIELDS.map(f => (
                      <td key={f.key}>
                        <span className="cell-value" title={row.data[f.key]}>
                          {row.data[f.key] || <span className="empty-cell">—</span>}
                        </span>
                      </td>
                    ))}
                    {customFields.map(f => (
                      <td key={f.key}>
                        <span className="cell-value" title={row.data[f.key]}>
                          {row.data[f.key] || <span className="empty-cell">—</span>}
                        </span>
                      </td>
                    ))}
                    <td className="status-col">
                      {row.errors.length > 0 && (
                        <span className="import-badge badge-error" title={row.errors.join('; ')}>
                          <i className="ti ti-x"></i> {row.errors.length}
                        </span>
                      )}
                      {row.errors.length === 0 && row.warnings.length > 0 && (
                        <span className="import-badge badge-warning" title={row.warnings.join('; ')}>
                          <i className="ti ti-alert-circle"></i> {row.warnings.length}
                        </span>
                      )}
                      {row.valid && row.warnings.length === 0 && (
                        <span className="import-badge badge-ok">
                          <i className="ti ti-check"></i>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {errorCount > 0 && (
          <div className="import-errors-list">
            <h5><i className="ti ti-list"></i> جزئیات خطاها</h5>
            {rows.filter(r => r.errors.length > 0).map((row, idx) => (
              <div key={idx} className="import-error-item">
                <strong>ردیف {row.index}:</strong> {row.errors.join('، ')}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="d-flex gap-2 mb-4">
        <button className={`tab-btn ${importMode === 'csv' ? 'active' : ''}`}
          onClick={() => setImportMode('csv')}>
          <i className="ti ti-file-type-csv"></i> ورود CSV
        </button>
        <button className={`tab-btn ${importMode === 'excel' ? 'active' : ''}`}
          onClick={() => setImportMode('excel')}>
          <i className="ti ti-file-excel"></i> ورود Excel
        </button>
      </div>

      <div className="form-card mb-4">
        <div className="d-flex align-items-center mb-4">
          <div className="stat-icon primary" style={{ marginLeft: '1rem' }}>
            <i className={`ti ${importMode === 'csv' ? 'ti-file-type-csv' : 'ti-file-excel'}`}></i>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '0.25rem' }}>قالب {importMode === 'csv' ? 'CSV' : 'Excel'}</h4>
            <p style={{ opacity: 0.7, margin: 0 }}>فایل الگو را دانلود و با داده‌های خود پر کنید</p>
          </div>
          <button className="btn btn-primary" onClick={() => downloadTemplate(FIELDS, CSV_TEMPLATE)}>
            <i className="ti ti-download"></i> دانلود قالب
          </button>
        </div>
        <div style={{
          background: 'var(--bg-body)', padding: '1rem', borderRadius: 8,
          fontFamily: 'monospace', fontSize: '0.85rem', overflowX: 'auto', direction: 'ltr',
        }}>
          {FIELDS.map(f => f.key).join(', ')}<br />
          <span style={{ opacity: 0.6 }}># برای فیلد related از کاما برای جداسازی چندین کد استفاده کنید</span>
        </div>
      </div>

      <div className="upload-zone" onClick={handleDropZoneClick}>
        <div className="upload-icon">
          <i className="ti ti-upload"></i>
        </div>
        <h4 style={{ marginBottom: '0.5rem' }}>فایل {importMode === 'csv' ? 'CSV' : 'Excel'} را آپلود کنید</h4>
        <p style={{ opacity: 0.7, margin: 0 }}>ستون‌ها: {[...FIELDS.map(f => f.key), ...customFields.map(f => f.key)].join(', ')}</p>
        <input ref={fileRef} type="file" accept={importMode === 'csv' ? '.csv' : '.xlsx,.xls'} onChange={handleFileChange} className="d-none" />
      </div>
    </div>
  );
}
