import React, { Suspense, lazy } from 'react';
import { FIELDS, PAGE_SIZE } from '../data/fields';
import RecordCard from './RecordCard';
import BatchActionBar from './BatchActionBar';
import SearchableSelect from './SearchableSelect';
import { CardSkeleton, TableSkeleton } from './LoadingSkeleton';
import type { RecordItem, CustomField } from '../types';
import type { FilterState } from './FilterPresets';

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
  return (
    <div>
      <div className="records-toolbar">
        <div className="d-flex gap-2 align-items-center flex-wrap">
          <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>مرتب‌سازی:</span>
          {['code', 'project', 'date', 'amount'].map(f => (
            <button key={f} className={`sort-btn ${sortBy === f ? 'active' : ''}`} onClick={() => onSort(f)}>
              {FIELDS.find(x => x.key === f)?.fa || f}
              {sortBy === f && (
                <i className={`ti ${sortOrder === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}></i>
              )}
            </button>
          ))}
        </div>
        <div className="records-toolbar-actions">
          {customFields.length > 0 && (
            <div className="d-flex gap-1 flex-wrap align-items-center" style={{ fontSize: '0.75rem' }}>
              <span style={{ opacity: 0.5 }}>فیلدهای سفارشی:</span>
              {customFields.map(f => {
                const active = enabledCustomFieldKeys.includes(f.key);
                return (
                  <span key={f.key} onClick={() => onSetEnabledCustomFieldKeys(prev => {
                    const next = prev.includes(f.key) ? prev.filter(k => k !== f.key) : [...prev, f.key];
                    localStorage.setItem('label-studio-enabled-cfields', JSON.stringify(next));
                    return next;
                  })} style={{
                    padding: '0.2rem 0.5rem', borderRadius: 12, cursor: 'pointer',
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
          )}
          <button className="btn btn-outline btn-sm" onClick={() => onSetViewMode(p => p === 'card' ? 'table' : 'card')}>
            <i className={`ti ${viewMode === 'card' ? 'ti-list' : 'ti-grid'}`}></i>
            {viewMode === 'card' ? 'نمایش جدول' : 'نمایش کارتی'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onToggleAll}>
            <i className="ti ti-checkbox"></i>
            {selected.size === sortedRecords.length && sortedRecords.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه'}
          </button>
          {currentRecords.length > 0 && (
            <>
              <button className="btn btn-outline btn-sm" onClick={onExportAllExcel} title="خروجی اکسل همه رکوردها">
                <i className="ti ti-file-excel"></i> خروجی اکسل
              </button>
              <button className="btn btn-outline btn-sm" onClick={onExportAllCSV} title="خروجی CSV همه رکوردها">
                <i className="ti ti-file-text"></i> خروجی CSV
              </button>
              <button className="btn btn-outline btn-sm" onClick={onExportAllPrint} title="چاپ همه رکوردها">
                <i className="ti ti-printer"></i> چاپ همه
              </button>
            </>
          )}
          {selected.size > 0 && (
            <>
              <button className="btn btn-outline btn-sm" onClick={onExcel} title="خروجی اکسل رکوردهای انتخاب شده">
                <i className="ti ti-file-excel"></i> اکسل ({selected.size})
              </button>
              <button className="btn btn-outline btn-sm" onClick={onCSVExport} title="خروجی CSV رکوردهای انتخاب شده">
                <i className="ti ti-file-text"></i> CSV ({selected.size})
              </button>
            </>
          )}
          {!isViewer && currentRecords.length > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => onShowRenumberConfirm(true)} title="بازنویسی کدها بر اساس پروژه، نوع و تاریخ">
              <i className="ti ti-sort-numeric"></i> بازنویسی کدها
            </button>
          )}
          {selected.size > 0 && !isViewer && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => onShowBulkEdit(true)}>
                <i className="ti ti-edit"></i> ویرایش دسته‌جمعی ({selected.size})
              </button>
              <button className="btn btn-danger btn-sm" onClick={onDeleteClick}>
                <i className="ti ti-trash"></i> حذف ({selected.size})
              </button>
            </>
          )}
        </div>
      </div>

      <div className="records-filter">
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
        <input type="number" className="form-input" placeholder="حداقل مبلغ"
          value={filterAmountMin} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { onSetFilterAmountMin(e.target.value); onSetPage(1); }} />
        <input type="number" className="form-input" placeholder="حداکثر مبلغ"
          value={filterAmountMax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { onSetFilterAmountMax(e.target.value); onSetPage(1); }} />
        {(filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) && (
          <button className="btn btn-outline btn-sm" onClick={() => { onSetFilterDateFrom(''); onSetFilterDateTo(''); onSetFilterAmountMin(''); onSetFilterAmountMax(''); onSetPage(1); }}>
            <i className="ti ti-x"></i> پاک کردن فیلترها
          </button>
        )}
        {tags.length > 0 && (
          <div className="d-flex gap-1 flex-wrap align-items-center" style={{ fontSize: '0.85rem' }}>
            <span style={{ opacity: 0.6 }}>برچسب:</span>
            {tags.map(tag => (
              <button key={tag}
                className={`btn btn-sm ${selectedTagFilter === tag ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => onSetSelectedTagFilter(tag === selectedTagFilter ? null : tag)}
                >
                {tag}
              </button>
            ))}
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

      {sortedRecords.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" style={{ width: 140, height: 140, fontSize: '4rem', borderRadius: '50%', background: 'var(--hover-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--text-color)', opacity: 0.3 }}>
            <i className="ti ti-file-off"></i>
          </div>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>هنوز رکوردی وجود ندارد</h3>
          <p style={{ opacity: 0.6, marginBottom: '2rem', maxWidth: 400, margin: '0 auto 2rem', lineHeight: 1.8 }}>برای شروع کار، رکورد جدید اضافه کنید یا یک فایل CSV یا Excel وارد نمایید. همچنین می‌توانید از قالب‌های آماده استفاده کنید.</p>
          {!isViewer && (
            <div className="d-flex gap-2 align-items-center" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => onTabChange('add')}>
                <i className="ti ti-plus"></i> افزودن رکورد
              </button>
              <button className="btn btn-outline" onClick={() => onTabChange('import')}>
                <i className="ti ti-upload"></i> وارد کردن فایل
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'table' ? (
        <Suspense fallback={<TableSkeleton rows={8} />}>
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
            customFields={customFields}
          />
        </Suspense>
      ) : serverLoading ? (
        <div className="card-grid">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : useVirtualScroll ? (
        <Suspense fallback={<div className="card-grid">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}</div>}>
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
            customFields={customFields}
          />
        </Suspense>
      ) : (
        <>
          <div className="card-grid" key={refreshKey}>
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
                  customFields={customFields}
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
          <div className="pagination" style={totalPages <= 1 ? { justifyContent: 'center', opacity: 0.6 } : {}}>
            <button className="pagination-btn" disabled={safePage <= 1} onClick={() => onSetPage(p => Math.max(1, p - 1))}>قبلی</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`pagination-btn ${p === safePage ? 'active' : ''}`} onClick={() => onSetPage(p)}>{p}</button>
            ))}
            <button className="pagination-btn" disabled={safePage >= totalPages} onClick={() => onSetPage(p => Math.min(totalPages, p + 1))}>بعدی</button>
            <span style={{ marginRight: '0.75rem', opacity: 0.6, fontSize: '0.85rem' }}>
              {sortedRecords.length > 0 ? `${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, sortedRecords.length)} از ${sortedRecords.length}` : '۰ رکورد'}
            </span>
          </div>
        </>
      )}
      <div className="d-flex justify-content-center mt-4">
        <button className="btn btn-outline btn-sm" onClick={() => onSetUseVirtualScroll(p => !p)}>
          <i className={`ti ${useVirtualScroll ? 'ti-grid' : 'ti-list'}`}></i>
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
    </div>
  );
}
