import React, { Suspense, lazy, useMemo } from 'react';
import { FIELDS, PAGE_SIZE } from '../data/fields';
import RecordCard from './RecordCard';
import BatchActionBar from './BatchActionBar';
import SearchableSelect from './SearchableSelect';
import { CardSkeleton, TableSkeleton } from './LoadingSkeleton';
import type { RecordItem, CustomField } from '../types';
import type { FilterState } from './FilterPresets';
import {
  FileSpreadsheet,
  FileText,
  Printer,
  ArrowUpDown,
  Filter,
  Tags,
  LayoutGrid,
  LayoutList,
  CheckSquare,
  Square,
  Trash2,
  Pencil,
  Hash,
  Shield,
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  Download,
} from 'lucide-react';

const DateRangePicker = lazy(() => import('./DateRangePicker'));
const FilterPresets = lazy(() => import('./FilterPresets'));
const TableView = lazy(() => import('./TableView'));
const VirtualizedRecordGrid = lazy(() => import('./VirtualizedRecordGrid'));

interface RecordsPageProps {
  currentRecords: RecordItem[];
  sortedRecords: RecordItem[];
  pagedRecords: RecordItem[];
  selected: Set<number>;
  sortBy: string | null;
  sortOrder: string;
  refreshKey: number;
  search: string;
  filterType: string;
  filterParty: string;
  filterDateFrom: string;
  filterDateTo: string;
  filterAmountMin: string;
  filterAmountMax: string;
  selectedTagFilter: string | null;
  allTypes: string[];
  allParties: string[];
  viewMode: string;
  useVirtualScroll: boolean;
  serverLoading: boolean;
  safePage: number;
  totalPages: number;
  customFields: CustomField[];
  enabledCustomFieldKeys: string[];
  tags: string[];
  findRelated: (related: string[]) => RecordItem[];
  recordToIndex: Map<RecordItem, number>;
  isViewer: boolean;
  serverMode: boolean;
  onSort: (f: string) => void;
  onToggleSelect: (i: number) => void;
  onToggleAll: () => void;
  onEdit: (i: number) => void;
  onView: (i: number) => void;
  onDeleteClick: () => void;
  onExcel: () => void;
  onCSVExport: () => void;
  onExportAllExcel: () => void;
  onExportAllCSV: () => void;
  onExportAllPrint: () => void;
  onDragStart: (e: React.DragEvent, idx: number) => void;
  onDrop: (e: React.DragEvent, dropIdx: number) => void;
  onSetDragIndex: (i: number | null) => void;
  onInlineEdit: (index: number, field: string, value: string) => void;
  onToggleFavorite?: (index: number) => void;
  onApplyPreset: (filters: FilterState) => void;
  onTabChange: (t: string) => void;
  onSetViewMode: React.Dispatch<React.SetStateAction<string>>;
  onSetUseVirtualScroll: React.Dispatch<React.SetStateAction<boolean>>;
  onSetFilterType: (v: string) => void;
  onSetFilterParty: (v: string) => void;
  onSetFilterDateFrom: (v: string) => void;
  onSetFilterDateTo: (v: string) => void;
  onSetFilterAmountMin: (v: string) => void;
  onSetFilterAmountMax: (v: string) => void;
  onSetSelectedTagFilter: (v: string | null) => void;
  onSetPage: React.Dispatch<React.SetStateAction<number>>;
  onShowRenumberConfirm: (s: boolean) => void;
  onShowBulkEdit: (s: boolean) => void;
  onSetEnabledCustomFieldKeys: React.Dispatch<React.SetStateAction<string[]>>;
  onClearSelection: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
}

