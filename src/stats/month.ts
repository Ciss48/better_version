import { classifyPlanTiming, localParts } from '@/domain';
import type { DaySummary, ISODate, Settings, Task } from '@/domain';
import { firstPlannedAt, roundMean } from './helpers';
import type { MonthSummary, PlanTiming } from './types';

/**
 * The two derived values the History screen needs. Both are pure and take the
 * data they work on, so the screen never reaches past the store for them.
 */

/**
 * The line under a month's title: "2/3 ngày có plan · TB 92%".
 *
 * Dates after today are not part of the month yet, and today is left out of the
 * average for the same reason every other average leaves it out — it is not
 * finished. It still counts as a day that has a plan.
 *
 * `null` when the month holds no plan at all; the calendar then says
 * "Chưa có dữ liệu".
 */
export function monthSummary(
  days: DaySummary[],
  month: string,
  today: ISODate,
): MonthSummary | null {
  const relevant = days.filter((day) => day.date.startsWith(`${month}-`) && day.date <= today);
  const planned = relevant.filter((day) => day.hasPlan);
  if (planned.length === 0) return null;

  const completed = planned.filter((day) => day.date < today).map((day) => day.pct);
  return { planned: planned.length, total: relevant.length, avg: roundMean(completed) ?? 0 };
}

/**
 * When the plan for `date` was written, as DayDetail prints it. A plan written
 * after the lock belongs to neither habit, so it is reported as `null` rather
 * than labelled — the screen simply drops the line.
 */
export function planTimingOf(
  dayTasks: Task[],
  date: ISODate,
  settings: Settings,
): PlanTiming | null {
  const at = firstPlannedAt(dayTasks);
  if (at === null) return null;

  const kind = classifyPlanTiming(at, date, settings);
  if (kind === 'late') return null;
  return { kind, time: localParts(at, settings.timezone).hhmm };
}
