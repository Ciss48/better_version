# Phase 03: Components A — core & Today

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (`docs/plan.md`). Phase 01 built
the Next.js 16 / React 19 / Tailwind v4 / shadcn (Base UI flavour) scaffold, tokens, fonts,
`t()`, AppShell and placeholder routes. Phase 02 built `src/domain/` — every business rule as
pure, 100%-covered TypeScript, exported from `@/domain` (see `memory/phase_02_report.md`
"Input for the next phase" if you need details). This phase (1) applies two small domain
amendments decided by the planning session, then (2) builds the presentational components
the **Today** screen needs, with a dev gallery, a domain-driven playground, component tests
and a screenshot script. Design source: `design/handoff/` (read-only).

## Goal
`src/components/` contains every component listed in the Interface Contract, styled with
tokens to match `design/handoff/screenshots/`, animated per `design/handoff/motion.md`,
covered by the listed component tests, and visible in every listed state on
`/dev/components`, including an interactive Today playground that mutates fixtures through
`@/domain` only.

## Non-goals
- No real screens: do not change `src/app/(app)/*/page.tsx` beyond what already exists.
- No zustand store, no Repository, no localStorage persistence, no Supabase (MCP stays off).
- No Phase 4 components: Stepper, ReviewRow, RitualFooter, ReflectionForm,
  TomorrowPlanList, RitualSummary, StatCard, Heatmap, WeekdayChart, InsightCard,
  CalendarMonth, DayDetail, Settings controls, Onboarding pieces, Phase2Notice.
  (DatePickerChips IS in this phase because TaskItem and the ritual both use it.)
- No re-implementing business rules in components: call `@/domain` functions
  (`parseQuickAdd`, `dateChipOptions`, `quadrantOf`, `flagsForQuadrant`, `addDays`, …).
- No animation library (no `motion`/framer-motion): CSS transitions/keyframes with the
  motion tokens only.
- Do not render `validateSettings` strings anywhere.
- Do not fix the cosmetic Vite "ESM syntax … CommonJS" warning.

## Interface Contract

### Part A — domain amendments (do these first, in `src/domain/`)
1. **`CloseDayInput` gains a required field**:
   ```ts
   otherTargets: Record<ISODate, Task[]>; // existing tasks of every distinct move date ≠ date+1
   ```
   - For each move decision to a date ≠ date+1, `otherTargets[date]` must exist (may be
     `[]`); if missing → throw `DomainError('missing_target_day')` (add the code to
     `DomainErrorCode`).
   - The MIT limit is enforced per target date: existing tasks of that date first, then
     moved-in tasks in `todayTasks` order. Over the limit → copy gets `mit=false`, notice
     `'mitLimit'` (still deduplicated in the final `notices`).
   - Date+1 behaviour is unchanged (`tomorrowExisting`, `tomorrowMit`, `tomorrowNew`).
2. **`restoreTask` re-checks the MIT limit.** Contract clarification: `related` must contain
   every task of `task.planDate` (plus, for a moved task, its copy). When restoring a task
   with `mit=true` and `activeMitCount(related tasks on task.planDate, excluding task) ≥ 3`,
   the restored task gets `mit=false`, the mutation carries notice `'mitLimit'`, and the
   `task_restored` payload gains `mitDowngraded: true`. Signature unchanged.
3. Tests to add (keep coverage ≥90%, all existing tests green):
   - move to `2026-10-10` where `otherTargets['2026-10-10']` already has 3 MITs → copy
     `mit=false`, exactly one `'mitLimit'` notice;
   - two MIT moves to the same other date that has 2 MITs → first keeps MIT, second loses it;
   - missing `otherTargets` key for a move date → throws `missing_target_day`;
   - restore a dropped MIT into a day with 3 active MITs → `mit=false` + notice +
     `mitDowngraded: true`; restore into a day with 2 → `mit` stays true, no notice.
4. Update the existing test "ignores a tomorrowMit entry for a task moved elsewhere" so it
   passes `otherTargets`. `index.test.ts` must still pass (no new exported names).

