# Phase 05: App core on a local repository

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (`docs/plan.md`). Phases 1–4 are
done: scaffold + AppShell (1); pure, 100%-covered `src/domain/` (2, amended in 3); every
presentational component, visible at `/dev/components`, with `ClockProvider`/`useClock()`
and two working reference loops — `src/app/dev/components/Playground.tsx` (Today) and
`RitualPlayground.tsx` (ritual + `closeDay` incl. `otherTargets`) (3–4). The `(app)` routes
are still placeholders. This phase builds the state layer and the real **Today, Ritual,
Onboarding, Settings and More** screens on a localStorage repository, so the whole core
loop works in the browser without a backend. Stats, History, Goals and Weekly are Phase 6.

## Goal
A user can onboard (or skip), plan, tick, move/drop/restore, use the matrix, run the
evening ritual and close the day, change settings — and everything survives a reload.
Every Today/Ritual/Onboarding/Settings state in `design/handoff/screens.md` is reproducible
via dev-only `?seed=` and `?now=` and captured by `pnpm shots:screens`; Playwright e2e
flows pass.

## Non-goals
- No Supabase, no auth, no Supabase MCP, no network calls.
- No stats: do not build `src/stats/`, the Journey screen or History screen (Phase 6).
  ConsistencyMini uses the domain's `buildDaySummaries` + `consistency` only.
- `/stats`, `/history`, `/goals`, `/weekly` stay placeholders.
- No changes to `src/domain/` (if a rule seems wrong → discovery). No new UI kit, no new
  date library. zustand is the only new runtime dependency.
- No push notifications, no service worker, no PWA manifest.

## Interface Contract

### 1. Repository (`src/data/repository.ts`) — Phase 7 implements this for Supabase
```ts
export interface DateRange { from: ISODate; to: ISODate }      // inclusive
export interface Repository {
  loadSettings(): Promise<Settings | null>;        // null = first run, never saved
  saveSettings(s: Settings): Promise<void>;
  loadTasks(r: DateRange): Promise<Task[]>;        // by planDate
  loadDayLogs(r: DateRange): Promise<DayLog[]>;
  firstPlanDate(): Promise<ISODate | null>;        // earliest planDate with an adhoc=false task
  commit(m: Mutation, dayLog?: DayLog): Promise<void>; // atomic: upserts, deletes, events, dayLog
  reset(): Promise<void>;                          // dev/tests only
}
```
Implementations:
- `src/data/memory-repository.ts` — `MemoryRepository` (tests).
- `src/data/local-repository.ts` — `LocalRepository`, localStorage keys
  `bed:v1:settings`, `bed:v1:tasks` (Record<id, Task>), `bed:v1:dayLogs`
  (Record<ISODate, DayLog>), `bed:v1:events` (TaskEvent[] append-only). `commit` reads,
  applies everything in memory, then writes all changed keys; if any step throws before
  writing, nothing is written. Corrupt JSON → treat as empty and `console.error`.
- `src/data/index.ts` exports `getRepository()` → the LocalRepository singleton (Phase 7
  swaps this one line).
- Repository contract test `src/data/__tests__/repository.contract.ts` run against both
  implementations (`describe.each`).

### 2. Clock source (`src/state/clock-source.ts`)
```ts
export function getNow(): Date;              // dev override if set, else the system clock
export function setNowOverride(d: Date | null): void;
export function useNow(intervalMs?: number): Date; // re-renders every 30s (default); frozen under override
```
- Dev only (`process.env.NODE_ENV !== 'production'`): `?now=<ISO instant>` sets a **frozen**
  override for the session (kept in `sessionStorage` so navigation keeps it; `?now=off`
  clears it). In production the param is ignored.
- `src/state/ClockBridge.tsx` (client): reads `useNow()` + store settings, computes
  `today = logicalDate(now, settings)`, renders `<ClockProvider value={{ now, today, settings }}>`.
  Mounted in `src/app/(app)/layout.tsx` and in the onboarding page.
- Store actions build `Ctx` with `getNow()` at call time, `newId: () => crypto.randomUUID()`.

