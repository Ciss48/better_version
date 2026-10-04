import { addDays, DEFAULT_SETTINGS } from '@/domain';
import type { DayLog, ISODate, Reflection, Settings, Task } from '@/domain';

/**
 * Hand-built fixtures on fixed dates. Nothing here is generated from the clock:
 * every window in `compute.ts` is relative to `today`, so the tests pin `today`
 * and spell the days out.
 *
 * 2026-10-03 is a Saturday — the design's anchor day.
 */

export const TODAY: ISODate = '2026-10-03';
export const SETTINGS: Settings = DEFAULT_SETTINGS;

/** 20:00 local on the day before — the evening habit. */
export function eveningAt(date: ISODate): string {
  return `${addDays(date, -1)}T13:00:00.000Z`;
}

/** 08:30 local on the day itself, before the 10:00 lock. */
export function morningAt(date: ISODate): string {
  return `${date}T01:30:00.000Z`;
}

/** 18:00 local — after the lock, so `classifyPlanTiming` says `late`. */
export function lateAt(date: ISODate): string {
  return `${date}T11:00:00.000Z`;
}

function createdFor(date: ISODate, timing: 'evening' | 'morning' | 'late'): string {
  if (timing === 'morning') return morningAt(date);
  if (timing === 'late') return lateAt(date);
  return eveningAt(date);
}

const BASE: Omit<Task, 'id' | 'planDate' | 'title'> = {
  important: false,
  urgent: false,
  mit: false,
  size: 'S',
  status: 'todo',
  postponedCount: 0,
  adhoc: false,
  position: 0,
  createdAt: '',
  completedAt: null,
  movedTo: null,
  originTaskId: null,
};

export interface DaySpec {
  /** Weighted completion of the day, exactly. */
  pct: number;
  /** Planned tasks; 100 of them makes every integer percentage exact. */
  count?: number;
  /** Per-day plan timing; `run()` recomputes it for each date. */
  timing?: 'evening' | 'morning' | 'late';
  createdAt?: string;
  /** Applied to every task of the day — flags, mit, status overrides. */
  flags?: Partial<Task>;
  /** Keeps ids unique when two blocks share a date. */
  key?: string;
}

/**
 * One planned day of equal-weight tasks, the first `pct`% of them done. With
 * the default of 100 same-size tasks the day's weighted completion is exactly
 * `pct`, whatever `pct` is.
 */
export function day(date: ISODate, spec: DaySpec): Task[] {
  const count = spec.count ?? 100;
  const done = Math.round((spec.pct * count) / 100);
  return Array.from({ length: count }, (_, index) => ({
    ...BASE,
    id: `${spec.key ?? ''}${date}#${index}`,
    planDate: date,
    title: `${date} #${index}`,
    position: index,
    status: index < done ? ('done' as const) : ('todo' as const),
    completedAt: index < done ? `${date}T05:00:00.000Z` : null,
    createdAt: spec.createdAt ?? createdFor(date, spec.timing ?? 'evening'),
    ...spec.flags,
  }));
}

/** `n` consecutive planned days ending on `end` (inclusive), going backwards. */
export function run(end: ISODate, n: number, spec: DaySpec): Task[] {
  const tasks: Task[] = [];
  for (let index = 0; index < n; index += 1) {
    tasks.push(...day(addDays(end, -index), spec));
  }
  return tasks;
}

/**
 * Days that only exist to make a fixture non-sparse or to get it past the
 * "≥14 planned days" insight gate. They sit in [today−61, today−90]: inside the
 * insights' 90-day window but outside both 30-day task windows. Their plans
 * were written `late` (so the evening insight skips them) and they carry no day
 * log (so energy skips them too).
 */
export function filler(today: ISODate, n = 14): Task[] {
  const tasks: Task[] = [];
  for (let index = 0; index < n; index += 1) {
    const date = addDays(today, -(61 + index));
    tasks.push(...day(date, { pct: 100, count: 1, timing: 'late', key: 'f-' }));
  }
  return tasks;
}

export function log(date: ISODate, energy: Reflection['energy']): DayLog {
  return { planDate: date, closedAt: `${date}T14:30:00.000Z`, energy, good: '', improve: '' };
}
