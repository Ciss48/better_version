# Phase 06: Stats & History

## Context Recap
Better Every Day is a Vietnamese daily-planning web app (`docs/plan.md`). Phases 1–5 are
done: the core loop (Today, Ritual, Onboarding, Settings) runs on a localStorage
`Repository` through a zustand store, with dev `?seed=` / `?now=`, 9 e2e flows and
screen-state shots (see `memory/phase_05_report.md` → "Input for the next phase").
Every stats/history component already exists and takes ready values via props
(Phase 4). Nothing computes those values yet, and `/stats`, `/history`, `/goals`,
`/weekly` are placeholders. This phase adds a pure stats module and the four remaining
screens, which makes the MVP feature-complete on localStorage.

## Goal
`src/stats/` computes every number and insight on the Journey screen from tasks + day logs,
fully tested; `/stats`, `/history`, `/goals`, `/weekly` are real screens matching the
design; a few Phase 5 leftovers are fixed; new shots and e2e specs pass.

## Non-goals
- No Supabase, auth, Supabase MCP or SQL (Phase 7 / 9).
- No changes to `src/domain/`. No changes to the `Repository` interface.
- Goals/Weekly stay **non-functional** Phase-2 previews (static sample content, inputs
  disabled). No goal linking, no `@` parsing.
- No event-log-based stats: plan timing comes from `tasks.createdAt` (plan.md data model).
- No new dependencies.

## Interface Contract

### 1. `src/stats/` (pure TypeScript; may import `@/domain`; no React/zustand/I/O)
```ts
// src/stats/types.ts
export interface StatsInput {
  tasks: Task[];               // everything loaded (the store window: today−190 … today+30)
  dayLogs: DayLog[];
  today: ISODate;
  settings: Settings;          // for classifyPlanTiming
}
export interface CardValue { value: number | null; delta: number | null }
export type InsightKind = 'evening' | 'mit' | 'weekday' | 'energy';
export interface Insight {
  kind: InsightKind;
  tone: 'success' | 'accent';                     // weekday → accent, others → success
  vars: Record<string, string | number>;          // exactly the template's placeholders
}
export interface StatsResult {
  daysWithPlan: number;                           // all loaded dates ≤ today with hasPlan
  sparse: boolean;                                // daysWithPlan < 7
  firstUseDate: ISODate | null;                   // earliest planDate with a planned task
  cards: {
    avg7: CardValue; avg30: CardValue;            // percent
    consistency: { planned: number };             // domain consistency(), ratio30
    q2Share: CardValue;                           // percent, delta shown
    adhocShare: CardValue;                        // percent, delta ALWAYS null (no tone judgement)
    movedShare: CardValue;                        // percent, delta ALWAYS null
  };
  heatmap: DaySummary[];                          // [today − 26*7 + 1 … today]
  weekday: { weekday: 1|2|3|4|5|6|7; pct: number | null }[]; // Mon…Sun
  insights: Insight[];                            // ordered evening, mit, weekday, energy
}
// src/stats/compute.ts
export function computeStats(input: StatsInput): StatsResult;
// src/stats/month.ts
export function monthSummary(days: DaySummary[], month: string /* YYYY-MM */, today: ISODate):
  { planned: number; total: number; avg: number } | null;
export function planTimingOf(dayTasks: Task[], date: ISODate, settings: Settings):
  { kind: 'evening' | 'morning'; time: HHMM } | null;
```

