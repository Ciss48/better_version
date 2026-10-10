# Plan: Better Every Day

## 1. Overview
**Goal.** A web app that measures the gap between what a person *intended* to do and what
they *actually* did, to build daily planning discipline ("tiến bộ 1% mỗi ngày").
Interface language: Vietnamese. Owner/first user: Ciss; built multi-user from day one.

**Core loop.** Write the plan for day D inside a planning window → tick tasks during D →
evening ritual (review, decide on unfinished tasks, reflect, plan D+1) → metrics.

**In scope (MVP).** Today (list + Eisenhower matrix), Evening ritual (stepper), Journey
(stats), History, Settings, Onboarding, mobile "More" menu, auth, persistence, deploy.

**Out of scope (project-level).**
- Phase 2 product features: Goals, Weekly review, `@tên-mục-tiêu` linking (placeholder
  screens only, exactly as designed).
- Push notifications / service-worker reminders (in-app banners only in MVP).
- Native apps, offline sync, multi-language, team/shared plans, data export, payments.
- Closing a past day retroactively (see Risks R3).

## 2. High-level architecture

```
Browser (Next.js App Router, React, Tailwind v4 + shadcn/ui)
  ├─ src/app/            routes: (app)/today|ritual|stats|history|settings|goals|weekly|more, onboarding, auth
  ├─ src/components/     presentational components (props only, from design/handoff/components.md)
  ├─ src/features/       screen containers: wire store → components
  ├─ src/domain/         PURE business logic + tests (no React, no I/O, time injected)
  ├─ src/data/           Repository interface + implementations (memory/localStorage → Supabase)
  └─ src/lib/            copy (t()), utils
          │
          ▼  @supabase/ssr (anon key + user session, RLS)
Supabase Postgres
  ├─ user_settings, tasks, day_logs        (current state)
  ├─ task_events                           (append-only event log)
  └─ SQL analytics views (Phase 9, post-MVP, parity-checked against src/stats)
Deploy: Vercel (Phase 8)
```

**Locked stack and why.**
| Choice | Why |
|---|---|
| Next.js App Router + TS strict | Matches handoff (React + TS); Vercel-native deploy; server routes for auth callback |
| Tailwind v4 + shadcn/ui (Base UI flavour, CLI v4 default) | Handoff tokens are written for `@theme inline` + shadcn aliases; Base UI is shadcn's current default (Phase 1 finding) |
| pnpm, Vitest | Fast; Vitest for pure domain tests (most of the risk lives there) |
| date-fns v4 + @date-fns/tz | Timezone-correct logical-day math; small |
| next-themes (`attribute="class"`) | tokens.css switches on `.dark` |
| zustand (from Phase 4) | Minimal client store for screen state |
| dnd-kit (Phase 3) | Matrix drag on desktop with keyboard support |
| Supabase (Postgres + Auth + RLS) | Hosted Postgres; SQL-first stats suit the owner's DE background; MCP access for Claude Code |
| Vercel | Owner already deploys there |

**Key design decisions (locked).**
1. **Domain-first.** All rules (window, lock, logical day, weighted %, moving, closing the
   day, banner selection) live in `src/domain/` as pure functions with unit tests, built
   *before* any screen. UI and data layers call them; they never re-implement them.
2. **Repository seam.** Screens talk to a `Repository` interface. Phase 4 ships an
   in-memory/localStorage implementation so the whole app is clickable without a backend;
   Phase 7 swaps in Supabase without touching screens.
3. **Event log.** Every mutating domain function returns the `TaskEvent`s it implies; the
   repository persists state + events together.
4b. **Stats are computed client-side in TypeScript** (`src/stats/`, pure + tested, Phase 6)
   from tasks + day logs. One user's data is a few thousand rows at most, so this is cheap
   and keeps one source of truth for the MVP. Phase 9 (post-MVP) adds SQL analytics views on Supabase
   (portfolio value, future dashboards) and checks them for parity against `src/stats/`.
4. **Moving a task creates a new task** on the target date (`originTaskId` → original,
   `postponedCount + 1`, flags and MIT kept); the original becomes `status='moved'`,
   `movedTo=<date>`. History therefore shows both sides truthfully.
5. **Clock context.** Components that need "now", "today" or the user's timezone read them
   from `ClockProvider` / `useClock()` (`src/lib/clock.tsx`), fed by the screen (real clock,
   or the dev `?now=` override). Components never construct dates from the system clock.
6. **Ritual is a draft until "Hoàn tất & đóng ngày".** Draft lives client-side
   (localStorage, keyed by user + date); closing applies everything atomically.
7. **Breakpoint:** viewport `app:` variant (≥720px). The handoff's "container" wording only
   mattered for the design canvas; in the real app the container is the viewport.
