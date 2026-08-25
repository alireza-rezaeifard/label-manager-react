import { ShieldCheck, ClipboardList, Plus } from 'lucide-react';
import type { QualityField } from '../../hooks/useDashboardStats';
import { faNum } from './jalali';
import { DashboardSection, EmptyState } from './DashboardSection';

interface Props {
  available: boolean;
  overall: number;
  needsReview: number;
  fields: QualityField[];
  onCreateRecord?: () => void;
}

function fillClass(percent: number): string {
  if (percent < 50) return 'txd-quality-low';
  if (percent < 85) return 'txd-quality-mid';
  return 'txd-quality-high';
}

export function DataQualityCard({ available, overall, needsReview, fields, onCreateRecord }: Props) {
  return (
    <DashboardSection
      className="txd-span-5"
      title={<><ShieldCheck size={15} /> کیفیت اطلاعات</>}
      note="تکمیل فیلدهای سفارشی"
    >
      {!available ? (
        <EmptyState
          icon={<ClipboardList size={20} />}
          title="فیلد سفارشی تعریف نشده"
          hint={
            <>
              از تنظیمات، فیلدهای سفارشی مثل «شماره اقتصادی» را به رکوردها اضافه کنید تا میزان تکمیل آن‌ها اینجا دیده شود.
              {onCreateRecord ? (
                <button type="button" className="txd-link" style={{ marginTop: '0.5rem' }} onClick={onCreateRecord}>
                  <Plus size={13} /> ایجاد رکورد
                </button>
              ) : null}
            </>
          }
        />
      ) : (
        <>
          <div className="txd-quality-summary">
            <span className="txd-quality-score">{faNum(overall)}٪</span>
            <span className="txd-quality-desc">
              میانگین تکمیل فیلدها
              <br />
              {needsReview > 0
                ? <><b>{faNum(needsReview)}</b> فیلد نیاز به بررسی دارند</>
                : 'همه فیلدها در وضعیت مطلوب‌اند'}
            </span>
          </div>

          {fields.map(f => (
            <div className="txd-quality-field" key={f.key}>
              <div className="txd-quality-head">
                <span className="txd-quality-name">{f.name}</span>
                <span className="txd-quality-meta">
                  {faNum(f.filled)} از {faNum(f.total)} رکورد · {faNum(f.percent)}٪
                </span>
              </div>
              <div
                className="txd-quality-track"
                role="meter"
                aria-valuenow={f.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`تکمیل ${f.name}`}
              >
                <div
                  className={`txd-quality-fill ${fillClass(f.percent)}`}
                  style={{ width: `${f.percent === 0 ? 0 : Math.max(f.percent, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </>
      )}
    </DashboardSection>
  );
}