function ToolbarBtn({ onClick, active, danger, children, title }: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      className={`rpg-tb-btn ${active ? 'rpg-tb-btn-active' : ''} ${danger ? 'rpg-tb-btn-danger' : ''}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

export default function RecordsPage({
  currentRecords,
  sortedRecords,
  pagedRecords,
  selected,
  sortBy,
  sortOrder,
  refreshKey,
  search,
  filterType,
  filterParty,
  filterDateFrom,
  filterDateTo,
  filterAmountMin,
  filterAmountMax,
  selectedTagFilter,
  allTypes,
  allParties,
  viewMode,
  useVirtualScroll,
  serverLoading,
  safePage,
  totalPages,
  customFields,
  enabledCustomFieldKeys,
  tags,
  findRelated,
  recordToIndex,
  isViewer,
  serverMode,
  onSort,
  onToggleSelect,
  onToggleAll,
  onEdit,
  onView,
  onDeleteClick,
  onExcel,
  onCSVExport,
  onExportAllExcel,
  onExportAllCSV,
  onExportAllPrint,
  onDragStart,
  onDrop,
  onSetDragIndex,
  onInlineEdit,
  onToggleFavorite,
  onApplyPreset,
  onTabChange,
  onSetFilterType,
  onSetFilterParty,
  onSetFilterDateFrom,
  onSetFilterDateTo,
  onSetFilterAmountMin,
  onSetFilterAmountMax,
  onSetSelectedTagFilter,
  onSetPage,
  onShowRenumberConfirm,
  onShowBulkEdit,
  onSetEnabledCustomFieldKeys,
  onSetViewMode,
  onSetUseVirtualScroll,
  onClearSelection,
  addToast,
}: RecordsPageProps) {
  const visibleCustomFields = useMemo(
    () => customFields.filter(f => enabledCustomFieldKeys.includes(f.key)),
    [customFields, enabledCustomFieldKeys]
  );

  const sortFields = ['code', 'project', 'date', 'amount'] as const;
  const hasActiveFilters = !!(filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax);

  return (
    <div className="rpg fade-in">
      {/* ── Page Header ── */}
      <div className="rpg-header">
        <div className="rpg-header-left">
          <div className="rpg-emblem">
            <FileSpreadsheet className="rpg-emblem-icon" />
          </div>
          <div>
            <h2 className="rpg-title">رکوردها</h2>
            <p className="rpg-subtitle">
              {sortedRecords.length.toLocaleString('fa-IR')} رکورد
              {selected.size > 0 && ` — ${selected.size.toLocaleString('fa-IR')} انتخاب شده`}
            </p>
          </div>
        </div>
        <div className="rpg-header-right">
          <ToolbarBtn onClick={onToggleAll} active={selected.size === sortedRecords.length && sortedRecords.length > 0}>
            {selected.size === sortedRecords.length && sortedRecords.length > 0 ? <CheckSquare className="rpg-tb-icon" /> : <Square className="rpg-tb-icon" />}
            {selected.size === sortedRecords.length && sortedRecords.length > 0 ? 'لغو انتخاب' : 'انتخاب همه'}
          </ToolbarBtn>
          <ToolbarBtn onClick={() => onSetViewMode(p => p === 'card' ? 'table' : 'card')}>
            {viewMode === 'card' ? <LayoutList className="rpg-tb-icon" /> : <LayoutGrid className="rpg-tb-icon" />}
            {viewMode === 'card' ? 'جدول' : 'کارت'}
          </ToolbarBtn>
        </div>
      </div>

      {/* ── Sort Bar ── */}
      <div className="rpg-sort">
        <div className="rpg-sort-label">
          <ArrowUpDown className="rpg-sort-icon" />
          <span>مرتب‌سازی</span>
        </div>
        <div className="rpg-sort-pills">
          {sortFields.map(f => (
            <button key={f} className={`rpg-sort-pill ${sortBy === f ? 'active' : ''}`} onClick={() => onSort(f)}>
              <span>{FIELDS.find(x => x.key === f)?.fa || f}</span>
              {sortBy === f && (
                <i className={`ti ${sortOrder === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.625rem' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="rpg-toolbar">
        <div className="rpg-tb-left">
          {/* Custom Fields */}
          {customFields.length > 0 && (
            <div className="rpg-cfields">
              <span className="rpg-cfields-label">فیلدها:</span>
              {customFields.map(f => {
                const active = enabledCustomFieldKeys.includes(f.key);
                return (
                  <button
                    key={f.key}
                    className={`rpg-cfield ${active ? 'active' : ''}`}
                    onClick={() => onSetEnabledCustomFieldKeys(prev => {
                      const next = prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key];
                      localStorage.setItem('label-studio-enabled-cfields', JSON.stringify(next));
                      return next;
                    })}
                  >
                    {f.fa}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="rpg-tb-right">
          {/* Export All */}
          {currentRecords.length > 0 && (
            <div className="rpg-tb-group">
              <ToolbarBtn onClick={onExportAllExcel} title="خروجی اکسل همه">
                <FileSpreadsheet className="rpg-tb-icon" /> اکسل
              </ToolbarBtn>
              <ToolbarBtn onClick={onExportAllCSV} title="خروجی CSV همه">
                <FileText className="rpg-tb-icon" /> CSV
              </ToolbarBtn>
              <ToolbarBtn onClick={onExportAllPrint} title="چاپ همه">
                <Printer className="rpg-tb-icon" /> چاپ
              </ToolbarBtn>
            </div>
          )}

          {/* Selected Actions */}
          {selected.size > 0 && (
            <div className="rpg-tb-group">
              <ToolbarBtn onClick={onExcel} title="اکسل انتخاب شده">
                <Download className="rpg-tb-icon" /> اکسل ({selected.size})
              </ToolbarBtn>
              <ToolbarBtn onClick={onCSVExport} title="CSV انتخاب شده">
                <Download className="rpg-tb-icon" /> CSV ({selected.size})
              </ToolbarBtn>
            </div>
          )}

          {/* Renumber */}
          {!isViewer && currentRecords.length > 0 && (
            <ToolbarBtn onClick={() => onShowRenumberConfirm(true)} title="بازنویسی کدها">
              <Hash className="rpg-tb-icon" /> بازنویسی
            </ToolbarBtn>
          )}

          {/* Bulk Edit / Delete */}
          {selected.size > 0 && !isViewer && (
            <div className="rpg-tb-group">
              <ToolbarBtn onClick={() => onShowBulkEdit(true)}>
                <Pencil className="rpg-tb-icon" /> ویرایش ({selected.size})
              </ToolbarBtn>
              <ToolbarBtn onClick={onDeleteClick} danger>
                <Trash2 className="rpg-tb-icon" /> حذف ({selected.size})
              </ToolbarBtn>
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="rpg-filters">
        <div className="rpg-filter-icon">
          <Filter className="rpg-filter-icon-svg" />
        </div>
        <div className="rpg-filter-fields">
          <SearchableSelect value={filterType} options={allTypes} onChange={(v) => { onSetFilterType(v); onSetPage(1); }} placeholder="همه انواع" />
          <SearchableSelect value={filterParty} options={allParties} onChange={(v) => { onSetFilterParty(v); onSetPage(1); }} placeholder="همه طرف حساب‌ها" />
          <Suspense fallback={null}>
            <DateRangePicker
              dateFrom={filterDateFrom}
              dateTo={filterDateTo}
              onDateFromChange={(d) => { onSetFilterDateFrom(d); onSetPage(1); }}
              onDateToChange={(d) => { onSetFilterDateTo(d); onSetPage(1); }}
            />
          </Suspense>
          <div className="rpg-filter-amount">
            <input type="number" className="rpg-filter-input" placeholder="حداقل مبلغ"
              value={filterAmountMin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { onSetFilterAmountMin(e.target.value); onSetPage(1); }} />
            <span className="rpg-filter-sep">—</span>
            <input type="number" className="rpg-filter-input" placeholder="حداکثر مبلغ"
              value={filterAmountMax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { onSetFilterAmountMax(e.target.value); onSetPage(1); }} />
          </div>
          {hasActiveFilters && (
            <button className="rpg-filter-clear" onClick={() => { onSetFilterDateFrom(''); onSetFilterDateTo(''); onSetFilterAmountMin(''); onSetFilterAmountMax(''); onSetPage(1); }}>
              <X className="rpg-filter-clear-icon" /> پاک کردن
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <div className="rpg-tags">
            <div className="rpg-tags-label">
              <Tags className="rpg-tags-icon" />
              <span>برچسب</span>
            </div>
            <div className="rpg-tags-list">
              {tags.map(tag => (
                <button key={tag}
                  className={`rpg-tag ${selectedTagFilter === tag ? 'active' : ''}`}
                  onClick={() => onSetSelectedTagFilter(tag === selectedTagFilter ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          <FilterPresets
            currentFilters={{ search, filterType, filterParty, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax, selectedTagFilter }}
            onApply={onApplyPreset}
            addToast={addToast}
          />
        </Suspense>
      </div>

      {/* ── Content ── */}
      {sortedRecords.length === 0 ? (
        <div className="rpg-empty">
          <div className="rpg-empty-badge">
            <Shield className="rpg-empty-icon" />
          </div>
          <div className="rpg-empty-ornament">&#10022; &#10022; &#10022;</div>
          <h3 className="rpg-empty-title">هنوز رکوردی وجود ندارد</h3>
          <p className="rpg-empty-desc">
            برای شروع کار، رکورد جدید اضافه کنید یا یک فایل CSV یا Excel وارد نمایید.
          </p>
          {!isViewer && (
            <div className="rpg-empty-actions">
              <button className="rpg-empty-btn primary" onClick={() => onTabChange('add')}>
                <i className="ti ti-plus" /> افزودن رکورد
              </button>
              <button className="rpg-empty-btn" onClick={() => onTabChange('import')}>
                <i className="ti ti-upload" /> وارد کردن فایل
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <Suspense fallback={<TableSkeleton rows={8} />}>
          <div className="rpg-table-wrap">
            <TableView
              records={sortedRecords}
              recordToIndex={recordToIndex}
              selected={selected}
              onToggle={onToggleSelect}
              onEdit={onEdit}
              onView={onView}
              onSort={onSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              customFields={visibleCustomFields}
            />
          </div>
        </Suspense>
      ) : serverLoading ? (
        <div className="rpg-cards">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : useVirtualScroll ? (
        <Suspense fallback={<div className="rpg-cards">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>}>
          <VirtualizedRecordGrid
            records={sortedRecords}
            recordToIndex={recordToIndex}
            selected={selected}
            onToggle={onToggleSelect}
            onEdit={onEdit}
            onView={onView}
            getRelatedLabels={findRelated}
            onDragStart={onDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            setDragIndex={onSetDragIndex}
            customFields={visibleCustomFields}
          />
        </Suspense>
      ) : (
        <>
          <div className="rpg-cards" key={refreshKey}>
            {pagedRecords.map((r) => {
              const realIdx = recordToIndex.get(r);
              if (realIdx === undefined) return null;
              return (
                <RecordCard
                  key={serverMode ? r.id : `r-${realIdx}`}
                  record={r}
                  selected={selected.has(realIdx)}
                  onToggle={() => onToggleSelect(realIdx)}
                  onEdit={() => onEdit(realIdx)}
                  onView={() => onView(realIdx)}
                  getRelatedLabels={findRelated}
                  index={realIdx}
                  onDragStart={(e: React.DragEvent) => onDragStart(e, realIdx)}
                  customFields={visibleCustomFields}
                  searchQuery={search}
                  onDragOver={(e: React.DragEvent) => e.preventDefault()}
                  onDragEnd={() => onSetDragIndex(null)}
                  onDrop={(e: React.DragEvent) => onDrop(e, realIdx)}
                  onInlineEdit={onInlineEdit}
                  onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(realIdx) : undefined}
                />
              );
            })}
          </div>

          {/* ── Pagination ── */}
          <div className="rpg-pagination">
            <div className="rpg-pager">
              <button
                className="rpg-pg-btn"
                disabled={safePage <= 1}
                onClick={() => onSetPage(p => Math.max(1, p - 1))}
              >
                <ChevronRight className="rpg-pg-icon" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`rpg-pg-btn ${p === safePage ? 'active' : ''}`}
                  onClick={() => onSetPage(p)}
                >
                  <span className="rpg-pg-num">{p}</span>
                </button>
              ))}
              <button
                className="rpg-pg-btn"
                disabled={safePage >= totalPages}
                onClick={() => onSetPage(p => Math.min(totalPages, p + 1))}
              >
                <ChevronLeft className="rpg-pg-icon" />
              </button>
            </div>
            <span className="rpg-pg-info">
              {sortedRecords.length > 0
                ? `${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, sortedRecords.length)} از ${sortedRecords.length.toLocaleString('fa-IR')}`
                : '۰ رکورد'}
            </span>
          </div>
        </>
      )}

      {/* ── Virtual Scroll Toggle ── */}
      <div className="rpg-scroll-toggle">
        <button className="rpg-st-btn" onClick={() => onSetUseVirtualScroll(p => !p)}>
          <LayoutGrid className="rpg-st-icon" />
          {useVirtualScroll ? 'حالت صفحه‌بندی' : 'حالت مجازی (سریع)'}
        </button>
      </div>

      <BatchActionBar
        selectedCount={selected.size}
        onClearSelection={onClearSelection}
        onDelete={onDeleteClick}
        onBulkEdit={() => onShowBulkEdit(true)}
        onExportExcel={onExcel}
        onExportCSV={onCSVExport}
        isViewer={isViewer}
      />

      <style>{`
        /* ══════════════════════════════════════════════════════════════
           Records Page — Classic Badge Theme
           ══════════════════════════════════════════════════════════════ */

        .rpg {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* ── Page Header ── */
        .rpg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding-bottom: 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .rpg-header-left {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .rpg-emblem {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--primary), #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
          flex-shrink: 0;
        }

        .rpg-emblem-icon {
          width: 22px;
          height: 22px;
          color: white;
        }

        .rpg-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--text-color);
          letter-spacing: -0.02em;
        }

        .rpg-subtitle {
          margin: 0.125rem 0 0;
          font-size: 0.8125rem;
          color: var(--text-color);
          opacity: 0.45;
        }

        .rpg-header-right {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        /* ── Toolbar Button ── */
        .rpg-tb-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .rpg-tb-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
          background: rgba(99, 102, 241, 0.04);
        }

        .rpg-tb-btn-active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        .rpg-tb-btn-active:hover {
          background: var(--primary-hover);
          color: white;
        }

        .rpg-tb-btn-danger {
          border-color: rgba(239, 68, 68, 0.3);
          color: var(--danger);
        }

        .rpg-tb-btn-danger:hover {
          background: rgba(239, 68, 68, 0.06);
          border-color: var(--danger);
        }

        .rpg-tb-icon {
          width: 14px;
          height: 14px;
        }

        /* ── Sort Bar ── */
        .rpg-sort {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
        }

        .rpg-sort-label {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-color);
          opacity: 0.5;
          white-space: nowrap;
        }

        .rpg-sort-icon {
          width: 14px;
          height: 14px;
        }

        .rpg-sort-pills {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }

        .rpg-sort-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          opacity: 0.6;
        }

        .rpg-sort-pill:hover {
          opacity: 0.9;
          border-color: var(--primary);
        }

        .rpg-sort-pill.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          opacity: 1;
        }

        /* ── Toolbar ── */
        .rpg-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .rpg-tb-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }

        .rpg-tb-right {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          flex-wrap: wrap;
        }

        .rpg-tb-group {
          display: flex;
          gap: 0.25rem;
          padding-right: 0.375rem;
          border-right: 1px solid var(--border-color);
          margin-right: 0.125rem;
        }

        .rpg-tb-group:last-child {
          border-right: none;
          margin-right: 0;
          padding-right: 0;
        }

        /* ── Custom Fields ── */
        .rpg-cfields {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.75rem;
        }

        .rpg-cfields-label {
          color: var(--text-color);
          opacity: 0.45;
          font-weight: 500;
          white-space: nowrap;
        }

        .rpg-cfield {
          padding: 0.25rem 0.625rem;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-color);
          font-size: 0.6875rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rpg-cfield:hover {
          border-color: var(--primary);
        }

        .rpg-cfield.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        /* ── Filters ── */
        .rpg-filters {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          flex-wrap: wrap;
        }

        .rpg-filter-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary), #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .rpg-filter-icon-svg {
          width: 16px;
          height: 16px;
          color: white;
        }

        .rpg-filter-fields {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          flex: 1;
        }

        .rpg-filter-amount {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .rpg-filter-input {
          width: 90px;
          padding: 0.4rem 0.625rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-body);
          color: var(--text-color);
          font-size: 0.75rem;
          font-family: inherit;
          transition: border-color 0.15s;
        }

        .rpg-filter-input:focus {
          outline: none;
          border-color: var(--primary);
        }

        .rpg-filter-input::placeholder {
          color: var(--text-color);
          opacity: 0.3;
        }

        .rpg-filter-sep {
          color: var(--text-color);
          opacity: 0.3;
          font-size: 0.75rem;
        }

        .rpg-filter-clear {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.375rem 0.625rem;
          border-radius: 6px;
          border: 1px dashed rgba(239, 68, 68, 0.3);
          background: transparent;
          color: var(--danger);
          font-size: 0.6875rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rpg-filter-clear:hover {
          background: rgba(239, 68, 68, 0.06);
          border-color: var(--danger);
        }

        .rpg-filter-clear-icon {
          width: 12px;
          height: 12px;
        }

        /* ── Tags ── */
        .rpg-tags {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border-color);
          margin-top: 0.25rem;
        }

        .rpg-tags-label {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-color);
          opacity: 0.45;
          white-space: nowrap;
        }

        .rpg-tags-icon {
          width: 12px;
          height: 12px;
        }

        .rpg-tags-list {
          display: flex;
          gap: 0.25rem;
          flex-wrap: wrap;
        }

        .rpg-tag {
          padding: 0.25rem 0.625rem;
          border-radius: 6px;
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-color);
          font-size: 0.6875rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rpg-tag:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .rpg-tag.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }

        /* ── Empty State ── */
        .rpg-empty {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
        }

        .rpg-empty-badge {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), #818cf8);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
          position: relative;
        }

        .rpg-empty-badge::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px dashed var(--primary);
          opacity: 0.2;
        }

        .rpg-empty-icon {
          width: 36px;
          height: 36px;
          color: white;
        }

        .rpg-empty-ornament {
          color: var(--primary);
          opacity: 0.2;
          font-size: 0.75rem;
          letter-spacing: 0.5em;
          margin-bottom: 1rem;
        }

        .rpg-empty-title {
          margin: 0 0 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-color);
        }

        .rpg-empty-desc {
          margin: 0 auto 1.5rem;
          max-width: 400px;
          font-size: 0.875rem;
          color: var(--text-color);
          opacity: 0.5;
          line-height: 1.7;
        }

        .rpg-empty-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .rpg-empty-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-color);
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rpg-empty-btn:hover {
          border-color: var(--primary);
          color: var(--primary);
        }

        .rpg-empty-btn.primary {
          background: linear-gradient(135deg, var(--primary), #818cf8);
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .rpg-empty-btn.primary:hover {
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        /* ── Cards Grid ── */
        .rpg-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        /* ── Table Wrapper ── */
        .rpg-table-wrap {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          overflow: hidden;
        }

        /* ── Pagination ── */
        .rpg-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1.25rem;
          padding: 1rem 0 0.5rem;
        }

        .rpg-pager {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 0.25rem;
        }

        .rpg-pg-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 32px;
          padding: 0 0.375rem;
          border-radius: 7px;
          border: none;
          background: transparent;
          color: var(--text-color);
          font-size: 0.8125rem;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }

        .rpg-pg-btn:hover:not(:disabled):not(.active) {
          background: var(--hover-bg);
        }

        .rpg-pg-btn.active {
          background: var(--primary);
          color: white;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        }

        .rpg-pg-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .rpg-pg-num {
          font-family: 'Georgia', serif;
          font-weight: 600;
          font-size: 0.75rem;
        }

        .rpg-pg-icon {
          width: 16px;
          height: 16px;
        }

        .rpg-pg-info {
          font-size: 0.8125rem;
          color: var(--text-color);
          opacity: 0.45;
          font-weight: 500;
        }

        /* ── Scroll Toggle ── */
        .rpg-scroll-toggle {
          display: flex;
          justify-content: center;
          padding-top: 0.5rem;
        }

        .rpg-st-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px dashed var(--border-color);
          background: transparent;
          color: var(--text-color);
          font-size: 0.75rem;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          opacity: 0.5;
        }

        .rpg-st-btn:hover {
          opacity: 0.8;
          border-color: var(--primary);
          color: var(--primary);
        }

        .rpg-st-icon {
          width: 14px;
          height: 14px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .rpg-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .rpg-header-right {
            width: 100%;
          }

          .rpg-toolbar {
            flex-direction: column;
            align-items: flex-start;
          }

          .rpg-tb-right {
            width: 100%;
            justify-content: flex-start;
          }

          .rpg-sort {
            flex-direction: column;
            align-items: flex-start;
          }

          .rpg-filters {
            flex-direction: column;
            align-items: flex-start;
          }

          .rpg-filter-fields {
            width: 100%;
          }

          .rpg-cards {
            grid-template-columns: 1fr;
          }

          .rpg-pagination {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}
