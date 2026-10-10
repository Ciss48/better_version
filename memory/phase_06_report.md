# Phase 06 report — Stats & History

**Done:** 2026-10-04 · committed as `phase-06: stats & history`.
The MVP is now feature-complete on localStorage: every screen in `design/handoff/screens.md`
exists and runs on real data.

## What was done

### 1. `src/stats/` — the pure stats module (test-first)
`types.ts` · `helpers.ts` · `compute.ts` · `month.ts` · `index.ts`, plus
`__tests__/{helpers.ts, compute.test.ts, month.test.ts}`.

- `computeStats(input): StatsResult` turns `{tasks, dayLogs, today, settings}` into every number
  on the Journey screen in one pass: the six cards (with deltas), the 26-week heat map, the
  weekday averages and the four insights.
- `monthSummary(days, month, today)` and `planTimingOf(dayTasks, date, settings)` serve History.
- It imports `@/domain` and nothing else — no React, no zustand, no Next, no I/O. Every rule it
  needs (`buildDaySummaries`, `consistency`, `classifyPlanTiming`, `localParts`, `isoWeekday`)
  comes from the domain; nothing is re-implemented.
- Two rules run through all of it: **"completed days" are the days strictly before today**
  (today only counts for the consistency score and the heat map), and **too little data shows
  "—", never a zero** (`sparse` = fewer than 7 planned days).
