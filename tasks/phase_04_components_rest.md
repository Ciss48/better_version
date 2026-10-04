# Phase 04: Components B — ritual, stats, history, settings, onboarding

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (`docs/plan.md`). Phases 1–3 are
done: scaffold + tokens + AppShell (1); pure, 100%-covered `src/domain/` exported from
`@/domain` (2); and the Today component library with the `/dev/components` gallery, a
domain-driven Today playground, jsdom tests and `pnpm shots` (3). Phase 3 also amended the
domain (`CloseDayInput.otherTargets`, MIT re-check in `restoreTask`). Read
`memory/phase_03_report.md` → "New findings" before touching Base UI — it lists the API
differences from Radix. This phase builds every remaining MVP component, plus a
`ClockProvider` so components stop guessing "now"/"today"/timezone.

## Goal
Every component in Part C exists in `src/components/`, matches the design screenshots,
is visible in every listed state on `/dev/components` (17 new sections, including a
ritual playground that runs the real `closeDay`), is covered by the listed tests, and
`formatClockLocal` is gone in favour of `useClock()`.

## Non-goals
- No real screens: `src/app/(app)/*/page.tsx` stay placeholders (Phase 5 builds them).
- No zustand store, Repository, localStorage, Supabase or Supabase MCP.
- No stats computation: StatCard/Heatmap/WeekdayChart/InsightCard/CalendarMonth receive
  ready numbers and strings via props. Do not compute averages, deltas or insights here.
- No Phase 2 product features: only `Phase2Notice`. Goals/Weekly placeholder pages are
  Phase 5.
- No new animation library; no new date library.
- Do not change Phase 3 component APIs except the clock changes in Part B.

## Interface Contract

### Part A — dependencies
Base UI parts as needed: `select` (TimeSelect), `switch`, `radio-group` (EnergyScale,
HabitCard group, chip groups) — they are already inside `@base-ui/react`. Try the shadcn
CLI once; if `ui.shadcn.com` is still unreachable, hand-write wrappers in
`src/components/ui/` (`select.tsx`, `switch.tsx`) per CLAUDE.md. No other new packages.

### Part B — clock context (replaces `formatClockLocal`)
```ts
// src/lib/clock.tsx  ('use client')
export interface ClockValue { now: Date; today: ISODate; settings: Settings }
export function ClockProvider(props: { value: ClockValue; children: React.ReactNode }): JSX.Element;
export function useClock(): ClockValue;   // throws a clear Error if no provider is mounted
```
- Remove `formatClockLocal` from `src/lib/format.ts`. `TaskItem` uses
  `formatClock(task.createdAt, useClock().settings.timezone)` for "thêm lúc …".
- `DatePicker` passes `today={useClock().today}` (as a local Date) to react-day-picker so the
  "today" cell is the injected day, not the machine's.
- `/dev/components` wraps everything in a `ClockProvider` with
  `now = 2026-10-03T07:10:00Z`, `today = '2026-10-03'`, `settings = DEFAULT_SETTINGS`.
  Add a test helper `renderWithClock(ui, value?)` in `src/test/render.tsx` and use it in
  every component test that needs the clock (update Phase 3 tests that now need it).
- Add `formatHourLoose(hhmm: HHMM): string` to `format.ts`: `'03:00'` → `'3:00'`,
  `'10:00'` → `'10:00'`, `'00:00'` → `'0:00'` (the design prints dayEnd as `3:00`).

### Part C — components (spec = `design/handoff/components.md`; deviations below are binding)
Props-only, client components. Callbacks report intent. Allowed `@/domain` imports in
components: types plus the read-only helpers `parseQuickAdd`, `dateChipOptions`,
`quadrantOf`, `flagsForQuadrant`, `addDays`, `isoWeekday`, `completion`, `taskWeight`.

