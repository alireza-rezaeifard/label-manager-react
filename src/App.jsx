import { useState, useCallback, useEffect } from 'react';
import { useRecords } from './hooks/useRecords';
import { useToast } from './hooks/useToast';
import { FIELDS, LABEL_PRINT_COLS, LABEL_WIDTH, LABEL_HEIGHT, PAGE_SIZE } from './data/fields';
import * as exportUtils from './utils/exporters';
import { api, isAuthenticated, getAuthUser } from './utils/api';


import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatsCards from './components/StatsCards';
import RecordCard from './components/RecordCard';
import RecordForm from './components/RecordForm';
import ImportCSV from './components/ImportCSV';
import LabelPreview from './components/LabelPreview';
import ViewDetail from './components/ViewDetail';
import Toast from './components/Toast';
import ReportsTab from './components/ReportsTab';
import LoginPage from './components/LoginPage';
import ProfileTab from './components/ProfileTab';

const HISTORY_KEY = 'label-studio-print-history';
const CUSTOM_FIELDS_KEY = 'label-studio-custom-fields';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}
function saveHistory(h) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)); } catch { /* */ }
}
function loadCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]'); } catch { return []; }
}
function saveCustomFields(f) {
  try { localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(f)); } catch { /* */ }
}

export default function App() {
  const [localMode, setLocalMode] = useState(() => localStorage.getItem('local_mode') === 'true');
  const [authUser, setAuthUser] = useState(() => localMode ? null : getAuthUser());
  const [serverMode, setServerMode] = useState(() => localMode ? false : !!getAuthUser());

  const {
    records, setRecords,
    addRecord, updateRecord, deleteRecords, reorderRecords,
    undo, undoStack,
    getRelatedLabels,
    isDuplicateCode,
  } = useRecords();

  const [serverRecords, setServerRecords] = useState([]);
  const [serverLoading, setServerLoading] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [tab, setTab] = useState('records');
  const [selected, setSelected] = useState(new Set());
  const [editIndex, setEditIndex] = useState(null);
  const [viewIndex, setViewIndex] = useState(null);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [importMsg, setImportMsg] = useState('');

  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);

  const [printHistory, setPrintHistory] = useState(loadHistory);
  const [showPrintSettings, setShowPrintSettings] = useState(false);
  const [printCols, setPrintCols] = useState(LABEL_PRINT_COLS);
  const [printWidth, setPrintWidth] = useState(LABEL_WIDTH);
  const [printHeight, setPrintHeight] = useState(LABEL_HEIGHT);
  const [printTemplate, setPrintTemplate] = useState('classic');
  const [printQr, setPrintQr] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const [customFields, setCustomFields] = useState(loadCustomFields);
  const [newFieldName, setNewFieldName] = useState('');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupFile, setBackupFile] = useState(null);

  const { toasts, addToast, removeToast } = useToast();

  const currentRecords = serverMode ? serverRecords : records;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    const handleAuthChange = () => {
      if (!isAuthenticated()) {
        setServerMode(false);
        setAuthUser(null);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, [theme]);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !serverMode && undoStack.length > 0) {
        e.preventDefault();
        undo();
        addToast('عملیات لغو شد', 'success');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, undoStack, serverMode, addToast]);

  const toggleTheme = () => setTheme(p => p === 'light' ? 'dark' : 'light');
  const toggleSidebar = () => setSidebarOpen(p => !p);
  const resetForm = () => setEditIndex(null);

  const handleTabChange = useCallback((t) => {
    setTab(t);
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
      setSelected(new Set(filtered.map((_, i) => currentRecords.indexOf(filtered[i]))));
    }
  };

  const getSortedRecords = useCallback(() => {
    let result = currentRecords;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = currentRecords.filter(r =>
        Object.values(r).some(v =>
          Array.isArray(v)
            ? v.some(item => String(item).toLowerCase().includes(q))
            : String(v).toLowerCase().includes(q)
        )
      );
    }
    if (sortBy) {
      result = [...result].sort((a, b) => {
        const aVal = String(a[sortBy] || '').toLowerCase();
        const bVal = String(b[sortBy] || '').toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    }
    return result;
  }, [search, sortBy, sortOrder, currentRecords]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('asc'); }
    setPage(1);
  };

  const fr = getSortedRecords();
  const totalPages = Math.max(1, Math.ceil(fr.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = fr.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const serverOp = async (fn) => {
    if (!serverMode) return true;
    setServerLoading(true);
    try { await fn(); setServerLoading(false); return true; }
    catch (err) { addToast(err.message, 'error'); setServerLoading(false); return false; }
  };

  const handleSubmit = async (recordData) => {
    let ok = true;
    if (editIndex !== null) {
      if (serverMode) {
        const record = currentRecords[editIndex];
        ok = await serverOp(async () => {
          const updated = await api.updateRecord(record.id, recordData);
          setServerRecords(p => p.map((r, i) => i === editIndex ? { ...updated } : r));
        });
      } else {
        updateRecord(editIndex, recordData);
      }
      setEditIndex(null);
      if (ok) addToast('رکورد با موفقیت ویرایش شد', 'success');
    } else {
      if (serverMode) {
        ok = await serverOp(async () => {
          const created = await api.createRecord(recordData);
          setServerRecords(p => [created, ...p]);
        });
      } else {
        addRecord(recordData);
      }
      if (ok) addToast('رکورد با موفقیت اضافه شد', 'success');
    }
    if (ok) setTab('records');
  };

  const handleEdit = (i) => { setEditIndex(i); setTab('add'); };
  const handleView = (i) => { setViewIndex(i); setTab('view'); };

  const handleDelete = async () => {
    const count = selected.size;
    if (count === 0) return;

    let ok = true;
    if (serverMode) {
      const ids = [...selected].map(i => currentRecords[i].id).filter(Boolean);
      ok = await serverOp(async () => {
        await api.deleteRecords(ids);
        setServerRecords(p => p.filter((_, i) => !selected.has(i)));
      });
    } else {
      deleteRecords(selected);
    }
    setSelected(new Set());
    if (ok) addToast(`${count} رکورد با موفقیت حذف شد`, 'success');
  };

  const handleImport = async (imported) => {
    let ok = true;
    if (serverMode) {
      ok = await serverOp(async () => {
        for (const r of imported) {
          const created = await api.createRecord(r);
          setServerRecords(p => [created, ...p]);
        }
      });
    } else {
      setRecords(p => [...p, ...imported]);
    }
    if (ok) setTab('records');
  };

  const handleReorder = (from, to) => {
    if (serverMode) return; // server handles order via created_at
    reorderRecords(from, to);
  };

  const handlePrint = () => {
    const sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    exportUtils.printLabels(sel, FIELDS, printCols, printWidth, printHeight, printTemplate, printQr);
    const entry = {
      date: new Date().toLocaleDateString('fa-IR'),
      time: new Date().toLocaleTimeString('fa-IR'),
      count: sel.length, codes: sel.map(r => r.code),
    };
    const updated = [entry, ...printHistory].slice(0, 50);
    setPrintHistory(updated); saveHistory(updated);
  };

  const handleExcel = () => {
    const sel = currentRecords.filter((_, i) => selected.has(i));
    if (!sel.length) { addToast('حداقل یک رکورد انتخاب کنید', 'error'); return; }
    exportUtils.downloadExcel(sel, FIELDS);
    addToast('فایل اکسل با موفقیت ساخته شد', 'success');
  };

  const handlePDF = async () => {
    const el = document.getElementById('preview-grid');
    if (!el) return;
    try { await exportUtils.downloadPDF(el); addToast('فایل PDF با موفقیت ساخته شد', 'success'); }
    catch { addToast('خطا در ساخت PDF', 'error'); }
  };

  const handleDragStart = (e, idx) => { setDragIndex(idx); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== dropIdx) {
      handleReorder(dragIndex, dropIdx);
      setSelected(new Set());
    }
    setDragIndex(null);
  };

  const clearHistory = () => { setPrintHistory([]); saveHistory([]); addToast('تاریخچه پاک شد', 'success'); };

  const handleBackup = () => {
    const blob = new Blob([JSON.stringify(currentRecords, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `label-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    addToast('پشتیبان با موفقیت ساخته شد', 'success');
  };

  const handleRestore = async () => {
    if (!backupFile) { addToast('فایل را انتخاب کنید', 'error'); return; }
    try {
      const text = await backupFile.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('فرمت فایل نامعتبر');

      if (serverMode) {
        await serverOp(async () => {
          await api.restore(data);
          const refreshed = await api.getRecords();
          setServerRecords(refreshed);
        });
      } else {
        setRecords(data);
      }
      setShowBackupModal(false);
      addToast(`${data.length} رکورد با موفقیت بازیابی شد`, 'success');
    } catch (err) {
      addToast('خطا در بازیابی: ' + err.message, 'error');
    }
  };

  const handleLogin = (user) => {
    if (user === null) {
      setLocalMode(true);
      localStorage.setItem('local_mode', 'true');
      setServerMode(false);
      setAuthUser(null);
      setTab('records');
    } else {
      setLocalMode(false);
      localStorage.setItem('local_mode', 'false');
      setAuthUser(user);
      setServerMode(true);
      setTab('records');
      setServerLoading(true);
      api.getRecords().then(data => setServerRecords(data)).catch(() => {}).finally(() => setServerLoading(false));
    }
  };

  const handleLoginGoToServer = () => {
    setLocalMode(false);
    localStorage.removeItem('local_mode');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setLocalMode(true);
    localStorage.setItem('local_mode', 'true');
    setServerMode(false);
    setAuthUser(null);
    setTab('records');
    addToast('خروج با موفقیت انجام شد', 'success');
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;
    const key = newFieldName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customFields.some(f => f.key === key)) { addToast('این فیلد قبلا اضافه شده', 'error'); return; }
    const field = { key, label: newFieldName.trim(), fa: newFieldName.trim(), placeholder: '', isCustom: true };
    const updated = [...customFields, field];
    setCustomFields(updated);
    saveCustomFields(updated);
    setNewFieldName('');
    addToast('فیلد جدید اضافه شد', 'success');
  };

  const handleRemoveCustomField = (key) => {
    const updated = customFields.filter(f => f.key !== key);
    setCustomFields(updated);
    saveCustomFields(updated);
    addToast('فیلد حذف شد', 'success');
  };

  const fr_all = getSortedRecords();
  const availLabels = editIndex !== null
    ? currentRecords.filter(r => r.code !== currentRecords[editIndex]?.code)
    : currentRecords;
  const editRecord = editIndex !== null ? currentRecords[editIndex] : null;
  const selectedRecords = currentRecords.filter((_, i) => selected.has(i));

  if (!serverMode && !authUser && !getAuthUser() && !localMode) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (serverMode && serverLoading && currentRecords.length === 0) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="sidebar-brand-icon" style={{ margin: '0 auto 1rem', width: 64, height: 64, fontSize: '2rem', animation: 'fadeIn 0.5s' }}>
            <i className="ti ti-loader"></i>
          </div>
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

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
          recordCount={currentRecords.length}
          onToggleSidebar={toggleSidebar}
          onSettingsClick={() => setTab('settings')}
          onProfileClick={() => setTab('profile')}
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
                {tab === 'profile' && 'پروفایل'}
                {tab === 'settings' && 'تنظیمات'}
                {tab === 'reports' && 'گزارش‌ها و آمار'}
              </h1>
              <p className="page-subtitle">ابزار مدیریت اسناد و چاپ برچسب</p>
            </div>

            <div className="d-flex gap-2 flex-wrap align-items-center">
              {tab === 'preview' && selected.size > 0 && (
                <>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowPrintSettings(true)}>
                    <i className="ti ti-settings"></i> تنظیمات چاپ
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handleExcel}>
                    <i className="ti ti-file-excel"></i> اکسل
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={handlePDF}>
                    <i className="ti ti-file-type-pdf"></i> PDF
                  </button>
                  <button className="btn btn-success btn-sm" onClick={handlePrint}>
                    <i className="ti ti-printer"></i> چاپ
                  </button>
                </>
              )}
              {tab === 'view' && viewIndex !== null && (
                <button className="btn btn-outline btn-sm" onClick={() => { setViewIndex(null); setTab('records'); setSelected(new Set([viewIndex])); }}>
                  <i className="ti ti-arrow-right"></i> بازگشت
                </button>
              )}
              {(tab === 'records' || tab === 'add' || tab === 'import') && (
                <button className="btn btn-outline btn-sm" onClick={() => setTab('preview')}>
                  <i className="ti ti-printer"></i> پیش‌نمایش
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setShowBackupModal(true)}>
                <i className="ti ti-cloud-download"></i> پشتیبان
              </button>
              <button className="btn btn-outline btn-sm" onClick={serverMode ? handleLogout : handleLoginGoToServer}>
                <i className={`ti ${serverMode ? 'ti-logout' : 'ti-server'}`}></i>
                {serverMode ? 'خروج' : 'ورود به سرور'}
              </button>
            </div>
          </div>

          {tab !== 'view' && tab !== 'settings' && tab !== 'profile' && tab !== 'reports' && (
            <StatsCards records={currentRecords} selected={selected} filtered={fr_all} />
          )}

          {tab === 'records' && (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div className="d-flex gap-2 align-items-center flex-wrap">
                  <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>مرتب‌سازی:</span>
                  {['code', 'project', 'date', 'amount'].map(f => (
                    <button key={f} className={`sort-btn ${sortBy === f ? 'active' : ''}`} onClick={() => handleSort(f)}>
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
                  <div className="empty-icon"><i className="ti ti-file-off"></i></div>
                  <h3 style={{ marginBottom: '0.5rem' }}>هنوز رکوردی وجود ندارد</h3>
                  <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>رکورد جدید اضافه کنید یا فایل CSV وارد نمایید</p>
                  <button className="btn btn-primary" onClick={() => setTab('add')}>
                    <i className="ti ti-plus"></i> افزودن رکورد
                  </button>
                </div>
              ) : (
                <>
                  <div className="card-grid">
                    {pagedRecords.map((r) => {
                      const realIdx = currentRecords.indexOf(r);
                      return (
                        <RecordCard
                          key={serverMode ? r.id : realIdx}
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
                      <button className="pagination-btn" disabled={safePage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>قبلی</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button key={p} className={`pagination-btn ${p === safePage ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                      ))}
                      <button className="pagination-btn" disabled={safePage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>بعدی</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'add' && (
            <RecordForm
              editRecord={editRecord}
              editIndex={editIndex}
              availableLabels={availLabels}
              isDuplicateCode={isDuplicateCode}
              onSubmit={handleSubmit}
              onCancel={() => { setEditIndex(null); setTab('records'); }}
              addToast={addToast}
              customFields={customFields}
              serverMode={serverMode}
            />
          )}

          {tab === 'import' && (
            <ImportCSV onImport={handleImport} importMsg={importMsg} setImportMsg={setImportMsg} addToast={addToast} />
          )}

          {tab === 'view' && viewIndex !== null && (
            <ViewDetail
              record={currentRecords[viewIndex]}
              relatedRecords={getRelatedLabels(currentRecords[viewIndex].related)}
              onEdit={() => handleEdit(viewIndex)}
              onNavigateToRelated={(rel) => {
                const idx = currentRecords.indexOf(rel);
                if (idx !== -1) setViewIndex(idx);
              }}
            />
          )}

          {tab === 'preview' && (
            <LabelPreview selectedRecords={selectedRecords} onGoToRecords={() => setTab('records')} />
          )}

          {tab === 'history' && (
            <HistoryTab printHistory={printHistory} clearHistory={clearHistory} />
          )}

          {tab === 'reports' && (
            <ReportsTab records={currentRecords} />
          )}

          {tab === 'profile' && (
            <ProfileTab authUser={authUser} serverMode={serverMode} onLogin={handleLoginGoToServer} />
          )}

          {tab === 'settings' && (
            <SettingsTab
              customFields={customFields}
              onAddField={handleAddCustomField}
              onRemoveField={handleRemoveCustomField}
              newFieldName={newFieldName}
              onNewFieldNameChange={setNewFieldName}
              serverMode={serverMode}
              authUser={authUser}
            />
          )}
        </div>
      </main>

      <Toast toasts={toasts} onRemove={removeToast} />

      {showPrintSettings && (
        <div className="modal-overlay" onClick={() => setShowPrintSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>تنظیمات چاپ</h3>
              <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowPrintSettings(false)}></i>
            </div>
            <div className="form-group">
              <label className="form-label">قالب برچسب</label>
              <select className="form-input" value={printTemplate} onChange={e => setPrintTemplate(e.target.value)}>
                <option value="classic">کلاسیک</option>
                <option value="compact">فشرده</option>
                <option value="detailed">جزئیات کامل</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">تعداد برچسب در هر ردیف</label>
              <select className="form-input" value={printCols} onChange={e => setPrintCols(Number(e.target.value))}>
                <option value={2}>۲ عدد</option>
                <option value={3}>۳ عدد</option>
                <option value={4}>۴ عدد</option>
              </select>
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
            <button className="btn btn-primary w-100" onClick={() => setShowPrintSettings(false)}>تایید</button>
          </div>
        </div>
      )}

      {showBackupModal && (
        <div className="modal-overlay" onClick={() => setShowBackupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>پشتیبان‌گیری و بازیابی</h3>
              <i className="ti ti-x" style={{ cursor: 'pointer', fontSize: '1.5rem' }} onClick={() => setShowBackupModal(false)}></i>
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>خروجی پشتیبان</h4>
              <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: '0.9rem' }}>
                {currentRecords.length} رکورد برای پشتیبان‌گیری آماده است
              </p>
              <button className="btn btn-primary w-100" onClick={handleBackup}>
                <i className="ti ti-download"></i> دانلود پشتیبان (JSON)
              </button>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>بازیابی از پشتیبان</h4>
              <input
                type="file"
                accept=".json"
                className="form-input"
                style={{ marginBottom: '1rem' }}
                onChange={e => setBackupFile(e.target.files[0])}
              />
              <button className="btn btn-success w-100" onClick={handleRestore}>
                <i className="ti ti-upload"></i> بازیابی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryTab({ printHistory, clearHistory }) {
  return (
    <div className="fade-in">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <span style={{ opacity: 0.7 }}>
          {printHistory.length > 0 ? `${printHistory.length} بار چاپ انجام شده` : 'هنوز چاپی انجام نشده'}
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
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, direction: 'ltr' }}>{entry.date} - {entry.time}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: 300 }}>
                {entry.codes.map(code => (
                  <span key={code} style={{
                    padding: '0.15rem 0.5rem', background: 'rgba(115, 103, 240, 0.1)',
                    color: 'var(--primary)', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'monospace',
                  }}>{code}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ customFields, onAddField, onRemoveField, newFieldName, onNewFieldNameChange, serverMode, authUser }) {
  return (
    <div className="fade-in">
      <div className="form-card mb-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon info"><i className="ti ti-server"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>اتصال به سرور</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              {serverMode ? `متصل به عنوان ${authUser?.username || 'کاربر'}` : 'حالت محلی (localStorage)'}
            </p>
          </div>
        </div>
      </div>

      <div className="form-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-icon warning"><i className="ti ti-list-details"></i></div>
          <div>
            <h4 style={{ margin: 0 }}>فیلدهای سفارشی</h4>
            <p style={{ opacity: 0.6, margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              فیلدهای دلخواه خود را به رکوردها اضافه کنید
            </p>
          </div>
        </div>

        {customFields.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            {customFields.map(f => (
              <div key={f.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.75rem 1rem', background: 'var(--bg-body)',
                borderRadius: 8, marginBottom: '0.5rem',
              }}>
                <span>{f.fa}</span>
                <i className="ti ti-trash" style={{ cursor: 'pointer', opacity: 0.5, color: 'var(--danger)' }}
                  onClick={() => onRemoveField(f.key)}></i>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex gap-2">
          <input
            type="text"
            className="form-input"
            value={newFieldName}
            onChange={e => onNewFieldNameChange(e.target.value)}
            placeholder="نام فیلد جدید..."
            style={{ marginBottom: 0 }}
            onKeyDown={e => e.key === 'Enter' && onAddField()}
          />
          <button className="btn btn-primary" onClick={onAddField}>
            <i className="ti ti-plus"></i> افزودن
          </button>
        </div>
      </div>
    </div>
  );
}
