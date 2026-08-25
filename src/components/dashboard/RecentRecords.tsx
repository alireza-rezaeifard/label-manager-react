import { ArrowLeft, FilePlus2 } from 'lucide-react';
import type { RecordItem } from '../../types';
import { formatAmount, toJalaliDate } from '../../utils/formatters';
import { stableColor } from './colors';
import { faNum } from './jalali';
import { DashboardSection, EmptyState } from './DashboardSection';

interface Props {
  records: RecordItem[];
  onView?: (record: RecordItem) => void;
  onGoToRecords: () => void;
  onCreateRecord: () => void;
}

function displayDate(r: RecordItem): string {
  const raw = r.created_at || r.date || '';
  if (!raw) return '—';
  const d = new Date(String(raw).includes('T') ? String(raw) : String(raw) + 'T00:00:00');
  if (isNaN(d.getTime())) return String(raw);
  return toJalaliDate(d);
}

export function RecentRecords({ records, onView, onGoToRecords, onCreateRecord }: Props) {
  return (
    <DashboardSection
      className="txd-span-12"
      title={<>آخرین رکوردها</>}
      note={`${faNum(records.length)} رکورد اخیر`}
      action={
        <button type="button" className="txd-link" onClick={onGoToRecords}>
          مشاهده همه <ArrowLeft size={13} />
        </button>
      }
    >
      {records.length === 0 ? (
        <EmptyState
          icon={<FilePlus2 size={20} />}
          title="هنوز رکوردی ثبت نشده"
          hint="اولین رکورد خود را ایجاد کنید تا فعالیت‌های فضای کاری در اینجا نمایش داده شود."
        >
          <button type="button" className="btn btn-primary btn-sm" onClick={onCreateRecord}>
            <FilePlus2 size={14} /> ایجاد رکورد
          </button>
        </EmptyState>
      ) : (
        <div className="txd-table-wrap">
          <table className="txd-table">
            <thead>
              <tr>
                <th scope="col">کد</th>
                <th scope="col">پروژه</th>
                <th scope="col">نوع</th>
                <th scope="col">طرف حساب</th>
                <th scope="col">تاریخ</th>
                <th scope="col">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr
                  key={(r.id ?? r.code ?? '') + '-' + i}
                  onClick={() => onView?.(r)}
                >
                  <td>
                    <button
                      type="button"
                      className="txd-code txd-code-btn"
                      onClick={e => { e.stopPropagation(); onView?.(r); }}
                      aria-label={`مشاهده رکورد ${r.code}`}
                    >
                      {r.code}
                    </button>
                  </td>
                  <td>{r.project || '—'}</td>
                  <td>
                    {r.type ? (
                      <span
                        className="txd-type-badge"
                        style={{ ['--badge-color' as string]: stableColor(r.type) }}
                      >
                        <span className="txd-type-dot" />
                        {r.type}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{r.party || '—'}</td>
                  <td style={{ opacity: 0.7 }}>{displayDate(r)}</td>
                  <td className="txd-amount-cell">{r.amount ? formatAmount(r.amount) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardSection>
  );
}
