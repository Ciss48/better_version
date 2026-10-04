# State

**Last updated:** 2026-10-04 — Phase 4 complete, committed as `phase-04: components rest`

## Where things stand
Current phase: 5 — not started, **task file not written yet**.
Phases 1–4 are done. The app has its scaffold, tokens, fonts, `t()`, AppShell and placeholder
routes (1); a fully-tested pure `src/domain/` (2); the Today component library (3); and now
every remaining MVP component — ritual, stats, history, settings, onboarding — plus a
`ClockProvider` so nothing guesses "now" (4). All 41 components are visible at
`/dev/components` (32 sections). Still no real screens, no zustand store, no Repository, no
persistence, no Supabase.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
- **Phase 2 — Domain logic** (`memory/phase_02_report.md`).
- **Phase 3 — Components A: core & Today** (`memory/phase_03_report.md`).
- **Phase 4 — Components B: ritual, stats, history, settings, onboarding**
  (`memory/phase_04_report.md`). 21 new components in `src/components/`
  (ritual · stats · history · settings · onboarding · common) plus 3 new primitives in
  `src/components/ui/` (select · switch · radio-group), `src/lib/clock.tsx`,
  `src/test/render.tsx`, 17 new gallery sections and the ritual playground.
  `pnpm lint`, `pnpm typecheck`, `pnpm test` (33 files, **233 tests**) and `pnpm build` all
  exit 0; `pnpm test:coverage` → **100% lines** for `src/domain/**` (domain untouched).
  `pnpm shots` writes exactly **128 PNGs** to `artifacts/shots/` (git-ignored).

## Most important findings so far
- Design handoff is at **`design/handoff/`** (not `design/` as CLAUDE.md's table says) and is
  read-only. The prototype uses a custom Claude Design format, not React — reference only.
- Business-rule inconsistencies in the handoff were resolved in `docs/plan.md` §2
  (notably: default dayEnd is 00:00; breakpoint uses viewport `app:` variant).
- Supabase project exists; keys are in `.env.local` (git-ignored). Claude Code has Supabase
  MCP access, but Supabase must not be touched before Phase 5.
- **Phase 1, four Moderate discoveries, all resolved** — see `memory/discoveries.md`:
  1. The `shadcn` CLI overwrote `design/handoff/tokens.css`. Always check
     `components.json → tailwind.css === "src/app/globals.css"` before running it, and diff
     `design/handoff/tokens.css` against `src/styles/tokens.css` afterwards.
  2. `next dev` appended an agent-rules block to `CLAUDE.md`; disabled via
     `agentRules: false` in `next.config.ts`.
  3. shadcn v4 uses **Base UI** (`@base-ui/react`) and the standalone **`cn`** package.
  4. `cn()` dropped token size classes. `src/lib/utils.ts` registers the project's `text-*`
     and `rounded-*` scales via `createCn`. Register any new token scale there too.
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — use `bg-hover` for hover tints. The shadcn CLI reintroduces the clash
  in every component it generates; strip it every time.
- **The shadcn CLI works again (Phase 4, Moderate, logged)** — Phase 3's "registry
  unreachable" no longer holds. Use it, but **rewrite what it generates** to token classes:
  its output is shadcn-styled (wrong radii, wrong sizes, `cn` from the wrong module).
- **Base UI is not Radix.** Popover/Tooltip/Select are `Root → Trigger → Portal → Positioner →
  Popup` (placement props on `Positioner`, there is no `Content`); `ToggleGroup`'s value is a
  `string[]` with `multiple={false}`; composition is `render={<El/>}`, not `asChild`; Base UI
  has its own swipeable `Drawer`, so no vaul and no Radix are in the tree. **`RadioGroup`
  never reports a click on the already-selected item** — clear-on-reclick needs an explicit
  `onClick`. The authoritative API docs ship inside the package at
  `node_modules/@base-ui/react/docs/react/components/*.md`.
- **Time is injected through `useClock()`** (`src/lib/clock.tsx` → `{ now, today, settings }`).
  `formatClockLocal` is gone. Any screen rendering `TaskItem`, `DatePicker`, `ReviewRow`,
  `Heatmap` or `CalendarMonth` must sit under a `ClockProvider`; tests use
  `renderWithClock` from `src/test/render.tsx` (it passes the provider as RTL's `wrapper`, so
  `rerender` keeps it).
- **dnd-kit needs an explicit `id` on `DndContext`** (`useId()`), otherwise its
  `aria-describedby` counter desyncs between SSR and hydration.
- Components are presentational and prop-only; they may import only types and the read-only
  domain helpers (`parseQuickAdd`, `dateChipOptions`, `quadrantOf`, `flagsForQuadrant`,
  `addDays`, `isoWeekday`, `completion`, `taskWeight`). **Mutating domain functions live in
  `src/app/dev/` and tests only** — Phase 5's screens become the next place they are allowed.
- **No stats are computed anywhere yet.** StatCard / Heatmap / WeekdayChart / InsightCard /
  CalendarMonth take ready numbers and sentences; Phase 5 owns deriving them.
- `@date-fns/tz`'s `TZDate.toISOString()` returns an offset string (`…+07:00`), not `Z`.
  Always convert to a plain `Date` before handing it on.
- Date chips are not a fixed set: a Monday and a Saturday only yield three options.
- `closeDay` requires `otherTargets` (a key, possibly `[]`, for every distinct non-tomorrow
  move date) and `restoreTask` requires the full `related` list — see
  `src/app/dev/components/RitualPlayground.tsx` for a working example of both.
- Toolchain: node 24.11.1, **pnpm 10.34.6** installed via `npm i -g pnpm@10`.

## Next action
Phase 05 task file to be written by the planning session — bring `memory/STATE.md`,
`memory/phase_04_report.md` and `memory/discoveries.md` back to it.
