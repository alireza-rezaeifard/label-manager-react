import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export default function ShortcutsHelp({ show, onClose }: {
  show: boolean;
  onClose: () => void;
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shortcuts-help" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>میانبرهای صفحه کلید</h3>
          <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onClose}></i>
        </div>
        <div className="shortcuts-grid">
          {SHORTCUTS.map(s => (
            <div key={s.action} className="shortcut-row">
              <kbd className="shortcut-key">
                {s.ctrl && <span>Ctrl+</span>}{s.key === ' ' ? 'Space' : s.key}
              </kbd>
              <span className="shortcut-desc">{s.label}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1.5rem', opacity: 0.6, fontSize: '0.85rem', textAlign: 'center' }}>
          Ctrl+/ برای نمایش یا بستن این پنجره
        </p>
      </div>
    </div>
  );
}