### Part B — new dependencies
`@dnd-kit/core`, `sonner` (via shadcn), `react-day-picker` + shadcn `calendar`,
shadcn `popover`, `drawer`, `tooltip`, `toggle-group` (or Base UI equivalent the CLI
installs). Dev: `@testing-library/react`, `@testing-library/user-event`, `jsdom`,
`@playwright/test` (+ `pnpm exec playwright install chromium`).
For each shadcn command follow the CLAUDE.md shadcn rule. If `drawer` pulls in `vaul`
(+ a Radix dialog), that is acceptable (Minor). Required drawer behaviour regardless of
implementation: swipe-down to close, scrim tap/Esc closes, focus trap, focus returns to
the trigger. Do not hand-roll a drawer.

### Part C — files (exact paths)
```
src/lib/format.ts            + src/lib/format.test.ts
src/lib/toast.ts             showToast, noticeKey
src/lib/hooks/use-media.ts   useIsDesktop()
src/lib/hooks/use-shortcut.ts useShortcut()
src/components/ui/…          shadcn primitives (generated)
src/components/common/Tag.tsx
src/components/common/EmptyState.tsx
src/components/common/Segmented.tsx
src/components/common/Kbd.tsx
src/components/common/Toaster.tsx       styled Sonner, mounted in src/app/layout.tsx
src/components/today/Banner.tsx
src/components/today/PlanStatus.tsx
src/components/today/ProgressBar.tsx
src/components/today/TaskInput.tsx
src/components/today/TaskCheckbox.tsx
src/components/today/SizeBadge.tsx
src/components/today/TaskItem.tsx
src/components/today/MITSection.tsx
src/components/today/TaskGroup.tsx
src/components/today/ViewToggle.tsx
src/components/matrix/MatrixBoard.tsx
src/components/matrix/MatrixQuadrant.tsx
src/components/matrix/MatrixBottomSheet.tsx
src/components/date/DatePickerChips.tsx
src/components/date/DatePicker.tsx
src/components/**/__tests__/*.test.tsx   jsdom tests (first line: // @vitest-environment jsdom)
src/test/setup-dom.ts        matchMedia/ResizeObserver polyfills, jest-dom-free (use plain asserts or add @testing-library/jest-dom — Minor)
src/dev/fixtures.ts          Task fixtures built with domain types
src/app/dev/components/page.tsx   gallery; notFound() in production
scripts/shots.ts             Playwright screenshot script
```
`vitest.config.ts`: add `setupFiles` for the DOM setup (guarded so node tests still run)
and include `src/**/*.test.{ts,tsx}`. Add scripts `"shots": "tsx scripts/shots.ts"`.
Add `artifacts/` to `.gitignore`.

### Part D — helpers
```ts
// src/lib/format.ts  (Vietnamese output always via t()/tRaw())
export function formatDateLong(date: ISODate): string;   // '2026-10-03' → 'Thứ Bảy, 3 tháng 10'   (date.longFormat)
export function formatDateShort(date: ISODate): string;  // → 'T7 3/10'                            (date.shortFormat)
export function formatDayMonth(date: ISODate): string;   // → '3/10'
export function formatMonth(ym: string): string;         // '2026-10' → 'Tháng 10, 2026'           (date.month)
export function formatMonthShort(ym: string): string;    // → 'thg 10'                             (date.monthShort)
export function formatDuration(minutes: number): string; // 45 → '45 phút', 60 → '1 giờ', 105 → '1 giờ 45 phút'
export function formatClock(instant: Date | string, tz: string): HHMM; // UTC instant → local 'HH:MM'
```
Add copy keys `format.duration.minutes` = `"{m} phút"`, `format.duration.hours` =
`"{h} giờ"`, `format.duration.hoursMinutes` = `"{h} giờ {m} phút"`. Weekday arrays in
copy are indexed CN=0 … T7=6 (`isoWeekday % 7`). Never hand a `TZDate` onward — convert
to a plain `Date` (Phase 2 finding).

```ts
// src/lib/toast.ts
export function showToast(key: CopyKey, vars?: Record<string, string | number>): void;
export function noticeKey(n: Notice, action: 'add' | 'toggle', scope: 'today' | 'tomorrow'): CopyKey;
//  adhocAdded → today.toast.addedAdhoc
//  mitLimit, add,    today    → today.toast.mitFullOnAdd
//  mitLimit, toggle, today    → today.toast.mitMax
//  mitLimit, add,    tomorrow → ritual.step3.mitFullOnAdd
//  mitLimit, toggle, tomorrow → ritual.step3.mitMax

// src/lib/hooks/use-media.ts
export function useIsDesktop(): boolean | undefined; // matchMedia('(min-width: 45rem)'); undefined before mount

// src/lib/hooks/use-shortcut.ts
export function useShortcut(key: string | string[], handler: (e: KeyboardEvent) => void,
  opts?: { enabled?: boolean }): void; // ignores events from input/textarea/select/contenteditable and with Ctrl/Meta/Alt
```
Refactor the AppShell `T` shortcut to use `useShortcut` (Minor).

