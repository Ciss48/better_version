'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { EmptyState } from '@/components/common/EmptyState';
import { MatrixBoard } from '@/components/matrix/MatrixBoard';
import { Banner } from '@/components/today/Banner';
import { MITSection } from '@/components/today/MITSection';
import { PlanStatus } from '@/components/today/PlanStatus';
import { ProgressBar } from '@/components/today/ProgressBar';
import { TaskGroup } from '@/components/today/TaskGroup';
import { TaskInput } from '@/components/today/TaskInput';
import { TaskItem } from '@/components/today/TaskItem';
import type { TaskPatch } from '@/components/today/TaskItem';
import { ViewToggle } from '@/components/today/ViewToggle';
import { activeMitCount, addDays } from '@/domain';
import type { BannerVariant, ISODate, Task } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import {
  formatDateLong,
  formatHourLoose,
  weekdayLong,
  formatClock,
  formatWeekdayDayMonth,
} from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks/use-media';
import { useShortcut } from '@/lib/hooks/use-shortcut';
import { useStore } from '@/state/store';
import { todayView } from '@/state/selectors';
import { ScreenState } from '@/features/common/ScreenState';

/**
 * Today — design/handoff/screens.md §1. Reads the store through `todayView`,
 * reports every intent back to the store, and never applies a rule itself: the
 * banner order, the lock state and the weighted percentage all come from the
 * domain.
 */

interface WelcomeStep {
  title: string;
  body: string;
}

/** The three numbered cards inside the welcome banner. */
function WelcomeSteps() {
  const steps = tRaw<WelcomeStep[]>('today.welcome.steps');
  return (
    <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
      {steps.map((step, index) => (
        <div
          key={step.title}
          className="flex flex-col gap-1 rounded-tile bg-paper px-4 py-3.5"
        >
          <span className="font-num text-[22px] text-accent">{index + 1}</span>
          <b className="font-semibold">{step.title}</b>
          <span className="text-caption text-ink-3">{step.body}</span>
        </div>
      ))}
    </div>
  );
}

