# State

**Last updated:** 2026-10-10 — Phase 7 complete (Supabase persistence & auth)

## Where things stand
Current phase: 8 — ship. Status: not started, task file not written yet.
Phases 1–7 are done. **The app runs on Supabase**: magic-link auth gates every route via
`src/proxy.ts`, all user data (tasks, day logs, task events, settings) lives in Postgres under
RLS, mutations commit atomically through one RPC, and `NEXT_PUBLIC_DATA_BACKEND=local` still
gives the full localStorage experience for dev/e2e/screenshots. Every screen in
`design/handoff/screens.md` exists and runs on real data. A user can sign in, onboard, plan,
tick, move / drop / restore, use the matrix, run the whole evening ritual and close the day,
read the Journey screen (six cards, 26-week heat map, weekday chart, four insights), walk back
through History month by month, and change settings — and all of it survives a reload and
persists server-side. Goals and Weekly are static Phase 2 previews. See
`memory/phase_07_report.md` for the full Phase 7 account.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
- **Phase 2 — Domain logic** (`memory/phase_02_report.md`).
- **Phase 3 — Components A: core & Today** (`memory/phase_03_report.md`).
- **Phase 4 — Components B: ritual, stats, history, settings, onboarding**
  (`memory/phase_04_report.md`).
- **Phase 5 — App core on a local repository** (`memory/phase_05_report.md`).
- **Phase 6 — Stats & history** (`memory/phase_06_report.md`).
- **Phase 7 — Supabase persistence & auth** (`memory/phase_07_report.md`). Magic-link auth,
  4 Postgres tables under RLS, atomic commit RPC, `SupabaseRepository`, `DATA_BACKEND` switch.
  `pnpm lint/typecheck/test` (446 tests), `pnpm build`, `pnpm e2e` (16/16), `pnpm test:supabase`
  (23/23) all exit 0. RLS confirmed on all 4 tables; one cosmetic advisor warning (leaked-password
  protection, dashboard toggle, not RLS).
  `src/stats/` (pure: `computeStats`, `monthSummary`, `planTimingOf` — no React/zustand/Next),
  `statsView` + `historyDay` selectors, the store action `ensureMonthLoaded`, the Journey,
  History, Goals and Weekly screens, `src/content/phase2-samples.vi.json`, the three allowed
  Phase 5 component fixes, a rewritten `demo` seed plus a new `sparse` seed, and
  `e2e/global-setup.ts`.
  `pnpm lint`, `pnpm typecheck`, `pnpm test` (39 files, **423 tests**), `pnpm build` and
  `pnpm e2e` (**14/14**, green from a deleted `.next`) all exit 0; `pnpm test:coverage` →
  **100% lines** for both `src/domain/**` and `src/stats/**`. `pnpm shots` → 128 PNGs,
  `pnpm shots:screens` → **72 PNGs**.

## Most important findings so far
- Design handoff is at **`design/handoff/`** and is read-only. The prototype uses a custom
  Claude Design format, not React — reference only.
- **Where a task file and a handoff screenshot disagree on *appearance*, the screenshot wins**
  (CLAUDE.md names it visual truth) and the deviation is logged in `memory/discoveries.md`.
  Where they disagree on a *rule*, the task file wins. Two Phase 6 cases, both logged.
- **Phase numbering: 6 stats & history, 7 Supabase, 8 ship (end of MVP), 9 SQL analytics
  (optional).** `docs/plan.md` is now reconciled.
- **`src/stats/` is pure and knows nothing about storage.** It takes `{tasks, dayLogs, today,
  settings}` and returns `StatsResult`. Every rule it needs comes from `src/domain`. If stats ever
  move to SQL, this module is the executable spec and its 49 tests are the comparison harness.
- **"Completed days" are the days strictly before today** everywhere in stats — today only counts
  for the consistency score and the heat map. Too little data shows "—", never a zero.
