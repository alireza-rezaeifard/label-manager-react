import { useState, useRef, useEffect, useMemo } from 'react';

interface SearchableSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  dir?: 'ltr' | 'rtl';
  className?: string;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'انتخاب کنید...',
  searchPlaceholder = 'جستجو...',
  emptyText = 'موردی یافت نشد',
  dir = 'rtl',
  className = '',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlight when the search text changes — derived at render time
  // (avoids setState-in-effect cascading renders).
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setHighlightIndex(-1);
  }

  const selectOption = (opt: string) => {
    onChange(opt);
    setIsOpen(false);
    setSearch('');
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightIndex >= 0 && highlightIndex < filtered.length) {
          selectOption(filtered[highlightIndex]);
        } else if (filtered.length === 1) {
          selectOption(filtered[0]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSearch('');
        setHighlightIndex(-1);
        break;
    }
  };

  const displayText = value || placeholder;
  const hasValue = !!value;

  return (
    <div
      ref={containerRef}
      className={`searchable-select ${className}`}
      style={{ position: 'relative' }}
      onKeyDown={handleKeyDown}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '1rem 1.25rem',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          background: 'var(--card-bg)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          direction: dir,
          transition: 'all 0.2s ease',
          minHeight: '48px',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)';
        }}
        onMouseLeave={e => {
          if (!isOpen) (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-color)';
        }}
      >
        <span style={{
          color: 'var(--text-color)',
          opacity: hasValue ? 1 : 0.5,
          fontSize: '0.95rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {displayText}
        </span>
        <i
          className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`}
          style={{ fontSize: '1rem', opacity: 0.5, marginRight: dir === 'rtl' ? 0 : '0.5rem', marginLeft: dir === 'rtl' ? '0.5rem' : 0, flexShrink: 0 }}
        ></i>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          marginTop: '0.375rem',
          zIndex: 1000,
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          direction: dir,
          animation: 'dropdownFadeIn 0.15s ease',
        }}>
          {options.length > 5 && (
            <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-search" style={{
                  position: 'absolute',
                  left: dir === 'rtl' ? undefined : '0.75rem',
                  right: dir === 'rtl' ? '0.75rem' : undefined,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  opacity: 0.4,
                  fontSize: '0.9rem',
                }}></i>
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 2.25rem 0.6rem 0.75rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    background: 'var(--bg-body)',
                    color: 'var(--text-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    direction: dir,
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                />
              </div>
            </div>
          )}

          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-color)', opacity: 0.4, fontSize: '0.85rem' }}>
                {emptyText}
              </div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt === value;
                const isHighlighted = i === highlightIndex;
                return (
                  <div
                    key={opt}
                    onClick={() => selectOption(opt)}
                    style={{
                      padding: '0.7rem 1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isHighlighted
                        ? 'rgba(115, 103, 240, 0.1)'
                        : isSelected
                          ? 'rgba(115, 103, 240, 0.06)'
                          : 'transparent',
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isHighlighted) {
                        e.currentTarget.style.background = 'rgba(115, 103, 240, 0.06)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isHighlighted) {
                        e.currentTarget.style.background = isSelected ? 'rgba(115, 103, 240, 0.06)' : 'transparent';
                      }
                    }}
                  >
                    {isSelected && (
                      <i className="ti ti-check" style={{ color: 'var(--primary)', fontSize: '0.9rem', flexShrink: 0 }}></i>
                    )}
                    <span style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-color)',
                      fontWeight: isSelected ? 600 : 400,
                    }}>
                      {opt}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
