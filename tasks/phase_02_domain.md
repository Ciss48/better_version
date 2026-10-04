# Phase 02: Domain logic

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (`docs/plan.md`). Phase 01
scaffolded Next.js + TS + Tailwind v4 + shadcn, tokens, fonts, the copy helper `t()`,
routes and the AppShell, with Vitest running (see `memory/phase_01_report.md` only if you
need a detail). This phase implements **every business rule** as pure, tested TypeScript
in `src/domain/`. Screens (Phase 4) and persistence (Phase 5) will call these functions
and must never re-implement the rules, so the contract below is load-bearing.

## Goal
`src/domain/` exports the types and functions in the Interface Contract, fully covered by
unit tests using fixed instants, with ≥90% line coverage, no React, no I/O and no
`new Date()` / `Date.now()` calls.

## Non-goals
- No UI, no hooks, no stores, no Supabase, no localStorage. Do not touch `src/app` or
  `src/components`.
- No stats beyond `summarizeDay` / `buildDaySummaries` / `consistency` (stat cards,
  weekday chart and insights are SQL in Phase 6).
- No `@tên-mục-tiêu` goal parsing, no recurring tasks, no reminders/notifications.
- No i18n/formatting of durations or dates for display (Phase 3 owns `src/lib/format.ts`).
- Do not "improve" rules: if a rule here looks wrong, log it (Moderate/Major) instead
  of changing it.

## Interface Contract

### Dependencies
`date-fns` v4 and `@date-fns/tz` (TZDate). Dev: `@vitest/coverage-v8`.
Add script `"test:coverage": "vitest run --coverage"` with coverage `include: ['src/domain/**']`.

### File layout (exact)
```
src/domain/
  index.ts          re-exports everything public
  types.ts          all types below
  errors.ts         DomainError
  settings.ts       DEFAULT_SETTINGS, settingsForHabit, validateSettings
  time.ts           localParts, zonedInstant, addDays, isoWeekday, isLateNight, logicalDate,
                    planWindow, isLocked, minutesToLock, classifyPlanTiming, reminderAt
  weights.ts        taskWeight, completion, quadrantOf, flagsForQuadrant
  quick-add.ts      parseQuickAdd
  tasks.ts          activeMitCount, createTask, toggleDone, patchTask, moveTask, dropTask, restoreTask
  date-chips.ts     dateChipOptions
  ritual.ts         ritualRemaining, closeDay
  banners.ts        selectBanners
  summary.ts        summarizeDay, buildDaySummaries, consistency
  events.ts         makeEvent (internal helper, also exported for the data layer)
  __tests__/*.test.ts   one test file per module
```

### types.ts
```ts
export type ISODate = string;   // logical day 'YYYY-MM-DD'
export type HHMM = string;      // 'HH:MM', 24h, zero-padded
export type Size = 'S' | 'M' | 'L';
export type TaskStatus = 'todo' | 'done' | 'moved' | 'dropped';
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'; // q1 important+urgent, q2 important, q3 urgent, q4 neither
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
  adhoc: boolean;              // created after the plan for planDate locked
  position: number;            // ordering within planDate, ascending
  createdAt: string;           // ISO-8601 UTC instant
  completedAt: string | null;  // set when status becomes 'done'
  movedTo: ISODate | null;     // set when status === 'moved'
  originTaskId: string | null; // the task this one was moved from
}

export interface ParsedTask {
  title: string; mit: boolean; important: boolean; urgent: boolean; size: Size | null;
}

export type Decision = { kind: 'move'; date: ISODate } | { kind: 'drop' };

export interface Settings {
  timezone: string;                                  // IANA
  habit: Habit;
  windowStart: { hour: number; dayOffset: -1 | 0 };  // evening {18,-1}; morning {6,0}
  lockTime: HHMM;                                    // 07:00–14:00
  dayEnd: HHMM;                                      // '00:00'…'05:00', whole hours
  remindOn: boolean;
  remindPlan: HHMM;
  remindRitual: HHMM;
  theme: Theme;
  onboardedAt: string | null;                        // ISO instant
}

export interface Reflection { energy: 0 | 1 | 2 | 3 | 4 | 5; good: string; improve: string }

export interface DayLog {
  planDate: ISODate; closedAt: string | null;
  energy: Reflection['energy']; good: string; improve: string;
}

export interface DaySummary { date: ISODate; hasPlan: boolean; pct: number; isToday: boolean }

export type TaskEventType =
  | 'task_created' | 'task_completed' | 'task_uncompleted' | 'task_updated'
  | 'task_moved' | 'task_dropped' | 'task_restored' | 'day_closed';

export interface TaskEvent {
  id: string;
  type: TaskEventType;
  taskId: string | null;        // null only for day_closed
  planDate: ISODate;
  occurredAt: string;           // ISO instant = ctx.now
  payload: Record<string, unknown>;
}

export type Notice = 'adhocAdded' | 'mitLimit';

/** Uniform result of every mutating function. The data layer persists it as one unit. */
export interface Mutation {
  upserts: Task[];      // full task objects after the change (new or updated)
  deletes: string[];    // task ids to delete
  events: TaskEvent[];
  notices: Notice[];    // UI turns these into toasts
}

/** Injected by callers; the domain never reads the clock or generates ids itself. */
export interface Ctx { now: Date; settings: Settings; newId: () => string }
```

