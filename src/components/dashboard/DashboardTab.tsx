import { useMemo, useState } from 'react';
import { Files, Coins, CalendarDays, Building2 } from 'lucide-react';
import type { CustomField, RecordItem } from '../../types';
import { useDashboardStats, type Granularity, type PeriodKey } from '../../hooks/useDashboardStats';
import './dashboard.css';
import { DashboardHeader } from './DashboardHeader';
import { DashboardQuickActions, type QuickActionDef } from './DashboardQuickActions';
import { MetricCard } from './MetricCard';
import { RecordsTrendChart } from './RecordsTrendChart';
import { AmountSummaryCard } from './AmountSummaryCard';
import { TypeDistribution, ProjectRanking, PartyRanking, TagRanking } from './Rankings';
import { DataQualityCard } from './DataQualityCard';
import { RecentRecords } from './RecentRecords';
import { ActivityTimeline, type ActivityItem } from './ActivityTimeline';
import { SectionBoundary } from './DashboardSection';
import { faNum } from './jalali';

interface Props {
  records: RecordItem[];
  customFields: CustomField[];
  tags: string[];
  activityLog: Array<{
    id?: number | string;
    action: string;
    details?: string;
    date?: string;
    time?: string;
    created_at?: string;
    user_id?: number;
    user_name?: string;
    record_id?: number | null;
  }>;
  onTabChange: (tab: string) => void;
  workspaceName?: string;
  isViewer?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onOpenScanner?: () => void;
  onViewRecord?: (record: RecordItem) => void;
  onFilterToRecords?: (kind: 'type' | 'party', value: string) => void;
  onAskHermes?: (prompt?: string) => void;
}

export default function DashboardTab({
  records,
  customFields,
  tags,
  activityLog,
  onTabChange,
  workspaceName,
  isViewer,
  refreshing,
  onRefresh,
  onOpenScanner,
  onViewRecord,
  onFilterToRecords,
  onAskHermes,
}: Props) {
  const [period, setPeriod] = useState<PeriodKey>('all');
  const [granChoice, setGranChoice] = useState<{ period: PeriodKey; g: Granularity } | null>(null);

  const availableGranularities: Granularity[] = period === 'all' ? ['month', 'season'] : ['day', 'month'];
  const suggested: Granularity = period === 'all' ? 'month' : 'day';
  const granularity: Granularity =
    granChoice && granChoice.period === period && availableGranularities.includes(granChoice.g)
      ? granChoice.g
      : suggested;

  const stats = useDashboardStats({ records, customFields, tags, period, granularity });

  const handleGranularityChange = (g: Granularity) => {
    setGranChoice({ period, g });
  };

  const activities = useMemo<ActivityItem[]>(
    () => (activityLog || []).map((a, i) => ({ ...a, id: a.id ?? i })),
    [activityLog],
  );

  const quickActions = useMemo<QuickActionDef[]>(() => {
    const actions: QuickActionDef[] = [];
    if (!isViewer) {
      actions.push({ key: 'new', label: 'رکورد جدید', icon: 'plus', onSelect: () => onTabChange('add') });
      actions.push({ key: 'import', label: 'وارد کردن CSV', icon: 'upload', onSelect: () => onTabChange('import') });
    }
    actions.push({ key: 'history', label: 'تاریخچه چاپ', icon: 'history', onSelect: () => onTabChange('history') });
    if (onOpenScanner) {
      actions.push({ key: 'scan', label: 'اسکن QR', icon: 'scan', onSelect: onOpenScanner });
    }
    return actions;
  }, [isViewer, onTabChange, onOpenScanner]);

  return (
    <div className="txd fade-in">
      <DashboardHeader
        workspaceName={workspaceName}
        period={period}
        onPeriodChange={setPeriod}
        refreshing={!!refreshing}
        onRefresh={() => onRefresh?.()}
        onOpenReports={() => onTabChange('reports')}
        onAskHermes={prompt => (prompt && onAskHermes ? onAskHermes(prompt) : onTabChange('assistant'))}
      />

      <DashboardQuickActions actions={quickActions} />

      <div className="txd-grid">
        <SectionBoundary>
          <MetricCard
            className="txd-span-3"
            folio="I"
            label="مجموع رکوردها"
            value={stats.kpis.totalRecords}
            hint={`رکورد ثبت‌شده در ${workspaceName || 'فضای کاری'}`}
            glyph={<Files size={14} />}
            sparkline={stats.kpis.sparkline}
          />
        </SectionBoundary>

        <SectionBoundary>
          <MetricCard
            className="txd-span-3"
            folio="II"
            label="مجموع مبالغ"
            value={stats.kpis.totalAmount}
            hint="مجموع مبلغ رکوردها"
            glyph={<Coins size={14} />}
          />
        </SectionBoundary>

        <SectionBoundary>
          <MetricCard
            className="txd-span-3"
            folio="III"
            label="رکوردهای این هفته"
            value={stats.kpis.thisWeek}
            hint="ثبت‌شده در ۷ روز گذشته"
            delta={stats.kpis.thisWeekDelta}
            glyph={<CalendarDays size={14} />}
          />
        </SectionBoundary>

        <SectionBoundary>
          <MetricCard
            className="txd-span-3"
            folio="IV"
            label="پروژه‌ها و انواع"
            value={stats.kpis.projects}
            hint={`${faNum(stats.kpis.types)} نوع برچسب`}
            glyph={<Building2 size={14} />}
          />
        </SectionBoundary>

        <SectionBoundary height={330}>
          <RecordsTrendChart
            points={stats.trend.points}
            peak={stats.trend.peak}
            datedCount={stats.trend.dated}
            scopedCount={stats.scoped.length}
            granularity={granularity}
            availableGranularities={availableGranularities}
            onGranularityChange={handleGranularityChange}
          />
        </SectionBoundary>

        <SectionBoundary height={330}>
          <AmountSummaryCard
            total={stats.amountByProject.total}
            rows={stats.amountByProject.rows}
            projectCount={stats.kpis.projects}
            onOpenReports={() => onTabChange('reports')}
          />
        </SectionBoundary>

        <SectionBoundary height={300}>
          <TypeDistribution
            data={stats.typeData}
            scopedTotal={stats.scoped.length}
            onSelect={onFilterToRecords ? name => onFilterToRecords('type', name) : undefined}
          />
        </SectionBoundary>

        <SectionBoundary height={300}>
          <DataQualityCard
            available={stats.quality.available}
            overall={stats.quality.overall}
            needsReview={stats.quality.needsReview}
            fields={stats.quality.fields}
            onCreateRecord={() => onTabChange('add')}
          />
        </SectionBoundary>

        <SectionBoundary height={280}>
          <ProjectRanking
            data={stats.projectData}
            scopedTotal={stats.scoped.length}
            onOpenReports={() => onTabChange('reports')}
          />
        </SectionBoundary>

        <SectionBoundary height={280}>
          <PartyRanking
            data={stats.partyData}
            onSelect={onFilterToRecords ? name => onFilterToRecords('party', name) : undefined}
          />
        </SectionBoundary>

        <SectionBoundary height={140}>
          <TagRanking data={stats.tagData.slice(0, 14)} />
        </SectionBoundary>

        <SectionBoundary height={260}>
          <RecentRecords
            records={stats.recentRecords}
            onView={onViewRecord}
            onGoToRecords={() => onTabChange('records')}
            onCreateRecord={() => onTabChange('add')}
          />
        </SectionBoundary>

        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}
