export default function BackupModal({
  show, onClose,
  recordCount, onBackup,
  onRestore, setBackupFile,
  isViewer,
}: {
  show: boolean;
  onClose: () => void;
  recordCount: number;
  onBackup: () => void;
  onRestore: () => void;
  setBackupFile: React.Dispatch<React.SetStateAction<File | null>>;
  isViewer: boolean;
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>پشتیبان‌گیری و بازیابی</h3>
          <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onClose}></i>
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>خروجی پشتیبان</h4>
          <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
            {recordCount} رکورد برای پشتیبان‌گیری آماده است
          </p>
          <button className="btn btn-primary w-100" onClick={onBackup}>
            <i className="ti ti-download"></i> دانلود پشتیبان (JSON)
          </button>
        </div>
        {!isViewer && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <h4 style={{ marginBottom: '0.75rem' }}>بازیابی از پشتیبان</h4>
            <input
              type="file"
              accept=".json"
              className="form-input"
              style={{ marginBottom: '1rem' }}
              onChange={e => setBackupFile(e.target.files?.[0] ?? null)}
            />
            <button className="btn btn-success w-100" onClick={onRestore}>
              <i className="ti ti-upload"></i> بازیابی
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
