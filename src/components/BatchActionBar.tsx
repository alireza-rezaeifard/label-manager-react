import { useEffect, useRef } from 'react';

interface BatchActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDelete: () => void;
  onBulkEdit: () => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  isViewer: boolean;
}

export default function BatchActionBar({
  selectedCount,
  onClearSelection,
  onDelete,
  onBulkEdit,
  onExportExcel,
  onExportCSV,
  isViewer,
}: BatchActionBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCount > 0 && barRef.current) {
      barRef.current.style.transform = 'translateY(0)';
      barRef.current.style.opacity = '1';
    }
  }, [selectedCount]);

  if (selectedCount === 0) return null;

  return (
    <div
      ref={barRef}
      className="batch-action-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--primary)',
        color: '#fff',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        zIndex: 1000,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
        transform: 'translateY(100%)',
        opacity: 0,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        direction: 'rtl',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
        {selectedCount} رکورد انتخاب شده
      </span>
      <div style={{ flex: 1 }} />
      <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={onClearSelection}>
        <i className="ti ti-x"></i> لغو انتخاب
      </button>
      <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={onExportExcel}>
        <i className="ti ti-file-excel"></i> اکسل
      </button>
      <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={onExportCSV}>
        <i className="ti ti-file-text"></i> CSV
      </button>
      {!isViewer && (
        <>
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }} onClick={onBulkEdit}>
            <i className="ti ti-edit"></i> ویرایش دسته‌جمعی
          </button>
          <button className="btn btn-sm" style={{ background: '#dc3545', color: '#fff', border: 'none' }} onClick={onDelete}>
            <i className="ti ti-trash"></i> حذف
          </button>
        </>
      )}
    </div>
  );
}