**Definitions (binding).** "Completed days" = dates strictly before `today`. Summaries via
`buildDaySummaries` / `summarizeDay`. All percentages rounded to integers; deltas are
`round(current − previous)` and `null` if either side is `null`. Windows are inclusive.
| Output | Rule |
|---|---|
| `avg7` | mean `pct` of completed days with `hasPlan` in [today−7, today−1]; previous = [today−14, today−8]; `null` if no planned day |
| `avg30` | same over [today−30, today−1]; previous [today−60, today−31] |
| `consistency` | `consistency(summaries, today)` from the domain (includes today) |
| `q2Share` | tasks with planDate in [today−30, today−1], `adhoc=false`, `status≠'dropped'`: share with `important && !urgent`; previous window [today−60, today−31]; `null` if 0 tasks |
| `adhocShare` | tasks in [today−30, today−1], any status: share with `adhoc=true`; `null` if 0 |
| `movedShare` | tasks in [today−30, today−1] with `adhoc=false`: share with `status='moved'`; `null` if 0 |
| `sparse` | `daysWithPlan < 7` → every card except `consistency` is `{value:null, delta:null}`, `weekday` all `null`, `insights` `[]` |
| `weekday` | completed planned days in [today−182, today−1]; mean `pct` per `isoWeekday`; `null` if none |
| insights gate | only if ≥14 completed days with a plan in [today−90, today−1]; else `[]` |
| `evening` | per completed planned day in [today−90, today−1]: `classifyPlanTiming(min createdAt of its adhoc=false tasks)`; mean pct of `evening` days vs `morning` days (`late` ignored); each group ≥3 days; show if `round(e − m) ≥ 5`; vars `{ n }` |
| `mit` | tasks in [today−30, today−1], `adhoc=false`, `status≠'dropped'`: done-rate of MIT vs non-MIT (counts); each group ≥5 tasks; show if `mit − other ≥ 5`; vars `{ mit, other }` |
| `weekday` insight | from `weekday` result, among weekdays with ≥2 sample days: best and worst; show if `best − worst ≥ 10`; vars `{ best, bestPct, worst, worstPct }` with names from `tRaw('date.weekdayLong')` — **resolved by the screen, not the module** (module puts `isoWeekday` numbers in `vars.best/worst`; screen maps them) |
| `energy` | completed days in [today−90, today−1] with a dayLog `energy > 0` and `hasPlan`: mean pct of energy 4–5 vs 1–2; each ≥3 days; show if `high − low ≥ 5`; vars `{ high, low }` |
| `monthSummary` | dates of `month` that are ≤ today: `planned` = count `hasPlan`, `total` = count of those dates, `avg` = mean pct of planned completed days (today excluded); `null` if `planned === 0` |
| `planTimingOf` | `classifyPlanTiming(min createdAt of adhoc=false tasks)`; `late` → `null`; `time` = `formatClock`-equivalent local HH:MM computed with the domain's `localParts` (no React) |

Tests (`src/stats/__tests__/`), using hand-built fixtures with fixed dates: every row of
the table, including each threshold just below and at its boundary (e.g. evening diff 4 →
absent, 5 → present; group of 2 days → absent), sparse with 6 vs 7 days, deltas `null`
when the previous window is empty, `adhoc`/`moved` deltas always `null`, today excluded
from averages but included in consistency and heatmap, `monthSummary` for the current
month (dates after today ignored) and an empty month. Coverage ≥90% lines for `src/stats/**`
(add it to the coverage include).

### 2. Store / selectors
- `src/state/selectors.ts` gains `statsView(s: AppState, clock: ClockValue): StatsResult`
  (memoise in the screen with `useMemo`, as Phase 5 does) and
  `historyDay(s, date, settings)` returning `{ tasks, dayLog, planTiming, mode }`.
- History needs months older than the loaded window: add store action
  `ensureMonthLoaded(month: string)` that calls `ensureLoaded` for every date of that month
  (reuse the existing gap logic). Do not widen the init window.

### 3. Screens (`src/features/stats/StatsScreen.tsx`, `src/features/history/HistoryScreen.tsx`, `src/features/phase2/*`)
**Journey `/stats`** — screens.md §3. Header: kicker, title, range line
(`stats.range` with `stats.period.w26|w13` by `useIsDesktop`, `formatDateLong(today)`;
`stats.rangeNew` / `stats.rangeToday` for new users). Sparse → `Banner`-style card with
`stats.sparse.*` (`{n}` = daysWithPlan). 6 StatCards in the order of the screenshot with
labels/notes from `stats.cards.*`; Heatmap (`weeks = isDesktop === false ? 13 : 26`,
`firstUseDate`, `onSelectDay` → `/history?date=<d>`); WeekdayChart; InsightCard with
texts from `t('stats.insights.<kind>', vars)` (map weekday numbers to names first).
Layout per `stats_default` desktop and mobile screenshots.

**History `/history`** — screens.md §4. Query params `?date=YYYY-MM-DD` (selected day) and
optional `?month=YYYY-MM`; default selected = yesterday (today if the user has no data
before today), month = selected's month. `CalendarMonth` with `summary = monthSummary(…)`,
`canPrev` = month > month of `firstPlanDate` (or false if null), `canNext` = month < current
month; prev/next call `ensureMonthLoaded` and keep the selection if it is in the new month,
else select that month's last past day. Selecting a future day is impossible (component
already disables it). `DayDetail` from `historyDay` (`mode='today'` when date = today,
`onOpenToday` → `/today`). Desktop: calendar left, detail right (sticky); mobile: stacked.
Update the URL with `router.replace` on selection (no history spam).