### errors.ts
```ts
export type DomainErrorCode =
  | 'empty_title' | 'not_tickable' | 'not_movable' | 'invalid_move_date'
  | 'cannot_restore' | 'undecided_tasks';
export class DomainError extends Error { constructor(public code: DomainErrorCode, message?: string) }
```

### settings.ts
```ts
export const DEFAULT_SETTINGS: Settings; // timezone 'Asia/Ho_Chi_Minh', habit 'evening', windowStart {18,-1},
                                         // lockTime '10:00', dayEnd '00:00', remindOn true,
                                         // remindPlan '21:30', remindRitual '21:00', theme 'system', onboardedAt null
/** Returns a copy with habit + its windowStart ({18,-1} | {6,0}) and remindPlan ('21:30' | '07:00'). */
export function settingsForHabit(s: Settings, habit: Habit): Settings;
/** Returns a list of human-readable problems; [] means valid.
 *  Rules: HH:MM format everywhere; lockTime 07:00–14:00; dayEnd ∈ {00..05}:00;
 *  evening → windowStart.hour 17–20 & dayOffset -1; morning → hour 5–6 & dayOffset 0. */
export function validateSettings(s: Settings): string[];
```

### time.ts (all instants are `Date`; all wall-clock math in `settings.timezone`)
```ts
export function localParts(now: Date, tz: string): { date: ISODate; hhmm: HHMM; minutes: number }; // minutes since local midnight
export function zonedInstant(date: ISODate, hhmm: HHMM, tz: string): Date;  // that wall-clock time in tz
export function addDays(date: ISODate, n: number): ISODate;
export function isoWeekday(date: ISODate): 1|2|3|4|5|6|7;                   // Mon=1 … Sun=7
export function isLateNight(now: Date, s: Settings): boolean;               // local minutes < dayEnd minutes
export function logicalDate(now: Date, s: Settings): ISODate;               // local date, minus 1 day if late night
export function planWindow(date: ISODate, s: Settings): { opensAt: Date; locksAt: Date };
   // opensAt = zonedInstant(addDays(date, windowStart.dayOffset), HH(windowStart.hour)+':00')
   // locksAt = zonedInstant(date, lockTime)
export function isLocked(date: ISODate, now: Date, s: Settings): boolean;   // now >= locksAt
export function minutesToLock(date: ISODate, now: Date, s: Settings): number | null; // ceil, null if locked
export function classifyPlanTiming(firstPlannedAt: Date, date: ISODate, s: Settings): 'evening'|'morning'|'late';
   // < zonedInstant(date, dayEnd) → evening; < locksAt → morning; else late
export function reminderAt(target: ISODate, s: Settings): Date;
   // zonedInstant(addDays(target, windowStart.dayOffset), remindPlan)
```

### weights.ts
```ts
export function taskWeight(t: Task): number;                 // S1, M2, null→2, L3; ×2 if mit
export function completion(tasks: Task[]): { pct: number; done: number; total: number };
   // considers only adhoc=false AND status≠'dropped'; moved = not done.
   // pct = round(100 * Σweight(done) / Σweight(considered)); 0 when nothing considered.
   // done/total are COUNTS of considered tasks (for "3/5 việc đã định").
export function quadrantOf(t: Pick<Task,'important'|'urgent'>): Quadrant;
export function flagsForQuadrant(q: Quadrant): { important: boolean; urgent: boolean };
```

