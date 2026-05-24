import { useState, useEffect, useRef } from 'react';

const SECTIONS = [
  {
    title: 'اصلی',
    key: 'main',
    items: [
      { tab: 'dashboard', icon: 'ti-layout-dashboard', label: 'داشبورد' },
      { tab: 'records', icon: 'ti-files', label: 'سوابق' },
    ],
  },
  {
    title: 'عملیات',
    key: 'actions',
    viewerHide: true,
    items: [
      { tab: 'add', icon: 'ti-plus', label: 'افزودن رکورد' },
      { tab: 'import', icon: 'ti-upload', label: 'ورود CSV' },
    ],
  },
  {
    title: 'ابزارها',
    key: 'tools',
    items: [
      { tab: 'preview', icon: 'ti-printer', label: 'پیش‌نمایش برچسب' },
      { tab: 'reports', icon: 'ti-chart-bar', label: 'گزارش‌ها' },
      { tab: 'history', icon: 'ti-history', label: 'تاریخچه چاپ' },
    ],
  },
  {
    title: 'حساب',
    key: 'account',
    items: [
      { tab: 'profile', icon: 'ti-user', label: 'پروفایل' },
      { tab: 'settings', icon: 'ti-settings', label: 'تنظیمات' },
    ],
  },
];

const ACTIVITY_ICONS = {
  create: 'ti-plus',
  update: 'ti-edit',
  delete: 'ti-trash',
  restore: 'ti-refresh',
  'bulk-edit': 'ti-edit',
  reorder: 'ti-arrows-sort',
};

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem('sidebar-collapsed-sections') || '{}'); } catch { return {}; }
}
function saveCollapsed(s) {
  try { localStorage.setItem('sidebar-collapsed-sections', JSON.stringify(s)); } catch {}
}

export default function Sidebar({ tab, onTabChange, sidebarOpen, onClose, onResetForm, isViewer, serverMode, activityLog, compact, onToggleCompact, onRefreshActivity }) {
  const [collapsedSections, setCollapsedSections] = useState(loadCollapsed);
  const [activityRefreshing, setActivityRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleSection = (key) => {
    setCollapsedSections(prev => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  };

  useEffect(() => {
    if (!serverMode || !onRefreshActivity) return;
    const id = setInterval(() => {
      setActivityRefreshing(true);
      onRefreshActivity().finally(() => setActivityRefreshing(false));
    }, 15000);
    intervalRef.current = id;
    return () => { clearInterval(id); intervalRef.current = null; };
  }, [serverMode, onRefreshActivity]);

  const handleClick = (t) => {
    onTabChange(t);
    if (t !== 'add') onResetForm();
    onClose();
  };

  const visibleSections = SECTIONS
    .map(s => ({
      ...s,
      items: s.items.filter(item => !(isViewer && s.viewerHide)),
    }))
    .filter(s => s.items.length > 0);

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''} ${compact ? 'sidebar-narrow' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="ti ti-tags"></i>
          </div>
          <span className="sidebar-brand-text">Label Studio</span>
        </div>

        <nav className="sidebar-nav">
          {visibleSections.map(section => (
            <div key={section.key} className="nav-section">
              <div
                className={`nav-section-title ${collapsedSections[section.key] ? 'collapsed' : ''}`}
                onClick={() => toggleSection(section.key)}
              >
                <span>{section.title}</span>
                <i className={`ti ti-chevron-down section-arrow ${collapsedSections[section.key] ? 'rotated' : ''}`}></i>
              </div>
              <div className={`nav-section-body ${collapsedSections[section.key] ? 'hidden' : ''}`}>
                {section.items.map(item => (
                  <div
                    key={item.tab}
                    className={`nav-item ${tab === item.tab ? 'active' : ''}`}
                    onClick={() => handleClick(item.tab)}
                    title={item.label}
                  >
                    <i className={`ti ${item.icon}`}></i>
                    <span className="nav-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {serverMode && activityLog.length > 0 && (
          <div className="sidebar-activity">
            <div className="nav-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>فعالیت‌ها</span>
                <span className={`live-indicator ${activityRefreshing ? 'refreshing' : ''}`} title="بروزرسانی خودکار هر ۱۵ ثانیه"></span>
              </div>
            </div>
            <div className="activity-feed">
              {activityLog.slice(0, 8).map((a, i) => (
                <div key={i} className="activity-item" title={`${a.action}${a.details ? ': ' + a.details : ''}`}>
                  <i className={`ti ${ACTIVITY_ICONS[a.action] || 'ti-info-circle'}`}></i>
                  <div className="activity-body">
                    <span className="activity-action">{a.action}</span>
                    {a.details && <span className="activity-details">{a.details}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <button className="sidebar-compact-btn" onClick={onToggleCompact} title={compact ? 'حالت گسترده' : 'حالت جمع‌وجور'}>
            <i className={`ti ${compact ? 'ti-chevrons-right' : 'ti-chevrons-left'}`}></i>
          </button>
          <span className="sidebar-version">Version 2.0.0</span>
        </div>
      </aside>
    </>
  );
}
