import { useState } from 'react';
import { RefreshCw, BarChart3, Bot, Sparkles, Layers } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import type { PeriodKey } from '../../hooks/useDashboardStats';
import { HERMES_PROMPTS } from './hermesPrompts';

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'quarter', label: '۳ ماه اخیر' },
  { key: 'all', label: 'همه' },
];

interface Props {
  workspaceName?: string;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenReports: () => void;
  onAskHermes: (prompt?: string) => void;
}

export function DashboardHeader({
  workspaceName,
  period,
  onPeriodChange,
  refreshing,
  onRefresh,
  onOpenReports,
  onAskHermes,
}: Props) {
  const [spin, setSpin] = useState(false);

  const handleRefresh = () => {
    if (refreshing) return;
    setSpin(true);
    window.setTimeout(() => setSpin(false), 700);
    onRefresh();
  };

  return (
    <header className="txd-header">
      <div className="txd-header-main">
        <span className="txd-eyebrow">
          <span className="txd-eyebrow-rule" aria-hidden="true" />
          مرکز مدیریت TaxBook
        </span>
        <h1 className="txd-title">
          داشبورد
          {workspaceName ? (
            <span className="txd-ws-chip">
              <Layers size={12} />
              {workspaceName}
            </span>
          ) : null}
        </h1>
        <p className="txd-subtitle">نمای کلی اطلاعات و فعالیت‌های TaxBook</p>
      </div>

      <div className="txd-header-side">
        <div className="txd-period" role="tablist" aria-label="بازه زمانی تحلیل">
          {PERIODS.map(p => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              className={`txd-period-btn ${period === p.key ? 'active' : ''}`}
              onClick={() => onPeriodChange(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="txd-header-actions">
          <button type="button" className="txd-icon-btn" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw
              size={13}
              style={refreshing || spin ? { animation: 'txd-spin 0.9s linear infinite' } : undefined}
            />
            به‌روزرسانی
          </button>

          <button type="button" className="txd-icon-btn" onClick={onOpenReports}>
            <BarChart3 size={13} />
            گزارش‌ها
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="txd-icon-btn">
                <Bot size={13} />
                پرسش از Hermes
                <Sparkles size={11} style={{ color: 'var(--accent-gold)' }} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6}>
              <DropdownMenuLabel>تحلیل با Hermes</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {HERMES_PROMPTS.map(prompt => (
                <DropdownMenuItem key={prompt} onSelect={() => onAskHermes(prompt)}>
                  <Sparkles size={12} style={{ color: 'var(--accent-gold)', flexShrink: 0 }} />
                  {prompt}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAskHermes()}>
                <Bot size={12} style={{ flexShrink: 0 }} />
                باز کردن دستیار
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