### quick-add.ts
```ts
export function parseQuickAdd(input: string): ParsedTask | null;
```
Split on whitespace. A word matching `/^[*!^]+$/` sets flags for each char present
(`*` mit, `!` important, `^` urgent). A word matching `/^~[sml]$/i` sets size (uppercase;
last one wins). All other words form the title, joined by single spaces. Symbols inside
other words are text (`C++`, `hi!`). Returns `null` if the title is empty.

### tasks.ts
```ts
/** MITs that count toward the limit of 3: mit && status ∈ {todo, done}. */
export function activeMitCount(dayTasks: Task[]): number;

export function createTask(input: ParsedTask, at: { planDate: ISODate; dayTasks: Task[] }, ctx: Ctx): Mutation;
   // adhoc = isLocked(planDate, ctx.now) → notice 'adhocAdded'
   // mit requested but activeMitCount ≥ 3 → mit=false, notice 'mitLimit'
   // position = max(dayTasks.position)+1 (0 if none); status 'todo'; postponedCount 0
   // events: task_created { title, important, urgent, mit, size, adhoc, originTaskId: null }
   // throws empty_title if title.trim() === ''

export function toggleDone(task: Task, ctx: Ctx): Mutation;
   // todo→done (completedAt=now, event task_completed); done→todo (completedAt=null, task_uncompleted)
   // moved/dropped → throws not_tickable

export function patchTask(task: Task,
  patch: Partial<Pick<Task, 'title'|'important'|'urgent'|'mit'|'size'>>,
  dayTasks: Task[], ctx: Ctx): Mutation;
   // mit:true while activeMitCount(others) ≥ 3 → mit stays false, notice 'mitLimit', other fields still applied
   // title trimmed; empty → throws empty_title
   // event task_updated { changes: <only fields that actually changed> }; no-op patch → no event, no upsert
   // (Matrix moves call patchTask with flagsForQuadrant(q).)

export function moveTask(task: Task, toDate: ISODate,
  target: { dayTasks: Task[] }, ctx: Ctx): Mutation;
   // requires task.status === 'todo' else throws not_movable
   // requires toDate > task.planDate AND toDate > logicalDate(ctx.now) else invalid_move_date
   // original → status 'moved', movedTo = toDate
   // new task on toDate: same title/important/urgent/size, mit kept unless target activeMitCount ≥ 3
   //   (then false + notice 'mitLimit'), status 'todo', postponedCount = original+1, adhoc false,
   //   originTaskId = original.id, position = max(target)+1, createdAt now
   // events: task_moved {to, newTaskId} on original; task_created on new (originTaskId set)

export function dropTask(task: Task, ctx: Ctx): Mutation;
   // todo → dropped (event task_dropped); other statuses → throws not_movable

export function restoreTask(task: Task, related: Task[], ctx: Ctx): Mutation;
   // dropped → todo; event task_restored {from:'dropped'}
   // moved → find copy in `related` with originTaskId === task.id; if missing or copy.status ≠ 'todo'
   //   → throws cannot_restore; else delete copy, original → todo, movedTo null;
   //   event task_restored {from:'moved', removedTaskId}
   // todo/done → throws cannot_restore
```

### date-chips.ts
```ts
export type DateChipKey = 'tomorrow' | 'nextMonday' | 'weekend' | 'plusWeek';
export function dateChipOptions(today: ISODate): { key: DateChipKey; date: ISODate }[];
   // tomorrow = today+1; nextMonday = first Monday strictly after today;
   // weekend = first Saturday strictly after today; plusWeek = today+7.
   // Order as listed; drop any option whose date equals an earlier option's date.
```

