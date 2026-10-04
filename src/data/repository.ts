import type { DayLog, ISODate, Mutation, Settings, Task, TaskEvent } from '@/domain';

/** Inclusive logical-date range. */
export interface DateRange {
  from: ISODate;
  to: ISODate;
}

/**
 * The only seam between the screens and storage. Phase 5 ships two
 * implementations (memory for tests, localStorage for the browser); Phase 7
 * adds a Supabase one without touching anything above this interface.
 *
 * `commit` is the whole contract: a `Mutation` (plus the `DayLog` of a close)
 * is persisted as **one unit** — upserts, deletes, the event log and the day
 * log either all land or none do.
 */
export interface Repository {
  /** `null` means "never saved" — a first run, not a user with defaults. */
  loadSettings(): Promise<Settings | null>;
  saveSettings(s: Settings): Promise<void>;
  /** Every task whose `planDate` falls inside `r`. */
  loadTasks(r: DateRange): Promise<Task[]>;
  loadDayLogs(r: DateRange): Promise<DayLog[]>;
  /** The earliest `planDate` that has at least one `adhoc = false` task. */
  firstPlanDate(): Promise<ISODate | null>;
  commit(m: Mutation, dayLog?: DayLog): Promise<void>;
  /** Dev and tests only — wipes everything this repository owns. */
  reset(): Promise<void>;
}

/** Ready-made state a dev seed can write straight into a repository. */
export interface SeedData {
  settings?: Settings | null;
  tasks?: Task[];
  dayLogs?: DayLog[];
  events?: TaskEvent[];
}

/**
 * A repository that can be filled with ready-made state. Deliberately *not*
 * part of the `Repository` contract: only the dev seeds and tests use it, so
 * Phase 7's Supabase implementation does not have to provide it.
 */
export interface SeedableRepository extends Repository {
  seed(data: SeedData): Promise<void>;
}

export function isSeedable(r: Repository): r is SeedableRepository {
  return typeof (r as SeedableRepository).seed === 'function';
}

/** Applies a mutation to a task map in place. Shared by every implementation. */
export function applyMutation(tasks: Record<string, Task>, m: Mutation): void {
  for (const task of m.upserts) tasks[task.id] = task;
  for (const id of m.deletes) delete tasks[id];
}

/** The earliest planDate among planned (non-adhoc) tasks, or `null`. */
export function earliestPlanDate(tasks: Task[]): ISODate | null {
  let earliest: ISODate | null = null;
  for (const task of tasks) {
    if (task.adhoc) continue;
    if (earliest === null || task.planDate < earliest) earliest = task.planDate;
  }
  return earliest;
}

export function inRange(date: ISODate, r: DateRange): boolean {
  return date >= r.from && date <= r.to;
}
