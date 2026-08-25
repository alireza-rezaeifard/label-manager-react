import { Plus, Upload, History, ScanLine, Bot } from 'lucide-react';

export interface QuickActionDef {
  key: string;
  label: string;
  icon: 'plus' | 'upload' | 'history' | 'scan' | 'hermes';
  onSelect: () => void;
}

const ICONS = {
  plus: Plus,
  upload: Upload,
  history: History,
  scan: ScanLine,
  hermes: Bot,
};

export function DashboardQuickActions({ actions }: { actions: QuickActionDef[] }) {
  if (actions.length === 0) return null;
  return (
    <nav className="txd-quick" aria-label="دسترسی سریع">
      {actions.map(a => {
        const Icon = ICONS[a.icon];
        return (
          <button key={a.key} type="button" className="txd-quick-btn" onClick={a.onSelect}>
            <Icon size={13} />
            {a.label}
          </button>
        );
      })}
    </nav>
  );
}