- Tests are hand-built fixtures on fixed dates (today = 2026-10-03, the design's anchor). Every
  row of the task file's definitions table has a test, and every threshold has one just below it
  and one at it: evening gap 4 → silent / 5 → spoken, group of 2 days → silent / 3 → spoken,
  MIT group of 4 tasks → silent / 5 → spoken, weekday gap 9 → silent / 10 → spoken, a weekday
  seen once → skipped / twice → counted, sparse at 6 vs 7 planned days, the insight gate at 13
  vs 14 days, `null` deltas when the previous window is empty, `adhoc`/`moved` deltas always
  `null`, today excluded from the averages but present in consistency and the heat map.
  **49 tests, 100% lines.**

### 2. Store and selectors
- `src/state/selectors.ts` gains `statsView(s, clock)` (a thin pass-through to `computeStats`)
  and `historyDay(s, date, clock)` → `{tasks, dayLog, planTiming, mode}`.
- `src/state/store.ts` gains **`ensureMonthLoaded(month)`**, which hands every date of a
  'YYYY-MM' month to the existing `ensureLoaded` gap logic. The init window is unchanged.
- 3 new store tests (older month, leap February, no read when the month is already loaded) and
  6 new selector tests.

### 3. Screens
- **`src/features/stats/StatsScreen.tsx`** — Journey. Header + range line, the sparse card with
  its seven dots, six `StatCard`s, `Heatmap` (26 weeks on desktop, 13 below the `app:` break),
  `WeekdayChart` and `InsightCard`. The module reports ISO weekday *numbers*; the screen turns
  them into names from `date.weekdayLong`, so copy stays in the UI. A heat-map cell pushes
  `/history?date=<d>`.
- **`src/features/history/HistoryScreen.tsx`** — History. `?date=` and `?month=` are the **only**
  state: there is no local `useState` mirror, so a link from the heat map, a reload and the
  prev/next buttons all go through one path. Selecting uses `router.replace` (no back-button
  spam). The calendar is given only the month's days that are ≤ today **and** ≥ `firstPlanDate`,
  which is what makes future days and pre-first-use days render as quiet, unclickable numbers.
  The page wraps the screen in `<Suspense>` — `useSearchParams` requires it.
- **`src/features/phase2/`** — `Phase2Page` (shared frame), `GoalsScreen`, `WeeklyScreen`,
  `samples.ts`. Static previews: sample content lives in `src/content/phase2-samples.vi.json`,
  the "+ Thêm mục tiêu" tile and the three "next week" inputs are `disabled` + `aria-disabled`
  with no handlers, and neither screen touches the store. They mark themselves
  `data-ready="true"` directly, since there is nothing to wait for.

### 4. The three allowed Phase 5 leftovers (§4)
1. `DayEndChips` gained `midnightLabel?: 'word' | 'time'` (default `'word'`); Settings passes
   `'time'`, so 00:00 reads "00:00" as in `settings_default`. Onboarding still says "Nửa đêm".
2. `RitualSummary`'s kicker uses `formatWeekdayDayMonth` → "ĐÃ KHÉP LẠI THỨ BẢY, 3/10".
3. The live theme and `settings.theme` can no longer disagree. Done in **`AppShellLive`**, not in
   `AppShell`: it watches next-themes' `theme` and writes any change back with
   `updateSettings({ theme })`. That covers the `T` shortcut *and* both theme buttons, and needed
   no fourth component change. Verified by hand: `settings.theme` goes `system` → `dark` on `T`.
4. Seeds (dev-only, §4.4) — see "Decisions made".

### 5. Shots and e2e
- `scripts/shots-screens.ts`: 6 new rows → **72 PNGs**. `ritual_summary` is the only row that
  needs driving: a `prepare(page)` hook runs the whole ritual through the UI (the summary lives
  in the store after a real close, so no seed can produce it), then reloads so the "Đã đóng ngày"
  toast is not in the picture.
- `e2e/stats.spec.ts` (3) and `e2e/history.spec.ts` (2) → **14 specs**, all green.
- `e2e/global-setup.ts` — new, and the reason the suite is reliable again. See "New findings".

## Results

| Check | Result |
|---|---|
| `pnpm lint` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm test` | 0 — **39 files, 423 tests** (was 363) |
| `pnpm build` | 0 — 11 routes, all static, no `/dev` |
| `pnpm e2e` | 0 — **14/14**, 9.1s warm, 12.4s from a deleted `.next` |
| `pnpm test:coverage` | `src/domain/**` **100% lines**, `src/stats/**` **100% lines** |
| `pnpm shots:screens` | **72/72 PNGs** |
| `git diff --stat HEAD -- src/domain src/data/repository.ts` | empty |
| `grep -rnE "from ['\"](react\|zustand\|next)" src/stats` | no matches |
| Vietnamese outside `src/content` / `src/dev` | none in string literals (comments only, as elsewhere) |
| Raw hex in `src/components` / `src/features` | none |
| `/dev` route or seed fixture titles in the production build | none in `.next/server/app` or `.next/static` |
| `git status design/` | clean |

## Shot comparison with `design/handoff/screenshots/`

The six new rows (each shot light + dark × desktop + mobile).

| Row | Design file | Verdict |
|---|---|---|
| `ritual_summary` | `desktop/ritual_summary_{light,dark}` | **Match.** 62%, 5/8, 3 dời, 1 bỏ, 4/5 năng lượng, "Ngày mai đã sẵn sàng · 4 việc, 2 MIT" with the same two titles; the kicker reads "ĐÃ KHÉP LẠI THỨ BẢY, 3/10" (§4.2). **Phase 7 fix:** `RitualScreen` now keeps the ritual header ("NGHI THỨC BUỔI TỐI / Thứ Bảy, 3/10 · 21:30" + "Để sau Esc") above the summary at step 3, matching the design — see `memory/phase_07_report.md` §5. Re-shot in `artifacts/screens/`. |
| `stats_default` | `desktop/` + `mobile/` | **Match on structure, layout and type** — header, 4+2 card grid, 26-week map (13 on mobile), weekday chart + insights side by side, all four insight sentences present with the design's dot colours. Figures differ because they are computed from the seed, not pinned (86/72/28-30/46/7/19 vs the design's 76/75/26-30/38/6/23). **One deliberate difference:** the q2 card carries its delta chip; the design shows none. The task file's contract says "q2Share: percent, **delta shown**", so the contract won — flagged here. |
| `stats_not-enough-data` | `desktop/` | **Match on treatment** — accent-soft sparse card, seven dots, every card but the consistency score at "—", flat weekday bars, the "come back in two weeks" insight line. Content differs by design of the task table: the row is seeded `sparse` (a 4-day user → "4/7", "0/30" → "4/30", a partly-filled map), the design file pictures a 0-day user. |
| `history_default` | `desktop/` + `mobile/` | **Match on layout and the selected day** — calendar left / detail right, sticky on desktop, stacked on mobile; the detail is the same 2/10 fixture, 100%, "Plan lúc 07:59 sáng · 8 việc đã định" (the fixture's `createdAt` was fixed to produce it), the same eight rows and the same reflection. **One remaining difference:** the month line reads "3/3 ngày có plan · TB 100%" where the design shows "2/2 · TB 92%" — the task file defines the month total as *dates of the month ≤ today*, so today is counted (the prototype silently dropped it); this is a rule difference, not a defect, and stays. **Phase 7 fix:** `DayDetail`'s heading now uses `formatWeekdayDayMonth` → "Thứ Sáu, 2/10", matching the design (was "Thứ Sáu, 2 tháng 10") — see `memory/phase_07_report.md` §5. Re-shot in `artifacts/screens/`. |
| `goals_phase2` | `desktop/goals_phase2_{light,dark}` | **Match** — notice, header, three goal cards with the right horizons/metrics/percentages/focus boxes/linked counts, the dashed "+ Thêm mục tiêu" tile on the second row. One small difference: `@tên-mục-tiêu` is plain text, not monospace-bold — the copy key is one string and splitting it would mean inventing copy. |
| `weekly_phase2` | `desktop/weekly-review_phase2_{light,dark}` | **Match** — notice, "Tuần 28/9 – 4/10", the three figures (79% / 6/7 / 11/14), the seven-bar chart with a dashed CN and an accent T7, and the three disabled focus fields with the design's placeholders. Note the **file names differ**: the task table calls the row `weekly_phase2`, the design file is `weekly-review_phase2`. The task table was followed. |

The 12 Phase 5 rows were re-shot unchanged except `settings_default` (00:00 now reads "00:00",
§4.1) and `ritual_step1-review` (same, re-rendered against the new seed data).

## New findings

### `pnpm e2e` was failing cold for a reason that had nothing to do with this phase
Running the suite against a cold `next dev` failed **all 14 specs** — every one timed out waiting
for `[data-ready="true"]` — while running it serially, or a second time against the now-warm
server, passed everything in seconds. `next dev` compiles a route the first time it is asked for,
and its client bundle only when a browser actually fetches it; with the default four workers that
cost lands on four *parallel* first navigations and blows the 20s readiness timeout on all of
them. More routes (9 now) and a bigger `demo` seed made it tip over.

Fixed with **`e2e/global-setup.ts`**: one browser walks all nine routes before the workers start.
A cold run (`rm -rf .next`) now takes 12.4s and passes 14/14, with or without a worker cap — so no
cap was added. *Do not chase this as a memory problem; it is lazy compilation.*

### The `demo` seed was quietly showing every historical day as 100%
`historyDay` marked every unfinished task `dropped`, and `completion()` excludes dropped tasks
from the denominator — so a day where nothing was finished scored 100%. Nothing before this phase
read those percentages (the sidebar card only asks "was there a plan"), so it never showed. The
Journey screen reads them for everything, which is how it surfaced. See "Decisions made".

### Insight tone and the range date disagree with the task file; the screenshots won
Two presentational details in the §3 contract do not match `design/handoff/screenshots/`. Both
were resolved in favour of the screenshots (CLAUDE.md: "How it looks | `design/screenshots/`
(visual truth)") and logged in `memory/discoveries.md` as one Moderate finding.

### Smaller things
- `historyDay`'s signature is `(s, date, clock)`, not `(s, date, settings)` as the task file
  wrote it: `mode` needs `today`, and `ClockValue` already carries both. Symmetric with
  `statsView(s, clock)`.
- `useSearchParams` forces a `<Suspense>` boundary at build time. `app/(app)/history/page.tsx`
  provides one with a `null` fallback; `ScreenState` already draws the loading skeleton.
- The eslint rule `react-hooks/set-state-in-effect` rejects syncing URL params into state inside
  an effect. That pushed History to "the URL is the only state", which is better anyway.
- Sonner's 2.6s timer does not fire reliably in a headless context — the toast never disappeared.
  The `ritual_summary` shot reloads instead of waiting it out; the closed day is persisted, so the
  summary comes back identically.

## Decisions made

1. **Insight tones follow the screenshot, not the contract.** The task file says
   "weekday → accent, others → success"; `stats_default` plainly shows green, orange, green,
   orange — evening → success, mit → accent, weekday → success, energy → accent. Implemented as
   the screenshot shows. Moderate, logged in `discoveries.md`.
2. **The range line uses `formatWeekdayDayMonth`, not `formatDateLong`.** The task file says
   `formatDateLong(today)`, which renders "Thứ Bảy, 3 tháng 10"; both the desktop and mobile
   screenshots read "tính đến Thứ Bảy, **3/10**" — and §4.2 of the same task file corrects
   `RitualSummary` in exactly this direction. Same discovery entry.
3. **`monthSummary` follows the contract, not the prototype.** The task file defines the month
   total as the dates of the month ≤ today, so today counts as a day with a plan. The prototype's
   "2/2" came from its sample array simply stopping before today. The contract is the
   better-defined rule; the difference is recorded in the comparison table above.
4. **`demo` history rewritten (dev-only).** The numbers are still deterministic noise, but no
   longer *independent* noise — all four insights are comparisons, so the seed has to carry the
   correlations they look for:
   - two days in three are planned the evening before, and those days go better (`evening`);
   - a day's two MITs are likelier to get done than the rest (`mit`);
   - the day log's energy tracks how the day went (`energy`);
   - the weekday insight falls out of the first one.
   Unfinished work now spreads over moved / dropped / untouched instead of all being dropped (the
   100% bug above), and roughly every third day gets one adhoc task, so "Việc phát sinh" and
   "Việc bị dời" are not flat zeros. A seeded `moved` task deliberately gets **no copy** on its
   target day — a seed is a picture of the past, and the copy would hand a day that is meant to
   have no plan one anyway. History is read-only, so nothing can restore one.
5. **`HISTORY_DAYS` 45 → 190**, matching the store's own past window, so the 26-week map and the
   26-week weekday chart are full rather than half grey. ~904 tasks; no measurable effect on load
   time (seeding a page costs the same as the 18-task `sparse` seed).
6. **New dev seed `sparse`** — onboarded, four planned days ending yesterday. Drives
   `stats_not-enough-data` and e2e spec 13.
7. **`src/features/phase2/` are server components.** No store, no clock, no `'use client'`; the
   sample text is prerendered into `goals.html` / `weekly.html` and never reaches `.next/static`.

## Open issues

- ~~**`DayDetail`'s heading** prints `formatDateLong` ("Thứ Sáu, 2 tháng 10"); the design has
  "Thứ Sáu, 2/10".~~ **Fixed in Phase 7** (`memory/phase_07_report.md` §5).
- ~~**The ritual summary drops the ritual header** that `ritual_summary` shows. `RitualScreen`
  returns early at step 3.~~ **Fixed in Phase 7** (`memory/phase_07_report.md` §5).
- **`docs/plan.md` §3 still carries the pre-renumbering phase list** (Phase 5 finding). The brief
  for this session confirmed the live numbering — 6 stats & history, 7 Supabase, 8 ship (end of
  MVP), 9 SQL analytics (optional) — but `plan.md` itself has not been updated.
- `@tên-mục-tiêu` on the Goals preview is not styled as code (single copy string).

## Supabase reachability (risk R6)

`curl -sI https://<project>.supabase.co`, URL read from `.env.local` (no key printed, nothing
logged):

```
HTTP/2 404
server: cloudflare
```
in **0.14s**. A 404 on the bare project root is the expected answer — the REST API lives under
`/rest/v1/`. **The project host resolves and answers from this machine**, so Phase 7 is not
blocked on network access. `.env.local` holds `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY`; none of them is used by any code yet.

## MVP-on-localStorage checklist (click through by hand)

Run `pnpm dev`, then walk this once. Each line is one thing the MVP promises.

1. **First run** — open `/` in a private window → onboarding. Walk the four steps, or press
   "Bỏ qua, dùng mặc định". You land on Today with the input focused.
2. **Write a plan** — `?seed=empty&now=2026-10-03T01:15:00Z` on `/today` (window open). Type
   `Học 2 chương Databricks * !^ ~L` → the chips preview MIT / quan trọng / gấp / L before you
   press Enter. Add three more. Try a fourth MIT → it is refused with a toast.
3. **Tick** — click a checkbox: the % and "n/m việc đã định" move together. Tick everything →
   the 100% banner.
4. **Matrix** — press `M`. Drag a chip into another quadrant; reload — it stayed.
5. **After the lock** — `?seed=demo&now=2026-10-03T07:10:00Z`. New tasks land in "Phát sinh" with
   a dashed border and do **not** move the percentage.
6. **Move / drop / restore** — expand a task → "Dời" → "Mai"; it shows "dời sang …". Undo it with
   "Khôi phục".
7. **Evening ritual** — `/ritual?seed=demo&now=2026-10-03T14:30:00Z`. "Tiếp tục" is blocked until
   every leftover has a decision; step 2 is skippable; step 3 caps tomorrow at 3 MITs. Press Esc
   mid-way and come back — the draft survived. Finish → the summary.
8. **Reload after closing** — the summary is still there; `/today` for 2026-10-04 holds what you
   planned.
9. **Journey** — `/stats?seed=demo&now=2026-10-03T07:10:00Z`: six cards, a full 26-week map, the
   weekday chart and four insights. Narrow the window below 720px → 13 weeks, two columns.
10. **Not enough data** — `/stats?seed=sparse&now=2026-10-03T07:10:00Z`: "Bạn đã có 4/7", every
    card "—", no insights. Nothing scolds you.
11. **Heat map → History** — click any cell → `/history?date=…` opens that day.
12. **History** — prev/next walk the months; next is disabled on the current one; a day with no
    plan says so kindly; today says "Ngày này vẫn đang diễn ra" with a way back.
13. **Settings** — change the lock time; Today's PlanStatus updates at once, with no Save button.
    Day end reads "00:00". Toggle reminders. Switch the theme here or with `T` — both stick after
    a reload.
14. **Phase 2 previews** — `/goals` and `/weekly` carry the Phase 2 notice and nothing is typeable.
15. **It is all still there** — reload any screen; nothing was lost. Nothing has ever reached a
    network.

## Input for the next phase

### Phase 07 — Supabase persistence & auth
- **`src/stats/` needs nothing from Phase 7.** It takes plain arrays. If stats ever move to SQL
  (Phase 9), this module is the executable specification of what those queries must return — and
  its tests are the comparison harness.
- **`commit()` must become genuinely atomic** (one transaction or RPC). Unchanged from the Phase 5
  report, and now more pressing: `closeDay` writes tasks, events *and* a day log, and the store's
  rollback cannot recover from a partial write.
- **`ensureMonthLoaded` is the one new read path.** It funnels into `ensureLoaded`, which issues
  one `loadTasks` + one `loadDayLogs` per gap — a Supabase implementation should expect range
  queries on `plan_date`, not per-day ones. `firstPlanDate()` is called once per init and is what
  History's "how far back can I go" and the heat map's "before you started" both rest on.
- **Nothing above `src/data` knows where the data lives.** `getRepository()` is still the single
  line to swap.
- `e2e/global-setup.ts` and the `?seed=` / `?now=` params stay dev-only; a Supabase repository
  does not have to implement `SeedableRepository`.

### Worth doing whenever the rule allows
The two component-level mismatches under "Open issues" (`DayDetail`'s heading format, the ritual
header above the summary) are both small and both visible in the handoff screenshots.
