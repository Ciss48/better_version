import { addDays } from './time';
import { completion } from './weights';
import type { DaySummary, ISODate, Task } from './types';

const CONSISTENCY_WINDOW = 30;

export function summarizeDay(date: ISODate, dayTasks: Task[], today: ISODate): DaySummary {
  return {
    date,
    hasPlan: dayTasks.some((t) => !t.adhoc),
    pct: completion(dayTasks).pct,
    isToday: date === today,
  };
}

/** One summary per date in [from, to], ascending. */
export function buildDaySummaries(
  from: ISODate,
  to: ISODate,
  tasks: Task[],
  today: ISODate,
): DaySummary[] {
  const byDate = new Map<ISODate, Task[]>();
  for (const t of tasks) {
    const bucket = byDate.get(t.planDate);
    if (bucket) bucket.push(t);
    else byDate.set(t.planDate, [t]);
  }

  const summaries: DaySummary[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    summaries.push(summarizeDay(date, byDate.get(date) ?? [], today));
  }
  return summaries;
}

/** Days with a plan in the last 30 logical days (never resets; no streak). */
export function consistency(
  summaries: DaySummary[],
  today: ISODate,
): { planned: number; total: 30 } {
  const from = addDays(today, -(CONSISTENCY_WINDOW - 1));
  const planned = summaries.filter(
    (s) => s.hasPlan && s.date >= from && s.date <= today,
  ).length;
  return { planned, total: CONSISTENCY_WINDOW };
}
