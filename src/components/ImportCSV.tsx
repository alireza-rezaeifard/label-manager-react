import { useRef, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { FIELDS, CSV_TEMPLATE } from '../data/fields';
import { downloadTemplate } from '../utils/exporters';

export default function ImportCSV({ onImport, importMsg, setImportMsg, addToast }) {
  const fileRef = useRef(null);
  const [importMode, setImportMode] = useState('csv');

  const processRecords = (data) => {
    const valid = data.filter(r => r.code && r.project);
    if (!valid.length) {
      setImportMsg('❌ هیچ ردیف معتبری یافت نشد.');
      return;
    }

    const importedRecords = valid.map(r => ({
      code: String(r.code || '').trim(),
      project: String(r.project || '').trim(),
      type: String(r.type || '').trim(),
      date: String(r.date || '').trim(),
      party: String(r.party || '').trim(),
      amount: String(r.amount || '').trim(),
      related: r.related ? String(r.related).split(',').map(s => s.trim()).filter(Boolean) : [],
    }));

    onImport(importedRecords);
    setImportMsg(`✅ ${importedRecords.length} رکورد با موفقیت وارد شد.`);
    addToast(`${importedRecords.length} رکورد با موفقیت وارد شد.`, 'success');
  };

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (importMode === 'excel') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
          processRecords(json);
        } catch {
          setImportMsg('❌ خطا در خواندن فایل اکسل');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => processRecords(res.data),
        error: () => setImportMsg('❌ خطا در پردازش فایل.'),
      });
    }
    e.target.value = '';
  };

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

      <div className="upload-zone" onClick={() => fileRef.current?.click()}>
        <div className="upload-icon">
          <i className="ti ti-upload"></i>
        </div>
        <h4 style={{ marginBottom: '0.5rem' }}>فایل {importMode === 'csv' ? 'CSV' : 'Excel'} را آپلود کنید</h4>
        <p style={{ opacity: 0.7, margin: 0 }}>ستون‌ها: {FIELDS.map(f => f.key).join(', ')}</p>
        <input ref={fileRef} type="file" accept={importMode === 'csv' ? '.csv' : '.xlsx,.xls'} onChange={handleCSV} className="d-none" />
      </div>

      {importMsg && (
        <div className={`alert ${importMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
          {importMsg}
        </div>
      )}
    </div>
  );
}