### Part E — components (spec = `design/handoff/components.md`; deviations below are binding)
All are client components, props-only, no data fetching, no domain mutation inside.
Callbacks report intent; the caller applies domain functions.

```ts
// common
type TagVariant = 'mit' | 'important' | 'urgent' | 'adhoc' | 'warn' | 'success' | 'neutral' | 'phase2';
interface TagProps { variant: TagVariant; children: React.ReactNode }
     // important = solid outline, urgent = dashed outline, warn = accent-soft, adhoc = neutral line-2
interface EmptyStateProps { title: string; body?: string; variant?: 'dashed' | 'soft' }
interface SegmentedProps<T extends string> { value: T; options: { value: T; label: string }[];
  onChange(v: T): void; ariaLabel: string; size?: 'md' | 'sm' }
interface KbdProps { children: React.ReactNode }

// today
interface BannerProps { variant: 'ritual'|'planReminder'|'missedDay'|'complete'|'welcome';
  title: string; body?: string;
  primary?: { label: string; onClick(): void; kbd?: string };
  secondary?: { label: string; onClick(): void };
  children?: React.ReactNode }            // welcome renders its 3 step cards as children
interface PlanStatusProps { locked: boolean; lockAt: HHMM; minutesLeft: number | null;
  lateNight?: { dayEnd: HHMM } }           // formats with formatDuration
interface ProgressBarProps { value: number; done: number; total: number; size?: 'md' | 'sm' }
interface TaskInputProps { locked: boolean; onAdd(p: ParsedTask): void; placeholder?: string;
  enableShortcut?: boolean;                // registers N and / to focus
  scope?: 'today' | 'tomorrow' }           // tomorrow: hides lockedHint, uses ritual.step3.placeholder default
interface TaskCheckboxProps { checked: boolean; disabled?: boolean; onToggle(): void;
  label: string; size?: 24 | 18 }          // tick pop animation per motion.md §1
interface SizeBadgeProps { size: Size | null } // null → renders nothing
interface TaskItemProps {
  task: Task; today: ISODate; expanded: boolean;
  onToggleExpand(): void; onToggleDone(): void;
  onPatch(p: Partial<Pick<Task, 'important' | 'urgent' | 'mit' | 'size'>>): void;
  onMove(date: ISODate): void;             // "Dời sang mai" → onMove(addDays(today, 1))
  onDrop(): void; onRestore(): void;
}  // "Ngày khác…" opens <DatePicker> internally (min = addDays(today,1)) and calls onMove.
   // Replaces components.md's onPickDate(anchor).
interface MITSectionProps { count: number; children?: React.ReactNode } // empty → today.mit.empty hint
interface TaskGroupProps { variant: 'default' | 'adhoc'; title: string; doneCount?: number;
  totalCount?: number; children: React.ReactNode }
interface ViewToggleProps { value: 'list' | 'matrix'; onChange(v: 'list' | 'matrix'): void;
  enableShortcut?: boolean }               // M toggles; built on Segmented

// matrix
interface MatrixBoardProps {
  tasks: Task[];                           // board shows status todo|done only
  interaction: 'drag' | 'tap';
  onSetQuadrant(taskId: string, q: Quadrant): void;
  onToggleDone(taskId: string): void;
}  // owns dnd-kit context (PointerSensor + KeyboardSensor) and, in tap mode, the bottom sheet state
interface MatrixQuadrantProps { quadrant: Quadrant; tasks: Task[]; isDropTarget: boolean;
  interaction: 'drag' | 'tap'; onTapTask?(id: string): void; onToggleDone(id: string): void }
interface MatrixBottomSheetProps { open: boolean; task: Task | null; onSelect(q: Quadrant): void;
  onClose(): void }                        // current quadrant = quadrantOf(task)

// date
interface DatePickerChipsProps { today: ISODate; value?: Decision;
  onChange(d: Decision | undefined): void; allowDrop?: boolean; taskTitle?: string }
  // chips = dateChipOptions(today) (count varies 3–4!) + "Chọn ngày…" + (allowDrop ? "Bỏ")
  // labels: tomorrow → datePicker.chips.tomorrow; nextMonday/weekend → datePicker.chipWithDate
  //   {label, d, m}; plusWeek → datePicker.chips.nextWeek (note the key name differs)
  // custom date selected → the "Chọn ngày…" chip shows formatDateShort(date) and is selected
interface DatePickerProps { trigger: React.ReactElement; min: ISODate; selected?: ISODate;
  taskTitle?: string; onSelect(date: ISODate): void;
  open?: boolean; onOpenChange?(open: boolean): void }
  // desktop (useIsDesktop true): popover, commit on click; else: drawer with confirm button
  // calendar: week starts Monday, headers from tRaw('date.weekdayShort') reordered T2…CN,
  //   month title formatMonth, days < min disabled
```
Styling rules: token classes only; touch targets ≥44px under `app:`-less (mobile)
layouts; focus ring from tokens.css; dark mode via tokens (no `dark:` colour overrides
unless a token is genuinely missing — log Minor).