```ts
// src/components/ritual/
interface StepperProps { steps: string[]; current: 0 | 1 | 2; onStepClick(i: number): void } // only i < current is clickable
interface ReviewRowProps { task: Task; decision?: Decision;
  onToggleDone(): void; onDecide(d: Decision | undefined): void }
  // uses DatePickerChips (allowDrop) when task.status === 'todo'; nudge (ritual.step1.nudge)
  // when postponedCount ≥ 3 and decision?.kind !== 'drop'; shows MIT / Phát sinh tags
interface RitualFooterProps { status?: { remaining: number }; // step 1 only → left text
  primaryLabel: string; disabled?: boolean; onNext(): void; onBlockedClick?(): void; onBack?(): void }
  // disabled → aria-disabled + .45, click calls onBlockedClick (screen shows ritual.step1.blocked toast)
interface ReflectionFormProps { value: Reflection; onChange(v: Reflection): void }
  // EnergyScale = Base UI radio group of 5 × 52px circles, labels from ritual.step2.energyLevels,
  // clicking the selected level again sets energy 0
interface TomorrowItem { id: string; title: string; mit: boolean; carried: boolean;
  postponedCount: number; removable: boolean }
interface TomorrowPlanListProps { items: TomorrowItem[]; onToggleMit(id: string): void;
  onRemove(id: string): void; onAdd(p: ParsedTask): void }
  // header "{n}/3 MIT" + ritual.step3.count; TaskInput scope="tomorrow" below; empty → ritual.step3.empty
interface RitualSummaryProps {
  date: ISODate; pct: number; done: number; total: number; adhocDone: number;
  moved: number; dropped: number; energy: Reflection['energy']; good: string;
  tomorrow: { count: number; mitTitles: string[] }; consistencyPlanned: number;
  onDone(): void }
  // headline: pct ≥100 p100, ≥75 p75, ≥50 p50, else low; body per ritual.summary.* keys

// src/components/stats/
interface StatCardProps { label: string; value: number | null; unit?: '%' | 'ratio30';
  delta?: number | null; note?: string }
  // value null → '—' and no delta; ratio30 renders "n/30"; delta ≥0 → success-soft
  // stats.cards.deltaUp, <0 → neutral line-2 stats.cards.deltaDown with |n|
interface HeatmapProps { days: DaySummary[]; weeks: 26 | 13; firstUseDate: ISODate | null;
  onSelectDay(date: ISODate): void }
  // columns = weeks ending with the week containing useClock().today; rows T2→CN;
  // before firstUseDate → heat-empty; no plan → dashed heat-none ring; pct buckets <40/<60/<80/≥80;
  // today → accent outline; future → hidden; month labels "thg m" on a month's first week;
  // every visible cell is a button with aria-label from stats.heatmap.cell*; roving tabindex,
  // arrow keys move by day (↑↓) and week (←→)
interface WeekdayChartProps { values: { weekday: 1|2|3|4|5|6|7; pct: number | null }[] }
  // best (max non-null) bar = success, others heat-2; all null → '—'
interface InsightCardProps { items: { text: string; tone: 'success' | 'accent' }[] }
  // [] → stats.insights.empty

// src/components/history/
interface CalendarMonthProps { month: string; /* 'YYYY-MM' */ days: DaySummary[];
  selected: ISODate; onSelect(d: ISODate): void;
  summary: { planned: number; total: number; avg: number } | null; // null → history.monthEmpty
  canPrev: boolean; canNext: boolean; onPrev(): void; onNext(): void }
  // week starts Monday; today/selected/future treatments from components.md; uses useClock().today
interface DayDetailProps { date: ISODate; tasks: Task[]; dayLog: DayLog | null;
  planTiming: { kind: 'evening' | 'morning'; time: HHMM } | null;
  mode: 'past' | 'today'; onOpenToday?(): void }
  // mode today → history.today + CTA; past with no planned task → history.noPlan;
  // % via completion(tasks); status icons ✓ / → dời sang {date} / × đã bỏ;
  // reflection box or history.noReflection

// src/components/settings/
interface SettingsSectionProps { title: string; description?: string; children: React.ReactNode }
interface TimeSelectProps { value: HHMM; options: { value: HHMM; label: string }[];
  onChange(v: HHMM): void; ariaLabel: string }          // Base UI Select, 46px pill
interface SwitchProps { checked: boolean; onCheckedChange(v: boolean): void; ariaLabel: string } // 54×32
interface PlanWindowTimelineProps { settings: Settings }
  // 16px track = 12:00 D-1 … 12:00 D (24h); success segment from window open to lock;
  // 3px accent marker at dayEnd; labels settings.window.timeline*; sentence settings.window.sentence
  // (morning habit: opening is on D, still inside the track)
interface DayEndChipsProps { value: HHMM; onChange(v: HHMM): void }
  // 00:00…05:00 radio chips; 00:00 labelled onboarding.step3.midnight; shared by Settings + Onboarding

// src/components/onboarding/
interface HabitCardGroupProps { value: Habit; onChange(h: Habit): void } // 2 radio cards, copy onboarding.step1.*
interface TimeChipsProps { options: HHMM[]; value: HHMM; onChange(v: HHMM): void; ariaLabel: string }
interface OnboardingDotsProps { step: 0 | 1 | 2 }        // current dot stretches 10→34px
interface OnboardingSummaryProps { settings: Settings; onFinish(): void } // onboarding.done.*

// src/components/common/
interface Phase2NoticeProps { children?: React.ReactNode } // dashed accent border + solid phase2.tag + phase2.notice
```

