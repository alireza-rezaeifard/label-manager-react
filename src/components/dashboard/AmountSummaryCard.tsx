import { Coins } from 'lucide-react';
import { formatAmount } from '../../utils/formatters';
import { faNum, faPct } from './jalali';
import { DashboardSection } from './DashboardSection';

interface Props {
  total: number;
  rows: Array<{ name: string; value: number; pct: number }>;
  projectCount: number;
  onOpenReports: () => void;
}

/**
 * The signature element of the dashboard: in a ledger the sum line is ruled
 * heavier than its entries, so this card renders as an inverted folio —
 * ink surface, brass figure.
 */
export function AmountSummaryCard({ total, rows, projectCount, onOpenReports }: Props) {
  return (
    <DashboardSection
      className="txd-span-4 txd-inverse"
      title={<>مجموع مبالغ</>}
      note={`${faNum(projectCount)} پروژه`}
      action={
        <button type="button" className="txd-link" onClick={onOpenReports}>
          گزارش کامل
        </button>
      }
    >
      <div>
        <div className="txd-amount-figure">{formatAmount(total)}</div>
      </div>

      {rows.length === 0 ? (
        <p className="txd-amount-empty">
          {total > 0
            ? 'مبالغ ثبت‌شده به پروژه‌ای نسبت داده نشده‌اند.'
            : 'هنوز مبلغی در این بازه ثبت نشده است.'}
        </p>
      ) : (
        <div className="txd-amount-rows">
          <span className="txd-card-note">سهم پروژه‌ها از مبالغ ثبت‌شده</span>
          {rows.map(row => (
            <div className="txd-amount-row" key={row.name}>
              <span className="txd-amount-row-name">
                <Coins size={12} style={{ opacity: 0.55, flexShrink: 0 }} />
                <span>{row.name}</span>
              </span>
              <span className="txd-amount-row-pct">{faPct(row.pct)}</span>
              <span className="txd-amount-track">
                <span className="txd-amount-fill" style={{ width: `${Math.max(2, row.pct)}%` }} />
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
