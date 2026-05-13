const NAV_ITEMS = [
  { tab: 'records', icon: 'ti-files', label: 'سوابق' },
  { tab: 'add', icon: 'ti-plus', label: 'افزودن رکورد' },
  { tab: 'import', icon: 'ti-upload', label: 'ورود CSV' },
  { tab: 'preview', icon: 'ti-printer', label: 'پیش‌نمایش برچسب' },
  { tab: 'reports', icon: 'ti-chart-bar', label: 'گزارش‌ها' },
  { tab: 'history', icon: 'ti-history', label: 'تاریخچه چاپ' },
  { tab: 'profile', icon: 'ti-user', label: 'پروفایل' },
  { tab: 'settings', icon: 'ti-settings', label: 'تنظیمات' },
];

const VIEWER_HIDE = new Set(['add', 'import']);

const ACTIVITY_ICONS = {
  create: 'ti-plus',
  update: 'ti-edit',
  delete: 'ti-trash',
  restore: 'ti-refresh',
  'bulk-edit': 'ti-edit',
  reorder: 'ti-arrows-sort',
};

export default function Sidebar({ tab, onTabChange, sidebarOpen, onClose, onResetForm, isViewer, serverMode, activityLog }) {
  const handleClick = (t) => {
    onTabChange(t);
    if (t !== 'add') onResetForm();
    onClose();
  };

  const visibleItems = NAV_ITEMS.filter(item => !(isViewer && VIEWER_HIDE.has(item.tab)));

  return (
    <>
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <i className="ti ti-tags"></i>
          </div>
          <span className="sidebar-brand-text">Label Studio</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-title">Main Menu</div>
          {visibleItems.map(item => (
            <div
              key={item.tab}
              className={`nav-item ${tab === item.tab ? 'active' : ''}`}
              onClick={() => handleClick(item.tab)}
            >
              <i className={`ti ${item.icon}`}></i>
              <span>{item.label}</span>
            </div>
          ))}

          <div className="nav-section-title" style={{ marginTop: '1rem' }}>System</div>
          <div className={`nav-item ${tab === 'view' ? 'active' : ''}`} onClick={() => { onTabChange('records'); onClose(); }}>
            <i className="ti ti-layout-dashboard"></i>
            <span>داشبورد</span>
          </div>
        </nav>

        {serverMode && activityLog.length > 0 && (
          <div className="sidebar-activity">
            <div className="nav-section-title">Recent Activity</div>
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

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Version 2.0.0</div>
        </div>
      </aside>
    </>
  );
}