### ritual.ts
```ts
export function ritualRemaining(todayTasks: Task[], decisions: Record<string, Decision>): number;
   // count of status 'todo' tasks (planned AND adhoc) without a decision

export interface CloseDayInput {
  date: ISODate;                          // the day being closed
  todayTasks: Task[];                     // every task of `date`, incl. adhoc
  decisions: Record<string, Decision>;    // keyed by task id
  tomorrowExisting: Task[];               // tasks already on date+1
  tomorrowMit: Record<string, boolean>;   // MIT overrides for tasks moved to date+1, keyed by ORIGINAL task id
  tomorrowNew: ParsedTask[];              // typed in step 3, in order
  reflection: Reflection;
}
export function closeDay(input: CloseDayInput, ctx: Ctx): Mutation & { dayLog: DayLog };
   // throws undecided_tasks if ritualRemaining > 0
   // decisions on non-todo tasks are ignored
   // applies moveTask / dropTask per decision; for moves to date+1 the new task's mit = tomorrowMit[id] ?? original.mit
   // creates tomorrowNew tasks on date+1 (via createTask rules)
   // MIT limit on date+1 is enforced across: tomorrowExisting, then moved-in tasks (in todayTasks order),
   //   then tomorrowNew (in order) — the 4th+ MIT becomes mit=false with notice 'mitLimit' (notice at most once)
   // dayLog = { planDate: date, closedAt: now ISO, energy, good: trimmed, improve: trimmed }
   // final event: day_closed { pct, done, total, energy } where pct/done/total = completion(todayTasks after decisions)
   // events from sub-operations are included in order; upserts contain each task id at most once
```

### banners.ts
```ts
export type BannerVariant = 'planReminder' | 'ritual' | 'missedDay' | 'complete' | 'welcome';
export interface BannerInput {
  now: Date; settings: Settings;
  today: ISODate;                         // = logicalDate(now, settings)
  todayTasks: Task[]; tomorrowTasks: Task[];
  todayClosed: boolean;
  firstPlanDate: ISODate | null;          // earliest date that has ≥1 planned (adhoc=false) task, ever
  yesterdayHasPlan: boolean;
  planReminderDismissedOn: ISODate | null;
}
export function selectBanners(i: BannerInput): { variant: BannerVariant; target?: ISODate }[];
```
Rules (returned in this order: planReminder XOR ritual, then missedDay, complete, welcome):
- **planReminder** (with `target`): target = habit 'evening' ? today+1 : today.
  Shown iff remindOn AND now ≥ reminderAt(target) AND now < planWindow(target).locksAt
  AND target has no planned task (tomorrowTasks/todayTasks with adhoc=false) AND
  planReminderDismissedOn ≠ today.
- **ritual**: only if planReminder is not shown; !todayClosed AND
  now ≥ zonedInstant(today, '18:00', tz) (this also covers late night).
- **missedDay**: firstPlanDate ≠ null AND firstPlanDate < today−1 AND !yesterdayHasPlan.
- **complete**: completion(todayTasks).total > 0 AND pct === 100.
- **welcome**: firstPlanDate === null AND todayTasks has no planned task.

### summary.ts
```ts
export function summarizeDay(date: ISODate, dayTasks: Task[], today: ISODate): DaySummary;
   // hasPlan = ≥1 task with adhoc=false (any status); pct = completion(dayTasks).pct; isToday = date === today
export function buildDaySummaries(from: ISODate, to: ISODate, tasks: Task[], today: ISODate): DaySummary[];
   // one entry per date in [from, to], ascending; tasks grouped by planDate
export function consistency(summaries: DaySummary[], today: ISODate): { planned: number; total: 30 };
   // hasPlan count over dates in [today−29, today]
```

### events.ts
```ts
export function makeEvent(type: TaskEventType, taskId: string | null, planDate: ISODate,
  payload: Record<string, unknown>, ctx: Ctx): TaskEvent;   // id = ctx.newId(), occurredAt = ctx.now.toISOString()
```

