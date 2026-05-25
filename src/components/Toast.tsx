import { useState, useEffect } from 'react';

function ToastItem({ toast, onRemove, index }: { toast: any; onRemove: (id: number) => void; index: number }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (toast.exiting) {
      setExiting(true);
      const timer = setTimeout(() => onRemove(toast.id), 300);
      return () => clearTimeout(timer);
    }
  }, [toast.exiting, toast.id, onRemove]);

  const offset = index * 70;

  return (
    <div
      style={{
        padding: '1rem 1.5rem', borderRadius: 12, minWidth: 300,
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        background: toast.type === 'success' ? '#28c76f' : '#ea5455',
        color: '#fff', boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        direction: 'rtl', position: 'absolute', top: 0, right: 0, left: 0,
        transform: exiting ? 'translateX(120%) scale(0.9)' : 'translateX(0) scale(1)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        animation: exiting ? 'none' : 'toastSlideIn 0.35s ease',
        zIndex: 9999 - index,
        pointerEvents: 'auto',
      }}
    >
      <i className={`ti ${toast.type === 'success' ? 'ti-check-circle' : 'ti-alert-circle'}`}></i>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <i className="ti ti-x" style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => onRemove(toast.id)}></i>
    </div>
  );
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: '1rem', left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{ position: 'relative', width: 320, height: toasts.length * 70 }}>
        {toasts.map((t, i) => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} index={i} />
        ))}
      </div>
    </div>
  );
}
