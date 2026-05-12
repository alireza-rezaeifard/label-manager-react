import { useRef } from 'react';
import Papa from 'papaparse';
import { FIELDS, CSV_TEMPLATE } from '../data/fields';
import { downloadTemplate } from '../utils/exporters';

export default function ImportCSV({ onImport, importMsg, setImportMsg, addToast }) {
  const fileRef = useRef();

  const handleCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const valid = res.data.filter(r => r.code && r.project);
        if (!valid.length) {
          setImportMsg('❌ هیچ ردیف معتبری یافت نشد.');
          return;
        }

        const importedRecords = valid.map(r => ({
          code: r.code || '',
          project: r.project || '',
          type: r.type || '',
          date: r.date || '',
          party: r.party || '',
          amount: r.amount || '',
          related: r.related ? r.related.split(',').map(s => s.trim()).filter(Boolean) : [],
        }));

        onImport(importedRecords);
        setImportMsg(`✅ ${importedRecords.length} رکورد با موفقیت وارد شد.`);
        addToast(`${importedRecords.length} رکورد با موفقیت وارد شد.`, 'success');
      },
      error: () => setImportMsg('❌ خطا در پردازش فایل.'),
    });
    e.target.value = '';
  };

  return (
    <div className="fade-in">
      <div className="form-card mb-4">
        <div className="d-flex align-items-center mb-4">
          <div className="stat-icon primary" style={{ marginRight: '1rem' }}>
            <i className="ti ti-file-type-csv"></i>
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '0.25rem' }}>قالب CSV</h4>
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

      <div className="upload-zone" onClick={() => fileRef.current.click()}>
        <div className="upload-icon">
          <i className="ti ti-upload"></i>
        </div>
        <h4 style={{ marginBottom: '0.5rem' }}>فایل CSV را آپلود کنید</h4>
        <p style={{ opacity: 0.7, margin: 0 }}>ستون‌ها: {FIELDS.map(f => f.key).join(', ')}</p>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="d-none" />
      </div>

      {importMsg && (
        <div className={`alert ${importMsg.startsWith('✅') ? 'alert-success' : 'alert-danger'}`}>
          {importMsg}
        </div>
      )}
    </div>
  );
}