- **The store is the only place outside `src/app/dev/**` and tests that may call a mutating
  domain function.** Screens report intent; `src/state/store.ts` builds `Ctx`, calls the domain,
  applies optimistically, commits, and reverts on failure.
- **Phase 7 must make `commit()` genuinely atomic** (one transaction/RPC): the store's rollback
  cannot recover from a partial write, and `closeDay` writes tasks, events *and* a day log.
  Full contract notes in `memory/phase_05_report.md` ("Input for the next phase").
- **Time flows one way:** `src/state/clock-source.ts` → `ClockBridge` → `useClock()` → every
  component. `getNow()` is the only wall-clock read in the app. `?now=<ISO>` freezes it in
  development; `?now=off` clears it.
- **`todayView`, `statsView` and friends cannot be zustand selectors** — they derive fresh
  objects. Screens subscribe with `useStore()` (no selector) and derive with `useMemo`.
- **History keeps its state in the URL only** (`?date=`, `?month=`). eslint's
  `react-hooks/set-state-in-effect` rules out mirroring search params into state, and
  `useSearchParams` needs a `<Suspense>` boundary in the page.
- **Dev-only code must be dynamically imported behind `NODE_ENV`, and dev-only *routes* must be
  `page.dev.tsx`** (`next.config.ts` → `pageExtensions`). Verified again in Phase 6.
- **`e2e/global-setup.ts` warms every route before the workers start.** Without it a cold
  `next dev` fails the whole suite — lazy route compilation, not memory. **Add every new route to
  that list.**
- **Screens expose `data-ready="true"`** on their root once they have something real to show; the
  screenshot script and every e2e spec wait on that instead of a timeout. The static Phase 2
  previews set it directly.
- **Seeds carry correlations, not just noise** — all four insights are comparisons, so `demo`
  deliberately ties plan timing, MIT completion and energy to how a day went. Seeds are dev-only.
- **Supabase is reachable from this machine** (`https://<project>.supabase.co` → HTTP/2 404 via
  Cloudflare in 0.14s, the expected answer for the bare root). Risk R6 is clear.
- **Phase 1, four Moderate discoveries, all resolved** — see `memory/discoveries.md`, plus the
  shadcn CLI notes (Phase 3/4), the production-build/dev-routes finding (Phase 5) and the two
  Phase 6 entries.
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — use `bg-hover` for hover tints.
- **Base UI is not Radix.** `Root → Trigger → Portal → Positioner → Popup`; `ToggleGroup`'s
  value is a `string[]`; composition is `render={<El/>}`; `RadioGroup` never reports a click on
  the already-selected item. Docs ship at `node_modules/@base-ui/react/docs/`.
- **`aria-disabled` is not `disabled`** — Playwright needs `click({ force: true })` to deliver a
  blocked click. Sonner's auto-dismiss timer does not fire reliably in a headless context.
- **dnd-kit** needs an explicit `id` on `DndContext`, and its keyboard drag moves 25px per key —
  e2e uses a real pointer drag instead.
- `@date-fns/tz`'s `TZDate.toISOString()` returns an offset string; convert to a plain `Date`.
- Vitest runs with `maxWorkers: 4` and `testTimeout: 15_000`; coverage includes `src/domain/**`
  and `src/stats/**`.
- Toolchain: node 24.11.1, **pnpm 10.34.6**, zustand 5.

## Known cosmetic gaps (deliberately out of Phase 6's scope)
- `DayDetail`'s heading uses `formatDateLong` ("Thứ Sáu, 2 tháng 10"); the design shows
  "Thứ Sáu, 2/10".
- The ritual summary drops the ritual header that `ritual_summary` shows — `RitualScreen` returns
  early at step 3.

## Next action
Phase 08 task file to be written by the planning session — bring `memory/STATE.md`,
`memory/phase_07_report.md` and `memory/discoveries.md` back to it. Phase 8 is "ship": GitHub
remote, Vercel project, production env vars, production redirect URL in the Supabase dashboard.
