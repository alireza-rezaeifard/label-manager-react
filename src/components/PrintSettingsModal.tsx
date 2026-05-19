export default function PrintSettingsModal({
  show, onClose,
  printTemplate, setPrintTemplate,
  printCols, setPrintCols,
  printWidth, setPrintWidth,
  printHeight, setPrintHeight,
  printQr, setPrintQr,
  printBarcode, setPrintBarcode,
  customFields = [] as any[],
  enabledCustomFieldKeys,
  onToggleCustomField,
}) {
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>تنظیمات چاپ</h3>
          <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={onClose}></i>
        </div>
        <div className="form-group">
          <label className="form-label">قالب برچسب</label>
          <select className="form-input" value={printTemplate} onChange={e => setPrintTemplate(e.target.value)}>
            <option value="classic">کلاسیک</option>
            <option value="compact">فشرده</option>
            <option value="detailed">جزئیات کامل</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">تعداد برچسب در هر ردیف</label>
          <select className="form-input" value={printCols} onChange={e => setPrintCols(Number(e.target.value))}>
            <option value={2}>۲ عدد</option>
            <option value={3}>۳ عدد</option>
            <option value={4}>۴ عدد</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">عرض برچسب (px)</label>
          <input type="number" className="form-input" value={printWidth} onChange={e => setPrintWidth(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label">ارتفاع برچسب (px)</label>
          <input type="number" className="form-input" value={printHeight} onChange={e => setPrintHeight(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={printQr} onChange={e => setPrintQr(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
            نمایش QR Code روی برچسب
          </label>
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={printBarcode} onChange={e => setPrintBarcode(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--primary)' }} />
            نمایش بارکد روی برچسب
          </label>
        </div>

        {customFields.length > 0 && (
          <div className="form-group">
            <label className="form-label">فیلدهای سفارشی در خروجی</label>
            <div className="d-flex gap-1 flex-wrap">
              {customFields.map(f => {
                const active = enabledCustomFieldKeys.includes(f.key);
                return (
                  <span key={f.key} onClick={() => onToggleCustomField(f.key)} style={{
                    padding: '0.3rem 0.7rem', borderRadius: 12, cursor: 'pointer',
                    fontSize: '0.85rem',
                    background: active ? 'var(--primary)' : 'var(--bg-body)',
                    color: active ? 'white' : 'var(--text-color)',
                    border: active ? 'none' : '1px solid var(--border-color)',
                    transition: 'all 0.2s',
                  }}>
                    {f.fa}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <button className="btn btn-primary w-100" onClick={onClose}>تایید</button>
      </div>
    </div>
  );
}
