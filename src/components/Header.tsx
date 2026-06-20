import { useState } from 'react';
import type { ConnectionStatus } from '../hooks/useWebSocket';

interface HeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  theme: string;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  onShortcutsHelp: () => void;
  connectionStatus?: ConnectionStatus;
}

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; icon: string }> = {
  connected: { color: '#28c76f', label: 'متصل', icon: 'ti-wifi' },
  connecting: { color: '#ff9f43', label: 'در حال اتصال...', icon: 'ti-loader' },
  disconnected: { color: '#ea5455', label: 'قطع شده', icon: 'ti-wifi-off' },
  reconnecting: { color: '#ff9f43', label: 'در حال اتصال مجدد...', icon: 'ti-refresh' },
};

export default function Header({ search, onSearchChange, theme, onToggleTheme, onToggleSidebar, onSettingsClick, onProfileClick, onShortcutsHelp, connectionStatus }: HeaderProps) {
  const [notifications] = useState([]);
  const statusInfo = connectionStatus ? STATUS_CONFIG[connectionStatus] : null;

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
        {statusInfo && (
          <div className="connection-status" title={statusInfo.label} style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.25rem 0.6rem', borderRadius: 12, fontSize: '0.75rem',
            background: `${statusInfo.color}18`, color: statusInfo.color,
          }}>
            <i className={`ti ${statusInfo.icon}`} style={{ fontSize: '0.85rem' }}></i>
            <span>{statusInfo.label}</span>
          </div>
        )}
        <button className="header-icon-btn" onClick={onShortcutsHelp} title="میانبرهای صفحه کلید (Ctrl+/)">
          <i className="ti ti-keyboard"></i>
        </button>
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
