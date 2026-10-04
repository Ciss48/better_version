'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { CalendarMonth } from '@/components/history/CalendarMonth';
import { DayDetail } from '@/components/history/DayDetail';
import { addDays, buildDaySummaries } from '@/domain';
import type { ISODate } from '@/domain';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/copy';
import { monthSummary } from '@/stats';
import { ScreenState } from '@/features/common/ScreenState';
import { historyDay } from '@/state/selectors';
import { useStore } from '@/state/store';

/**
 * History — design/handoff/screens.md §4. Read-only by design: a finished day
 * is a fact, and the screen offers no way to rewrite it.
 *
 * The selected day and the shown month live in the URL (`?date=`, `?month=`)
 * and nowhere else, so a heat-map cell on the Journey screen can link straight
 * to a day and a reload lands back on it. Selecting a day uses `router.replace`,
 * not `push` — clicking through a month should not fill the back button with
 * twenty steps.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function daysInMonth(month: string): number {
  return new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
}

function shiftMonth(month: string, by: 1 | -1): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)) - 1 + by;
  return `${year + Math.floor(index / 12)}-${pad2(((index % 12) + 12) % 12 + 1)}`;
}

/** The last day of `month` that has already happened. */
function lastPastDay(month: string, today: ISODate): ISODate {
  const last: ISODate = `${month}-${pad2(daysInMonth(month))}`;
  return last > today ? today : last;
}

function HistoryBody() {
  const router = useRouter();
  const params = useSearchParams();
  const clock = useClock();
  const { today } = clock;
  const state = useStore();
  const { ensureMonthLoaded, firstPlanDate } = state;

  const paramDate = params.get('date');
  const paramMonth = params.get('month');

  // Yesterday is what someone opening History wants to see — unless they have
  // no yesterday yet, in which case today is all there is.
  const fallback: ISODate =
    firstPlanDate !== null && firstPlanDate < today ? addDays(today, -1) : today;

  const selected: ISODate =
    paramDate !== null && ISO_DATE.test(paramDate) && paramDate <= today ? paramDate : fallback;
  const month =
    paramMonth !== null && ISO_MONTH.test(paramMonth) ? paramMonth : selected.slice(0, 7);

  useEffect(() => {
    void ensureMonthLoaded(month);
  }, [ensureMonthLoaded, month]);

  /**
   * One summary per day of the month that has happened and that the user had
   * already started on. Days outside that are left out entirely, which is what
   * renders them as quiet, unclickable numbers.
   */
  const days = useMemo(() => {
    const first: ISODate = `${month}-01`;
    const last: ISODate = `${month}-${pad2(daysInMonth(month))}`;
    const from = firstPlanDate !== null && firstPlanDate > first ? firstPlanDate : first;
    const to = last > today ? today : last;
    if (from > to) return [];
    return buildDaySummaries(from, to, Object.values(state.tasks), today);
  }, [month, firstPlanDate, today, state.tasks]);

  const detail = useMemo(() => historyDay(state, selected, clock), [state, selected, clock]);

  function show(date: ISODate, nextMonth: string): void {
    router.replace(`/history?date=${date}&month=${nextMonth}`, { scroll: false });
  }

  function goToMonth(next: string): void {
    void ensureMonthLoaded(next);
    show(selected.startsWith(`${next}-`) ? selected : lastPastDay(next, today), next);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('history.kicker')}
        </p>
        <h1 className="font-display text-display-md app:text-display-xl">{t('history.title')}</h1>
      </header>

      <div className="grid items-start gap-4 app:[grid-template-columns:minmax(0,1.15fr)_minmax(0,1fr)]">
        <CalendarMonth
          month={month}
          days={days}
          selected={selected}
          onSelect={(date) => show(date, month)}
          summary={monthSummary(days, month, today)}
          canPrev={firstPlanDate !== null && month > firstPlanDate.slice(0, 7)}
          canNext={month < today.slice(0, 7)}
          onPrev={() => goToMonth(shiftMonth(month, -1))}
          onNext={() => goToMonth(shiftMonth(month, 1))}
        />
        <DayDetail
          date={selected}
          tasks={detail.tasks}
          dayLog={detail.dayLog}
          planTiming={detail.planTiming}
          mode={detail.mode}
          onOpenToday={() => router.push('/today')}
          className="app:sticky app:top-11"
        />
      </div>
    </div>
  );
}

export function HistoryScreen() {
  return (
    <PageContainer>
      <ScreenState skeleton="settings">
        <HistoryBody />
      </ScreenState>
    </PageContainer>
  );
}
