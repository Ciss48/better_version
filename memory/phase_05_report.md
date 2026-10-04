# Phase 05 report — App core on a local repository

**Date:** 2026-10-04 · committed as `phase-05: app core`

## What was done

### 1. Data layer (`src/data/`)
- `repository.ts` — the `Repository` interface exactly as the task file specifies, plus the
  shared helpers (`applyMutation`, `earliestPlanDate`, `inRange`) and a deliberately
  **non-contract** `SeedableRepository` extension (`seed(data)`) that only the dev seeds and
  tests use, so Phase 7's Supabase implementation does not have to provide it.
- `memory-repository.ts` — `MemoryRepository`, the reference implementation.
- `local-repository.ts` — `LocalRepository` on the four documented keys
  (`bed:v1:settings`, `bed:v1:tasks`, `bed:v1:dayLogs`, `bed:v1:events`). `commit` builds the
  next value of every affected key in memory first and only then writes. Corrupt JSON →
  `console.error` + treated as empty, and the next commit repairs the key.
- `index.ts` — `getRepository()` (the LocalRepository singleton Phase 7 swaps) and
  `setRepository()` for tests.
- `__tests__/repository.contract.ts` — 19 shared cases, run via `describe.each`-style calls
  against both implementations in `repository.test.ts`, plus 5 localStorage-specific cases.
  **41 tests.** The contract file is deliberately not `*.test.ts` so it runs once per
  implementation, not once on its own.

### 2. Clock and dev tooling
- `src/state/clock-source.ts` — `getNow()` / `setNowOverride()` / `restoreNowOverride()` /
  `useNow(intervalMs = 30_000)`. The override is dev-only and lives in `sessionStorage`.
- `src/state/ClockBridge.tsx` — turns `useNow()` + store settings into the `ClockValue` that
  `useClock()` serves, and registers next-themes' `setTheme` with `theme-bridge.ts`.
- `src/state/StoreBootstrap.tsx` — runs `init()` once, after the dev params in development.
- `src/dev/DevParams.tsx` — applies `?seed=` and `?now=` (`?now=off` clears), then strips both
  params with `router.replace`, so a reload neither re-seeds nor loses the frozen clock.
- `src/dev/seeds.ts` — the six seeds, all generated from the anchor **2026-10-03** and fully
  deterministic (`sin`-based noise keyed by date).

### 3. State (`src/state/`)
- `store.ts` — zustand, every action in the contract, created by `createAppStore(repo?)` so
  tests (and Phase 7) can run it against any repository. Each mutating action: build `Ctx` →
  gather inputs (`ensureLoaded` first when a date is outside the window) → call the domain →
  apply optimistically → `repo.commit` → revert + `common.saveError` on failure → notices and
  extra toasts only after the write lands.
- `ritual-draft.ts` — `loadDraft` / `saveDraft` / `clearDraft` on `bed:v1:ritual:<date>`, with
  shape validation and a date check so a draft can never bleed into another day.
- `selectors.ts` — `tasksOn`, `todayView`, `consistencyView`, `ritualTomorrowItems` and
  `ritualReviewTasks`, all pure.
- `theme-bridge.ts` — the one-function seam between the store and next-themes.
- Tests: **60** store cases, **19** selector cases, **7** ritual-draft cases.

### 4. Screens (`src/features/`)
`TodayScreen`, `RitualScreen`, `OnboardingScreen`, `SettingsScreen`, `AppShellLive` (feeds
`ConsistencyMini` from `consistencyView`) and `ScreenState` (the quiet paper skeleton plus the
`data-ready="true"` marker the screenshot script and the e2e specs wait on). The `(app)` layout
and the onboarding page mount `StoreBootstrap → ClockBridge`.

### 5. The two allowed Phase 3/4 component changes
- `TaskInput` gained `showSyntax?: boolean` (default `true`); `TomorrowPlanList` passes `false`
  — that is how "ritual step 3 passes false" is actually wired, since step 3's quick-add field
  lives inside that component.
- `DayDetail` hides the energy line entirely when `energy === 0` instead of printing "—/5".
- Both have new test cases.

### 6. Tooling
- `scripts/shots-screens.ts` + `pnpm shots:screens` — 12 rows × 2 themes × 2 viewports.
- `playwright.config.ts` + `e2e/` + `pnpm e2e` — 9 specs, `webServer = pnpm dev`.

## Results

