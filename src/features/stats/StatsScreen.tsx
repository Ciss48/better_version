'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { Heatmap } from '@/components/stats/Heatmap';
import { InsightCard } from '@/components/stats/InsightCard';
import { StatCard } from '@/components/stats/StatCard';
import { WeekdayChart } from '@/components/stats/WeekdayChart';
import type { ISODate } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { formatWeekdayDayMonth } from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks/use-media';
import { cn } from '@/lib/utils';
import type { Insight } from '@/stats';
import { ScreenState } from '@/features/common/ScreenState';
import { statsView } from '@/state/selectors';
import { useStore } from '@/state/store';

/**
 * Journey — design/handoff/screens.md §3.
 *
 * Every figure here is computed by `src/stats`; this file only chooses words
 * and boxes. The one thing it does decide is how an insight reads: the module
 * reports ISO weekday *numbers*, the names live in copy.vi.json, and copy stays
 * in the UI.
 */

const CARD_GRID =
  'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] ' +
  'app:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]';

const SPLIT_GRID =
  'grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] ' +
  'app:[grid-template-columns:repeat(auto-fit,minmax(340px,1fr))]';

/** The seven dots of the sparse card: one per planned day, out of seven. */
const SPARSE_TARGET = 7;

/** Whole days between two logical dates — calendar arithmetic, no clock. */
function daysBetween(from: ISODate, to: ISODate): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function weekdayName(value: string | number): string {
  return tRaw<string[]>('date.weekdayLong')[Number(value) % 7];
}

/** `stats.insights.<kind>` with the module's vars, weekday numbers named. */
function insightText(insight: Insight): string {
  const vars =
    insight.kind === 'weekday'
      ? {
          ...insight.vars,
          best: weekdayName(insight.vars.best),
          worst: weekdayName(insight.vars.worst),
        }
      : insight.vars;
  return t(`stats.insights.${insight.kind}` as CopyKey, vars);
}

function SparseCard({ daysWithPlan }: { daysWithPlan: number }) {
  return (
    <section className="flex flex-col gap-3.5 rounded-card bg-accent-soft px-6 py-[22px]">
      <h2 className="font-display text-display-sm">{t('stats.sparse.title')}</h2>
      <p className="max-w-[520px] text-pretty text-ink-2">
        {t('stats.sparse.body', { n: daysWithPlan })}
      </p>
      <div className="flex gap-2" role="img" aria-label={t('stats.sparse.body', { n: daysWithPlan })}>
        {Array.from({ length: SPARSE_TARGET }, (_, index) => (
          <span
            key={index}
            className={cn(
              'size-[26px] rounded-full',
              index < daysWithPlan
                ? 'bg-success'
                : 'bg-transparent shadow-[inset_0_0_0_2px_var(--line)]',
            )}
          />
        ))}
      </div>
    </section>
  );
}

function StatsBody() {
  const router = useRouter();
  const clock = useClock();
  const isDesktop = useIsDesktop();
  const state = useStore();

  const view = useMemo(() => statsView(state, clock), [state, clock]);
  // The server cannot know the viewport: until it does, show the wide version.
  const weeks = isDesktop === false ? 13 : 26;

  const range = view.sparse
    ? view.firstUseDate === null || daysBetween(view.firstUseDate, clock.today) <= 0
      ? t('stats.rangeToday')
      : t('stats.rangeNew', { n: daysBetween(view.firstUseDate, clock.today) })
    : t('stats.range', {
        period: t(weeks === 26 ? 'stats.period.w26' : 'stats.period.w13'),
        date: formatWeekdayDayMonth(clock.today),
      });

  const { avg7, avg30, consistency, q2Share, adhocShare, movedShare } = view.cards;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2.5">
        <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('stats.kicker')}
        </p>
        <h1 className="font-display text-display-md app:text-display-xl">{t('stats.title')}</h1>
        <p className="text-ink-2">{range}</p>
      </header>

      {view.sparse ? <SparseCard daysWithPlan={view.daysWithPlan} /> : null}

      <div className={CARD_GRID}>
        <StatCard label={t('stats.cards.avg7')} value={avg7.value} unit="%" delta={avg7.delta} />
        <StatCard label={t('stats.cards.avg30')} value={avg30.value} unit="%" delta={avg30.delta} />
        <StatCard
          label={t('stats.cards.consistency.label')}
          value={consistency.planned}
          unit="ratio30"
          note={t('stats.cards.consistency.note')}
        />
        <StatCard
          label={t('stats.cards.q2.label')}
          value={q2Share.value}
          unit="%"
          delta={q2Share.delta}
          note={t('stats.cards.q2.note')}
        />
        <StatCard
          label={t('stats.cards.adhoc.label')}
          value={adhocShare.value}
          unit="%"
          note={t('stats.cards.adhoc.note')}
        />
        <StatCard
          label={t('stats.cards.moved.label')}
          value={movedShare.value}
          unit="%"
          note={t('stats.cards.moved.note')}
        />
      </div>

      <Heatmap
        days={view.heatmap}
        weeks={weeks}
        firstUseDate={view.firstUseDate}
        onSelectDay={(date) => router.push(`/history?date=${date}`)}
      />

      <div className={SPLIT_GRID}>
        <WeekdayChart values={view.weekday} />
        <InsightCard
          items={view.insights.map((insight) => ({
            text: insightText(insight),
            tone: insight.tone,
          }))}
        />
      </div>
    </div>
  );
}

export function StatsScreen() {
  return (
    <PageContainer>
      <ScreenState skeleton="settings">
        <StatsBody />
      </ScreenState>
    </PageContainer>
  );
}