### Part F — `/dev/components` gallery (sections = anchor ids, used by shots.ts)
| id | Must show |
|---|---|
| `tags` | every TagVariant |
| `banners` | all 5 variants (welcome with its 3 step cards) |
| `plan-status` | open (105 min left), locked, lateNight dayEnd 03:00 |
| `progress` | 0%, 64% (done 2 / total 4), 100% |
| `task-input` | default, locked hint, tomorrow scope, a pre-filled value showing preview chips |
| `task-item` | todo, done, expanded, MIT+important+urgent+L, adhoc "thêm lúc 14:10", postponed 1, postponed 3 (warning chip), moved "Đã dời → T4 14/10", dropped |
| `mit-section` | empty, 2/3 with items |
| `task-group` | default, adhoc (1/2 xong) |
| `view-toggle` | both values |
| `matrix` | board in drag mode with tasks in all four quadrants + one empty quadrant; tap mode with sheet open (button to open) |
| `date-chips` | today = Sat 2026-10-03 (3 date chips), Tue 2026-10-06 (4 date chips), custom date selected |
| `date-picker` | popover trigger and drawer trigger (force mode with a prop-free wrapper by resizing; document how in the page) |
| `empty-state` | dashed, soft |
| `toast` | buttons firing each noticeKey mapping |
| `playground` | interactive Today (below) |

Gallery section headings/labels are developer-facing: write them in English so the
Vietnamese-string grep in the DoD stays meaningful.

**Playground:** fixed `now = 2026-10-03T07:10:00Z` (14:10 Sat, Asia/Ho_Chi_Minh, plan
locked), seeded from the sample tasks in `design/handoff/prototype/BedApp.dc.html` (copy
titles/flags into `src/dev/fixtures.ts`), `useReducer` holding `Task[]`; every interaction
calls the real domain function (`createTask`, `toggleDone`, `patchTask`, `moveTask`,
`dropTask`, `restoreTask`) and applies the returned `Mutation` (upserts/deletes) and
`notices` (→ `showToast(noticeKey(...))`). Shows ProgressBar from `completion()`,
PlanStatus, TaskInput, ViewToggle, MITSection, TaskGroup default + adhoc, and the
MatrixBoard (interaction from `useIsDesktop()`).

### Part G — `scripts/shots.ts`
Starts nothing itself (expects `pnpm dev` running on :3000). For each gallery section id
× theme (`light`,`dark`, set via `localStorage['bed-theme']` in an init script) × width
(1280, 390) it screenshots the section element to
`artifacts/shots/<id>_<theme>_<width>.png`. Exit code 0 on success.

## Steps
1. Part A domain amendments + tests; run `pnpm test:coverage`.
2. Install dependencies (Part B), following the shadcn rule each time; restyle generated
   primitives to tokens (`bg-hover` instead of `bg-accent`, radii/shadows from tokens).
