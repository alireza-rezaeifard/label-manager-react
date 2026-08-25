import { Tags as TagsIcon } from 'lucide-react';
import type { NamedCount } from '../../hooks/useDashboardStats';
import { faNum, faPct } from './jalali';
import { stableColor } from './colors';
import { DashboardSection, EmptyState } from './DashboardSection';

interface RankedListProps {
  data: NamedCount[];
  total: number;
  max?: number;
  onSelect?: (name: string) => void;
}

/** Shared ranked horizontal-bar list; rank numerals carry meaning here (it is a ranking). */
export function RankedList({ data, total, max: maxOverride, onSelect }: RankedListProps) {
  const max = maxOverride ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div className="txd-rank-list">
      {data.map((d, i) => {
        const row = (
          <>
            <span className="txd-rank-row">
              <span className="txd-rank-no" aria-hidden="true">{faNum(i + 1)}</span>
              <span className="txd-rank-name">{d.name}</span>
              <span className="txd-rank-count">{faNum(d.value)}</span>
              {total > 0 ? <span className="txd-rank-pct">{faPct((d.value / total) * 100)}</span> : null}
            </span>
            <span className="txd-rank-track" style={{ ['--bar-color' as string]: stableColor(d.name) }}>
              <span
                className="txd-rank-fill"
                style={{ width: `${Math.max(1.5, (d.value / max) * 100)}%` }}
              />
            </span>
          </>
        );
        return (
          <div key={d.name}>
            {onSelect ? (
              <button
                type="button"
                className="txd-rank-item"
                onClick={() => onSelect(d.name)}
                title={`نمایش رکوردهای «${d.name}»`}
              >
                {row}
              </button>
            ) : (
              <div className="txd-rank-item" style={{ cursor: 'default' }}>
                {row}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function TypeDistribution({
  data,
  scopedTotal,
  onSelect,
}: {
  data: NamedCount[];
  scopedTotal: number;
  onSelect?: (name: string) => void;
}) {
  return (
    <DashboardSection
      className="txd-span-7"
      title={<><TagsIcon size={15} /> توزیع بر اساس نوع</>}
      note={`${faNum(data.length)} نوع`}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<TagsIcon size={20} />}
          title="هنوز نوعی ثبت نشده"
          hint="با افزودن رکورد، توزیع انواع در اینجا نمایش داده می‌شود."
        />
      ) : (
        <RankedList data={data} total={scopedTotal} onSelect={onSelect} />
      )}
    </DashboardSection>
  );
}

export function ProjectRanking({
  data,
  scopedTotal,
  onOpenReports,
}: {
  data: NamedCount[];
  scopedTotal: number;
  onOpenReports: () => void;
}) {
  return (
    <DashboardSection
      className="txd-span-6"
      title={<>پروژه‌های فعال</>}
      note={`${faNum(data.length)} پروژه`}
      action={
        <button type="button" className="txd-link" onClick={onOpenReports}>
          مشاهده همه
        </button>
      }
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<TagsIcon size={20} />}
          title="پروژه‌ای در این بازه نیست"
          hint="پروژه‌ها از فیلد پروژهٔ رکوردها خوانده می‌شوند."
        />
      ) : (
        <RankedList data={data} total={scopedTotal} />
      )}
    </DashboardSection>
  );
}

export function PartyRanking({
  data,
  onSelect,
}: {
  data: NamedCount[];
  onSelect?: (name: string) => void;
}) {
  return (
    <DashboardSection
      className="txd-span-6"
      title={<>بیشترین طرف‌های حساب</>}
      note={`${faNum(data.length)} طرف حساب`}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<TagsIcon size={20} />}
          title="طرف حسابی ثبت نشده"
          hint="طرف‌های حساب از فیلد طرف حساب رکوردها شمارش می‌شوند."
        />
      ) : (
        <div className="txd-party-list">
          {data.map((item, idx) => (
            <button
              key={item.name}
              type="button"
              className="txd-party-row"
              onClick={onSelect ? () => onSelect(item.name) : undefined}
              title={onSelect ? `نمایش رکوردهای «${item.name}»` : undefined}
              style={onSelect ? undefined : { cursor: 'default' }}
            >
              <span className="txd-party-no" aria-hidden="true">{faNum(idx + 1)}</span>
              <span className="txd-party-name">{item.name}</span>
              <span className="txd-party-count">{faNum(item.value)}</span>
            </button>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}

export function TagRanking({ data }: { data: NamedCount[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <DashboardSection
      className="txd-span-12"
      title={<>پرکاربردترین برچسب‌ها</>}
      note={`${faNum(data.length)} برچسب`}
    >
      {data.length === 0 ? (
        <EmptyState
          icon={<TagsIcon size={20} />}
          title="برچسبی استفاده نشده"
          hint="برچسب‌های تعریف‌شدهٔ فضای کاری اینجا با تعداد استفاده نمایش داده می‌شوند."
        />
      ) : (
        <div className="txd-tags">
          {data.slice(0, 14).map(d => (
            <span
              key={d.name}
              className={`txd-tag ${d.value === max && d.value > 0 ? 'txd-tag-hot' : ''}`}
              title={`استفاده در ${faNum(d.value)} رکورد`}
            >
              #{d.name}
              <b>{faNum(d.value)}</b>
            </span>
          ))}
        </div>
      )}
    </DashboardSection>
  );
}
