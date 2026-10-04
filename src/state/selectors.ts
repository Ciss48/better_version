import {
  addDays,
  buildDaySummaries,
  completion,
  consistency,
  isLateNight,
  isLocked,
  minutesToLock,
  selectBanners,
  summarizeDay,
} from '@/domain';
import type { DaySummary, ISODate, Task } from '@/domain';
import type { TomorrowItem } from '@/components/ritual/TomorrowPlanList';
import type { ClockValue } from '@/lib/clock';
import type { RitualDraft } from './ritual-draft';
import type { AppState } from './store';

/**
 * Pure readers over the store. They own the *shape* a screen needs; every rule
 * they apply comes from `src/domain` (completion, banner selection, the
 * consistency window). Kept separate from the store so they can be tested
 * without zustand.
 */

/** Every task of `date`, in plan order. */
export function tasksOn(tasks: Record<string, Task>, date: ISODate): Task[] {
  return Object.values(tasks)
    .filter((task) => task.planDate === date)
    .sort((a, b) => a.position - b.position);
}

export interface TodayView {
  dayTasks: Task[];
  /** MITs, adhoc ones included — the design shows them in the MIT card. */
  mit: Task[];
  /** Planned, non-MIT. */
  others: Task[];
  /** Adhoc, non-MIT. */
  adhoc: Task[];
  progress: { pct: number; done: number; total: number };
  locked: boolean;
  minutesLeft: number | null;
  lateNight: boolean;
  banners: ReturnType<typeof selectBanners>;
}

export function todayView(s: AppState, clock: ClockValue): TodayView {
  const { now, today, settings } = clock;
  const dayTasks = tasksOn(s.tasks, today);
  const tomorrowTasks = tasksOn(s.tasks, addDays(today, 1));
  const yesterday = addDays(today, -1);

  return {
    dayTasks,
    mit: dayTasks.filter((task) => task.mit),
    others: dayTasks.filter((task) => !task.mit && !task.adhoc),
    adhoc: dayTasks.filter((task) => !task.mit && task.adhoc),
    progress: completion(dayTasks),
    locked: isLocked(today, now, settings),
    minutesLeft: minutesToLock(today, now, settings),
    lateNight: isLateNight(now, settings),
    banners: selectBanners({
      now,
      settings,
      today,
      todayTasks: dayTasks,
      tomorrowTasks,
      todayClosed: s.dayLogs[today]?.closedAt != null,
      firstPlanDate: s.firstPlanDate,
      yesterdayHasPlan: summarizeDay(yesterday, tasksOn(s.tasks, yesterday), today).hasPlan,
      planReminderDismissedOn: s.ui.planReminderDismissedOn,
    }),
  };
}

/** The 30-day window the sidebar card and the ritual summary line read. */
export function consistencyView(
  s: AppState,
  today: ISODate,
): { days: DaySummary[]; planned: number } {
  const days = buildDaySummaries(addDays(today, -29), today, Object.values(s.tasks), today);
  return { days, planned: consistency(days, today).planned };
}

/**
 * Tomorrow's plan as ritual step 3 lists it: tasks carried over by a decision
 * first, then what already sat on tomorrow, then what was typed in this ritual.
 * Carried items show `postponedCount + 1` — the move has not happened yet.
 */
export function ritualTomorrowItems(
  s: AppState,
  draft: RitualDraft,
  today: ISODate,
): TomorrowItem[] {
  const tomorrow = addDays(today, 1);
  const carried = tasksOn(s.tasks, today).filter((task) => {
    const decision = draft.decisions[task.id];
    return (
      task.status === 'todo' && decision?.kind === 'move' && decision.date === tomorrow
    );
  });

  return [
    ...carried.map((task) => ({
      id: task.id,
      title: task.title,
      mit: draft.tomorrowMit[task.id] ?? task.mit,
      carried: true,
      postponedCount: task.postponedCount + 1,
      removable: false,
    })),
    ...tasksOn(s.tasks, tomorrow).map((task) => ({
      id: task.id,
      title: task.title,
      mit: task.mit,
      carried: false,
      postponedCount: task.postponedCount,
      removable: false,
    })),
    ...draft.tomorrowNew.map((item) => ({
      id: item.id,
      title: item.parsed.title,
      mit: item.parsed.mit,
      carried: false,
      postponedCount: 0,
      removable: true,
    })),
  ];
}

/** Tasks ritual step 1 reviews: still tickable, MITs first, then plan order. */
export function ritualReviewTasks(s: AppState, today: ISODate): Task[] {
  return tasksOn(s.tasks, today)
    .filter((task) => task.status === 'todo' || task.status === 'done')
    .sort((a, b) => (a.mit === b.mit ? a.position - b.position : a.mit ? -1 : 1));
}
