export type ISODate = string; // logical day 'YYYY-MM-DD'
export type HHMM = string; // 'HH:MM', 24h, zero-padded
export type Size = 'S' | 'M' | 'L';
export type TaskStatus = 'todo' | 'done' | 'moved' | 'dropped';
/** q1 important+urgent, q2 important, q3 urgent, q4 neither */
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';
export type Habit = 'evening' | 'morning';
export type Theme = 'light' | 'dark' | 'system';

export interface Task {
  id: string;
  planDate: ISODate;
  title: string;
  important: boolean;
  urgent: boolean;
  mit: boolean;
  size: Size | null;
  status: TaskStatus;
  postponedCount: number;
  /** created after the plan for planDate locked */
  adhoc: boolean;
  /** ordering within planDate, ascending */
  position: number;
  /** ISO-8601 UTC instant */
  createdAt: string;
  /** set when status becomes 'done' */
  completedAt: string | null;
  /** set when status === 'moved' */
  movedTo: ISODate | null;
  /** the task this one was moved from */
  originTaskId: string | null;
}

export interface ParsedTask {
  title: string;
  mit: boolean;
  important: boolean;
  urgent: boolean;
  size: Size | null;
}

export type Decision = { kind: 'move'; date: ISODate } | { kind: 'drop' };

export interface Settings {
  /** IANA */
  timezone: string;
  habit: Habit;
  /** evening {18,-1}; morning {6,0} */
  windowStart: { hour: number; dayOffset: -1 | 0 };
  /** 07:00–14:00 */
  lockTime: HHMM;
  /** '00:00'…'05:00', whole hours */
  dayEnd: HHMM;
  remindOn: boolean;
  remindPlan: HHMM;
  remindRitual: HHMM;
  theme: Theme;
  /** ISO instant */
  onboardedAt: string | null;
}

export interface Reflection {
  energy: 0 | 1 | 2 | 3 | 4 | 5;
  good: string;
  improve: string;
}

export interface DayLog {
  planDate: ISODate;
  closedAt: string | null;
  energy: Reflection['energy'];
  good: string;
  improve: string;
}

export interface DaySummary {
  date: ISODate;
  hasPlan: boolean;
  pct: number;
  isToday: boolean;
}

export type TaskEventType =
  | 'task_created'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_updated'
  | 'task_moved'
  | 'task_dropped'
  | 'task_restored'
  | 'day_closed';

export interface TaskEvent {
  id: string;
  type: TaskEventType;
  /** null only for day_closed */
  taskId: string | null;
  planDate: ISODate;
  /** ISO instant = ctx.now */
  occurredAt: string;
  payload: Record<string, unknown>;
}

export type Notice = 'adhocAdded' | 'mitLimit';

/** Uniform result of every mutating function. The data layer persists it as one unit. */
export interface Mutation {
  /** full task objects after the change (new or updated) */
  upserts: Task[];
  /** task ids to delete */
  deletes: string[];
  events: TaskEvent[];
  /** UI turns these into toasts */
  notices: Notice[];
}

/** Injected by callers; the domain never reads the clock or generates ids itself. */
export interface Ctx {
  now: Date;
  settings: Settings;
  newId: () => string;
}
