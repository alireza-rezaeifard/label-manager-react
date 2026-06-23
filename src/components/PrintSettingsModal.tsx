import type { CustomField } from '../types';
import SearchableSelect from './SearchableSelect';

interface PrintSettingsModalProps {
  show: boolean;
  onClose: () => void;
  printTemplate: string;
  setPrintTemplate: (v: string) => void;
  printCols: number;
  setPrintCols: (v: number) => void;
  printWidth: number;
  setPrintWidth: (v: number) => void;
  printHeight: number;
  setPrintHeight: (v: number) => void;
  printQr: boolean;
  setPrintQr: (v: boolean) => void;
  printBarcode: boolean;
  setPrintBarcode: (v: boolean) => void;
  customFields?: CustomField[];
  enabledCustomFieldKeys: string[];
  onToggleCustomField: (key: string) => void;
}

export default function PrintSettingsModal({
  show, onClose,
  printTemplate, setPrintTemplate,
  printCols, setPrintCols,
  printWidth, setPrintWidth,
  printHeight, setPrintHeight,
  printQr, setPrintQr,
  printBarcode, setPrintBarcode,
  customFields = [],
  enabledCustomFieldKeys,
  onToggleCustomField,
}: PrintSettingsModalProps) {
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
          <SearchableSelect
            value={{ classic: 'کلاسیک', compact: 'فشرده', detailed: 'جزئیات کامل' }[printTemplate] || printTemplate}
            options={['کلاسیک', 'فشرده', 'جزئیات کامل']}
            onChange={(label) => {
              const map: Record<string, string> = { 'کلاسیک': 'classic', 'فشرده': 'compact', 'جزئیات کامل': 'detailed' };
              setPrintTemplate(map[label] || label);
            }}
            dir="rtl"
          />
        </div>
        <div className="form-group">
          <label className="form-label">تعداد برچسب در هر ردیف</label>
          <SearchableSelect
            value={`${printCols} عدد`}
            options={['۲ عدد', '۳ عدد', '۴ عدد']}
            onChange={(label) => {
              const num = parseInt(label);
              if (num) setPrintCols(num);
            }}
            dir="rtl"
          />
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
