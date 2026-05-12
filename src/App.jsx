import { useState, useCallback } from "react";
import { useRecords } from "./hooks/useRecords";
import { useToast } from "./hooks/useToast";
import { FIELDS, LABEL_PRINT_COLS, LABEL_WIDTH, LABEL_HEIGHT, PAGE_SIZE } from "./data/fields";
import * as exportUtils from "./utils/exporters";

import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import StatsCards from "./components/StatsCards";
import RecordCard from "./components/RecordCard";
import RecordForm from "./components/RecordForm";
import ImportCSV from "./components/ImportCSV";
import LabelPreview from "./components/LabelPreview";
import ViewDetail from "./components/ViewDetail";
import Toast from "./components/Toast";

const HISTORY_KEY = 'label-studio-print-history';

function loadHistory() {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState("records");
  const [selected, setSelected] = useState(new Set());
  const [editIndex, setEditIndex] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [printHistory, setPrintHistory] = useState(loadHistory);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printCols, setPrintCols] = useState(LABEL_PRINT_COLS);
  const [printWidth, setPrintWidth] = useState(LABEL_WIDTH);
  const [printHeight, setPrintHeight] = useState(LABEL_HEIGHT);
  const [dragIndex, setDragIndex] = useState(null);

  const {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    getRelatedLabels, getAvailableLabels,
    isDuplicateCode, searchRecords,
  } = useRecords();

  const { toasts, addToast, removeToast } = useToast();

  useState(() => {
    document.documentElement.setAttribute('data-theme', theme);
  });

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
    setEditIndex(null);
  }, []);

  const resetForm = useCallback(() => {
    setEditIndex(null);
  }, []);

  const toggleSelect = useCallback((i) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }, []);

  const toggleAll = () => {
    const filtered = getSortedRecords();
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((_, i) => records.indexOf(filtered[i]))));
    }
  };

  const getSortedRecords = useCallback(() => {
    let result = searchRecords(search);
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = String(a[sortBy] || '').toLowerCase();
        const bVal = String(b[sortBy] || '').toLowerCase();
        const cmp = aVal.localeCompare(bVal);
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [search, sortBy, sortOrder, searchRecords]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const fr = getSortedRecords();
  const totalPages = Math.max(1, Math.ceil(fr.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = fr.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSubmit = (recordData) => {
    if (editIndex !== null) {
      updateRecord(editIndex, recordData);
      setEditIndex(null);
      addToast("رکورد با موفقیت ویرایش شد", "success");
    } else {
      addRecord(recordData);
      addToast("رکورد با موفقیت اضافه شد", "success");
    }
    setTab("records");
  };

  const handleEdit = (i) => {
    setEditIndex(i);
    setTab("add");
  };

  const handleView = (i) => {
    setViewIndex(i);
    setTab("view");
  };

  const handleDelete = () => {
    const count = selected.size;
    if (count === 0) return;
    deleteRecords(selected);
    setSelected(new Set());
    addToast(`${count} رکورد با موفقیت حذف شد`, "success");
  };

  const handleImport = (importedRecords) => {
    setRecords(prev => [...prev, ...importedRecords]);
    setTab("records");
  };

  const handlePrint = () => {
    const selectedRecords = records.filter((_, i) => selected.has(i));
    if (!selectedRecords.length) {
      addToast("حداقل یک رکورد انتخاب کنید", "error");
      return;
    }
    exportUtils.printLabels(selectedRecords, FIELDS, printCols, printWidth, printHeight);

    const entry = {
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR'),
      count: selectedRecords.length,
      codes: selectedRecords.map(r => r.code),
    };
    const updated = [entry, ...printHistory].slice(0, 50);
    setPrintHistory(updated);
    saveHistory(updated);
  };

  const handleExcel = () => {
    const selectedRecords = records.filter((_, i) => selected.has(i));
    if (!selectedRecords.length) {
      addToast("حداقل یک رکورد انتخاب کنید", "error");
      return;
    }
    exportUtils.downloadExcel(selectedRecords, FIELDS);
    addToast("فایل اکسل با موفقیت ساخته شد", "success");
  };

  const handlePDF = async () => {
    const el = document.getElementById('preview-grid');
    if (!el) return;
    try {
      await exportUtils.downloadPDF(el);
      addToast("فایل PDF با موفقیت ساخته شد", "success");
    } catch {
      addToast("خطا در ساخت PDF", "error");
    }
  };

  const handleDragStart = (e, idx) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIdx) {
      reorderRecords(dragIndex, dropIdx);
      setSelected(new Set());
    }
    setDragIndex(null);
  };

  const clearHistory = () => {
    setPrintHistory([]);
    saveHistory([]);
    addToast("تاریخچه پاک شد", "success");
  };

  const fr_all = getSortedRecords();
  const availableLabels = editIndex !== null
    ? getAvailableLabels(records[editIndex]?.code)
    : getAvailableLabels();
  const editRecord = editIndex !== null ? records[editIndex] : null;
  const selectedRecords = records.filter((_, i) => selected.has(i));

  return (
    <div className="app-container">
      <Sidebar
        tab={tab}
        onTabChange={handleTabChange}
        sidebarOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onResetForm={resetForm}
      />

      <main className="main-content">
        <Header
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          theme={theme}
          onToggleTheme={toggleTheme}
          recordCount={records.length}
          selectedCount={selected.size}
          onToggleSidebar={toggleSidebar}
        />

        <div className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {tab === 'records' && 'مدیریت سوابق'}
                {tab === 'add' && (editIndex !== null ? 'ویرایش رکورد' : 'افزودن رکورد جدید')}
                {tab === 'import' && 'ورود از CSV'}
                {tab === 'preview' && 'پیش‌نمایش برچسب‌ها'}
                {tab === 'view' && 'جزئیات برچسب'}
                {tab === 'history' && 'تاریخچه چاپ'}
              </h1>
              <p className="page-subtitle">ابزار مدیریت اسناد و چاپ برچسب</p>
            </div>

            {tab === 'preview' && selected.size > 0 && (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline" onClick={() => setShowPrintSettings(true)}>
                  <i className="ti ti-settings"></i> تنظیمات چاپ
                </button>
                <button className="btn btn-outline" onClick={handleExcel}>
                  <i className="ti ti-file-excel"></i> خروجی اکسل
                </button>
                <button className="btn btn-outline" onClick={handlePDF}>
                  <i className="ti ti-file-type-pdf"></i> خروجی PDF
                </button>
                <button className="btn btn-success" onClick={handlePrint}>
                  <i className="ti ti-printer"></i> چاپ برچسب‌ها
                </button>
              </div>
            )}

            {tab === 'view' && viewIndex !== null && (
              <button className="btn btn-outline" onClick={() => { setViewIndex(null); setTab("records"); setSelected(new Set([viewIndex])); }}>
                <i className="ti ti-arrow-right"></i> بازگشت
              </button>
            )}

            {(tab === 'records' || tab === 'add' || tab === 'import') && (
              <button className="btn btn-outline" onClick={() => setTab("preview")}>
                <i className="ti ti-printer"></i> پیش‌نمایش
              </button>
            )}
          </div>

          {tab !== 'view' && tab !== 'history' && (
            <StatsCards records={records} selected={selected} filtered={fr_all} />
          )}

          {tab !== 'view' && tab !== 'history' && (
            <div className="tab-nav">
              <button className={`tab-btn ${tab === 'records' ? 'active' : ''}`} onClick={() => { setTab("records"); setEditIndex(null); setPage(1); }}>
                <i className="ti ti-files"></i> سوابق
              </button>
              <button className={`tab-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => { setTab("add"); setEditIndex(null); }}>
                <i className="ti ti-plus"></i> افزودن
              </button>
              <button className={`tab-btn ${tab === 'import' ? 'active' : ''}`} onClick={() => { setTab("import"); setImportMsg(""); }}>
                <i className="ti ti-upload"></i> ورود CSV
              </button>
              <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab("history")}>
                <i className="ti ti-history"></i> تاریخچه چاپ
              </button>
            </div>
          )}

          {/* Records Tab */}
          {tab === 'records' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div className="d-flex gap-2 align-items-center">
                  <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>مرتب‌سازی:</span>
                  {['code', 'project', 'date', 'amount'].map(f => (
                    <button
                      key={f}
                      className={`sort-btn ${sortBy === f ? 'active' : ''}`}
                      onClick={() => handleSort(f)}
                    >
                      {FIELDS.find(x => x.key === f)?.fa || f}
                      {sortBy === f && (
                        <i className={`ti ${sortOrder === 'asc' ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '0.75rem', marginRight: '0.25rem' }}></i>
                      )}
                    </button>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline btn-sm" onClick={toggleAll}>
                    <i className="ti ti-checkbox"></i>
                    {selected.size === fr_all.length && fr_all.length > 0 ? 'لغو انتخاب همه' : 'انتخاب همه'}
                  </button>
                  {selected.size > 0 && (
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                      <i className="ti ti-trash"></i> حذف ({selected.size})
                    </button>
                  )}
                </div>
              </div>

              {fr_all.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <i className="ti ti-file-off"></i>
                  </div>
                  <h3 style={{ marginBottom: "0.5rem" }}>هنوز رکوردی وجود ندارد</h3>
                  <p style={{ opacity: 0.7, marginBottom: "1.5rem" }}>رکورد جدید اضافه کنید یا فایل CSV وارد نمایید</p>
                  <button className="btn btn-primary" onClick={() => setTab("add")}>
                    <i className="ti ti-plus"></i> افزودن رکورد
                  </button>
                </div>
              ) : (
                <>
                  <div className="card-grid">
                    {pagedRecords.map((r) => {
                      const realIdx = records.indexOf(r);
                      return (
                        <RecordCard
                          key={realIdx}
                          record={r}
                          selected={selected.has(realIdx)}
                          onToggle={() => toggleSelect(realIdx)}
                          onEdit={() => handleEdit(realIdx)}
                          onView={() => handleView(realIdx)}
                          getRelatedLabels={getRelatedLabels}
                          index={realIdx}
                          onDragStart={(e) => handleDragStart(e, realIdx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnd={() => setDragIndex(null)}
                          onDrop={(e) => handleDrop(e, realIdx)}
                        />
                      );
                    })}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        className="pagination-btn"
                        disabled={safePage <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                      >
                        قبلی
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button
                          key={p}
                          className={`pagination-btn ${p === safePage ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      ))}
                      <button
                        className="pagination-btn"
                        disabled={safePage >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      >
                        بعدی
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Add/Edit Tab */}
          {tab === 'add' && (
            <RecordForm
              editRecord={editRecord}
              editIndex={editIndex}
              availableLabels={availableLabels}
              isDuplicateCode={isDuplicateCode}
              onSubmit={handleSubmit}
              onCancel={() => { setEditIndex(null); setTab("records"); }}
              addToast={addToast}
            />
          )}

          {/* Import Tab */}
          {tab === 'import' && (
            <ImportCSV
              onImport={handleImport}
              importMsg={importMsg}
              setImportMsg={setImportMsg}
              addToast={addToast}
            />
          )}

          {/* View Detail */}
          {tab === 'view' && viewIndex !== null && (
            <ViewDetail
              record={records[viewIndex]}
              relatedRecords={getRelatedLabels(records[viewIndex].related)}
              onEdit={() => handleEdit(viewIndex)}
              onNavigateToRelated={(rel) => {
                const idx = records.indexOf(rel);
                if (idx !== -1) setViewIndex(idx);
              }}
            />
          )}

          {/* Preview Tab */}
          {tab === 'preview' && (
            <LabelPreview
              selectedRecords={selectedRecords}
              onPrint={handlePrint}
              onExcel={handleExcel}
              onPDF={handlePDF}
              onGoToRecords={() => setTab("records")}
            />
          )}

          {/* Print History Tab */}
          {tab === 'history' && (
            <div className="fade-in">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <span style={{ opacity: 0.7 }}>
                  {printHistory.length > 0
                    ? `${printHistory.length} بار چاپ انجام شده`
                    : 'هنوز چاپی انجام نشده'}
                </span>
                {printHistory.length > 0 && (
                  <button className="btn btn-danger btn-sm" onClick={clearHistory}>
                    <i className="ti ti-trash"></i> پاک کردن تاریخچه
                  </button>
                )}
              </div>

              {printHistory.length === 0 ? (
                <div className="history-empty">
                  <i className="ti ti-history" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}></i>
                  <p>تاریخچه چاپ خالی است</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {printHistory.map((entry, i) => (
                    <div key={i} className="history-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="stat-icon info" style={{ width: 40, height: 40, fontSize: '1.2rem' }}>
                          <i className="ti ti-printer"></i>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>چاپ {entry.count} برچسب</div>
                          <div style={{ fontSize: '0.8rem', opacity: 0.6, direction: 'ltr' }}>
                            {entry.date} - {entry.time}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: 300 }}>
                        {entry.codes.map(code => (
                          <span key={code} style={{
                            padding: '0.15rem 0.5rem', background: 'rgba(115, 103, 240, 0.1)',
                            color: 'var(--primary)', borderRadius: 4, fontSize: '0.75rem',
                            fontFamily: 'monospace',
                          }}>
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Print Settings Modal */}
      {showPrintSettings && (
        <div className="modal-overlay" onClick={() => setShowPrintSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>تنظیمات چاپ</h3>
              <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowPrintSettings(false)}></i>
            </div>

            <div className="form-group">
              <label className="form-label">تعداد برچسب در هر ردیف</label>
              <select
                className="form-input"
                value={printCols}
                onChange={e => setPrintCols(Number(e.target.value))}
              >
                <option value={2}>۲ عدد</option>
                <option value={3}>۳ عدد</option>
                <option value={4}>۴ عدد</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">عرض برچسب (px)</label>
              <input
                type="number"
                className="form-input"
                value={printWidth}
                onChange={e => setPrintWidth(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">ارتفاع برچسب (px)</label>
              <input
                type="number"
                className="form-input"
                value={printHeight}
                onChange={e => setPrintHeight(Number(e.target.value))}
              />
            </div>

            <div className="d-flex gap-3">
              <button className="btn btn-primary flex-1" onClick={() => setShowPrintSettings(false)}>
                تایید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
