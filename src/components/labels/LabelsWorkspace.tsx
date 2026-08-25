import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Printer, Settings, FileSpreadsheet, FileText, MoreHorizontal,
  ScanLine, CloudDownload, Hash, CheckSquare, Square, Tags, SearchX,
  Scissors, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import LabelsToolbar from './LabelsToolbar';
import LabelStub from './LabelStub';
import LabelLedgerRow from './LabelLedgerRow';
import LabelDetailDrawer from './LabelDetailDrawer';
import { LabelsSkeleton } from './LabelsSkeleton';
import { faNum } from './shared';
import { getTotalAmount } from '../../utils/formatters';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { RecordItem, CustomField } from '../../types';

export interface FiltersPatch {
  type?: string;
  party?: string;
  tag?: string | null;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
}

export interface LabelsWorkspaceProps {
  records: RecordItem[];
  sortedRecords: RecordItem[];
  pagedRecords: RecordItem[];
  safePage: number;
  totalPages: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  selected: Set<number>;
  onToggleSelect: (index: number) => void;
  onToggleAll: () => void;
  search: string;
  onSearchChange: (v: string) => void;
  sortBy: string | null;
  sortOrder: string;
  onSort: (field: string) => void;
  filters: {
    type: string;
    party: string;
    tag: string | null;
    dateFrom: string;
    dateTo: string;
    amountMin: string;
    amountMax: string;
  };
  onFiltersChange: (patch: FiltersPatch) => void;
  onClearFilters: () => void;
  allTypes: string[];
  allParties: string[];
  tags: string[];
  customFields: CustomField[];
  enabledCustomFieldKeys: string[];
  viewMode: string;
  setViewMode: (m: string) => void;
  serverLoading: boolean;
  isViewer: boolean;
  recordToIndex: Map<RecordItem, number>;
  findRelated: (codes: string[]) => RecordItem[];
  onView: (index: number) => void;
  onEdit: (index: number) => void;
  onToggleFavorite?: (index: number) => void;
  onExcel: () => void;
  onCSVExport: () => void;
  onPDF: () => void;
  onPrint: () => void;
  onShowPrintSettings: () => void;
  paperEstimator: (count: number, cols: number) => number;
  printCols: number;
  onShowPrintQueue: () => void;
  onShowScanner: () => void;
  onShowBackup: () => void;
  onShowTaxBookExport: () => void;
  onAuthAction: () => void;
  authActionLabel: string;
  onTabChange: (tab: string) => void;
}

