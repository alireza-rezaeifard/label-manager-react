import { useState, useRef, useEffect, useMemo, useCallback } from "react";

const PERSIAN_NORMALIZE: Record<string, string> = {
  'ي': 'ی', 'ك': 'ک', 'ة': 'ه', 'إ': 'ا', 'أ': 'ا', 'آ': 'ا',
  'ؤ': 'و', 'ئ': 'ی', 'ۀ': 'ه', 'ۆ': 'و', 'ێ': 'ی',
};

function normalize(s: string): string {
  let r = '';
  for (const ch of s) {
    r += PERSIAN_NORMALIZE[ch] || ch;
  }
  return r.toLowerCase();
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  suggestions: string[];
  placeholder?: string;
  error?: string;
  style?: React.CSSProperties;
  className?: string;
  dir?: string;
}

export default function AutocompleteInput({
  value, onChange, onBlur, suggestions, placeholder, error, style, className, dir,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!value) return [];
    const nv = normalize(value);
    if (!nv) return [];
    return suggestions.filter(s => {
      const ns = normalize(s);
      return ns.includes(nv) || ns.startsWith(nv);
    }).slice(0, 20);
  }, [value, suggestions]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
    setFocusedIdx(-1);
  }, [onChange]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setFocusedIdx(-1);
    inputRef.current?.focus();
  }, [onChange]);

  useEffect(() => {
    if (!open) setFocusedIdx(-1);
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIdx(i => Math.min(i + 1, filtered.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIdx(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIdx >= 0 && focusedIdx < filtered.length) {
          handleSelect(filtered[focusedIdx]);
        }
        break;
      case 'Escape':
        setOpen(false);
        break;
    }
  }, [open, filtered, focusedIdx, handleSelect]);

  useEffect(() => {
    if (focusedIdx >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[focusedIdx]) {
        (items[focusedIdx] as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIdx]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBlur = useCallback(() => {
    // Delay to allow suggestion click
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setOpen(false);
        onBlur?.();
      }
    }, 180);
  }, [onBlur]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        className={className + (error ? ' error' : '')}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (value) setOpen(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{ ...style, width: '100%' }}
        dir={dir || 'auto'}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
            background: 'var(--card-bg, #1e1e2f)',
            border: '1px solid var(--border-color, #2d2d44)',
            borderRadius: '0 0 8px 8px',
            maxHeight: '220px', overflowY: 'auto',
            boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
          }}
        >
          {filtered.map((s, i) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              onMouseEnter={() => setFocusedIdx(i)}
              style={{
                padding: '8px 12px', cursor: 'pointer', direction: 'ltr', textAlign: 'left',
                background: i === focusedIdx ? 'var(--hover-bg, #2a2a45)' : 'transparent',
                color: i === focusedIdx ? 'var(--primary, #0f766e)' : 'var(--text, #e0e0e0)',
                fontSize: '0.875rem', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color, #2d2d44)' : 'none',
                transition: 'background 0.1s',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