### 3. Dev seeds (`src/dev/seeds.ts`)
`?seed=<name>` (dev only): `repo.reset()`, write the seed, remove the param from the URL
(`router.replace`), reload store. Seeds are generated relative to a **seed anchor date
`2026-10-03`** (the design's "today", a Saturday) so screenshots match the design:
| seed | Content |
|---|---|
| `new` | nothing (settings null) |
| `demo` | onboarded settings (defaults), ~45 days of history before 10-03 with a few planless days (deterministic), yesterday (10-02) planned & closed, today's tasks = the Today playground fixtures (incl. 2 adhoc, MITs, one postponed ×3), nothing for 10-04 |
| `empty` | like `demo` but no tasks on 10-03 |
| `missed` | like `empty` but 10-02 has no tasks either |
| `complete` | like `demo` but every planned task on 10-03 is done |
| `latenight` | like `demo` with `dayEnd: '03:00'` |
Reuse fixtures from `src/dev/fixtures.ts`; never import seeds outside dev code paths
(dynamic import guarded by NODE_ENV).

### 4. Store (`src/state/store.ts`, zustand)
```ts
export interface RitualDraft {
  date: ISODate; step: 0 | 1 | 2 | 3;              // 3 = summary
  decisions: Record<string, Decision>;
  reflection: Reflection;
  tomorrowMit: Record<string, boolean>;           // keyed by ORIGINAL task id
  tomorrowNew: { id: string; parsed: ParsedTask }[];
}
export interface AppState {
  status: 'loading' | 'ready' | 'error';
  settings: Settings; onboarded: boolean;         // onboarded = loadSettings() !== null && onboardedAt !== null
  tasks: Record<string, Task>; dayLogs: Record<ISODate, DayLog>;
  loaded: DateRange; firstPlanDate: ISODate | null;
  ui: { todayView: 'list' | 'matrix'; expandedTaskId: string | null;
        planReminderDismissedOn: ISODate | null };
  lastClose: { result: Mutation & { dayLog: DayLog }; date: ISODate } | null; // feeds the summary
  init(): Promise<void>;
  ensureLoaded(dates: ISODate[]): Promise<void>;  // loads any date outside `loaded`
  addTask(planDate: ISODate, p: ParsedTask, scope: 'today' | 'tomorrow'): Promise<void>;
  toggleDone(id: string): Promise<void>;
  patchTask(id: string, patch: Partial<Pick<Task,'title'|'important'|'urgent'|'mit'|'size'>>): Promise<void>;
  setQuadrant(id: string, q: Quadrant): Promise<void>;
  moveTask(id: string, date: ISODate): Promise<void>;
  dropTask(id: string): Promise<void>;
  restoreTask(id: string): Promise<void>;
  closeDay(draft: RitualDraft): Promise<void>;    // builds CloseDayInput (incl. otherTargets via ensureLoaded)
  updateSettings(patch: Partial<Settings>): Promise<void>;
  completeOnboarding(s: Settings): Promise<void>; // sets onboardedAt = getNow()
  dismissPlanReminder(today: ISODate): void;      // persisted in localStorage 'bed:v1:ui'
  setTodayView(v: 'list' | 'matrix'): void;       // persisted in 'bed:v1:ui'
  setExpanded(id: string | null): void;
}
```
Rules for every mutating action:
1. Build `Ctx`; gather the inputs the domain needs (day tasks, `related`, target day — call
   `ensureLoaded` first for dates outside `loaded`).
2. Call the domain function; on `DomainError` → no state change, `console.warn`, and for
   user-visible cases show the matching toast (`mitLimit` etc. come via notices).
3. Apply `upserts`/`deletes` optimistically; `await repo.commit(mutation, dayLog?)`; on
   failure revert to the previous snapshot and `showToast('common.saveError')` (add key:
   "Chưa lưu được — thử lại nhé").
4. Fire `showToast(noticeKey(n, action, scope))` for each notice; extra toasts per
   components.md (`today.toast.movedTo`, `today.toast.quadrantMoved`,
   `today.toast.complete` when the action brings today to 100%, `today.toast.dayClosed`).
5. Recompute `firstPlanDate` = min(existing, any new planned task's planDate).
- `init()`: settings ← `loadSettings() ?? DEFAULT_SETTINGS`; validate with
  `validateSettings`; invalid → fall back to defaults field-by-field and `console.warn`.
  `loaded` = [today−190, today+30]; load tasks, dayLogs, firstPlanDate in parallel.
- `updateSettings`: merge, `validateSettings`; non-empty → refuse + `console.warn` (UI only
  offers valid values); `habit` changes go through `settingsForHabit`. Theme changes also
  call next-themes `setTheme`.
- The ritual draft lives in localStorage `bed:v1:ritual:<date>` (helpers in
  `src/state/ritual-draft.ts`: `loadDraft(date)`, `saveDraft(d)`, `clearDraft(date)`),
  saved on every change; cleared after a successful `closeDay`.

### 5. Selectors (`src/state/selectors.ts`, pure, tested)
```ts
export function tasksOn(tasks: Record<string, Task>, date: ISODate): Task[]; // sorted by position
export function todayView(s: AppState, clock: ClockValue): {
  dayTasks: Task[]; mit: Task[]; others: Task[]; adhoc: Task[];   // mit includes adhoc MITs; others = planned non-MIT
  progress: { pct: number; done: number; total: number };
  locked: boolean; minutesLeft: number | null; lateNight: boolean;
  banners: ReturnType<typeof selectBanners>;
};
export function consistencyView(s: AppState, today: ISODate): { days: DaySummary[]; planned: number };
export function ritualTomorrowItems(s: AppState, draft: RitualDraft, today: ISODate): TomorrowItem[];
```
`todayView` feeds `selectBanners` with: `todayClosed = !!dayLogs[today]?.closedAt`,
`yesterdayHasPlan` via `summarizeDay`, `firstPlanDate`, `planReminderDismissedOn`.

### 6. Screens (`src/features/<screen>/*Screen.tsx`, pages just render them)
**Today** (`/today`) — layout per screens.md §1 using the existing components:
kicker (`today.kicker` / `today.kickerLateNight` with `formatClock`/weekday) + H1
`formatDateLong(today)` + PlanStatus (`formatHourLoose(dayEnd)` for late night) +
ProgressBar; banners in `selectBanners` order with CTAs:
`ritual` → `/ritual` (kbd E); `planReminder` → evening habit `/ritual`, morning habit
focuses TaskInput; secondary "Để sau" → `dismissPlanReminder`; `welcome` → `/onboarding`
(+ hint, 3 step cards from `today.welcome.steps`). TaskInput (`enableShortcut`) → `addTask(today, p, 'today')`;
ViewToggle (M); list view: MITSection, "Các việc khác" TaskGroup, "Phát sinh" adhoc
TaskGroup (only if any); EmptyState `today.empty` when no tasks; matrix view: MatrixBoard
(`interaction = useIsDesktop() ? 'drag' : 'tap'`). One TaskItem expanded at a time
(Esc collapses). Global shortcut E → `/ritual`.

**Ritual** (`/ritual`) — screens.md §2. Top bar label + "Để sau (Esc)" → `/today`
(draft kept). Stepper (earlier steps clickable). Step 1: ReviewRow per task of today
(planned + adhoc, sorted MIT first then position); ticks call `toggleDone` immediately
(ticking clears that task's decision in the draft); RitualFooter gated on
`ritualRemaining`, blocked click → `ritual.step1.blocked` toast. Step 2: ReflectionForm,
primary label `ctaEmpty` while empty. Step 3: TomorrowPlanList from
`ritualTomorrowItems` (existing tomorrow tasks: MIT toggle calls `patchTask` directly;
carried items toggle `draft.tomorrowMit`; new items toggle their parsed `mit` and are
removable); TaskInput `scope="tomorrow"` adds to `draft.tomorrowNew` (enforce ≤3 MIT
across the list in the UI with `ritual.step3.mitMax` / `mitFullOnAdd` toasts — the domain
re-checks at close). "Hoàn tất & đóng ngày" → `closeDay(draft)` → step 3 summary from
`lastClose` (RitualSummary; `onDone` → `/today`). If today already has a closed dayLog
when opening `/ritual`, show the summary built from current data instead of step 1.
Content transition per motion.md §2; scroll to top on step change; mobile sticky footer;
no bottom tabs (already handled by AppShell).

**Onboarding** (`/onboarding`) — screens.md §6 with HabitCardGroup, TimeChips
(options per habit from the prototype: evening 20:30/21:00/21:30/22:00 for plan,
morning 06:30/07:00/07:30/08:00), DayEndChips, OnboardingDots, OnboardingSummary.
"Bỏ qua, dùng mặc định" on every step → `completeOnboarding(DEFAULT_SETTINGS)`.
Finish → `completeOnboarding(settings)`, `router.push('/today?focus=input')`,
toast `today.toast.onboarded`. Today focuses the input when `focus=input` is present.

**Settings** (`/settings`) — screens.md §5: window section (Segmented habit, TimeSelect
start with `settings.window.startOption*`, TimeSelect lock 07:00–14:00 with
`settings.window.lockOption`, PlanWindowTimeline), DayEndChips, reminders (Switch +
two TimeSelects), theme Segmented (light/dark/system), weights explanation + link to
`/onboarding`. Every change → `updateSettings` immediately.

**More** (`/more`) — keep Phase 1's version; ensure Phase 2 tags.

**AppShell** — ConsistencyMini fed by `consistencyView`.

**Loading/first paint** — while `status==='loading'` render a quiet skeleton (paper sheet,
no spinner text). Store `init()` runs once from a client `StoreBootstrap` in the root of
`(app)` and onboarding.

### 7. Screen-state screenshots (`scripts/shots-screens.ts`, `pnpm shots:screens`)
Expects `pnpm dev` on :3000. For each row, open `<path>?seed=<seed>&now=<instant>`,
wait for `[data-ready="true"]` (set on the screen root when store is ready), screenshot the
full page to `artifacts/screens/<design-name>_<theme>_<desktop|mobile>.png` at 1280 wide
and 390×844, light and dark:
| design-name | path | seed | now (UTC) | extra |
|---|---|---|---|---|
| `today_locked-adhoc` | /today | demo | 2026-10-03T07:10:00Z | |
| `today_window-open` | /today | demo | 2026-10-03T01:15:00Z | |
| `today_empty` | /today | empty | 2026-10-03T01:15:00Z | |
| `today_missed-day` | /today | missed | 2026-10-03T01:15:00Z | |
| `today_complete-100` | /today | complete | 2026-10-03T07:10:00Z | |
| `today_new-user` | /today | new | 2026-10-03T01:15:00Z | |
| `today_after-midnight` | /today | latenight | 2026-10-03T18:00:00Z | |
| `today_plan-reminder` | /today | demo | 2026-10-03T14:40:00Z | |
| `today_matrix` | /today | demo | 2026-10-03T07:10:00Z | set `bed:v1:ui` todayView=matrix |
| `ritual_step1-review` | /ritual | demo | 2026-10-03T14:30:00Z | |
| `settings_default` | /settings | demo | 2026-10-03T07:10:00Z | |
| `onboarding_step1` | /onboarding | new | 2026-10-03T01:15:00Z | |
(12 rows × 2 themes × 2 viewports = 48 PNGs.)

### 8. E2E (`e2e/*.spec.ts`, `pnpm e2e` = `playwright test`, webServer = `pnpm dev`)
1. **First run:** seed `new` → welcome banner visible → "Bỏ qua, dùng mặc định" from
   onboarding → back on /today with toast → type `Học Databricks * ~L` + Enter → task
   appears inside the MIT section; progress shows 0% → tick it → 100% and the complete
   banner appears → reload → still 100%.
2. **Adhoc after lock:** seed `demo`, now 07:10Z → add a task → it is in the Phát sinh group
   and the `Đã thêm vào nhóm Phát sinh` toast shows; progress % unchanged.
3. **Move & restore:** seed `demo`, now 01:15Z → expand a todo task → "Dời sang mai" →
   row shows "Đã dời → …" → "Khôi phục" → back to todo.
4. **Matrix (desktop):** switch with `m` → drag a chip from Làm ngay to Lên lịch (keyboard
   drag is fine) → reload → task is in Lên lịch.
5. **Ritual:** seed `demo`, now 14:30Z → `/ritual` → Tiếp tục is disabled → decide every task
   (at least one non-MIT task → Mai, one → Thứ 2 tới, one → Bỏ; send MIT tasks to Thứ 2 tới or Bỏ so tomorrow has a free MIT slot) → Tiếp tục → Bỏ qua → add `Chạy bộ 5km *` →
   Hoàn tất & đóng ngày → summary heading visible → set `now=2026-10-04T01:00:00Z` and open
   /today → the task moved to Mai is listed and `Chạy bộ 5km` is a MIT.
6. **Draft survives:** seed `demo`, now 14:30Z → decide one task in step 1 → press Esc →
   back on /today → open /ritual → the decision is still selected.
7. **Late night:** seed `latenight`, now 18:00Z → H1 is Saturday's date and the pill
   `Ngày của bạn kết thúc lúc 3:00` is visible.
8. **Settings live:** change lock time to 12:00 on /settings → /today PlanStatus reads
   `khóa lúc 12:00`.
9. **Mobile matrix:** viewport 390×844, seed `demo` → matrix → tap a chip → sheet
   "Chuyển sang ô…" → choose Lên lịch → toast `Đã chuyển sang “Lên lịch”`.

## Steps
1. `pnpm add zustand`. Repository interface, MemoryRepository, LocalRepository, contract
   tests.
2. Clock source + ClockBridge; seeds; `?seed`/`?now` handling in a dev-only client
   component (`src/dev/DevParams.tsx`) mounted by the `(app)` layout and onboarding page.
3. Store + ritual-draft helpers + selectors, with unit tests (MemoryRepository): every
   action happy path, revert-on-commit-failure (a repository whose `commit` rejects),
   `closeDay` collecting `otherTargets` for a move to a date outside `loaded`,
   `restoreTask` loading the copy's date when needed, `firstPlanDate` update.
4. Screens in this order: Today → Ritual → Onboarding → Settings → AppShell wiring. Compare
   each with its design screenshot as you go, using `?seed`/`?now`.
5. TaskInput: add prop `showSyntax?: boolean` (default `true`); ritual step 3 passes
   `false` (design does not show the syntax row there). DayDetail: hide the energy row
   when `energy === 0` (Phase 6 uses it, but fix it now — it's a one-liner). Update their
   tests. These are the only Phase 3/4 component changes allowed.
6. `pnpm shots:screens`; compare all 48 PNGs with `design/handoff/screenshots/` (same
   names); fix what you can; table in the report.
7. E2E; full check suite; handoff; commit `phase-05: app core`.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e` exit 0;
  `pnpm test:coverage` still ≥90% lines for `src/domain/**`; `git diff --stat HEAD -- src/domain` empty.
- Repository contract tests pass for both implementations; store tests cover every action
  listed in §4 incl. revert-on-failure.
- All 9 e2e specs exist and pass.
- `pnpm shots:screens` exits 0 and writes **48 PNGs**; every row has a verdict in the report.
- `grep -rn "localStorage" src --include=*.ts --include=*.tsx` hits only
  `src/data/local-repository.ts`, `src/state/ritual-draft.ts`, `src/state/store.ts` (ui
  prefs) and `src/state/clock-source.ts`/`src/dev/` (sessionStorage/dev).
- Building with `NODE_ENV=production` and grepping `.next/static` for `seed` fixture titles
  (e.g. a distinctive fixture task title) finds nothing — seeds are not shipped.
- Domain mutations (`createTask`, `toggleDone`, `patchTask`, `moveTask`, `dropTask`,
  `restoreTask`, `closeDay`) are imported only by `src/state/store.ts`, `src/app/dev/**`
  and tests.
- No hard-coded Vietnamese / hex colours (Phase 3 greps) in `src/features`, `src/state`,
  `src/data`, `src/components`, `src/app`.
- `git status design/` clean.

## Handoff Obligations
1. Write `memory/phase_05_report.md` (What was done / Results / New findings / Decisions
   made / Open issues / Input for the next phase), incl. the 48-shot comparison table and
   anything Phase 7 must know to implement `Repository` on Supabase (atomicity
   expectations, event volume, ordering).
2. Overwrite `memory/STATE.md`; next action: "Phase 06 task file to be written by the
   planning session — bring STATE.md, phase_05_report.md and discoveries.md back to it".
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
