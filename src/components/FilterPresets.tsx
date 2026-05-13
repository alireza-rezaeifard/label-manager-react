import { useState, useEffect, useCallback } from 'react';

const PRESETS_KEY = 'label-studio-filter-presets';

interface FilterState {
  search: string;
  filterType: string;
  filterParty: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterAmountMin: string;
  filterAmountMax: string;
  selectedTagFilter: string | null;
}

interface FilterPreset {
  name: string;
  filters: FilterState;
  createdAt: string;
}

function loadPresets(): FilterPreset[] {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); } catch { return []; }
}

function savePresets(presets: FilterPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch { /* localStorage might be full */ }
}

export default function FilterPresets({
  currentFilters,
  onApply,
  addToast,
}: {
  currentFilters: FilterState;
  onApply: (filters: FilterState) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [presets, setPresets] = useState<FilterPreset[]>(loadPresets);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => { savePresets(presets); }, [presets]);

  const hasActiveFilters = Boolean(
    currentFilters.filterType || currentFilters.filterParty ||
    currentFilters.filterDateFrom || currentFilters.filterDateTo ||
    currentFilters.filterAmountMin || currentFilters.filterAmountMax ||
    currentFilters.selectedTagFilter || currentFilters.search
  );

  const handleSave = useCallback(() => {
    if (!presetName.trim()) {
      addToast('نام فیلتر را وارد کنید', 'error');
      return;
    }
    if (presets.some(p => p.name === presetName.trim())) {
      addToast('این نام قبلا وجود دارد', 'error');
      return;
    }
    const preset: FilterPreset = {
      name: presetName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toLocaleDateString('fa-IR'),
    };
    setPresets(prev => [preset, ...prev]);
    setPresetName('');
    setShowSaveDialog(false);
    addToast(`فیلتر "${preset.name}" ذخیره شد`, 'success');
  }, [presetName, presets, currentFilters, addToast]);

  const handleLoad = useCallback((preset: FilterPreset) => {
    onApply(preset.filters);
    setShowPresets(false);
    addToast(`فیلتر "${preset.name}" اعمال شد`, 'success');
  }, [onApply, addToast]);

  const handleDelete = useCallback((name: string) => {
    setPresets(prev => prev.filter(p => p.name !== name));
    addToast(`فیلتر "${name}" حذف شد`, 'success');
  }, [addToast]);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
      {hasActiveFilters && (
        <button className="btn btn-outline btn-sm" onClick={() => setShowSaveDialog(true)}>
          <i className="ti ti-device-floppy"></i> ذخیره فیلتر
        </button>
      )}

      <button className="btn btn-outline btn-sm" onClick={() => setShowPresets(p => !p)}>
        <i className="ti ti-filter"></i> فیلترهای ذخیره شده
        {presets.length > 0 && (
          <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: 8, marginRight: '0.25rem' }}>
            {presets.length}
          </span>
        )}
      </button>

      {showSaveDialog && (
        <div className="modal-overlay" onClick={() => setShowSaveDialog(false)} style={{ position: 'fixed' }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>ذخیره فیلتر فعلی</h3>
              <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowSaveDialog(false)}></i>
            </div>
            <div className="form-group">
              <label className="form-label">نام فیلتر</label>
              <input type="text" className="form-input" placeholder="مثلا: فاکتورهای اسفند"
                value={presetName} onChange={e => setPresetName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }} />
            </div>
            <button className="btn btn-primary w-100" onClick={handleSave}>
              <i className="ti ti-device-floppy"></i> ذخیره
            </button>
          </div>
        </div>
      )}

      {showPresets && presets.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: '0.5rem',
          minWidth: 280, maxHeight: 350, overflowY: 'auto',
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 600, fontSize: '0.85rem' }}>
            فیلترهای ذخیره شده
          </div>
          {presets.map(preset => (
            <div key={preset.name} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', cursor: 'pointer', transition: 'background 0.2s',
              borderBottom: '1px solid var(--border-color)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              onClick={() => handleLoad(preset)}>
              <i className="ti ti-filter" style={{ opacity: 0.5, fontSize: '1.1rem' }}></i>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{preset.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>ایجاد: {preset.createdAt}</div>
              </div>
              <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.4, fontSize: '1rem' }}
                onClick={e => { e.stopPropagation(); handleDelete(preset.name); }}></i>
            </div>
          ))}
        </div>
      )}

      {showPresets && presets.length === 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, zIndex: 100, marginTop: '0.5rem',
          minWidth: 250,
          background: 'var(--card-bg)', border: '1px solid var(--border-color)',
          borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          padding: '2rem', textAlign: 'center',
        }}>
          <i className="ti ti-filter-off" style={{ fontSize: '1.5rem', opacity: 0.4, marginBottom: '0.75rem', display: 'block' }}></i>
          <p style={{ opacity: 0.6, fontSize: '0.9rem' }}>هنوز فیلتری ذخیره نشده</p>
        </div>
      )}
    </div>
  );
}
