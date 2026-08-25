import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import SearchableSelect from '../SearchableSelect';
import { LayoutGrid, LayoutList, ArrowUpDown, SlidersHorizontal, X, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const DateRangePicker = lazy(() => import('../DateRangePicker'));

export interface LabelsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  filterType: string;
  filterParty: string;
  selectedTagFilter: string | null;
  filterDateFrom: string;
  filterDateTo: string;
  filterAmountMin: string;
  filterAmountMax: string;
  allTypes: string[];
  allParties: string[];
  tags: string[];
  sortBy: string | null;
  sortOrder: string;
  viewMode: string;
  onFilterChange: (patch: {
    filterType?: string;
    filterParty?: string;
    selectedTagFilter?: string | null;
    filterDateFrom?: string;
    filterDateTo?: string;
    filterAmountMin?: string;
    filterAmountMax?: string;
  }) => void;
  onClearFilters: () => void;
  onSort: (field: string) => void;
  onViewModeChange: (m: string) => void;
}

const SORT_FIELDS = [
  { key: 'code', label: 'کد' },
  { key: 'project', label: 'پروژه' },
  { key: 'date', label: 'تاریخ' },
  { key: 'amount', label: 'مبلغ' },
];

export default function LabelsToolbar(props: LabelsToolbarProps) {
  const {
    search, onSearchChange, searchRef,
    filterType, filterParty, selectedTagFilter,
    filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax,
    allTypes, allParties, tags,
    sortBy, sortOrder, viewMode,
    onFilterChange, onClearFilters, onSort, onViewModeChange,
  } = props;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery('max-md');

  const activeCount = [filterType, filterParty, selectedTagFilter, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]
    .filter(v => v !== '' && v !== null).length;

  useEffect(() => {
    if (!filtersOpen) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setFiltersOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filtersOpen]);

  const filterPanel = (
    <div className="lbx-filter-panel">
      <div className="lbx-filter-row">
        <label className="lbx-filter-label">نوع</label>
        <SearchableSelect
          value={filterType}
          options={allTypes}
          onChange={v => onFilterChange({ filterType: v })}
          placeholder="همه انواع"
          className="lbx-filter-select"
        />
      </div>
      <div className="lbx-filter-row">
        <label className="lbx-filter-label">طرف حساب</label>
        <SearchableSelect
          value={filterParty}
          options={allParties}
          onChange={v => onFilterChange({ filterParty: v })}
          placeholder="همه طرف حساب‌ها"
          className="lbx-filter-select"
        />
      </div>
      <div className="lbx-filter-row">
        <label className="lbx-filter-label">تاریخ</label>
        <Suspense fallback={null}>
          <DateRangePicker
            dateFrom={filterDateFrom}
            dateTo={filterDateTo}
            onDateFromChange={d => onFilterChange({ filterDateFrom: d })}
            onDateToChange={d => onFilterChange({ filterDateTo: d })}
          />
        </Suspense>
      </div>
      <div className="lbx-filter-row">
        <label className="lbx-filter-label">مبلغ</label>
        <div className="lbx-amount-range">
          <input
            type="text"
            inputMode="numeric"
            className="ds-input"
            placeholder="حداقل"
            value={filterAmountMin}
            onChange={e => onFilterChange({ filterAmountMin: e.target.value.replace(/[^0-9۰-۹]/g, '') })}
          />
          <span className="lbx-amount-sep">—</span>
          <input
            type="text"
            inputMode="numeric"
            className="ds-input"
            placeholder="حداکثر"
            value={filterAmountMax}
            onChange={e => onFilterChange({ filterAmountMax: e.target.value.replace(/[^0-9۰-۹]/g, '') })}
          />
        </div>
      </div>
      <div className="lbx-filter-foot">
        <button type="button" className="ds-btn ds-btn--sm" onClick={() => setFiltersOpen(false)}>بستن</button>
        {activeCount > 0 && (
          <button type="button" className="ds-btn ds-btn--sm ds-btn--danger lbx-clear-all" onClick={onClearFilters}>
            <X size={13} /> پاک کردن همه ({activeCount})
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="lbx-toolbar">
      <div className="lbx-tb-row">
        <div className="lbx-search">
          <Search size={15} className="lbx-search-icon" aria-hidden="true" />
          <input
            ref={searchRef}
            type="text"
            className="lbx-search-input"
            placeholder="جستجوی کد، پروژه، طرف حساب، برچسب..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            aria-label="جستجوی برچسب‌ها"
          />
          {!isMobile && !search && (
            <kbd className="lbx-kbd" aria-hidden="true">Ctrl K</kbd>
          )}
          {search && (
            <button
              type="button"
              className="lbx-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="پاک کردن جستجو"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="lbx-filter-anchor" ref={popRef}>
          <button
            type="button"
            className={`ds-btn lbx-filter-trigger${activeCount > 0 ? ' has-filters' : ''}`}
            onClick={() => setFiltersOpen(p => !p)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal size={15} />
            فیلترها
            {activeCount > 0 && <span className="lbx-filter-count">{activeCount.toLocaleString('fa-IR')}</span>}
          </button>
          {filtersOpen && (
            isMobile ? (
              <div className="modal-overlay lbx-sheet-overlay" onClick={() => setFiltersOpen(false)}>
                <div className="lbx-bottom-sheet" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  <div className="lbx-sheet-grab" />
                  <h4 className="lbx-sheet-title">فیلترها</h4>
                  {filterPanel}
                </div>
              </div>
            ) : (
              <div className="lbx-popover">{filterPanel}</div>
            )
          )}
        </div>

        <SearchableSelect
          value={filterType}
          options={allTypes}
          onChange={v => onFilterChange({ filterType: v })}
          placeholder="همه انواع"
          className="lbx-inline-select"
        />

        <div className="lbx-viewseg" role="group" aria-label="حالت نمایش">
          <button
            type="button"
            className={viewMode === 'card' ? 'active' : ''}
            onClick={() => onViewModeChange('card')}
            aria-pressed={viewMode === 'card'}
            title="نمای برگه"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            className={viewMode === 'table' ? 'active' : ''}
            onClick={() => onViewModeChange('table')}
            aria-pressed={viewMode === 'table'}
            title="نمای فهرست"
          >
            <LayoutList size={15} />
          </button>
        </div>
      </div>

      <div className="lbx-tb-row lbx-tb-row-secondary">
        {tags.length > 0 && (
          <div className="lbx-tags-scroll">
            {tags.map(tag => (
              <button
                key={tag}
                type="button"
                className={`lbx-tag lbx-tag-btn${selectedTagFilter === tag ? ' active' : ''}`}
                onClick={() => onFilterChange({ selectedTagFilter: selectedTagFilter === tag ? null : tag })}
                aria-pressed={selectedTagFilter === tag}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <div className="lbx-sorts">
            <span className="lbx-sort-caption">
              <ArrowUpDown size={12} />
              مرتب‌سازی
            </span>
            {SORT_FIELDS.map(f => (
              <button
                key={f.key}
                type="button"
                className={`lbx-sort-pill${sortBy === f.key ? ' active' : ''}`}
                onClick={() => onSort(f.key)}
              >
                {f.label}
                {sortBy === f.key && (sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
            ))}
          </div>
        </div>
      </div>
  );
}