### Part D — gallery sections (append to `/dev/components`; ids used by `pnpm shots`)
| id | Must show |
|---|---|
| `stepper` | current 0, 1, 2 |
| `review-row` | done; undecided; decided move (Mai); decided drop; adhoc; postponed 3 with nudge |
| `ritual-footer` | step 1 blocked (remaining 2), step 1 ready, step 2 with back ("Bỏ qua" label) |
| `reflection` | empty, filled (energy 4 + both texts) |
| `tomorrow-list` | empty; 2 carried (one postponed 4 → warn tag) + 1 new removable, 2/3 MIT |
| `ritual-summary` | pct 100, pct 62 with adhoc + moved + dropped, pct 30 with no "good" text |
| `ritual-playground` | interactive steps 1→3 + summary (below) |
| `stat-card` | percent with +6 delta, percent with −4 delta, ratio30 26/30, empty |
| `heatmap` | 26 weeks full data with gaps; 13 weeks; new user (firstUseDate 5 days ago) |
| `weekday-chart` | full data, all null |
| `insights` | 3 items mixed tones, empty |
| `calendar-month` | Oct 2026 with data and selected yesterday; empty month with prev disabled |
| `day-detail` | past with tasks + reflection; past no reflection; past no plan; today |
| `settings-controls` | SettingsSection with TimeSelect, Switch on/off, DayEndChips, Segmented theme |
| `plan-window-timeline` | evening default; morning 06:00; evening 20:00 with dayEnd 03:00 |
| `onboarding` | HabitCardGroup, TimeChips (evening options), DayEndChips, dots at 0/1/2, summary |
| `phase2-notice` | the notice alone |

**Ritual playground:** same `ClockProvider` value as the gallery but `now =
2026-10-03T14:30:00Z` (21:30 Sat). Fixtures: today's tasks for `2026-10-03` (reuse Today
playground fixtures, include one adhoc and one postponed-3 task), 1 existing MIT task on
`2026-10-04`, and `otherTargets` data for `2026-10-05` (3 MITs) and `2026-10-10` (`[]`).
Step 1 ticks call `toggleDone` and apply the Mutation immediately; decisions, reflection
and step-3 items stay in local state; "Hoàn tất & đóng ngày" builds `CloseDayInput`
(collecting `otherTargets` for every distinct non-tomorrow move date), calls `closeDay`,
applies the Mutation, fires toasts for notices (scope `tomorrow`), then shows
`RitualSummary` fed from the result. Include a "reset" button.

### Part E — `scripts/shots.ts`
Extend the section list with the 17 new ids (32 total → 128 PNGs).

## Steps
1. Part B (ClockProvider, remove `formatClockLocal`, `formatHourLoose`, `renderWithClock`);
   update Phase 3 tests; full test run green before continuing.
