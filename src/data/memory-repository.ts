import type { DayLog, ISODate, Mutation, Settings, Task, TaskEvent } from '@/domain';
import { applyMutation, earliestPlanDate, inRange } from './repository';
import type { DateRange, SeedableRepository, SeedData } from './repository';

/**
 * The reference implementation: everything in plain objects. Tests use it, and
 * it documents the semantics `LocalRepository` and the future Supabase one have
 * to match (see `__tests__/repository.contract.ts`).
 */
export class MemoryRepository implements SeedableRepository {
  private settings: Settings | null = null;
  private tasks: Record<string, Task> = {};
  private dayLogs: Record<ISODate, DayLog> = {};
  private events: TaskEvent[] = [];

  async loadSettings(): Promise<Settings | null> {
    return this.settings === null ? null : { ...this.settings };
  }

  async saveSettings(s: Settings): Promise<void> {
    this.settings = { ...s, windowStart: { ...s.windowStart } };
  }

  async loadTasks(r: DateRange): Promise<Task[]> {
    return Object.values(this.tasks)
      .filter((task) => inRange(task.planDate, r))
      .map((task) => ({ ...task }));
  }

  async loadDayLogs(r: DateRange): Promise<DayLog[]> {
    return Object.values(this.dayLogs)
      .filter((log) => inRange(log.planDate, r))
      .map((log) => ({ ...log }));
  }

  async firstPlanDate(): Promise<ISODate | null> {
    return earliestPlanDate(Object.values(this.tasks));
  }

  async commit(m: Mutation, dayLog?: DayLog): Promise<void> {
    const tasks = { ...this.tasks };
    applyMutation(tasks, m);
    this.tasks = tasks;
    this.events = [...this.events, ...m.events];
    if (dayLog !== undefined) {
      this.dayLogs = { ...this.dayLogs, [dayLog.planDate]: { ...dayLog } };
    }
  }

  async reset(): Promise<void> {
    this.settings = null;
    this.tasks = {};
    this.dayLogs = {};
    this.events = [];
  }

  // ── Test/seed helpers (not part of the Repository contract) ──────────────

  /** Writes state directly, without deriving events — seeds and tests only. */
  async seed(data: SeedData): Promise<void> {
    if (data.settings !== undefined) this.settings = data.settings;
    for (const task of data.tasks ?? []) this.tasks[task.id] = { ...task };
    for (const log of data.dayLogs ?? []) this.dayLogs[log.planDate] = { ...log };
    if (data.events !== undefined) this.events = [...this.events, ...data.events];
  }

  /** The append-only event log, oldest first. */
  allEvents(): TaskEvent[] {
    return [...this.events];
  }
}