export default function LabelsWorkspace(props: LabelsWorkspaceProps) {
  const {
    records, sortedRecords, pagedRecords,
    safePage, totalPages, setPage,
    selected, onToggleSelect, onToggleAll,
    search, onSearchChange,
    sortBy, sortOrder, onSort,
    filters, onFiltersChange, onClearFilters,
    allTypes, allParties, tags,
    customFields, enabledCustomFieldKeys,
    viewMode, setViewMode,
    serverLoading, isViewer,
    recordToIndex, findRelated,
    onView, onEdit, onToggleFavorite,
    onExcel, onCSVExport, onPDF, onPrint,
    onShowPrintSettings,
    paperEstimator, printCols,
    onShowPrintQueue, onShowScanner, onShowBackup, onShowTaxBookExport,
    onAuthAction, authActionLabel,
    onTabChange,
  } = props;

  const [drawerCode, setDrawerCode] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const isMobileSheet = useMediaQuery('max-md');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const enabledFieldsList = useMemo(
    () => customFields.filter(f => enabledCustomFieldKeys.includes(f.key)),
    [customFields, enabledCustomFieldKeys]
  );

  const hasActiveFilters = useMemo(
    () => [filters.type, filters.party, filters.tag, filters.dateFrom, filters.dateTo, filters.amountMin, filters.amountMax]
      .some(v => v !== '' && v !== null),
    [filters]
  );

  const allFilteredSelected = sortedRecords.length > 0 && sortedRecords.every(r => {
    const idx = recordToIndex.get(r);
    return idx !== undefined && selected.has(idx);
  });

  const drawerRecord = useMemo(
    () => (drawerCode ? records.find(r => r.code === drawerCode) ?? null : null),
    [records, drawerCode]
  );
  const drawerIndex = drawerRecord ? recordToIndex.get(drawerRecord) ?? null : null;
  const paperCount = paperEstimator(selected.size > 0 ? selected.size : records.length, printCols);

  const openRelated = (code: string) => {
    setDrawerCode(code);
  };

  return (
    <div className="lbx fade-in">
      <header className="lbx-head">
        <div className="lbx-head-main">
          <span className="ds-page-eyebrow">
            <Printer size={12} />
            پیش‌نمایش چاپ
          </span>
          <h1 className="ds-page-title">برچسب‌ها</h1>
          <p className="ds-page-desc">مدیریت و مشاهده برچسب‌های فضای کاری</p>
        </div>

        <div className="lbx-rule" aria-hidden="true" />

        <div className="lbx-head-actions">
          <button type="button" className="btn btn-outline btn-sm lbx-hide-sm" onClick={onToggleAll}
            disabled={sortedRecords.length === 0}>
            {allFilteredSelected ? <Square size={14} /> : <CheckSquare size={14} />}
            {allFilteredSelected ? 'لغو انتخاب' : 'انتخاب نتایج'}
          </button>
          <button type="button" className="btn btn-outline btn-sm lbx-hide-sm" onClick={onShowPrintSettings}>
            <Settings size={14} /> تنظیمات چاپ
          </button>
          <button type="button" className="btn btn-outline btn-sm lbx-hide-md" onClick={onExcel} disabled={selected.size === 0}>
            <FileSpreadsheet size={14} /> اکسل
          </button>
          <button type="button" className="btn btn-outline btn-sm lbx-hide-md" onClick={onCSVExport} disabled={selected.size === 0}>
            <FileText size={14} /> CSV
          </button>
          <button type="button" className="btn btn-outline btn-sm lbx-hide-md" onClick={onPDF} disabled={sortedRecords.length === 0}>
            <FileText size={14} /> PDF
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onPrint}
            disabled={records.length === 0}
            title={selected.size === 0 ? 'بدون انتخاب، همه برچسب‌ها چاپ می‌شوند' : undefined}
          >
            <Printer size={14} />
            {selected.size > 0
              ? <>چاپ {faNum(selected.size)} برچسب <span className="lbx-paper-hint">≈ {faNum(paperCount)} برگ</span></>
              : <>چاپ همه ({faNum(records.length)})</>}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="btn btn-outline btn-sm lbx-more-btn" aria-label="گزینه‌های بیشتر">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>ابزارها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange('history')}>
                <Hash className="h-4 w-4" /> تاریخچه چاپ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowPrintQueue}>
                <Printer className="h-4 w-4" /> صف چاپ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowScanner}>
                <ScanLine className="h-4 w-4" /> اسکن QR
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onShowBackup}>
                <CloudDownload className="h-4 w-4" /> پشتیبان‌گیری
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShowTaxBookExport}>
                <FileSpreadsheet className="h-4 w-4" /> خروجی دفتر مالی
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onAuthAction}>{authActionLabel}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="lbx-statsbar" aria-label="آمار برچسب‌ها">
        <div className="ds-stats">
          <div className="ds-stat">
            <div className="ds-stat-value">{faNum(records.length)}</div>
            <div className="ds-stat-label">مجموع برچسب‌ها</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value">{faNum(sortedRecords.length)}</div>
            <div className="ds-stat-label">نتایج فعلی</div>
          </div>
          <div className={`ds-stat${selected.size > 0 ? ' lbx-stat-active' : ''}`}>
            <div className="ds-stat-value">{faNum(selected.size)}</div>
            <div className="ds-stat-label">انتخاب‌شده برای چاپ</div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat-value" dir="ltr">{getTotalAmount(sortedRecords)}</div>
            <div className="ds-stat-label">جمع مبلغ نتایج</div>
          </div>
        </div>
      </section>

      <LabelsToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchRef={searchRef}
        filterType={filters.type}
        filterParty={filters.party}
        selectedTagFilter={filters.tag}
        filterDateFrom={filters.dateFrom}
        filterDateTo={filters.dateTo}
        filterAmountMin={filters.amountMin}
        filterAmountMax={filters.amountMax}
        allTypes={allTypes}
        allParties={allParties}
        tags={tags}
        sortBy={sortBy}
        sortOrder={sortOrder}
        viewMode={viewMode}
        onFilterChange={(patch) => onFiltersChange({
          type: patch.filterType,
          party: patch.filterParty,
          tag: patch.selectedTagFilter,
          dateFrom: patch.filterDateFrom,
          dateTo: patch.filterDateTo,
          amountMin: patch.filterAmountMin,
          amountMax: patch.filterAmountMax,
        })}
        onClearFilters={onClearFilters}
        onSort={onSort}
        onViewModeChange={setViewMode}
      />

      {serverLoading && records.length === 0 ? (
        <LabelsSkeleton />
      ) : records.length === 0 ? (
        <div className="lbx-empty">
          <div className="lbx-empty-seal">
            <Tags size={26} />
            <span className="lbx-empty-halo" />
          </div>
          <div className="lbx-empty-ornament" aria-hidden="true">◆ ◆ ◆</div>
          <h3 className="lbx-empty-title">هنوز برچسبی ایجاد نشده</h3>
          <p className="lbx-empty-desc">
            برچسب‌ها همان رکوردهای شما هستند؛ با ساخت اولین رکورد، برگهٔ چاپ برچسب‌ها آماده می‌شود.
          </p>
          {!isViewer && (
            <div className="lbx-empty-actions">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => onTabChange('add')}>
                ساخت اولین رکورد
              </button>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onTabChange('import')}>
                ورود از CSV
              </button>
            </div>
          )}
        </div>
      ) : sortedRecords.length === 0 ? (
        <div className="lbx-empty">
          <div className="lbx-empty-seal lbx-empty-muted">
            <SearchX size={26} />
          </div>
          <div className="lbx-empty-ornament" aria-hidden="true">◆ ◆ ◆</div>
          <h3 className="lbx-empty-title">نتیجه‌ای پیدا نشد</h3>
          <p className="lbx-empty-desc">هیچ برچسبی با جستجو یا فیلترهای فعلی مطابقت ندارد.</p>
          <div className="lbx-empty-actions">
            {search && (
              <button type="button" className="btn btn-outline btn-sm" onClick={() => onSearchChange('')}>
                پاک کردن جستجو
              </button>
            )}
            {hasActiveFilters && (
              <button type="button" className="btn btn-outline btn-sm" onClick={onClearFilters}>
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </div>
      ) : viewMode === 'table' ? (
        <div className="lbx-listwrap" id="preview-grid">
          <div className="lbx-list" role="grid" aria-label="فهرست برچسب‌ها">
            <div className="lbx-lhead" role="row">
              <span />
              <span>کد</span>
              <span>پروژه</span>
              <span>نوع</span>
              <span>تاریخ</span>
              <span>طرف حساب</span>
              <button type="button" className={`lbx-lsort${sortBy === 'amount' ? ' active' : ''}`} onClick={() => onSort('amount')}>
                مبلغ{sortBy === 'amount' && (sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
              </button>
              <span>برچسب</span>
              <span />
            </div>
            {pagedRecords.map(r => {
              const idx = recordToIndex.get(r);
              if (idx === undefined) return null;
              return (
                <LabelLedgerRow
                  key={r.id ?? `idx-${idx}`}
                  record={r}
                  selected={selected.has(idx)}
                  searchQuery={search}
                  onToggle={() => onToggleSelect(idx)}
                  onView={() => onView(idx)}
                  onEdit={() => onEdit(idx)}
                  onOpenDetails={() => setDrawerCode(r.code)}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="lbx-sheet" id="preview-grid">
          <span className="lbx-mark lbx-mark-a" aria-hidden="true" />
          <span className="lbx-mark lbx-mark-b" aria-hidden="true" />
          <span className="lbx-mark lbx-mark-c" aria-hidden="true" />
          <span className="lbx-mark lbx-mark-d" aria-hidden="true" />
          <div className="lbx-cut" aria-hidden="true">
            <Scissors size={13} />
            <span className="lbx-cut-line" />
          </div>
          <div className="lbx-grid">
            {pagedRecords.map(r => {
              const idx = recordToIndex.get(r);
              if (idx === undefined) return null;
              return (
                <LabelStub
                  key={r.id ?? `idx-${idx}`}
                  record={r}
                  selected={selected.has(idx)}
                  customFields={enabledFieldsList}
                  searchQuery={search}
                  onToggle={() => onToggleSelect(idx)}
                  onView={() => onView(idx)}
                  onEdit={() => onEdit(idx)}
                  onOpenDetails={() => setDrawerCode(r.code)}
                  onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(idx) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {totalPages > 1 && sortedRecords.length > 0 && (
        <div className="lbx-pagination">
          <div className="lbx-pager">
            <button type="button" className="lbx-pg-btn" disabled={safePage <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))} aria-label="صفحه قبل">
              <ChevronRight size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 20) }, (_, i) => i + 1).map(p => (
              <button key={p} type="button"
                className={`lbx-pg-btn${p === safePage ? ' active' : ''}`}
                onClick={() => setPage(p)}>
                <span className="lbx-pg-num">{p}</span>
              </button>
            ))}
            <button type="button" className="lbx-pg-btn" disabled={safePage >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} aria-label="صفحه بعد">
              <ChevronLeft size={15} />
            </button>
          </div>
          <span className="lbx-pg-info">
            صفحهٔ {faNum(safePage)} از {faNum(totalPages)} · {faNum(sortedRecords.length)} برچسب
          </span>
        </div>
      )}

      <LabelDetailDrawer
        record={drawerRecord}
        index={drawerIndex}
        selected={drawerIndex !== null && selected.has(drawerIndex)}
        isFavorite={!!drawerRecord?.is_favorite}
        customFields={customFields}
        enabledCustomFieldKeys={enabledCustomFieldKeys}
        relatedRecords={drawerRecord ? findRelated(drawerRecord.related) : []}
        isMobileSheet={isMobileSheet}
        isViewer={isViewer}
        onClose={() => setDrawerCode(null)}
        onToggleSelect={onToggleSelect}
        onView={(i) => { setDrawerCode(null); onView(i); }}
        onEdit={(i) => { setDrawerCode(null); onEdit(i); }}
        onOpenRelated={openRelated}
        onToggleFavorite={onToggleFavorite}
      />

      <style>{`
        .lbx { display: flex; flex-direction: column; gap: 1rem; }

        .lbx-head { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
        .lbx-head-main { min-width: 0; }
        .lbx-head-main .ds-page-desc { max-width: none; }
        .lbx-rule {
          flex: 1 1 90px; height: 1px; min-width: 70px; align-self: center; position: relative;
          background: linear-gradient(to left, var(--border-color), var(--border-color) 85%, transparent);
        }
        .lbx-rule::after {
          content: '◆'; position: absolute; inset-inline-end: -3px; top: 50%;
          transform: translateY(-52%); font-size: 6px; color: var(--accent-gold, #c9a227); opacity: 0.9;
        }
        .lbx-head-actions { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-inline-start: auto; }
        .lbx-head-actions .btn { padding: 0.45rem 0.8rem; font-size: 0.8125rem; gap: 0.35rem; }
        .lbx-head-actions .btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .lbx-paper-hint { opacity: 0.75; font-size: 0.6875rem; font-weight: 500; }
        .lbx-more-btn { padding: 0.45rem 0.55rem !important; }

        .lbx-statsbar {
          background: var(--card-bg); border: 1px solid var(--border-color);
          border-radius: 14px; padding: 0.85rem 1.25rem;
        }
        .lbx-stat-active .ds-stat-value { color: var(--primary); }

        .lbx-toolbar {
          background: var(--card-bg); border: 1px solid var(--border-color);
          border-radius: 14px; padding: 0.7rem 0.9rem;
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .lbx-tb-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        .lbx-tb-row-secondary { justify-content: space-between; border-top: 1px dashed var(--border-color); padding-top: 0.6rem; }

        .lbx-search { position: relative; flex: 1 1 250px; min-width: 190px; }
        .lbx-search-input {
          width: 100%; padding: 0.6rem 2.5rem 0.6rem 2.4rem;
          border: 1px solid var(--border-color); border-radius: 10px;
          background: var(--bg-body); color: var(--text-color);
          font-size: 0.8438rem; font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .lbx-search-input:focus {
          outline: none; border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
        }
        .lbx-search-input::placeholder { color: var(--text-color); opacity: 0.35; }
        .lbx-search > .lbx-search-icon {
          position: absolute; inset-inline-start: 0.8rem; top: 50%; transform: translateY(-50%);
          opacity: 0.4; pointer-events: none; color: var(--text-color);
        }
        .lbx-kbd {
          position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%);
          font-family: ui-monospace, Consolas, monospace; font-size: 0.5938rem;
          color: var(--text-color); opacity: 0.45;
          border: 1px solid var(--border-color); border-radius: 4px; padding: 0.05rem 0.3rem;
          pointer-events: none; direction: ltr;
        }
        .lbx-search-clear {
          position: absolute; inset-inline-end: 0.55rem; top: 50%; transform: translateY(-50%);
          display: inline-flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 6px;
          border: none; background: var(--hover-bg); color: var(--text-color);
          opacity: 0.6; cursor: pointer;
        }
        .lbx-search-clear:hover { opacity: 1; color: var(--danger); }
        .lbx-search:has(.lbx-search-clear) .lbx-kbd { display: none; }

        .lbx-filter-anchor { position: relative; }
        .lbx-filter-trigger.has-filters { border-color: color-mix(in srgb, var(--accent-gold, #c9a227) 55%, transparent); }
        .lbx-filter-count {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 17px; height: 17px; padding: 0 4px; border-radius: 9px;
          background: var(--accent-gold, #c9a227); color: #fff;
          font-size: 0.6563rem; font-weight: 700;
        }
        .lbx-popover {
          position: absolute; top: calc(100% + 8px); inset-inline-start: 0; z-index: 80;
          width: min(360px, 88vw); background: var(--card-bg);
          border: 1px solid var(--border-color); border-radius: 13px; padding: 1rem;
          box-shadow: var(--shadow-elevation-lg, 0 20px 25px -5px rgb(0 0 0 / 15%));
        }
        .lbx-filter-row { margin-bottom: 0.8rem; }
        .lbx-filter-row:last-of-type { margin-bottom: 0.6rem; }
        .lbx-filter-label {
          display: block; font-size: 0.7188rem; font-weight: 700;
          color: var(--text-color); opacity: 0.55; margin-bottom: 0.35rem;
        }
        .lbx-filter-select { width: 100%; }
        .lbx-amount-range { display: flex; align-items: center; gap: 0.4rem; }
        .lbx-amount-range .ds-input { direction: ltr; text-align: start; }
        .lbx-amount-sep { opacity: 0.35; }
        .lbx-filter-foot { display: flex; justify-content: space-between; gap: 0.5rem; }
        .lbx-sheet-overlay { align-items: flex-end; }
        .lbx-bottom-sheet {
          width: 100%; max-height: 86dvh; overflow-y: auto;
          background: var(--card-bg); border-radius: 16px 16px 0 0;
          padding: 0.6rem 1.1rem 1.3rem;
        }
        .lbx-sheet-grab {
          width: 42px; height: 4px; border-radius: 2px; margin: 0.35rem auto 0.7rem;
          background: var(--border-color);
        }
        .lbx-sheet-title { margin: 0 0 0.9rem; font-size: 0.9375rem; font-weight: 700; }

        .lbx-inline-select { width: 158px; flex-shrink: 0; }

        .lbx-viewseg {
          display: inline-flex; border: 1px solid var(--border-color);
          border-radius: 9px; overflow: hidden; flex-shrink: 0;
        }
        .lbx-viewseg button {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 32px; border: none; cursor: pointer;
          background: transparent; color: var(--text-color); opacity: 0.5;
          transition: all 0.15s ease;
        }
        .lbx-viewseg button:hover { opacity: 0.85; }
        .lbx-viewseg button.active { background: var(--primary); color: #fff; opacity: 1; }
        .lbx-viewseg button:focus-visible { outline: 2px solid var(--primary); outline-offset: -3px; }
        .lbx-viewseg button + button { border-inline-start: 1px solid var(--border-color); }

        .lbx-tags-scroll { display: flex; gap: 0.3rem; flex-wrap: wrap; align-items: center; flex: 1 1 auto; min-width: 140px; }
        .lbx-tag {
          display: inline-flex; align-items: center;
          padding: 0.14rem 0.55rem; border-radius: 6px;
          font-size: 0.6563rem; font-weight: 600;
          background: color-mix(in srgb, var(--primary) 7%, transparent);
          color: var(--primary); white-space: nowrap;
        }
        .lbx-tag-btn {
          border: 1px solid transparent; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .lbx-tag-btn:hover { border-color: color-mix(in srgb, var(--primary) 40%, transparent); }
        .lbx-tag-btn.active {
          background: var(--primary); color: #fff;
          border-color: var(--primary);
        }
        .lbx-tag-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .lbx-tag-more { font-size: 0.5938rem; opacity: 0.5; font-weight: 600; }
        .lbx-tags-row { display: inline-flex; gap: 0.28rem; flex-wrap: wrap; align-items: center; min-width: 0; }

        .lbx-sorts { display: inline-flex; gap: 0.3rem; align-items: center; flex-wrap: wrap; margin-inline-start: auto; }
        .lbx-sort-caption {
          display: inline-flex; align-items: center; gap: 0.3rem;
          font-size: 0.6875rem; font-weight: 600; color: var(--text-color); opacity: 0.45; white-space: nowrap;
        }
        .lbx-sort-pill {
          display: inline-flex; align-items: center; gap: 0.2rem;
          padding: 0.3rem 0.65rem; border-radius: 6px;
          border: 1px solid var(--border-color); background: transparent;
          color: var(--text-color); font-size: 0.7188rem; font-weight: 500;
          font-family: inherit; cursor: pointer; opacity: 0.6;
          transition: all 0.15s ease;
        }
        .lbx-sort-pill:hover { opacity: 0.9; border-color: var(--primary); color: var(--primary); }
        .lbx-sort-pill.active {
          background: var(--primary); color: #fff; border-color: var(--primary); opacity: 1;
        }
        .lbx-sort-pill:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }

        .lbx-sheet {
          position: relative;
          background: color-mix(in srgb, var(--hover-bg) 30%, transparent);
          border: 1px dashed var(--border-color); border-radius: 16px;
          padding: 0.6rem 0.9rem 0.9rem;
        }
        .lbx-cut {
          display: flex; align-items: center; gap: 0.55rem;
          color: var(--text-color); opacity: 0.35; padding: 0.35rem 0.15rem 0.55rem;
          font-size: 0.8125rem;
        }
        .lbx-cut-line {
          flex: 1; height: 0; border-top: 1.5px dashed var(--border-color);
        }
        .lbx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
          gap: 0.95rem;
        }
        .lbx-mark { position: absolute; width: 13px; height: 13px; pointer-events: none; opacity: 0.6; }
        .lbx-mark-a { top: 6px; inset-inline-start: 6px; border-top: 2px solid var(--accent-gold, #c9a227); border-inline-start: 2px solid var(--accent-gold, #c9a227); border-start-start-radius: 4px; }
        .lbx-mark-b { top: 6px; inset-inline-end: 6px; border-top: 2px solid var(--accent-gold, #c9a227); border-inline-end: 2px solid var(--accent-gold, #c9a227); border-start-end-radius: 4px; }
        .lbx-mark-c { bottom: 6px; inset-inline-start: 6px; border-bottom: 2px solid var(--accent-gold, #c9a227); border-inline-start: 2px solid var(--accent-gold, #c9a227); border-end-start-radius: 4px; }
        .lbx-mark-d { bottom: 6px; inset-inline-end: 6px; border-bottom: 2px solid var(--accent-gold, #c9a227); border-inline-end: 2px solid var(--accent-gold, #c9a227); border-end-end-radius: 4px; }

        .lbx-stub {
          display: flex; flex-direction: column; min-width: 0;
          background: var(--card-bg);
          border: 1.5px dashed var(--border-color); border-radius: 14px;
          cursor: pointer;
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
          will-change: transform;
        }
        .lbx-stub:hover {
          transform: translateY(-3px);
          box-shadow: var(--card-shadow-hover);
          border-color: color-mix(in srgb, var(--primary) 45%, var(--border-color));
        }
        .lbx-stub:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .lbx-stub.selected {
          border-style: solid; border-color: var(--primary);
          box-shadow: var(--card-shadow-selected);
        }
        .lbx-stub.selected:hover { box-shadow: var(--card-shadow-selected-hover); }

        .lbx-stub-head { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.9rem 0.5rem; }
        .lbx-code-btn {
          cursor: pointer; max-width: 60%;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .lbx-code-btn:hover { border-color: var(--primary); }
        .lbx-stub.selected .code-badge.lbx-code-btn { background: color-mix(in srgb, var(--primary) 10%, transparent); }
        .lbx-head-tools { display: inline-flex; align-items: center; gap: 0.15rem; margin-inline-start: auto; }
        .lbx-lock { color: var(--warning); flex-shrink: 0; }
        .lbx-star {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px;
          border: none; background: transparent; cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .lbx-star:hover { background: var(--hover-bg); transform: scale(1.08); }
        .lbx-star:focus-visible { outline: 2px solid var(--primary); }
        .lbx-star-lg { position: static; width: 30px; height: 30px; }
        .lbx-info-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 26px; height: 26px; border-radius: 7px;
          border: none; background: transparent; color: var(--text-color);
          opacity: 0.4; cursor: pointer;
          transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
        }
        .lbx-info-btn:hover { opacity: 1; background: var(--hover-bg); color: var(--primary); }
        .lbx-info-btn:focus-visible { outline: 2px solid var(--primary); }

        .lbx-rule { margin: 0 0.9rem; flex: none; min-width: 0; }

        .lbx-stub-body { flex: 1; display: flex; flex-direction: column; gap: 0.42rem; padding: 0.7rem 0.9rem 0.75rem; }
        .lbx-eyebrow {
          display: flex; align-items: center; gap: 0.4rem; min-width: 0;
          font-size: 0.6563rem; font-weight: 700; letter-spacing: 0.05em;
          color: var(--primary); opacity: 0.9;
        }
        .lbx-eyebrow-dot { opacity: 0.5; }
        .lbx-eyebrow-proj {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          color: var(--text-color); opacity: 0.55;
        }
        .lbx-amount {
          font-size: 1.1875rem; font-weight: 800; letter-spacing: -0.01em;
          color: var(--primary); font-variant-numeric: tabular-nums;
          text-align: start; line-height: 1.2;
        }
        .lbx-party {
          font-size: 0.875rem; font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lbx-meta {
          display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
          font-size: 0.7188rem; opacity: 0.6; flex-wrap: wrap;
        }
        .lbx-meta-cf { display: inline-flex; gap: 0.55rem; }
        .lbx-cf-pair { display: inline-flex; gap: 0.25rem; align-items: baseline; }
        .lbx-cf-key { font-size: 0.625rem; opacity: 0.7; }

        .lbx-stub-foot {
          display: flex; gap: 0.5rem;
          padding: 0.6rem 0.9rem;
          border-top: 1px dashed var(--border-color);
        }

        .lbx-listwrap {
          background: var(--card-bg); border: 1px solid var(--border-color);
          border-radius: 14px; overflow-x: auto;
        }
        .lbx-list { min-width: 940px; }
        .lbx-lhead, .lbx-lrow {
          display: grid;
          grid-template-columns: 34px 185px 1.05fr 0.6fr 92px 1.05fr 128px minmax(100px, 0.8fr) 72px;
          gap: 0.6rem; align-items: center;
          padding: 0.55rem 0.95rem;
        }
        .lbx-lhead {
          font-size: 0.6563rem; font-weight: 700; letter-spacing: 0.04em;
          color: var(--text-color); opacity: 0.5;
          border-bottom: 1px solid var(--border-color);
          background: color-mix(in srgb, var(--hover-bg) 40%, var(--card-bg));
        }
        .lbx-lrow {
          border-bottom: 1px dashed var(--border-color);
          cursor: pointer; transition: background 0.12s ease;
        }
        .lbx-lrow:last-child { border-bottom: none; }
        .lbx-lrow:hover { background: var(--hover-bg); }
        .lbx-lrow.selected {
          background: color-mix(in srgb, var(--primary) 7%, var(--card-bg));
        }
        [dir='rtl'] .lbx-lrow.selected { box-shadow: inset -3px 0 0 var(--primary); }
        [dir='ltr'] .lbx-lrow.selected { box-shadow: inset 3px 0 0 var(--primary); }
        .lbx-lrow:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
        .lbx-cell { font-size: 0.8125rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lbx-dim { opacity: 0.6; font-size: 0.7813rem; }
        .lbx-cell-amt {
          font-size: 0.8438rem; font-weight: 800; color: var(--primary);
          font-variant-numeric: tabular-nums; text-align: start;
        }
        .lbx-lsort {
          display: inline-flex; align-items: center; gap: 0.15rem;
          border: none; background: transparent; cursor: pointer;
          font: inherit; color: inherit; letter-spacing: inherit; padding: 0;
        }
        .lbx-lsort:hover, .lbx-lsort.active { color: var(--primary); opacity: 1; }
        .lbx-row-actions { display: inline-flex; align-items: center; gap: 0.2rem; justify-content: flex-end; }
        .lbx-icon-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 27px; height: 27px; border-radius: 7px;
          border: none; background: transparent; color: var(--text-color);
          opacity: 0.45; cursor: pointer;
          transition: all 0.13s ease;
        }
        .lbx-icon-btn:hover { opacity: 1; background: var(--hover-bg); color: var(--primary); }
        .lbx-icon-btn:focus-visible { opacity: 1; outline: 2px solid var(--primary); outline-offset: 1px; }

        .lbx-pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 1.1rem; padding-top: 0.35rem; flex-wrap: wrap;
        }
        .lbx-pager {
          display: flex; align-items: center; gap: 0.2rem;
          background: var(--card-bg); border: 1px solid var(--border-color);
          border-radius: 10px; padding: 0.25rem;
        }
        .lbx-pg-btn {
          display: flex; align-items: center; justify-content: center;
          min-width: 34px; height: 31px; padding: 0 0.35rem;
          border-radius: 7px; border: none; background: transparent;
          color: var(--text-color); font-size: 0.8125rem; font-family: inherit;
          cursor: pointer; transition: all 0.15s ease;
        }
        .lbx-pg-btn:hover:not(:disabled):not(.active) { background: var(--hover-bg); }
        .lbx-pg-btn.active {
          background: var(--primary); color: #fff;
          box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .lbx-pg-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        .lbx-pg-num { font-family: Georgia, serif; font-weight: 600; font-size: 0.75rem; }

        .lbx-empty {
          text-align: center; padding: 3.5rem 2rem;
          background: var(--card-bg); border: 1px dashed var(--border-color); border-radius: 16px;
        }
        .lbx-empty-seal {
          position: relative; width: 74px; height: 74px; border-radius: 50%;
          margin: 0 auto 0.9rem; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--primary), var(--accent-gold, #c9a227));
          color: #fff; box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 25%, transparent);
        }
        .lbx-empty-seal.lbx-empty-muted {
          background: var(--hover-bg); color: var(--text-color); box-shadow: none; opacity: 0.7;
        }
        .lbx-empty-halo {
          position: absolute; inset: -6px; border-radius: 50%;
          border: 1.5px dashed color-mix(in srgb, var(--accent-gold, #c9a227) 55%, transparent);
        }
        .lbx-empty-ornament {
          color: var(--accent-gold, #c9a227); opacity: 0.4;
          font-size: 0.5625rem; letter-spacing: 0.6em; margin-bottom: 0.8rem;
        }
        .lbx-empty-title { margin: 0 0 0.4rem; font-size: 1.125rem; font-weight: 800; color: var(--text-color); }
        .lbx-empty-desc { margin: 0 auto 1.4rem; max-width: 46ch; font-size: 0.8438rem; line-height: 1.8; color: var(--text-color); opacity: 0.5; }
        .lbx-empty-actions { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }

        .lbx-drawer-overlay { z-index: 5000; }
        .lbx-drawer {
          position: fixed; top: 0; bottom: 0; inset-inline-end: 0;
          width: min(430px, 94vw);
          background: var(--card-bg);
          border-inline-start: 1px solid var(--border-color);
          box-shadow: 24px 0 60px rgba(0, 0, 0, 0.18);
          display: flex; flex-direction: column;
          z-index: 5001;
        }
        .lbx-drawer-sheet {
          top: auto; width: 100vw; max-height: 86dvh;
          border-radius: 16px 16px 0 0;
          border-inline-end: none; border-top: 1px solid var(--border-color);
          box-shadow: 0 -18px 48px rgba(0, 0, 0, 0.25);
        }
        .lbx-drawer-head {
          display: flex; align-items: center; gap: 0.7rem;
          padding: 0.95rem 1.1rem; border-bottom: 1px solid var(--border-color);
        }
        .lbx-drawer-id { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; flex: 1; }
        .lbx-drawer-id .code-badge { align-self: flex-start; }
        .lbx-drawer-sub {
          font-size: 0.75rem; color: var(--text-color); opacity: 0.55;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lbx-close-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
          border: 1px solid var(--border-color); background: var(--card-bg);
          color: var(--text-color); cursor: pointer;
          transition: all 0.15s ease;
        }
        .lbx-close-btn:hover { border-color: var(--danger); color: var(--danger); }
        .lbx-close-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
        .lbx-drawer-scroll { flex: 1; overflow-y: auto; padding-bottom: 0.5rem; }
        .lbx-sticker {
          margin: 1rem 1.1rem 0.4rem; padding: 0.9rem;
          background: #ffffff;
          border: 1.5px dashed color-mix(in srgb, var(--primary) 45%, transparent);
          border-radius: 12px;
          display: flex; align-items: center; gap: 1rem;
        }
        .lbx-sticker canvas { border-radius: 4px; }
        .lbx-sticker-info { display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
        .lbx-sticker-title {
          font-size: 0.6875rem; font-weight: 800; letter-spacing: 0.06em; color: #0f766e;
        }
        .lbx-sticker-hint { font-size: 0.6875rem; color: #555555; line-height: 1.7; }
        .lbx-kvlist { padding: 0.3rem 1.1rem 0; }
        .lbx-kv-amount { font-weight: 800; color: var(--primary); font-size: 0.9375rem; }
        .lbx-drawer-section { padding: 0.9rem 1.1rem 0; }
        .lbx-section-cap {
          font-size: 0.6563rem; font-weight: 800; letter-spacing: 0.07em;
          color: var(--text-color); opacity: 0.45; margin-bottom: 0.45rem;
        }
        .lbx-rel-list { display: flex; flex-direction: column; gap: 0.35rem; }
        .lbx-rel-item {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.4rem 0.5rem; border-radius: 9px;
          border: 1px dashed var(--border-color); background: transparent;
          cursor: pointer; text-align: start; font-family: inherit;
          transition: border-color 0.14s ease, background 0.14s ease;
          width: 100%;
        }
        .lbx-rel-item:hover { border-color: var(--primary); background: var(--hover-bg); }
        .lbx-rel-item:focus-visible { outline: 2px solid var(--primary); outline-offset: 1px; }
        .lbx-rel-code { font-size: 0.7188rem; padding: 0.25rem 0.55rem; }
        .lbx-rel-proj { font-size: 0.75rem; opacity: 0.6; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .lbx-notes-text { margin: 0; font-size: 0.8125rem; line-height: 1.9; opacity: 0.75; }
        .lbx-drawer-foot {
          display: flex; align-items: center; gap: 0.45rem;
          padding: 0.85rem 1.1rem; border-top: 1px solid var(--border-color);
          background: color-mix(in srgb, var(--hover-bg) 35%, var(--card-bg));
        }
        .lbx-foot-btn { flex: 1; justify-content: center; }
        .lbx-foot-icon { flex: 0 0 auto; padding: 0.5rem 0.6rem !important; }

        @media (max-width: 1100px) {
          .lbx-hide-md { display: none; }
        }
        @media (max-width: 640px) {
          .lbx-hide-sm { display: none; }
          .lbx-head-actions { width: 100%; margin-inline-start: 0; }
          .lbx-head-actions .btn-primary { flex: 1; }
          .lbx-search { flex-basis: 100%; order: -1; }
          .lbx-inline-select { width: 132px; }
          .lbx-grid { grid-template-columns: 1fr; }
          .lbx-sheet { padding: 0.4rem 0.55rem 0.55rem; }
          .lbx-statsbar { padding: 0.6rem 0.9rem; }
          .lbx-stat-value { font-size: 1.0625rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lbx *, .lbx-drawer, .lbx-drawer-overlay {
            transition: none !important;
            animation: none !important;
          }
          .lbx-stub:hover { transform: none; }
        }

        [data-theme='high-contrast'] .lbx-stub,
        [data-theme='high-contrast'] .lbx-lrow.selected { border-style: solid; }
        [data-theme='high-contrast'] .lbx-stub.selected { outline: 2px solid var(--accent-gold, #c9a227); outline-offset: -1px; }
        [data-theme='high-contrast'] .lbx-mark { opacity: 1; }
        [data-theme='high-contrast'] .lbx-sheet { border-style: solid; }
      `}</style>
    </div>
  );
}