2. Primitives (Part A).
3. Build components group by group — ritual → stats → history → settings → onboarding →
   Phase2Notice — adding each gallery section right after the group and comparing it with:
   `ritual_step1-review`, `ritual_step2-reflection`, `ritual_step3-plan-tomorrow`,
   `ritual_summary`, `stats_default`, `stats_not-enough-data`, `history_default`,
   `settings_default`, `onboarding_step1`, `goals_phase2` (notice only), and the mobile
   `ritual_step1-review`, `stats_default`, `history_default`. Read exact values from
   `design/handoff/prototype/*.dc.html` when a screenshot is ambiguous.
4. Motion: stepper bar colours + step content transition (motion.md §2), energy pick (§6),
   onboarding dots (§6), timeline segment (§6), switch (§6). Respect reduced motion.
5. Tests (below). 6. Ritual playground. 7. Extend and run `pnpm shots`; compare.
8. Full check suite, handoff, commit `phase-04: components rest`.

Tests (jsdom, via `renderWithClock` where needed) — minimum set:
- **Stepper:** `aria-current="step"` on the current item; clicking a future step does not
  call `onStepClick`; clicking an earlier one does.
- **ReviewRow:** a done task renders no date chips; deciding then ticking done calls
  `onToggleDone` (screen clears the decision — assert the chips disappear when re-rendered
  with status done); postponedCount 3 shows the nudge unless decision is drop.
- **RitualFooter:** disabled → clicking calls `onBlockedClick`, not `onNext`.
- **ReflectionForm:** clicking energy 4 → `onChange` with energy 4; clicking 4 again → 0.
- **TomorrowPlanList:** X button only on `removable` items; star toggles call `onToggleMit`.
- **RitualSummary:** pct 74 → headline from `p50`; pct 75 → `p75`.
- **StatCard:** `value=null` → "—" and no delta text; delta −4 → text contains "4" and no
  success styling class.
- **Heatmap:** with today `2026-10-03`, a 13-week map renders no cell button for any date
  after today; aria-label of a planned cell matches `stats.heatmap.cellPlanned`; ArrowRight
  moves focus 7 days forward.
- **CalendarMonth:** `canPrev=false` → prev button disabled; clicking a past day calls
  `onSelect` with its ISO date.
- **DayDetail:** `mode="today"` renders the `history.today` text and the CTA.
- **PlanWindowTimeline:** evening default → the window segment's inline left/width
  correspond to 18:00 D-1 → 10:00 D on a 12:00→12:00 track (25% → 91.67%, ±0.5%).
- **format:** `formatHourLoose` cases above.
- **Ritual playground smoke test** (render the playground component): decide every task,
  finish, and assert the summary heading appears and no error is thrown.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0; `pnpm test:coverage`
  still ≥90% lines for `src/domain/**` (domain untouched this phase).
- Every test listed above exists and passes; Phase 3 tests still pass.
- `grep -rn "formatClockLocal" src` returns nothing.
- `/dev/components` returns 200 with an element for each of the 32 section ids;
  `pnpm shots` exits 0 and `artifacts/shots/` holds **128 PNGs**.
- Vietnamese grep from Phase 3's DoD returns nothing (fixtures stay in `src/dev/`).
- `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/components --include=*.tsx` returns nothing.
- `grep -rnE "new Date\(\)|Date\.now\(" src/components` returns nothing (clock comes from
  `useClock()`).
- Components import from `@/domain` only types and the helpers allowed in Part C;
  mutating domain functions appear only in `src/app/dev/` and tests.
- `git status design/` is clean; `git diff --stat HEAD -- src/domain` is empty.

## Handoff Obligations
1. Write `memory/phase_04_report.md` (What was done / Results / New findings / Decisions
   made / Open issues / Input for the next phase), including the screenshot comparison
   table for the new sections and any copy keys added.
2. Overwrite `memory/STATE.md`; next action: "Phase 05 task file to be written by the
   planning session — bring STATE.md, phase_04_report.md and discoveries.md back to it".
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