8. **Fonts** via `next/font/google`: Fraunces (SOFT 100, weight 600) for headings, Be
   Vietnam Pro for UI, Caprasimo for numerals/logo only.

**Business rules (locked; resolves inconsistencies found in the handoff).**
| Rule | Value |
|---|---|
| Planning window, evening habit | opens 18:00 on D-1 (options 17–20h), locks at 10:00 on D |
| Planning window, morning habit | opens 06:00 on D (options 05–06h), locks at 10:00 on D |
| Lock time options | 07:00–14:00, default 10:00 |
| After lock | new tasks are `adhoc=true` ("Phát sinh"), excluded from % |
| Day end | options 00:00–05:00; **default 00:00** (onboarding default wins; the 03:00 in screenshots is an example). Between 00:00 and dayEnd the app still shows the previous day |
| Weighted % | weight S1 · M2 (null→M) · L3, ×2 if MIT; `pct = Σw(done)/Σw(planned, status≠dropped)`; adhoc excluded; moved = not done; rounded to integer |
| MIT limit | max 3 per day among tasks with status todo/done |
| Postpone nudge | `postponedCount ≥ 3` |
| Closing the day | every todo task (incl. adhoc) needs a decision (move date / drop) |
| MIT limit when moving/restoring | enforced on **every** target day: `closeDay` receives the existing tasks of each distinct move date; `restoreTask` re-checks the limit on the task's own day. Over-limit → the moved/restored task becomes a normal task + `mitLimit` notice |
| Consistency | days with a plan in the last 30 logical days (never resets; no streak) |
| Reminders (in-app) | `remindPlan` (evening 21:30 / morning 07:00) drives the planReminder banner; `remindRitual` (21:00) is stored but only used by future push notifications; the ritual banner shows from 18:00 or during late night |
| Timezone | per user, IANA, default `Asia/Ho_Chi_Minh` |
| Adding tasks before the window opens | allowed and counted as planned (the window start only drives banners/reminders and plan-timing insights) |
| Ritual state | ticking done/undone is applied immediately (it is a fact); decisions, reflection and new tomorrow tasks stay a draft until "Hoàn tất & đóng ngày" |
| Plan timing (for insights) | first planned task created before D's dayEnd boundary → "evening"; before lock → "morning"; after → "late" |

**Data model (sketch — finalised in the Phase 7 task file; TS types are locked in Phase 2).**
- Final schema: see `tasks/phase_07_supabase.md` §2 (supersedes this sketch).
- `user_settings(user_id pk, timezone, habit, window_start_hour, window_start_offset, lock_time, day_end, remind_on, remind_plan, remind_ritual, theme, onboarded_at, created_at, updated_at)`
- `tasks(id uuid pk, user_id, plan_date date, title, important, urgent, mit, size, status, postponed_count, adhoc, position, moved_to date, origin_task_id, created_at, completed_at, updated_at)`
- `day_logs(user_id, plan_date, closed_at, energy, good, improve; pk(user_id, plan_date))` — "first planned at" is derived as `min(tasks.created_at)` of planned tasks, not stored
- `task_events(id, user_id, task_id null, plan_date, type, payload jsonb, occurred_at)` — append-only

## 3. Phase list

### Phase 1: Scaffold & design system — [DONE]
Next.js app at repo root with tokens, fonts, theme switching, typed copy helper `t()`,
route skeleton, full AppShell (sidebar/bottom tabs), `/dev/tokens` page, Vitest, git.
Comes first because every later phase builds on this frame.

### Phase 2: Domain logic — [DONE]
Pure TypeScript module `src/domain/` implementing every business rule above with
exhaustive unit tests (timezone, late night, lock, weights, quick-add parser, date chips,
move/drop/restore, close-day, banners, consistency). Highest-risk logic, verified in
isolation before any UI depends on it.

### Phase 3: Components A — core & Today — [DONE]
Two small domain amendments (MIT limit on every move target; restore re-checks the
limit), `src/lib/format.ts`, and the presentational components for the Today screen:
Banner, PlanStatus, ProgressBar, Tag, EmptyState, Segmented/ViewToggle, TaskInput,
TaskItem, MITSection, TaskGroup, Matrix (board, quadrant, bottom sheet), DatePickerChips,
DatePicker, Toast. `/dev/components` gallery + a Today playground driven by the domain,
component tests, Playwright screenshot script.

### Phase 4: Components B — ritual, stats, history, settings, onboarding — [DONE]
Stepper, ReviewRow, RitualFooter, ReflectionForm, TomorrowPlanList, RitualSummary,
StatCard, Heatmap, WeekdayChart, InsightCard, CalendarMonth, DayDetail, Settings
controls (TimeSelect, Switch, PlanWindowTimeline, SettingsSection), Onboarding pieces,
Phase2Notice — all in the gallery with every state.