**Goals `/goals`, Weekly `/weekly`** — match `goals_phase2` / `weekly_phase2` screenshots
as static previews: `Phase2Notice` on top, then the designed cards rendered from sample
data in a new content file `src/content/phase2-samples.vi.json` (goal names, focus
lines, weekly numbers) plus copy keys `phase2.*`. Inputs/buttons rendered disabled
(`aria-disabled`, no handlers). No store access.

### 4. Phase 5 leftovers (only these component changes are allowed)
1. `DayEndChips` gains `midnightLabel?: 'word' | 'time'` (default `'word'`); Settings passes
   `'time'` so 00:00 reads "00:00" as in `settings_default`.
2. `RitualSummary` kicker uses `formatWeekdayDayMonth` ("Thứ Bảy, 3/10") as in `ritual_summary`.
3. The `T` shortcut (AppShellLive) persists the new theme via `updateSettings({ theme })`,
   so live theme and `settings.theme` never disagree.
4. Seeds: `demo` history gets realistic `createdAt` spread (some days planned the evening
   before, some in the morning) and dayLog energies such that **all four insights appear**
   for `?seed=demo` at `now=2026-10-03T07:10:00Z`; add seed `sparse` (onboarded, 4 planned
   days ending yesterday). Seeds stay dev-only.

### 5. Screen shots (extend `scripts/shots-screens.ts`)
| design-name | path | seed | now (UTC) |
|---|---|---|---|
| `stats_default` | /stats | demo | 2026-10-03T07:10:00Z |
| `stats_not-enough-data` | /stats | sparse | 2026-10-03T07:10:00Z |
| `history_default` | /history | demo | 2026-10-03T07:10:00Z |
| `goals_phase2` | /goals | demo | 2026-10-03T07:10:00Z |
| `weekly_phase2` | /weekly | demo | 2026-10-03T07:10:00Z |
| `ritual_summary` | /ritual | demo | 2026-10-03T14:30:00Z (script closes the day via UI first, or a dev seed `closed`) |
(6 new rows → 24 PNGs; total **72**.) If a design file for a row does not exist, still
capture it and judge against screens.md.

### 6. E2E (add to `e2e/`)
10. **Journey:** seed `demo`, now 07:10Z → 6 stat cards visible, 4 insight sentences,
    heatmap has no cell button after 2026-10-03.
11. **Heatmap → History:** click the cell for 2026-10-01 → URL `/history?date=2026-10-01`
    and DayDetail heading shows that date.
12. **History navigation:** seed `demo` → prev month → a September day is selectable and
    shows its tasks; next is disabled on the current month.
13. **Sparse:** seed `sparse` → sparse card with `4/7`, cards show "—", insights empty text.
14. **Stats react to closing a day:** seed `demo`, now 14:30Z → read consistency → run the
    ritual to the end → `/stats` with now `2026-10-04T01:00:00Z` → no error and the
    heatmap contains a cell for 2026-10-03 with a percentage.

## Steps
1. `src/stats/` types → compute → month/planTiming helpers, test-first; coverage.
2. Selectors + `ensureMonthLoaded` + store tests.
3. Phase 5 leftovers (§4) incl. seed changes; verify all four insights for `demo`.
4. Journey screen → History screen → Goals/Weekly previews; compare each with its
   screenshot via `?seed`/`?now` as you go.
5. Extend shots (72 PNGs) and compare; e2e 10–14; all 9 earlier specs still green.
6. Full check suite; handoff; commit `phase-06: stats & history`.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e` (14 specs) exit 0.
- `pnpm test:coverage`: `src/domain/**` and `src/stats/**` both ≥90% lines.
- `git diff --stat HEAD -- src/domain src/data/repository.ts` is empty.
- `grep -rnE "from ['\"](react|zustand|next)" src/stats` returns nothing.
- `pnpm shots:screens` writes **72 PNGs**; every new row has a verdict in the report.
- No hard-coded Vietnamese (Phase 3 grep) in `src/` outside `src/content/` and `src/dev/`;
  no raw hex in components/features.
- Production build: no `/dev` route, no seed fixture titles in `.next/static`.
- `git status design/` clean.

## Handoff Obligations
1. Write `memory/phase_06_report.md` (What was done / Results / New findings / Decisions
   made / Open issues / Input for the next phase), incl. the shot comparison table and a
   short "MVP-on-localStorage checklist" the user can click through manually.
2. Overwrite `memory/STATE.md`; next action: "Phase 07 task file to be written by the
   planning session — bring STATE.md, phase_06_report.md and discoveries.md back to it".
   Before finishing, run `curl -sI https://<project>.supabase.co` using the URL in
   `.env.local` (do not print keys) and record in the report whether it is reachable from
   this machine — Phase 7 depends on it (risk R6).
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major.
4. Commit.