| Check | Result |
|---|---|
| `pnpm lint` | 0 |
| `pnpm typecheck` | 0 |
| `pnpm test` | 0 — **37 files, 363 tests** (3 consecutive clean runs) |
| `pnpm build` | 0 — 11 routes, no `/dev` entry |
| `pnpm e2e` | 0 — **9/9 specs** |
| `pnpm test:coverage` | `src/domain/**` **100% lines**, 99.69% stmts, 100% funcs |
| `git diff --stat HEAD -- src/domain` | empty |
| `git status design/` | clean |
| `pnpm shots` (Phase 3/4 gallery) | still 128 PNGs |
| `pnpm shots:screens` | **48 PNGs** |

**DoD greps.** `localStorage`/`sessionStorage` appear only in `src/data/local-repository.ts`,
`src/state/ritual-draft.ts`, `src/state/store.ts`, `src/state/clock-source.ts` and
`src/dev/DevParams.tsx` (plus two occurrences inside doc comments). The mutating domain
functions are imported only by `src/state/store.ts`, `src/app/dev/components/*Playground.tsx`
and `src/domain/__tests__/`. No hard-coded Vietnamese and no raw hex in `src/features`,
`src/state`, `src/data`, `src/components`, `src/app` (the five diacritic hits are comments
quoting UI copy). A production build contains none of the seed fixture titles.

## 48-shot comparison with `design/handoff/screenshots/`

Each row below is 4 PNGs (light/dark × desktop/mobile). The design folder only holds desktop
captures for 12 of these names and mobile captures for 2, so "mobile" verdicts marked *(no
counterpart)* were judged against `screens.md` and the prototype instead.

Two systematic differences apply to **every** row and are not defects:
- **Clock.** The task file pins each row's `?now=`; the design captures were taken at the
  prototype's own times (mostly 20:45/21:30). Where that changes which banner `selectBanners`
  returns, it is called out below.
- **Data.** The 45 days of history are generated deterministically from a seed, so the
  consistency card reads 26–28/30 against the design's 26/30, and Settings shows the locked
  defaults (dayEnd 00:00, reminders 21:30/21:00) rather than the prototype's sample values.

