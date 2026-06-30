import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import type { ActivityEntry } from '../types';
import {
  LayoutDashboard,
  Files,
  Plus,
  Upload,
  Printer,
  BarChart3,
  History,
  User,
  Settings,
  Pencil,
  Trash2,
  RefreshCw,
  ArrowUpDown,
  Info,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Tags,
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'اصلی',
    key: 'main',
    items: [
      { tab: 'dashboard', icon: LayoutDashboard, label: 'داشبورد' },
      { tab: 'records', icon: Files, label: 'سوابق' },
    ],
  },
  {
    title: 'عملیات',
    key: 'actions',
    viewerHide: true,
    items: [
      { tab: 'add', icon: Plus, label: 'افزودن رکورد' },
      { tab: 'import', icon: Upload, label: 'ورود CSV' },
    ],
  },
  {
    title: 'ابزارها',
    key: 'tools',
    items: [
      { tab: 'preview', icon: Printer, label: 'پیشنمایش برچسب' },
      { tab: 'reports', icon: BarChart3, label: 'گزارشها' },
      { tab: 'history', icon: History, label: 'تاریخچه چاپ' },
    ],
  },
  {
    title: 'حساب',
    key: 'account',
    items: [
      { tab: 'profile', icon: User, label: 'پروفایل' },
      { tab: 'settings', icon: Settings, label: 'تنظیمات' },
    ],
  },
];

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  create: <Plus className="h-3.5 w-3.5" />,
  update: <Pencil className="h-3.5 w-3.5" />,
  delete: <Trash2 className="h-3.5 w-3.5" />,
  restore: <RefreshCw className="h-3.5 w-3.5" />,
  'bulk-edit': <Pencil className="h-3.5 w-3.5" />,
  reorder: <ArrowUpDown className="h-3.5 w-3.5" />,
};

function loadCollapsed() {
  try { return JSON.parse(localStorage.getItem('sidebar-collapsed-sections') || '{}'); } catch { return {}; }
}
function saveCollapsed(s: Record<string, boolean>) {
  try { localStorage.setItem('sidebar-collapsed-sections', JSON.stringify(s)); } catch {}
}

interface SidebarProps {
  tab: string;
  onTabChange: (tab: string) => void;
  sidebarOpen: boolean;
  onClose: () => void;
  onResetForm: () => void;
  isViewer: boolean;
  serverMode: boolean;
  activityLog: ActivityEntry[];
  compact: boolean;
  onToggleCompact: () => void;
  onRefreshActivity?: () => void;
}

export default function Sidebar({ tab, onTabChange, sidebarOpen, onClose, onResetForm, isViewer, serverMode, activityLog, compact, onToggleCompact, onRefreshActivity: _onRefreshActivity }: SidebarProps) {
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(loadCollapsed);

  const toggleSection = (key: string) => {
    setCollapsedSections((prev: Record<string, boolean>) => {
      const next = { ...prev, [key]: !prev[key] };
      saveCollapsed(next);
      return next;
    });
  };

  const handleClick = (t: string) => {
    onTabChange(t);
    if (t !== 'add') onResetForm();
    onClose();
  };

  const visibleSections = SECTIONS
    .map(s => ({
      ...s,
      items: s.items.filter(_item => !(isViewer && s.viewerHide)),
    }))
    .filter(s => s.items.length > 0);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${sidebarOpen ? 'show' : ''} ${compact ? 'sidebar-narrow' : ''}`}>
        <div className="sidebar-brand">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="sidebar-brand-icon"
          >
            <Tags className="h-5 w-5" />
          </motion.div>
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
                <ChevronDown className={`h-3.5 w-3.5 section-arrow ${collapsedSections[section.key] ? 'rotated' : ''}`} />
              </div>
              <AnimatePresence initial={false}>
                {!collapsedSections[section.key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="nav-section-body"
                  >
                    {section.items.map(item => {
                      const Icon = item.icon;
                      return (
                        <motion.div
                          key={item.tab}
                          whileHover={{ x: -2 }}
                          className={`nav-item ${tab === item.tab ? 'active' : ''}`}
                          onClick={() => handleClick(item.tab)}
                          title={item.label}
                        >
                          <Icon className="h-5 w-5" style={{ marginLeft: '1rem', minWidth: '20px' }} />
                          <span className="nav-label">{item.label}</span>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {serverMode && activityLog.length > 0 && (
          <div className="sidebar-activity">
            <div className="nav-section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>فعالیتها</span>
                <span className="live-indicator" title="بروزرسانی خودکار هر ۱۵ ثانیه"></span>
              </div>
            </div>
            <div className="activity-feed">
              {activityLog.slice(0, 8).map((a: ActivityEntry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="activity-item"
                  title={`${a.action}${a.details ? ': ' + a.details : ''}`}
                >
                  <div className="flex-shrink-0 opacity-55">
                    {ACTIVITY_ICONS[a.action] || <Info className="h-3.5 w-3.5" />}
                  </div>
                  <div className="activity-body">
                    <span className="activity-action">{a.action}</span>
                    {a.details && <span className="activity-details">{a.details}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="sidebar-footer">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleCompact} className="sidebar-compact-btn">
                {compact ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {compact ? 'حالت گسترده' : 'حالت جمعوجور'}
            </TooltipContent>
          </Tooltip>
          <span className="sidebar-version">Version 2.0.0</span>
        </div>
      </aside>
    </TooltipProvider>
  );
}
