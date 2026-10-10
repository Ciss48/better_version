import type {
  DayLog,
  Habit,
  Reflection,
  Settings,
  Size,
  Task,
  TaskEvent,
  TaskEventType,
  TaskStatus,
  Theme,
} from '@/domain';
import type { Database, Json } from './database.types';

type Tables = Database['public']['Tables'];
export type TaskRow = Tables['tasks']['Row'];
export type SettingsRow = Tables['user_settings']['Row'];
export type DayLogRow = Tables['day_logs']['Row'];
export type TaskEventRow = Tables['task_events']['Row'];

/**
 * Pure row ↔ domain translation. The only module that knows a column name.
 *
 * Two things it exists to get right:
 *
 * 1. **Instants.** Postgres hands back `2026-10-03T01:00:00+00:00`; the domain
 *    compares `createdAt` and `occurredAt` as *strings*, so everything that
 *    crosses this boundary is normalised to `…Z` with milliseconds. A row that
 *    skipped this would sort differently from one the app had just written.
 * 2. **`Settings.windowStart`**, which is one object in the domain and two
 *    columns in the table.
 *
 * Nothing here validates: the store's `repairSettings` already owns "stored
 * data no longer makes sense", and the table's own CHECK constraints own the
 * write direction.
 */

/** `2026-10-03T01:00:00+00:00` → `2026-10-03T01:00:00.000Z`. */
export function toIsoZ(value: string): string {
  return new Date(value).toISOString();
}

function toIsoZOrNull(value: string | null): string | null {
  return value === null ? null : toIsoZ(value);
}

// ------------------------------------------------------------------ Task

/** The insert payload `commit_mutation` expects — snake_case column names. */
export interface TaskUpsert {
  id: string;
  plan_date: string;
  title: string;
  important: boolean;
  urgent: boolean;
  mit: boolean;
  size: Size | null;
  status: TaskStatus;
  postponed_count: number;
  adhoc: boolean;
  position: number;
  created_at: string;
  completed_at: string | null;
  moved_to: string | null;
  origin_task_id: string | null;
}

export function taskToRow(task: Task): TaskUpsert {
  return {
    id: task.id,
    plan_date: task.planDate,
    title: task.title,
    important: task.important,
    urgent: task.urgent,
    mit: task.mit,
    size: task.size,
    status: task.status,
    postponed_count: task.postponedCount,
    adhoc: task.adhoc,
    position: task.position,
    created_at: task.createdAt,
    completed_at: task.completedAt,
    moved_to: task.movedTo,
    origin_task_id: task.originTaskId,
  };
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    planDate: row.plan_date,
    title: row.title,
    important: row.important,
    urgent: row.urgent,
    mit: row.mit,
    // The CHECK constraint guarantees the domain's own union.
    size: row.size as Size | null,
    status: row.status as TaskStatus,
    postponedCount: row.postponed_count,
    adhoc: row.adhoc,
    position: row.position,
    createdAt: toIsoZ(row.created_at),
    completedAt: toIsoZOrNull(row.completed_at),
    movedTo: row.moved_to,
    originTaskId: row.origin_task_id,
  };
}

// -------------------------------------------------------------- Settings

/** `user_id` is left out: the column defaults to `auth.uid()`. */
export type SettingsUpsert = Omit<
  SettingsRow,
  'user_id' | 'created_at' | 'updated_at'
>;

export function settingsToRow(s: Settings): SettingsUpsert {
  return {
    timezone: s.timezone,
    habit: s.habit,
    window_start_hour: s.windowStart.hour,
    window_start_offset: s.windowStart.dayOffset,
    lock_time: s.lockTime,
    day_end: s.dayEnd,
    remind_on: s.remindOn,
    remind_plan: s.remindPlan,
    remind_ritual: s.remindRitual,
    theme: s.theme,
    onboarded_at: s.onboardedAt,
  };
}

export function rowToSettings(row: SettingsRow): Settings {
  return {
    timezone: row.timezone,
    habit: row.habit as Habit,
    windowStart: {
      hour: row.window_start_hour,
      dayOffset: row.window_start_offset === -1 ? -1 : 0,
    },
    lockTime: row.lock_time,
    dayEnd: row.day_end,
    remindOn: row.remind_on,
    remindPlan: row.remind_plan,
    remindRitual: row.remind_ritual,
    theme: row.theme as Theme,
    onboardedAt: toIsoZOrNull(row.onboarded_at),
  };
}

// ---------------------------------------------------------------- DayLog

export interface DayLogUpsert {
  plan_date: string;
  closed_at: string | null;
  energy: number;
  good: string;
  improve: string;
}

export function dayLogToRow(log: DayLog): DayLogUpsert {
  return {
    plan_date: log.planDate,
    closed_at: log.closedAt,
    energy: log.energy,
    good: log.good,
    improve: log.improve,
  };
}

export function rowToDayLog(row: DayLogRow): DayLog {
  return {
    planDate: row.plan_date,
    closedAt: toIsoZOrNull(row.closed_at),
    // The CHECK constraint pins this to 0–5.
    energy: row.energy as Reflection['energy'],
    good: row.good,
    improve: row.improve,
  };
}

// ------------------------------------------------------------- TaskEvent

export interface TaskEventUpsert {
  id: string;
  task_id: string | null;
  plan_date: string;
  type: TaskEventType;
  payload: Json;
  occurred_at: string;
}

export function eventToRow(event: TaskEvent): TaskEventUpsert {
  return {
    id: event.id,
    task_id: event.taskId,
    plan_date: event.planDate,
    type: event.type,
    payload: event.payload as Json,
    occurred_at: event.occurredAt,
  };
}

export function rowToEvent(row: TaskEventRow): TaskEvent {
  return {
    id: row.id,
    type: row.type as TaskEventType,
    taskId: row.task_id,
    planDate: row.plan_date,
    occurredAt: toIsoZ(row.occurred_at),
    payload: (row.payload ?? {}) as Record<string, unknown>,
  };
}