3. `format.ts` + tests (node): every example in Part D, plus `formatClock('2026-10-03T07:10:00Z','Asia/Ho_Chi_Minh')` = `'14:10'` and `formatDateLong('2026-10-04')` = `'Chủ Nhật, 4 tháng 10'`.
4. `toast.ts`, hooks, Toaster mounted in the root layout.
5. Common components → Today components → Matrix → Date components. After each group,
   add its gallery section and look at it next to the matching screenshot(s):
   `today_locked-adhoc`, `today_window-open`, `today_empty`, `today_complete-100`,
   `today_new-user`, `today_after-midnight`, `today_plan-reminder`, `today_matrix`,
   mobile `today_matrix-sheet`, `ritual_step1-datepicker` (desktop popover), mobile
   `ritual_step1-datepicker-sheet`. Read exact values from the prototype HTML when the
   screenshot is ambiguous.
6. Motion per `design/handoff/motion.md` §1 (tick), §3 (sheets), §4 (popover), §5
   (progress), §6 (expand, hover, matrix drag, toast). Respect `prefers-reduced-motion`.
7. Component tests (below). 8. Playground. 9. `scripts/shots.ts`; run it; open several
   PNGs and compare with the design screenshots; list notable differences in the report.
10. Full check suite, handoff, commit `phase-03: components core`.

Component tests (jsdom) — minimum set:
- **TaskInput:** typing `Học * ~L` shows preview chips for MIT and size L; Enter calls
  `onAdd` with the parsed task and clears the field; Enter on `'   '` does not call it.
- **TaskItem:** checkbox has `role="checkbox"` and `aria-checked` matching status; a moved
  task's checkbox is disabled and clicking does not call `onToggleDone`; `expanded` renders
  `role="toolbar"`; moved/dropped toolbar shows only "Khôi phục"; postponedCount 3 renders
  the warning text from `today.task.postponedWarn`.
- **DatePickerChips:** today `2026-10-03`, `allowDrop` → exactly 5 `role="radio"`
  elements; clicking "Mai" calls `onChange({ kind: 'move', date: '2026-10-04' })`;
  clicking the selected chip again calls `onChange(undefined)`; today `2026-10-06` → 6 radios.
- **MatrixBoard (tap):** clicking a chip (not its checkbox) opens a dialog titled
  "Chuyển sang ô…"; choosing "Lên lịch" calls `onSetQuadrant(id, 'q2')`.
- **ProgressBar:** `role="progressbar"` with `aria-valuenow`.
- **Banner:** `role="status"`.
- **ViewToggle:** pressing `m` (focus on body) calls `onChange('matrix')`; pressing `m`
  inside an input does not.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0; `pnpm test:coverage`
  still ≥90% lines for `src/domain/**`.
- Part A tests exist and pass; `index.test.ts` passes unchanged in its export list.
- `format.test.ts` covers every Part D example; all component tests listed above pass.
- With `pnpm dev`: `/dev/components` returns 200 and its HTML contains an element with
  each id from Part F; `pnpm shots` exits 0 and `artifacts/shots/` holds
  15 sections × 2 themes × 2 widths = **60 PNGs**.
- `grep -rnP "[À-ỹ]" src/components src/app src/lib --include=*.tsx --include=*.ts | grep -v __tests__ | grep -v "\.test\."` returns nothing (no hard-coded Vietnamese; fixtures live in `src/dev/`).
- `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/components --include=*.tsx` returns nothing.
- `grep -rn "bg-accent\b" src/components/ui` returns nothing that is used as a hover tint.
- `grep -rnE "from ['\"](motion|framer-motion)" src` returns nothing.
- `git status design/` is clean.
- No component file imports from `@/domain` anything other than types and pure
  read-only helpers (`parseQuickAdd`, `dateChipOptions`, `quadrantOf`, `flagsForQuadrant`,
  `addDays`, `isoWeekday`, `completion`); mutations (`createTask`, `toggleDone`, …) appear
  only in `src/app/dev/` and tests.

## Handoff Obligations
1. Write `memory/phase_03_report.md` (What was done / Results / New findings / Decisions
   made / Open issues / Input for the next phase). Include: which shadcn primitives were
   installed and what they depend on (Base UI vs vaul/Radix); the Base UI API gotchas you
   hit; a table of screenshot comparisons (gallery PNG ↔ design PNG, "matches" or the
   difference); any copy keys you added.
2. Overwrite `memory/STATE.md`; next action: "Phase 04 task file to be written by the
   planning session — bring STATE.md, phase_03_report.md and discoveries.md back to it".
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
