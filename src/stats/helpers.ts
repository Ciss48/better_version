import { addDays } from '@/domain';
import type { ISODate, Task } from '@/domain';

/** An inclusive logical-date window, always expressed relative to `today`. */
export interface Window {
  from: ISODate;
  to: ISODate;
}

/** `windowOf(today, 30, 1)` → [today−30, today−1]. */
export function windowOf(today: ISODate, fromAgo: number, toAgo: number): Window {
  return { from: addDays(today, -fromAgo), to: addDays(today, -toAgo) };
}

export function inWindow(date: ISODate, w: Window): boolean {
  return date >= w.from && date <= w.to;
}

/** The mean of `values`, rounded to an integer; `null` for an empty list. */
export function roundMean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** `null` whenever either side is missing — a delta against nothing says nothing. */
export function deltaOf(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return Math.round(current - previous);
}

/** The share of `items` matching `match`, as whole percent; `null` if empty. */
export function shareOf<T>(items: T[], match: (item: T) => boolean): number | null {
  if (items.length === 0) return null;
  return Math.round((100 * items.filter(match).length) / items.length);
}

export function tasksIn(tasks: Task[], w: Window): Task[] {
  return tasks.filter((task) => inWindow(task.planDate, w));
}

/** Tasks of a day, keyed by `planDate` — the grouping every per-day rule needs. */
export function groupByDate(tasks: Task[]): Map<ISODate, Task[]> {
  const byDate = new Map<ISODate, Task[]>();
  for (const task of tasks) {
    const bucket = byDate.get(task.planDate);
    if (bucket) bucket.push(task);
    else byDate.set(task.planDate, [task]);
  }
  return byDate;
}

/**
 * When the plan for a day was first written: the earliest `createdAt` among its
 * planned (non-adhoc) tasks. `null` for a day with no plan.
 */
export function firstPlannedAt(dayTasks: Task[]): Date | null {
  let earliest: number | null = null;
  for (const task of dayTasks) {
    if (task.adhoc) continue;
    const at = new Date(task.createdAt).getTime();
    if (Number.isNaN(at)) continue;
    if (earliest === null || at < earliest) earliest = at;
  }
  return earliest === null ? null : new Date(earliest);
}
