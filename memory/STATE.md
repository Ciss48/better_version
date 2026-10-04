# State

**Last updated:** 2026-10-04 — Phase 5 complete, committed as `phase-05: app core`

## Where things stand
Current phase: 6 — not started, **task file not written yet**.
Phases 1–5 are done. The app is now a **working, clickable product on localStorage**: a user can
onboard (or skip), plan, tick, move/drop/restore, use the matrix, run the whole evening ritual
and close the day, change settings — and everything survives a reload. Still no Supabase, no
auth, no stats module, and `/stats`, `/history`, `/goals`, `/weekly` are placeholders.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
- **Phase 2 — Domain logic** (`memory/phase_02_report.md`).
- **Phase 3 — Components A: core & Today** (`memory/phase_03_report.md`).
- **Phase 4 — Components B: ritual, stats, history, settings, onboarding**
  (`memory/phase_04_report.md`).
- **Phase 5 — App core on a local repository** (`memory/phase_05_report.md`).
  `src/data/` (Repository + Memory/Local implementations + a shared contract suite),
  `src/state/` (clock source, zustand store, selectors, ritual draft, bridges),
  `src/dev/` (6 seeds + `?seed=`/`?now=` handling), `src/features/` (Today, Ritual, Onboarding,
  Settings, AppShellLive, ScreenState), `scripts/shots-screens.ts`, `playwright.config.ts` and
  9 e2e specs. `pnpm lint`, `pnpm typecheck`, `pnpm test` (37 files, **363 tests**), `pnpm build`
  and `pnpm e2e` (**9/9**) all exit 0; `pnpm test:coverage` → **100% lines** for `src/domain/**`
  (domain untouched). `pnpm shots` → 128 PNGs, `pnpm shots:screens` → **48 PNGs**.

## Most important findings so far
- Design handoff is at **`design/handoff/`** and is read-only. The prototype uses a custom
  Claude Design format, not React — reference only.
- **`docs/plan.md` §3 still has the pre-renumbering phase list** (it calls Supabase "Phase 6").
  The Phase 5 task file's numbering is the one in force: **6 = stats & history, 7 = Supabase,
  8 = SQL analytics, 9 = ship**, and the code says so (`src/data/repository.ts`). Logged in
  `memory/discoveries.md` for the user to reconcile.
- **The store is the only place outside `src/app/dev/**` and tests that may call a mutating
  domain function.** Screens report intent; `src/state/store.ts` builds `Ctx`, calls the domain,
  applies optimistically, commits, and reverts on failure.
- **Time flows one way:** `src/state/clock-source.ts` → `ClockBridge` → `useClock()` → every
  component. `getNow()` is the only wall-clock read in the app. `?now=<ISO>` freezes it in
  development (sessionStorage); `?now=off` clears it.
- **`todayView` and friends cannot be zustand selectors** — they derive fresh objects. Screens
  subscribe with `useStore()` (no selector) and derive with `useMemo`.
- **Dev-only code must be dynamically imported behind `NODE_ENV`, and dev-only *routes* must be
  `page.dev.tsx`** (`next.config.ts` → `pageExtensions`). That is what keeps seeds, fixtures and
  the `/dev` gallery out of a production build — verified by grepping `.next/static`.
- **Screens expose `data-ready="true"`** on their root once the store is ready; the screenshot
  script and every e2e spec wait on that instead of a timeout.
- **Phase 7 must make `commit()` genuinely atomic** (one transaction/RPC): the store's rollback
  cannot recover from a partial write. Full contract notes in `memory/phase_05_report.md`
  ("Input for the next phase").
- **Phase 1, four Moderate discoveries, all resolved** — see `memory/discoveries.md`. Plus the
  shadcn CLI notes (Phase 3/4) and the production-build/dev-routes finding (Phase 5).
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — use `bg-hover` for hover tints; strip the clash from every generated
  component.
- **Base UI is not Radix.** `Root → Trigger → Portal → Positioner → Popup`; `ToggleGroup`'s
  value is a `string[]`; composition is `render={<El/>}`; `RadioGroup` never reports a click on
  the already-selected item. Docs ship at `node_modules/@base-ui/react/docs/`.
- **`aria-disabled` is not `disabled`** — Playwright needs `click({ force: true })` to deliver a
  blocked click (the ritual gate relies on receiving it).
- **dnd-kit** needs an explicit `id` on `DndContext`, and its keyboard drag moves 25px per key —
  e2e uses a real pointer drag instead.
- `@date-fns/tz`'s `TZDate.toISOString()` returns an offset string; convert to a plain `Date`.
- Vitest runs with `maxWorkers: 4` and `testTimeout: 15_000`; the defaults made the two heaviest
  jsdom suites flake.
- Toolchain: node 24.11.1, **pnpm 10.34.6**, zustand 5.

## Next action
Phase 06 task file to be written by the planning session — bring `memory/STATE.md`,
`memory/phase_05_report.md` and `memory/discoveries.md` back to it.
