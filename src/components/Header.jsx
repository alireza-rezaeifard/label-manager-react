export default function Header({ search, onSearchChange, theme, onToggleTheme, recordCount, onToggleSidebar }) {
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
        <button className="header-icon-btn">
          <i className="ti ti-bell"></i>
          <span className="badge">{recordCount}</span>
        </button>
        <button className="header-icon-btn">
          <i className="ti ti-settings"></i>
        </button>
        <button className="theme-toggle" onClick={onToggleTheme}>
          <i className={`ti ${theme === 'light' ? 'ti-moon' : 'ti-sun'}`}></i>
        </button>
        <div className="user-dropdown">
          <div className="user-avatar">A</div>
          <span style={{ fontWeight: 500 }}>Admin</span>
          <i className="ti ti-chevron-down"></i>
        </div>
      </div>
    </header>
  );
}
