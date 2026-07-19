import { useState } from 'react';
import type { ConnectionStatus } from '../hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import {
  Menu,
  Search,
  Wifi,
  WifiOff,
  Loader2,
  RefreshCw,
  Keyboard,
  Bell,
  Settings,
  Moon,
  Sun,
  ChevronDown,
  User,
} from 'lucide-react';

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

const STATUS_CONFIG: Record<ConnectionStatus, { color: string; label: string; icon: React.ReactNode }> = {
  connected: { color: '#10b981', label: 'متصل', icon: <Wifi className="h-3.5 w-3.5" /> },
  connecting: { color: '#f59e0b', label: 'در حال اتصال...', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  disconnected: { color: '#ef4444', label: 'قطع شده', icon: <WifiOff className="h-3.5 w-3.5" /> },
  reconnecting: { color: '#f59e0b', label: 'در حال اتصال مجدد...', icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" /> },
};

export default function Header({ search, onSearchChange, theme, onToggleTheme, onToggleSidebar, onSettingsClick, onProfileClick, onShortcutsHelp, connectionStatus }: HeaderProps) {
  const [notifications] = useState([]);
  const statusInfo = connectionStatus ? STATUS_CONFIG[connectionStatus] : null;

  return (
    <TooltipProvider delayDuration={300}>
      <header className="header">
        <div className="header-left">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="menu-toggle">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="search-box">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-40" />
            <Input
              type="text"
              placeholder="جستجو..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="border-0 bg-transparent pl-10 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="header-right">
          {statusInfo && (
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
              style={{ background: `${statusInfo.color}15`, color: statusInfo.color }}
              title={statusInfo.label}
            >
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </div>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onShortcutsHelp}>
                <Keyboard className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>میانبرهای صفحه کلید (Ctrl+/)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.6rem]">
                    {notifications.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>اعلانها</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={onSettingsClick}>
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>تنظیمات</TooltipContent>
          </Tooltip>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTheme}
            className="theme-toggle header-icon-btn"
            title={theme === 'light' ? 'حالت تاریک' : 'حالت روشن'}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="user-dropdown" onClick={onProfileClick}>
                <div className="user-avatar">A</div>
                <span className="font-medium text-sm">Admin</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>حساب کاربری</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onProfileClick}>
                <User className="h-4 w-4" />
                پروفایل
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onSettingsClick}>
                <Settings className="h-4 w-4" />
                تنظیمات
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </TooltipProvider>
  );
}
