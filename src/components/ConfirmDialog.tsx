export default function ConfirmDialog({
  show, title, message, confirmLabel = 'تایید', cancelLabel = 'انصراف',
  variant = 'primary', loading = false, icon, onConfirm, onCancel,
}: {
  show: boolean; title: string; message: string;
  confirmLabel?: string; cancelLabel?: string;
  variant?: 'primary' | 'danger'; loading?: boolean; icon?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onCancel}></i>
        </div>
        {icon && (
          <div style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '2.5rem' }}>
            <i className={`ti ${icon}`} style={{ color: variant === 'danger' ? 'var(--danger)' : 'var(--primary)' }}></i>
          </div>
        )}
        <p style={{ opacity: 0.7, marginBottom: '1.5rem', lineHeight: 1.8 }}>{message}</p>
        <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading && <i className="ti ti-loader" style={{ animation: 'spin 0.6s linear infinite' }}></i>}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
