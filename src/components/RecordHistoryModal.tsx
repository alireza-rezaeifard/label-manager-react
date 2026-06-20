import { useState, useEffect } from 'react';
import { api } from '../utils/api';

interface VersionEntry {
  id: number;
  record_id: number;
  user_name: string;
  change_summary: string;
  created_at: string;
}

export default function RecordHistoryModal({ recordId, recordCode, onClose, onRestore, addToast }: {
  recordId: string | number;
  recordCode: string;
  onClose: () => void;
  onRestore: (versionId: number) => Promise<void>;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState<number | null>(null);

  useEffect(() => {
    api.getRecordVersions(recordId)
      .then(setVersions)
      .catch(() => addToast('خطا در دریافت تاریخچه', 'error'))
      .finally(() => setLoading(false));
  }, [recordId]);

  const handleRestore = async (versionId: number) => {
    setRestoring(versionId);
    try {
      await onRestore(versionId);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="ti ti-history" style={{ color: 'var(--primary)' }}></i>
            تاریخچه نسخه‌ها — <span style={{ fontFamily: 'monospace', direction: 'ltr' }}>{recordCode}</span>
          </h4>
          <button className="btn btn-outline-secondary" onClick={onClose}>
            <i className="ti ti-x"></i>
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">در حال بارگذاری...</span>
            </div>
          </div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
            <i className="ti ti-history-off" style={{ fontSize: '3rem', marginBottom: '1rem' }}></i>
            <p>تاریخچه‌ای برای این رکورد وجود ندارد</p>
          </div>
        ) : (
          <div className="version-list">
            {versions.map((v, idx) => (
              <div key={v.id} className="version-item">
                <div className="version-timeline-dot"></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <div>
                      <strong style={{ fontSize: '0.9rem' }}>{v.change_summary}</strong>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>
                        {v.user_name || 'کاربر ناشناس'} — {new Date(v.created_at + 'Z').toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${idx === 0 ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
                      onClick={() => handleRestore(v.id)}
                      disabled={restoring === v.id}
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      {restoring === v.id ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : idx === 0 ? (
                        'نسخه فعلی'
                      ) : (
                        'بازگردانی'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
