# State

**Last updated:** 2026-10-04 — Phase 1 complete, committed as `phase-01: scaffold`

## Where things stand
Current phase: 2 — Domain logic. Status: not started.
Phase 1 (Scaffold & design system) is done: a Next.js 16 + React 19 + Tailwind v4 +
shadcn app runs at the repo root, every route is a placeholder inside the real AppShell,
light/dark/system theming works, `t()` is typed against `copy.vi.json`, Vitest runs,
and `/dev/tokens` renders the whole token set. No Supabase, no business logic yet.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
  `pnpm lint`, `pnpm typecheck`, `pnpm test` (8 tests), `pnpm build` all exit 0.
  All routes 200, `/` → `/today`, `/dev/tokens` 404s in production.

## Most important findings so far
- Design handoff is at **`design/handoff/`** (not `design/` as CLAUDE.md's table says) and
  is read-only. The prototype uses a custom Claude Design format, not React — reference only.
- Business-rule inconsistencies in the handoff were resolved in `docs/plan.md` §2
  (notably: default dayEnd is 00:00; breakpoint uses viewport `app:` variant).
- Supabase project exists; keys are in `.env.local` (git-ignored). Claude Code has Supabase
  MCP access, but Supabase must not be touched before Phase 5.
- **Four Moderate discoveries from Phase 1, all resolved** — see `memory/discoveries.md`:
  1. The `shadcn` CLI overwrote `design/handoff/tokens.css`. Always check
     `components.json → tailwind.css === "src/app/globals.css"` before running it, and diff
     `design/handoff/tokens.css` against `src/styles/tokens.css` afterwards.
  2. `next dev` appended an agent-rules block to `CLAUDE.md`; disabled via
     `agentRules: false` in `next.config.ts`.
  3. shadcn v4 uses **Base UI** (`@base-ui/react`) and the standalone **`cn`** package, not
     Radix + clsx/tailwind-merge. Phase 3 should check Base UI's API for Dialog, Popover,
     Sheet, Tooltip, Switch.
  4. `cn()` dropped token size classes (`text-micro` next to `text-ink`). `src/lib/utils.ts`
     now registers the project's `text-*` and `rounded-*` scales via `createCn`. Register any
     new token scale there too.
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — replace `bg-accent` hovers in shadcn components with `bg-hover`.
- Fraunces renders Vietnamese with the `SOFT` axis; no heading fallback needed.
- Toolchain: node 24.11.1, **pnpm 10.34.6** installed via `npm i -g pnpm@10`
  (corepack cannot run pnpm 12 on this machine).

## Next action
Task file: `tasks/phase_02_domain.md`. Phase 2 is pure business logic in `src/domain/` —
it needs nothing from the UI built in Phase 1 beyond `src/lib/copy.ts`.