| Row | Verdict |
|---|---|
| `today_locked-adhoc` | **Match.** Header, PlanStatus pill, 62% / 5-of-8, MIT card, "Các việc khác", dashed "Phát sinh" group, tags and postpone nudge all line up pixel-for-pixel in both themes. The design also wraps the ProgressBar under the heading at 1280px, as we do. Design extra: the ritual banner (its capture is 20:45; ours is 14:10). Mobile matches the design's mobile capture (compact header, 30px H1, full-width progress, toggle wrapped under the input). |
| `today_window-open` | **Match, different data.** The green "Đang mở · khóa lúc 10:00" pill and the "còn 1 giờ 45 phút" hint are identical. The design's `open` scenario strips adhoc tasks and resets everything to todo; the task file pins seed `demo`, so ours keeps the two adhoc rows and the done ticks. Layout identical. |
| `today_empty` | **Match.** EmptyState card, open-window pill, no ProgressBar (nothing planned) — same as the design. |
| `today_missed-day` | **Match.** `accent-soft` missed-day banner above the input, EmptyState below, no ProgressBar. Same as the design. |
| `today_complete-100` | **Match.** 100%, the `success-soft` complete banner with its two decorative circles, every row ticked. Design extra: the ritual banner (21:30 capture vs our 14:10). |
| `today_new-user` | **Match.** Welcome banner with the three numbered `paper` cards, "Thiết lập trong 1 phút" + hint, EmptyState, 0/30 consistency. Same as the design. |
| `today_after-midnight` | **Match.** Kicker "VẪN LÀ HÔM NAY · 01:00 SÁNG CHỦ NHẬT", H1 still Saturday, the `Ngày của bạn kết thúc lúc 3:00` pill. Like the design, the plan reminder — not the ritual banner — wins this slot, which is what `selectBanners` computes too. |
| `today_plan-reminder` | **Match.** Bell avatar, "Chưa có plan cho Chủ Nhật, 4/10", body with the lock time and weekday, "Để sau" + "Lập plan ngày mai". |
| `today_matrix` | **Match.** 2×2 `auto-fit minmax(260px)` grid, per-quadrant counts, the q2 "Vùng của tiến bộ dài hạn" tag, MIT and "phát sinh" chip labels, desktop drag hint. Mobile collapses to one column with the tap hint *(no counterpart)*. |
| `ritual_step1-review` | **Match.** Top bar + "Để sau (Esc)", three-step stepper with step 1 in accent, heading and lead-in, green done rows with chips hidden, decision chips, the ≥3-postpone nudge, sticky footer with "Còn 4 việc cần quyết định" and the dimmed gate. Mobile matches the design's mobile capture, with no bottom tabs. |
| `settings_default` | **Match after one fix.** The reminders switch was initially on its own row; it now sits on the section title row as the design has it. Remaining differences are data (defaults vs the prototype's sample values) and one component-level choice outside this phase's remit: `DayEndChips` labels 00:00 as "Nửa đêm", while the design's Settings capture shows the raw "00:00" (onboarding step 3 does use "Nửa đêm"). |
| `onboarding_step1` | **Match after two fixes.** The screen now renders inside the same rounded paper sheet as the rest of the app, and the two decorative circles sit *behind* the content (`isolate` + `-z-10`) instead of washing out the skip button. Dots, step kicker, 38px heading, the two habit cards with their accent ring, and the "Tiếp tục" footer button all match. |

### Biggest visual differences, ranked
1. **The ritual banner is absent from `today_locked-adhoc` and `today_complete-100`.** Purely a
   clock difference: those rows are pinned to 14:10, and `selectBanners` only shows the ritual
   banner from 18:00. `ritual_step1-review` (21:30) and `today_after-midnight` do show the
   evening-time behaviour, so the banner itself is verified elsewhere.
2. **Seeded history vs the design's history.** Consistency reads 26–28/30 depending on the
   seed, and the `demo` seed keeps adhoc/done rows in the `window-open` row where the design's
   scenario had stripped them.
3. **`DayEndChips` says "Nửa đêm" on Settings.** The design's Settings capture shows "00:00".
   Changing it means touching a Phase 4 component outside the two allowed changes — left as is
   and flagged here.
4. **`RitualSummary`'s kicker spells the date long** ("Đã khép lại Thứ Bảy, 3 tháng 10") where
   the design writes "Đã khép lại Thứ Bảy, 3/10". The component calls `formatDateLong`
   internally; the screens that *can* choose (plan-reminder title, ritual meta line, step-3
   heading) now use the new `formatWeekdayDayMonth` and match the design.

## New findings
- **`todayView` cannot be a zustand selector.** It derives a fresh object on every call, so
  `useStore(s => todayView(s, clock))` hands `useSyncExternalStore` a new snapshot each render.
  The screens subscribe to the whole state (`useStore()`) and derive with `useMemo`.
- **`aria-disabled` is not `disabled` to Playwright.** `RitualFooter` deliberately keeps a
  blocked click reachable so the screen can toast the reason; the e2e spec needs
  `click({ force: true })` to deliver it.
- **dnd-kit keyboard dragging moves 25px per arrow key**, which is far too fine-grained for a
  260px quadrant. The matrix e2e spec uses a real pointer drag (down → 12px nudge past the 4px
  activation constraint → move → up) instead.
- **`useSearchParams` forces a Suspense boundary.** `TodayScreen` reads `?focus=input`, so
  `app/(app)/today/page.tsx` wraps it in `<Suspense>`. `DevParams` deliberately reads
  `window.location.search` directly to avoid imposing the same on every page that mounts it.
- **Vitest needed `maxWorkers: 4` and `testTimeout: 15_000`.** 37 isolated jsdom workers
  starting at once made the two heaviest `user-event` suites (matrix sheet, ritual playground)
  flake on the 5s default. Capping concurrency keeps isolation and made three consecutive runs
  green.
- **An absolutely positioned decorative sibling paints *above* static content.** Onboarding's
  circles needed `isolate` on the parent and `-z-10` on themselves.

## Decisions made
- **`matrix interaction`** is `isDesktop === false ? 'tap' : 'drag'` (the Phase 3 playground's
  form) rather than the task file's `useIsDesktop() ? 'drag' : 'tap'`. `useIsDesktop()` is
  `undefined` until the first layout effect, so the literal form would render the mobile branch
  for one frame on every desktop load; this way the desktop branch is the one that flickers, on
  mobile only.
- **Settings only offers valid option values.** The window-start select is filtered by habit
  (evening 17–20, morning 05–06) because `updateSettings` refuses anything `validateSettings`
  rejects; the prototype showed all six regardless. Lock times are the whole hours 07:00–14:00.
- **The Settings theme control reads next-themes, not `settings.theme`.** The `T` shortcut
  changes the live theme without touching settings, so showing the stored value would lie.
  Choosing a theme writes both.
- **The ritual summary is rebuilt from current state**, with `lastClose` supplying the dayLog
  when it is fresh. That is what makes "open `/ritual` on an already-closed day" show the
  summary without a `lastClose` in memory.
- **History seeds contain no `moved` tasks.** A move creates a copy on another day, which would
  have given a deliberately plan-less day a plan. Moving is exercised by the anchor day and the
  ritual flow instead.
- **Two copy keys were added** (Minor): `common.saveError`, `common.loadError`,
  `date.weekdayDayMonth` and `onboarding.step3.example.05:00` (the chip range runs to 05:00 but
  the prototype only wrote five sentences).

## Open issues
- `docs/plan.md` §3 still carries the pre-renumbering phase list — logged in
  `memory/discoveries.md`, for the user/planning session to reconcile.
- `DayEndChips`' "Nửa đêm" label on Settings (see above) — a one-prop change whenever a phase
  is allowed to touch it.
- `AppShell`'s `T` shortcut toggles the theme without persisting it to settings. Harmless, but
  it means the live theme and `settings.theme` can disagree until Settings is used.
- The seeds carry no `task_events`, so the event log is empty for historical days. Phase 6/8
  will need events for the plan-timing and insight queries; either the seeds grow events or
  those stats are derived from `tasks.created_at`, as `docs/plan.md` already suggests.

## Input for the next phase

### Phase 6 (stats & history)
- `consistencyView(state, today)` already returns the 30 `DaySummary`s; `buildDaySummaries`
  will give any window. Nothing computes averages, weekday breakdowns or insights yet.
- `ritualReviewTasks`/`todayView` show the selector style to follow: pure, state-in, shape-out,
  every rule delegated to `src/domain`.
- History's DayDetail already handles `energy === 0`; `planTiming` has to come from
  `classifyPlanTiming(min(created_at of planned tasks), date, settings)`.
- `?seed=demo` gives ~45 days of closed days with dayLogs, which is enough to render both
  Journey and History; `?seed=new` gives the "not enough data" state.

### Phase 7 — what a Supabase `Repository` must honour
1. **`commit(m, dayLog?)` is atomic.** Upserts, deletes, the appended events and the dayLog
   either all land or none do. `LocalRepository` only approximates this (it builds everything
   in memory, then writes key by key); Postgres must do it in **one transaction or one RPC**.
   The store reverts its optimistic state on a rejected promise, so a partial write is the one
   failure mode it cannot recover from.
2. **`commit` must be idempotent per task id.** Upserts are whole `Task` rows keyed by `id` —
   `insert … on conflict (id) do update`. Deletes are by id and must ignore unknown ids (the
   contract tests this).
3. **Event volume.** One tick is 1 event; a move is 2 (`task_moved` + `task_created` for the
   copy); a close is 1 per decided task, plus 1 per new tomorrow task, plus one `day_closed` —
   roughly 10–20 events per active day, so a few thousand rows per user-year. Append-only,
   never updated, never deleted; `task_events.task_id` is nullable (only `day_closed` uses it).
4. **Ordering.** Events inside one mutation are already in causal order and must be inserted in
   that order; `occurredAt` is `ctx.now` and is identical for every event of one mutation, so it
   cannot be the sort key on its own — keep the array order (an identity/sequence column).
5. **`firstPlanDate()` is `min(plan_date) where adhoc = false`** across all time, including
   `moved` and `dropped` tasks. It is called once per `init()` — index `(user_id, adhoc, plan_date)`.
6. **`loadTasks`/`loadDayLogs` take an inclusive `DateRange` on `planDate`.** `init()` asks for
   `[today-190, today+30]`; `ensureLoaded` then asks only for the gap ranges, never the whole
   window again.
7. **`loadSettings()` must return `null`** — not defaults — when the user has never saved. The
   store uses that to decide `onboarded`, and `selectBanners` uses `firstPlanDate === null` for
   the welcome banner.
8. **`reset()` stays dev/test-only.** `seed()` is not part of the interface; do not add it.
9. Swapping the implementation is **one line** in `src/data/index.ts`. The contract suite in
   `src/data/__tests__/repository.contract.ts` should be run against the Supabase repository
   too — that is why it is a plain function taking a `create()`.
10. The ritual draft stays in localStorage (`bed:v1:ritual:<date>`) and the two Today UI prefs
    stay in `bed:v1:ui`; neither belongs in Postgres.