## Steps
1. Install deps; add coverage config and the `test:coverage` script.
2. Write `types.ts`, `errors.ts`, `events.ts`, `settings.ts` (+ tests).
3. Write `time.ts` + tests first — everything else depends on it. Use these fixtures
   (tz `Asia/Ho_Chi_Minh`, UTC+7, no DST):
   - `logicalDate(2026-10-03T03:00:00Z)` = `'2026-10-03'` (10:00 Sat).
   - now `2026-10-03T18:00:00Z` (01:00 Sun local): dayEnd `'03:00'` → logicalDate
     `'2026-10-03'`, isLateNight true; dayEnd `'00:00'` → `'2026-10-04'`, false.
   - `planWindow('2026-10-04', DEFAULT_SETTINGS)` → opensAt `2026-10-03T11:00:00.000Z`,
     locksAt `2026-10-04T03:00:00.000Z`. Morning habit → opensAt `2026-10-03T23:00:00.000Z`.
   - `isLocked('2026-10-03', 2026-10-03T02:59:59Z)` false; at `03:00:00Z` true.
   - `minutesToLock('2026-10-03', 2026-10-03T01:15:00Z)` = 105.
   - `classifyPlanTiming(2026-10-02T14:00:00Z, '2026-10-03')` = evening;
     `2026-10-03T01:00:00Z` → morning; `2026-10-03T05:00:00Z` → late.
   - A non-VN check: tz `America/New_York`, `planWindow('2026-10-04', …lockTime '10:00')`
     locksAt `2026-10-04T14:00:00.000Z` (EDT).
   - `isoWeekday('2026-10-03')` = 6, `('2026-10-04')` = 7.
4. `weights.ts` + tests. Required fixture: tasks
   [MIT L done, M todo, S done, size-null moved, L dropped, adhoc S done]
   → `completion` = `{ pct: 64, done: 2, total: 4 }`. Also: empty → `{0,0,0}`;
   only adhoc → `{0,0,0}`; quadrant round-trips for q1–q4.
5. `quick-add.ts` + tests: `'Học Databricks * ~L'` → title `'Học Databricks'`, mit, L;
   `'Gửi báo cáo !^'` → important+urgent; `'C++ basics'` and `'hi!'` unchanged;
   `'* ! ^ ~m Chạy bộ'` → all flags, M, `'Chạy bộ'`; `'~S ~L test'` → L; `'   *  '` → null;
   `'a   b'` → `'a b'`.
6. `tasks.ts` + tests covering every rule and every throw in the contract, including:
   4th MIT via createTask and via patchTask; dropped MIT not counted; adhoc when locked;
   move preserves flags and increments postponedCount on a task already moved twice
   (→ 3); move into a day with 3 MITs; restore moved (copy deleted) vs copy already done
   (throws); each mutation's event types and `taskId`s.
7. `date-chips.ts` + tests: Sat `2026-10-03` → tomorrow 10-04, nextMonday 10-05,
   weekend 10-10 (plusWeek hidden); Fri `2026-10-02` → 10-03, 10-05, 10-09 (weekend
   hidden); Sun `2026-10-04` → 10-05, 10-10, 10-11 (nextMonday hidden).
8. `ritual.ts` + tests: undecided throws; full scenario (1 done, 1 moved to tomorrow with
   MIT override off, 1 moved to 10-10, 1 adhoc dropped, 2 new tomorrow tasks, 3 existing
   tomorrow MITs → new MIT downgraded with one notice); day_closed payload pct matches
   `completion`; no duplicate ids in upserts.
9. `banners.ts` + tests: one test per rule plus: planReminder suppresses ritual;
   dismissed today hides planReminder; morning habit targets today; late-night 01:00
   shows ritual; missed+complete stack.
10. `summary.ts` + tests: day with only moved planned tasks → hasPlan true, pct 0;
    buildDaySummaries length for a 30-day range = 30; consistency counts only last 30 days.
11. `index.ts` re-exports. Run the full check suite.
12. Handoff + commit `phase-02: domain`.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0.
- `pnpm test:coverage` reports ≥90% line coverage for `src/domain/**`.
- Every fixture listed in Steps 3–10 exists as a test and passes.
- `grep -rnE "new Date\(\)|Date\.now\(" src/domain --include=*.ts | grep -v __tests__`
  returns nothing.
- `grep -rnE "from ['\"](react|next|@supabase)" src/domain` returns nothing.
- `src/domain/index.ts` exports every name listed in the contract (verify with a test
  that imports them all from `@/domain`).
- No files outside `src/domain/`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`
  and `memory/` changed (`git diff --stat` before committing).

## Handoff Obligations
1. Write `memory/phase_02_report.md` (What was done / Results / New findings /
   Decisions made / Open issues / Input for the next phase). List any rule you found
   ambiguous and how the test encodes it.
2. Overwrite `memory/STATE.md`; next action: "Phase 03 task file to be written by the
   planning session — bring STATE.md, phase_02_report.md and discoveries.md back to it".
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