### Phase 5: App core on a local repository — [DONE]
Repository + LocalRepository, zustand store, clock source with dev `?now=`/`?seed=`,
real Today, Ritual, Onboarding, Settings, More screens; 9 e2e flows, 48 screen shots.

### Phase 6: Stats & History — [DONE]
Pure `src/stats/` module (averages + deltas, consistency, Q2/adhoc/moved shares, weekday
averages, four insights with thresholds) with tests; Journey and History screens;
Goals/Weekly Phase-2 placeholder pages; small leftovers from Phase 5; more shots and e2e.
**After this phase the app is feature-complete for the MVP (on localStorage).**

### Phase 7: Supabase persistence & auth — [HAS DETAILED TASK FILE]
Schema (4 tables, RLS, atomic `commit_mutation` RPC), magic-link auth with `@supabase/ssr`
(login page, callback, route protection, sign-out), `SupabaseRepository` implementing the
Phase 5 interface (paginated reads), backend switch `NEXT_PUBLIC_DATA_BACKEND`
(`supabase` for the real app, `local` for e2e/seeds), the repository contract suite run
against Supabase with a throwaway test user, two cosmetic leftovers from Phase 6.
Local browser data is **not** migrated to the account (test data only).

### Phase 8: Ship — [SKETCH]
GitHub remote, Vercel deploy with env vars, Supabase auth redirect URLs, PWA manifest +
icons, production smoke test on mobile. **End of MVP.**

### Phase 9 (post-MVP, optional): SQL analytics — [SKETCH]
Views/RPC on Supabase mirroring `src/stats/`, with a parity test against the TS
implementation on seeded data. Portfolio value; not needed for the app to work.

## 4. Risks / assumptions to validate early
- **R1 Timezone & late-night math** (dayEnd, window crossing midnight, multi-user).
  Mitigation: Phase 2 tests with fixed instants.
- **R2 Fraunces Vietnamese glyphs / SOFT axis via next/font.** Validate in Phase 1.
- **R3 Ritual never done before day end.** MVP: the unfinished day stays as-is (todo tasks
  count as not done, no auto-carry). A "close yesterday" flow is a candidate post-MVP
  feature — revisit after real usage.
- **R4 Evening-habit users can only plan tomorrow via ritual step 3** (by design). Revisit
  after real usage.
- **R5 shadcn init overwriting globals.css colour variables** that tokens.css owns.
  Phase 1 handles explicitly.
- **R6 Claude Code's network reaches only registry.npmjs.org at times** (Phase 3; Phase 4 found ui.shadcn.com reachable again — intermittent). The
  Supabase MCP has worked, but Phase 7 must verify the app itself can reach `*.supabase.co`
  from `pnpm dev`, and Phase 8 (GitHub push, Vercel) may need the user to run those steps
  or widen Claude Code's network allowlist. Check before writing those task files.

## 5. Plan change log
| Date | Change | Reason | Source |
|------|--------|--------|--------|
| 2026-10-04 | Initial plan | — | — |
| 2026-10-04 | Design handoff path is `design/handoff/`; shadcn is the Base UI flavour | Actual repo layout / shadcn CLI v4 default | Phase 1 report + discoveries |
| 2026-10-04 | MIT limit enforced on every move target (`CloseDayInput.otherTargets`) and on restore | Over-limit days were possible | Phase 2 discoveries (closeDay MIT), report finding 4 |
| 2026-10-04 | Component work split into Phase 3 (core & Today) and Phase 4 (rest); later phases renumbered 5–8 | ~35 components is too much for one reliable session | Planning |
| 2026-10-04 | Added ClockProvider/useClock decision; risk R6 (network allowlist) | `formatClockLocal` used DEFAULT_SETTINGS; DatePicker used the real today; registry unreachable | Phase 3 report |
| 2026-10-04 | Screens split into Phase 5 (core loop) and Phase 6 (stats & history); stats computed in TS (`src/stats/`), SQL analytics becomes Phase 8 with parity check; Supabase → 7, ship → 9 | Stats had no home before Supabase; keep one source of truth; phase size | Phase 4 report |
| 2026-10-04 | Ship moved before SQL analytics: 7 Supabase, 8 Ship (end of MVP), 9 SQL analytics (optional) | Reach a usable deployed product sooner | Planning, after Phase 5 |
| 2026-10-04 | Phase 7 detailed: atomic RPC commit, backend switch env, e2e stays on local backend, no local→cloud data migration | Phase 5/6 reports (atomicity, R6 cleared) | Planning |
