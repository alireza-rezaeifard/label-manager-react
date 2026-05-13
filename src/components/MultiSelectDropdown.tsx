import { useState, useRef, useEffect } from 'react';

export default function MultiSelectDropdown({ options, selected, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.code.toLowerCase().includes(search.toLowerCase())
  );

  const toggleOption = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter(s => s !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const getDisplayText = () => {
    if (selected.length === 0) return 'انتخاب کنید...';
    if (selected.length === 1) return selected[0];
    return `${selected.length} مورد انتخاب شده`;
  };

  return (
    <div className="multi-select-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        className="selected-values"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '0.875rem 1rem',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          background: 'var(--card-bg)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          direction: 'rtl',
        }}
      >
        <span style={{ color: selected.length ? 'var(--text-color)' : 'var(--text-color)', opacity: selected.length ? 1 : 0.5 }}>
          {getDisplayText()}
        </span>
        <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '1rem' }}></i>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu show"
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 10, marginTop: '0.5rem', zIndex: 1000,
            maxHeight: 300, overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            direction: 'rtl',
          }}
        >
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
            <input
              type="text"
              placeholder="جستجو..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="form-input"
              style={{ marginBottom: 0 }}
            />
          </div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color)', opacity: 0.5 }}>
                رکوردی یافت نشد
              </div>
            ) : (
              filteredOptions.map(opt => (
                <div
                  key={opt.code}
                  onClick={() => toggleOption(opt.code)}
                  style={{
                    padding: '0.75rem 1rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: selected.includes(opt.code) ? 'rgba(115, 103, 240, 0.1)' : 'transparent',
                    borderBottom: '1px solid var(--border-color)',
                  }}
                >
                  <div className={`custom-checkbox ${selected.includes(opt.code) ? 'checked' : ''}`}>
                    {selected.includes(opt.code) && <i className="ti ti-check" style={{ fontSize: 12 }}></i>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{opt.code}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{opt.project}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="selected-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
          {selected.map(code => (
            <span
              key={code}
              className="tag"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.35rem 0.75rem', background: 'var(--primary)',
                color: 'white', borderRadius: 6, fontSize: '0.85rem',
                fontFamily: 'monospace',
              }}
            >
              {code}
              <i
                className="ti ti-x"
                style={{ cursor: 'pointer', fontSize: '0.9rem' }}
                onClick={(e) => { e.stopPropagation(); toggleOption(code); }}
              ></i>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
