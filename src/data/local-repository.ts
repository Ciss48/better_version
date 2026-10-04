import type { DayLog, ISODate, Mutation, Settings, Task, TaskEvent } from '@/domain';
import { applyMutation, earliestPlanDate, inRange } from './repository';
import type { DateRange, SeedableRepository, SeedData } from './repository';

export const KEYS = {
  settings: 'bed:v1:settings',
  tasks: 'bed:v1:tasks',
  dayLogs: 'bed:v1:dayLogs',
  events: 'bed:v1:events',
} as const;

/** Reads and parses one key. Corrupt JSON is treated as absent, loudly. */
function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`[data] ${key} holds invalid JSON — treating it as empty.`, error);
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

/**
 * localStorage persistence. The whole dataset is small enough (one person,
 * a few thousand tasks) that every call reads the key it needs and writes it
 * back whole.
 *
 * `commit` builds the next value of **every** affected key in memory first and
 * only then writes, so a throw while applying leaves storage untouched. The
 * writes themselves are not transactional — localStorage has no transactions —
 * which is exactly the guarantee Phase 7 must strengthen with a single SQL
 * transaction or RPC.
 */
export class LocalRepository implements SeedableRepository {
  async loadSettings(): Promise<Settings | null> {
    return read<Settings | null>(KEYS.settings, null);
  }

  async saveSettings(s: Settings): Promise<void> {
    write(KEYS.settings, s);
  }

  private tasks(): Record<string, Task> {
    return read<Record<string, Task>>(KEYS.tasks, {});
  }

  private logs(): Record<ISODate, DayLog> {
    return read<Record<ISODate, DayLog>>(KEYS.dayLogs, {});
  }

  async loadTasks(r: DateRange): Promise<Task[]> {
    return Object.values(this.tasks()).filter((task) => inRange(task.planDate, r));
  }

  async loadDayLogs(r: DateRange): Promise<DayLog[]> {
    return Object.values(this.logs()).filter((log) => inRange(log.planDate, r));
  }

  async firstPlanDate(): Promise<ISODate | null> {
    return earliestPlanDate(Object.values(this.tasks()));
  }

  async commit(m: Mutation, dayLog?: DayLog): Promise<void> {
    const tasks = this.tasks();
    applyMutation(tasks, m);
    const events = [...read<TaskEvent[]>(KEYS.events, []), ...m.events];
    const logs = this.logs();
    if (dayLog !== undefined) logs[dayLog.planDate] = dayLog;

    write(KEYS.tasks, tasks);
    write(KEYS.events, events);
    if (dayLog !== undefined) write(KEYS.dayLogs, logs);
  }

  async reset(): Promise<void> {
    if (typeof window === 'undefined') return;
    for (const key of Object.values(KEYS)) window.localStorage.removeItem(key);
  }

  async seed(data: SeedData): Promise<void> {
    if (data.settings !== undefined) {
      if (data.settings === null) window.localStorage.removeItem(KEYS.settings);
      else write(KEYS.settings, data.settings);
    }
    if (data.tasks !== undefined) {
      const tasks = this.tasks();
      for (const task of data.tasks) tasks[task.id] = task;
      write(KEYS.tasks, tasks);
    }
    if (data.dayLogs !== undefined) {
      const logs = this.logs();
      for (const log of data.dayLogs) logs[log.planDate] = log;
      write(KEYS.dayLogs, logs);
    }
    if (data.events !== undefined) {
      write(KEYS.events, [...read<TaskEvent[]>(KEYS.events, []), ...data.events]);
    }
  }
}