function TodayBody() {
  const router = useRouter();
  const params = useSearchParams();
  const clock = useClock();
  const { today, now, settings } = clock;

  // The whole state: `todayView` derives a fresh object every call, so a
  // selector would hand zustand a new snapshot on every render.
  const state = useStore();
  const view = useMemo(() => todayView(state, clock), [state, clock]);
  const {
    addTask,
    toggleDone,
    patchTask,
    setQuadrant,
    moveTask,
    dropTask,
    restoreTask,
    setTodayView,
    setExpanded,
    dismissPlanReminder,
  } = state;
  const todayViewMode = state.ui.todayView;
  const expandedTaskId = state.ui.expandedTaskId;

  const isDesktop = useIsDesktop();
  // TaskInput owns its own field; focusing it from the outside (onboarding's
  // `?focus=input`, the morning plan reminder) goes through the wrapper.
  const inputWrap = useRef<HTMLDivElement>(null);
  const focusInput = useCallback(() => {
    inputWrap.current?.querySelector('input')?.focus();
  }, []);

  // `E` opens the ritual from anywhere on Today; Esc collapses an open row.
  useShortcut('e', () => router.push('/ritual'));
  useShortcut('escape', () => setExpanded(null), { enabled: expandedTaskId !== null });

  const wantsFocus = params.get('focus') === 'input';
  useEffect(() => {
    if (wantsFocus) focusInput();
  }, [wantsFocus, focusInput]);

  const kicker =
    view.lateNight
      ? t('today.kickerLateNight', {
          time: formatClock(now, settings.timezone),
          // Late night: the wall-clock weekday is already tomorrow's.
          weekdayLong: weekdayLong(addDays(today, 1)),
        })
      : t('today.kicker', { time: formatClock(now, settings.timezone) });

  function row(task: Task) {
    return (
      <TaskItem
        key={task.id}
        task={task}
        today={today}
        expanded={expandedTaskId === task.id}
        onToggleExpand={() => setExpanded(expandedTaskId === task.id ? null : task.id)}
        onToggleDone={() => void toggleDone(task.id)}
        onPatch={(patch: TaskPatch) => void patchTask(task.id, patch)}
        onMove={(date: ISODate) => {
          setExpanded(null);
          void moveTask(task.id, date);
        }}
        onDrop={() => void dropTask(task.id)}
        onRestore={() => void restoreTask(task.id)}
      />
    );
  }

  /** One banner, wired to its actions. `selectBanners` decides the order. */
  function banner(variant: BannerVariant, target?: ISODate) {
    switch (variant) {
      case 'ritual':
        return (
          <Banner
            key={variant}
            variant="ritual"
            title={t('today.ritualBanner.title')}
            body={t('today.ritualBanner.body')}
            primary={{
              label: t('today.ritualBanner.cta'),
              kbd: 'E',
              onClick: () => router.push('/ritual'),
            }}
          />
        );
      case 'planReminder': {
        const date = target ?? addDays(today, 1);
        return (
          <Banner
            key={variant}
            variant="planReminder"
            title={t('today.planReminder.title', { tomorrow: formatWeekdayDayMonth(date) })}
            body={t('today.planReminder.body', {
              lockAt: settings.lockTime,
              weekdayLong: weekdayLong(date),
            })}
            primary={{
              label: t('today.planReminder.cta'),
              // An evening planner writes tomorrow's plan in the ritual; a
              // morning planner is already on the day it belongs to.
              onClick: () =>
                settings.habit === 'evening' ? router.push('/ritual') : focusInput(),
            }}
            secondary={{
              label: t('today.planReminder.dismiss'),
              onClick: () => dismissPlanReminder(today),
            }}
          />
        );
      }
      case 'missedDay':
        return (
          <Banner
            key={variant}
            variant="missedDay"
            title={t('today.missed.title')}
            body={t('today.missed.body')}
          />
        );
      case 'complete':
        return (
          <Banner
            key={variant}
            variant="complete"
            title={t('today.complete.title')}
            body={t('today.complete.body')}
          />
        );
      case 'welcome':
        return (
          <Banner
            key={variant}
            variant="welcome"
            title={t('today.welcome.title')}
            body={t('today.welcome.body')}
            primary={{
              label: t('today.welcome.cta'),
              onClick: () => router.push('/onboarding'),
            }}
            hint={t('today.welcome.ctaHint')}
          >
            <WelcomeSteps />
          </Banner>
        );
    }
  }

  const adhocDone = view.dayTasks.filter(
    (task) => task.adhoc && task.status === 'done',
  ).length;
  const adhocTotal = view.dayTasks.filter((task) => task.adhoc).length;
  const hasPlanned = view.dayTasks.some((task) => !task.adhoc);

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-label font-semibold uppercase text-ink-3">{kicker}</p>
          <h1 className="font-display text-display-md app:text-display-xl">
            {formatDateLong(today)}
          </h1>
          <PlanStatus
            locked={view.locked}
            lockAt={settings.lockTime}
            minutesLeft={view.minutesLeft}
            lateNight={
              view.lateNight ? { dayEnd: formatHourLoose(settings.dayEnd) } : undefined
            }
          />
        </div>
        {hasPlanned ? (
          <ProgressBar
            value={view.progress.pct}
            done={view.progress.done}
            total={view.progress.total}
            className="max-w-[280px] flex-1 basis-[220px]"
          />
        ) : null}
      </header>

      {view.banners.map((entry) => banner(entry.variant, entry.target))}

      <div className="flex flex-wrap items-start gap-3">
        <div ref={inputWrap} className="flex min-w-0 flex-1 basis-[320px]">
          <TaskInput
            locked={view.locked}
            enableShortcut
            onAdd={(parsed) => void addTask(today, parsed, 'today')}
            className="flex-1"
          />
        </div>
        <ViewToggle value={todayViewMode} onChange={setTodayView} enableShortcut />
      </div>

      {view.dayTasks.length === 0 ? (
        <EmptyState
          title={t('today.empty.title')}
          body={t('today.empty.body', { lockAt: settings.lockTime })}
        />
      ) : todayViewMode === 'list' ? (
        <div className="flex flex-col gap-6">
          <MITSection count={activeMitCount(view.dayTasks)}>
            {view.mit.length === 0 ? null : view.mit.map(row)}
          </MITSection>

          {view.others.length === 0 ? null : (
            <TaskGroup
              variant="default"
              title={t('today.others.title')}
              totalCount={view.others.length}
            >
              {view.others.map(row)}
            </TaskGroup>
          )}

          {view.adhoc.length === 0 ? null : (
            <TaskGroup
              variant="adhoc"
              title={t('today.adhoc.tag')}
              doneCount={adhocDone}
              totalCount={adhocTotal}
            >
              {view.adhoc.map(row)}
            </TaskGroup>
          )}
        </div>
      ) : (
        <MatrixBoard
          tasks={view.dayTasks}
          // `undefined` before the first layout measurement — the sidebar
          // layout is the common case, so it wins the first paint.
          interaction={isDesktop === false ? 'tap' : 'drag'}
          onSetQuadrant={(id, quadrant) => void setQuadrant(id, quadrant)}
          onToggleDone={(id) => void toggleDone(id)}
        />
      )}
    </div>
  );
}

export function TodayScreen() {
  return (
    <PageContainer width="narrow">
      <ScreenState skeleton="today">
        <TodayBody />
      </ScreenState>
    </PageContainer>
  );
}
