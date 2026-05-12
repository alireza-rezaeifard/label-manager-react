export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          style={{
            padding: '1rem 1.5rem', borderRadius: 12, minWidth: 300,
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            background: t.type === 'success' ? '#28c76f' : '#ea5455',
            color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s ease', direction: 'rtl',
          }}
        >
          <i className={`ti ${t.type === 'success' ? 'ti-check-circle' : 'ti-alert-circle'}`}></i>
          <span style={{ flex: 1 }}>{t.message}</span>
          <i className="ti ti-x" style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => onRemove(t.id)}></i>
        </div>
      ))}
    </div>
  );
}
