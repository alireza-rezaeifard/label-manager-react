import { useState } from 'react';

export default function Header({ search, onSearchChange, theme, onToggleTheme, onToggleSidebar, onSettingsClick, onProfileClick }) {
  const [notifications] = useState([]);

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onToggleSidebar}>
          <i className="ti ti-menu-2"></i>
        </button>
        <div className="search-box">
          <i className="ti ti-search"></i>
          <input
            type="text"
            placeholder="جستجو..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-btn" title="اعلان‌ها">
          <i className="ti ti-bell"></i>
          {notifications.length > 0 && (
            <span className="badge">{notifications.length}</span>
          )}
        </button>
        <button className="header-icon-btn" onClick={onSettingsClick} title="تنظیمات">
          <i className="ti ti-settings"></i>
        </button>
        <button className="theme-toggle" onClick={onToggleTheme} title={theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}>
          <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`}></i>
        </button>
        <div className="user-dropdown" onClick={onProfileClick} style={{ cursor: 'pointer' }}>
          <div className="user-avatar">A</div>
          <span style={{ fontWeight: 500 }}>Admin</span>
          <i className="ti ti-chevron-down"></i>
        </div>
      </div>
    </header>
  );
}
