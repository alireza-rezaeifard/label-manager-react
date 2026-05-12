const NAV_ITEMS = [
  { tab: 'records', icon: 'ti-files', label: 'سوابق' },
  { tab: 'add', icon: 'ti-plus', label: 'افزودن رکورد' },
  { tab: 'import', icon: 'ti-upload', label: 'ورود CSV' },
  { tab: 'preview', icon: 'ti-printer', label: 'پیش‌نمایش برچسب' },
  { tab: 'history', icon: 'ti-history', label: 'تاریخچه چاپ' },
];

export default function Sidebar({ tab, onTabChange, sidebarOpen, onClose, onResetForm }) {
  const handleClick = (t) => {
    onTabChange(t);
    if (t !== 'add') onResetForm();
    onClose();
  };

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
          {NAV_ITEMS.map(item => (
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

        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>Version 2.0.0</div>
        </div>
      </aside>
    </>
  );
}
