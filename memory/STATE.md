# State

**Last updated:** 2026-10-04 — Phase 2 complete, committed as `phase-02: domain`

## Where things stand
Current phase: 3 — Component library. Status: not started, **task file not written yet**.
Phases 1 and 2 are done: a Next.js 16 + React 19 + Tailwind v4 + shadcn app runs at the
repo root with tokens, fonts, theming, `t()`, the AppShell and placeholder routes; and
`src/domain/` now implements every locked business rule as pure, fully-tested TypeScript.
No Supabase, no screens, no store yet.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
  `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` all exit 0. All routes 200,
  `/` → `/today`, `/dev/tokens` 404s in production.
- **Phase 2 — Domain logic** (`memory/phase_02_report.md`).
  `src/domain/` = 13 modules + 12 test files, 140 domain tests (148 total).
  `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` exit 0;
  `pnpm test:coverage` → **100% lines** / 99.66% statements / 99.51% branches for
  `src/domain/**`. No clock reads, no React/Next/Supabase imports in the domain.
  `src/domain/index.ts` is the single public surface and a test pins it to the contract.

## Most important findings so far
- Design handoff is at **`design/handoff/`** (not `design/` as CLAUDE.md's table says) and
  is read-only. The prototype uses a custom Claude Design format, not React — reference only.
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
  3. shadcn v4 uses **Base UI** (`@base-ui/react`) and the standalone **`cn`** package, not
     Radix + clsx/tailwind-merge. Phase 3 must check Base UI's API for Dialog, Popover,
     Sheet, Tooltip, Switch.
  4. `cn()` dropped token size classes (`text-micro` next to `text-ink`). `src/lib/utils.ts`
     now registers the project's `text-*` and `rounded-*` scales via `createCn`. Register any
     new token scale there too.
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — replace `bg-accent` hovers in shadcn components with `bg-hover`.
- Fraunces renders Vietnamese with the `SOFT` axis; no heading fallback needed.
- Toolchain: node 24.11.1, **pnpm 10.34.6** installed via `npm i -g pnpm@10`
  (corepack cannot run pnpm 12 on this machine).
- **Phase 2, two Moderate discoveries** — see `memory/discoveries.md`:
  5. **UNRESOLVED:** `closeDay` can only enforce the 3-MIT limit on date+1; a ritual move to
     any other date (next Monday, the weekend, +1 week) keeps the MIT flag and can leave that
     day with 4+ MITs. Needs a planning decision (extend `CloseDayInput` with the target
     days' tasks, or accept it) **before Phase 4 builds the ritual screen**. Not a blocker
     for Phase 3.
  6. `validateSettings` returns English developer diagnostics, not Vietnamese copy. Settings
     and Onboarding must constrain inputs with pickers rather than rendering these strings.
- `@date-fns/tz`'s `TZDate.toISOString()` returns an offset string (`…+07:00`), not `Z`.
  Always convert to a plain `Date` (`new Date(tzDate.getTime())`) before handing it on —
  this applies to Phase 3's `src/lib/format.ts` too.
- Date chips are not a fixed set: a Monday and a Saturday only yield three options, because
  `plusWeek` collides with `nextMonday` / `weekend`. The DatePicker must render whatever
  `dateChipOptions()` returns.

## Next action
Phase 03 task file to be written by the planning session — bring `memory/STATE.md`,
`memory/phase_02_report.md` and `memory/discoveries.md` back to it.
