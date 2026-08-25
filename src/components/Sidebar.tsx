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
  Shield,
  Bot,
  Layers,
} from 'lucide-react';

const SECTIONS = [
  {
    title: 'اصلی',
    key: 'main',
    numeral: 'I',
    items: [
      { tab: 'dashboard', icon: LayoutDashboard, label: 'داشبورد' },
      { tab: 'records', icon: Files, label: 'سوابق' },
    ],
  },
  {
    title: 'عملیات',
    key: 'actions',
    numeral: 'II',
    viewerHide: true,
    items: [
      { tab: 'add', icon: Plus, label: 'افزودن رکورد' },
      { tab: 'import', icon: Upload, label: 'ورود CSV' },
    ],
  },
  {
    title: 'ابزارها',
    key: 'tools',
    numeral: 'III',
    items: [
      { tab: 'assistant', icon: Bot, label: 'دستیار هوشمند' },
      { tab: 'preview', icon: Printer, label: 'پیشنمایش برچسب' },
      { tab: 'reports', icon: BarChart3, label: 'گزارشها' },
      { tab: 'history', icon: History, label: 'تاریخچه چاپ' },
    ],
  },
  {
    title: 'فضای کاری',
    key: 'workspace',
    numeral: 'IV',
    items: [
      { tab: 'workspace', icon: Layers, label: 'مدیریت فضا' },
    ],
  },
  {
    title: 'حساب',
    key: 'account',
    numeral: 'V',
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
        {/* ── Brand ── */}
        <div className="sidebar-brand sb-brand">
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="sidebar-brand-icon sb-emblem"
          >
            <Tags className="h-5 w-5" />
            <div className="sb-emblem-ring" />
          </motion.div>
          <div className="sb-brand-text-wrap">
            <span className="sidebar-brand-text sb-brand-name">Label Studio</span>
            <span className="sb-brand-tagline">سیستم مدیریت برچسب</span>
          </div>
        </div>

        {/* ── Ornamental Divider ── */}
        <div className="sb-divider">
          <span className="sb-divider-line" />
          <span className="sb-divider-dot">&#9830;</span>
          <span className="sb-divider-line" />
        </div>

        {/* ── Navigation ── */}
        <nav className="sidebar-nav sb-nav">
          {visibleSections.map((section, sIdx) => (
            <div key={section.key} className="nav-section sb-section">
              <div
                className={`nav-section-title sb-section-title ${collapsedSections[section.key] ? 'collapsed' : ''}`}
                onClick={() => toggleSection(section.key)}
              >
                <div className="sb-section-left">
                  <span className="sb-section-numeral">{section.numeral}</span>
                  <span>{section.title}</span>
                </div>
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
                      const isActive = tab === item.tab;
                      return (
                        <motion.div
                          key={item.tab}
                          whileHover={{ x: -2 }}
                          className={`nav-item sb-nav-item ${isActive ? 'active' : ''}`}
                          onClick={() => handleClick(item.tab)}
                          title={item.label}
                        >
                          <div className={`sb-nav-icon-wrap ${isActive ? 'active' : ''}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="nav-label sb-nav-label">{item.label}</span>
                          {isActive && <div className="sb-nav-active-dot" />}
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        {/* ── Activity Feed ── */}
        {serverMode && activityLog.length > 0 && (
          <div className="sidebar-activity sb-activity">
            <div className="nav-section-title sb-section-title">
              <div className="sb-section-left">
                <span className="sb-section-numeral">V</span>
                <span>فعالیتها</span>
                <span className="sb-live-dot" title="بروزرسانی خودکار هر ۱۵ ثانیه" />
              </div>
            </div>
            <div className="activity-feed sb-feed">
              {activityLog.slice(0, 8).map((a: ActivityEntry, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="activity-item sb-act-item"
                  title={`${a.action}${a.details ? ': ' + a.details : ''}`}
                >
                  <div className="sb-act-line" />
                  <div className="sb-act-dot">
                    {ACTIVITY_ICONS[a.action] || <Info className="h-3 w-3" />}
                  </div>
                  <div className="activity-body sb-act-body">
                    <span className="activity-action sb-act-action">{a.action}</span>
                    {a.details && <span className="activity-details sb-act-details">{a.details}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="sidebar-footer sb-footer">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onToggleCompact} className="sidebar-compact-btn sb-compact-btn">
                {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {compact ? 'حالت گسترده' : 'حالت جمعوجور'}
            </TooltipContent>
          </Tooltip>
          <div className="sb-footer-info">
            <Shield className="sb-footer-icon" />
            <span className="sidebar-version sb-version">v2.0.0</span>
          </div>
        </div>

        <style>{`
          /* ══════════════════════════════════════════════════════════════
             Sidebar — Classic Badge Theme
             ══════════════════════════════════════════════════════════════ */

          /* ── Brand ── */
          .sb-brand {
            padding: 1.5rem 1.5rem 1rem !important;
            gap: 0.875rem !important;
          }

          .sb-emblem {
            position: relative !important;
          }

          .sb-emblem-ring {
            position: absolute;
            inset: -4px;
            border-radius: 14px;
            border: 1.5px dashed rgba(255, 255, 255, 0.25);
            pointer-events: none;
          }

          .sb-brand-text-wrap {
            display: flex;
            flex-direction: column;
            min-width: 0;
          }

          .sb-brand-name {
            font-weight: 800 !important;
            font-size: 1.125rem !important;
            letter-spacing: -0.01em;
            line-height: 1.2;
          }

          .sb-brand-tagline {
            font-size: 0.625rem;
            opacity: 0.35;
            font-weight: 500;
            margin-top: 1px;
            white-space: nowrap;
          }

          /* ── Ornamental Divider ── */
          .sb-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0 1.5rem;
            margin-bottom: 0.5rem;
          }

          .sb-divider-line {
            flex: 1;
            height: 1px;
            background: var(--border-color);
          }

          .sb-divider-dot {
            color: var(--text-color);
            opacity: 0.15;
            font-size: 0.5rem;
          }

          /* ── Navigation ── */
          .sb-nav {
            padding: 0.25rem 0.5rem !important;
          }

          .sb-section {
            margin-bottom: 0.25rem;
          }

          .sb-section-title {
            gap: 0.5rem !important;
            padding: 0.625rem 0.75rem !important;
            margin: 0 0.25rem !important;
            border-radius: 8px !important;
          }

          .sb-section-title:hover {
            background: var(--hover-bg);
          }

          .sb-section-left {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .sb-section-numeral {
            font-family: 'Georgia', 'Times New Roman', serif;
            font-size: 0.5625rem;
            font-weight: 700;
            color: var(--primary);
            opacity: 0.5;
            background: rgba(15, 118, 110, 0.06);
            padding: 0.1rem 0.3rem;
            border-radius: 3px;
            border: 1px solid rgba(15, 118, 110, 0.1);
            letter-spacing: 0.05em;
            min-width: 18px;
            text-align: center;
          }

          /* ── Nav Item ── */
          .sb-nav-item {
            gap: 0.625rem !important;
            padding: 0.625rem 0.75rem !important;
            margin: 0.125rem 0.25rem !important;
            border-radius: 8px !important;
            position: relative;
          }

          .sb-nav-item:hover {
            background: var(--hover-bg);
          }

          .sb-nav-item.active {
            background: rgba(15, 118, 110, 0.08) !important;
            color: var(--primary) !important;
            box-shadow: none !important;
          }

          .sb-nav-icon-wrap {
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--hover-bg);
            color: var(--text-color);
            opacity: 0.6;
            transition: all 0.2s;
            flex-shrink: 0;
          }

          .sb-nav-icon-wrap.active {
            background: linear-gradient(135deg, var(--primary), #14b8a6) !important;
            color: white !important;
            opacity: 1;
            box-shadow: 0 2px 8px rgba(15, 118, 110, 0.3);
          }

          .sb-nav-label {
            font-weight: 500 !important;
            font-size: 0.8125rem !important;
          }

          .sb-nav-item.active .sb-nav-label {
            font-weight: 600 !important;
            color: var(--primary);
          }

          .sb-nav-active-dot {
            position: absolute;
            left: -0.25rem;
            top: 50%;
            transform: translateY(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: var(--primary);
            box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.15);
          }

          /* ── Activity Feed ── */
          .sb-activity {
            padding: 0.5rem !important;
            margin-top: auto;
            border-top: 1px solid var(--border-color) !important;
          }

          .sb-live-dot {
            display: inline-block;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--success);
            animation: sb-pulse 2s infinite;
          }

          @keyframes sb-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }

          .sb-feed {
            padding: 0.25rem 0.25rem 0 !important;
          }

          .sb-act-item {
            padding: 0.375rem 0.5rem !important;
            position: relative;
          }

          .sb-act-line {
            position: absolute;
            left: 13px;
            top: 0;
            bottom: 0;
            width: 1px;
            background: var(--border-color);
            opacity: 0.5;
          }

          .sb-act-item:last-child .sb-act-line {
            display: none;
          }

          .sb-act-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--hover-bg);
            border: 1px solid var(--border-color);
            flex-shrink: 0;
            color: var(--text-color);
            opacity: 0.55;
            position: relative;
            z-index: 1;
          }

          .sb-act-body {
            min-width: 0;
          }

          .sb-act-action {
            font-size: 0.625rem !important;
            text-transform: capitalize;
          }

          .sb-act-details {
            font-size: 0.5625rem !important;
          }

          /* ── Footer ── */
          .sb-footer {
            padding: 0.75rem 1rem !important;
            border-top: 1px solid var(--border-color) !important;
            gap: 0.5rem !important;
          }

          .sb-compact-btn {
            border-radius: 8px !important;
            border: 1px solid var(--border-color) !important;
            background: var(--hover-bg) !important;
            transition: all 0.15s !important;
          }

          .sb-compact-btn:hover {
            border-color: var(--primary) !important;
            color: var(--primary) !important;
          }

          .sb-footer-info {
            display: flex;
            align-items: center;
            gap: 0.375rem;
          }

          .sb-footer-icon {
            width: 12px;
            height: 12px;
            opacity: 0.25;
          }

          .sb-version {
            font-family: 'Georgia', serif !important;
            font-size: 0.5625rem !important;
            opacity: 0.3 !important;
            letter-spacing: 0.03em;
          }

          /* ── Narrow mode overrides ── */
          .sidebar-narrow .sb-brand {
            padding: 1rem 0.75rem !important;
            justify-content: center !important;
            gap: 0 !important;
          }

          .sidebar-narrow:hover .sb-brand {
            padding: 1.5rem 1.5rem 1rem !important;
            gap: 0.875rem !important;
          }

          .sidebar-narrow .sb-brand-text-wrap {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s ease;
          }

          .sidebar-narrow:hover .sb-brand-text-wrap {
            opacity: 1;
            pointer-events: auto;
          }

          .sidebar-narrow .sb-emblem-ring {
            display: none;
          }

          .sidebar-narrow:hover .sb-emblem-ring {
            display: block;
          }

          .sidebar-narrow .sb-divider {
            padding: 0 0.75rem;
          }

          .sidebar-narrow:hover .sb-divider {
            padding: 0 1.5rem;
          }

          .sidebar-narrow .sb-section-numeral {
            display: none;
          }

          .sidebar-narrow:hover .sb-section-numeral {
            display: inline-block;
          }

          .sidebar-narrow .sb-nav-item {
            justify-content: center !important;
            padding: 0.75rem !important;
            margin: 0.15rem 0.5rem !important;
          }

          .sidebar-narrow:hover .sb-nav-item {
            justify-content: flex-start !important;
            padding: 0.625rem 0.75rem !important;
            margin: 0.125rem 0.25rem !important;
          }

          .sidebar-narrow .sb-nav-icon-wrap {
            margin-left: 0;
          }

          .sidebar-narrow:hover .sb-nav-icon-wrap {
            margin-left: 0;
          }

          .sidebar-narrow .sb-nav-active-dot {
            display: none;
          }

          .sidebar-narrow:hover .sb-nav-active-dot {
            display: block;
          }

          .sidebar-narrow .sb-footer-info {
            display: none;
          }

          .sidebar-narrow:hover .sb-footer-info {
            display: flex;
          }

          .sidebar-narrow .sb-compact-btn {
            align-self: center;
          }

          .sidebar-narrow:hover .sb-compact-btn {
            align-self: flex-end;
          }

          /* ── Mobile ── */
          @media (max-width: 992px) {
            .sidebar-narrow .sb-brand {
              padding: 1.5rem 1.5rem 1rem !important;
              justify-content: flex-start !important;
              gap: 0.875rem !important;
            }

            .sidebar-narrow .sb-brand-text-wrap,
            .sidebar-narrow:hover .sb-brand-text-wrap {
              opacity: 1;
              pointer-events: auto;
            }

            .sidebar-narrow .sb-emblem-ring,
            .sidebar-narrow:hover .sb-emblem-ring {
              display: block;
            }

            .sidebar-narrow .sb-section-numeral,
            .sidebar-narrow:hover .sb-section-numeral {
              display: inline-block;
            }

            .sidebar-narrow .sb-nav-item,
            .sidebar-narrow:hover .sb-nav-item {
              justify-content: flex-start;
              padding: 0.625rem 0.75rem;
              margin: 0.125rem 0.25rem;
            }

            .sidebar-narrow .sb-nav-active-dot,
            .sidebar-narrow:hover .sb-nav-active-dot {
              display: block;
            }

            .sidebar-narrow .sb-footer-info,
            .sidebar-narrow:hover .sb-footer-info {
              display: flex;
            }

            .sidebar-narrow .sb-compact-btn,
            .sidebar-narrow:hover .sb-compact-btn {
              align-self: flex-end;
            }
          }
        `}</style>
      </aside>
    </TooltipProvider>
  );
}
