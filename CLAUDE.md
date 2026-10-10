# CLAUDE.md — Better Every Day

## What this project is
A Vietnamese-language web app for daily planning discipline: write a plan for day D
(evening before or early morning), tick it off, close the day with an evening ritual,
and see growth metrics. Full architecture and phase list: `docs/plan.md`.

## Mandatory bootstrap at the start of EVERY session
1. Read `memory/STATE.md` to see where things stand.
2. Read the current phase's task file in `tasks/`.
3. If STATE.md says a MAJOR discovery is unresolved, ask the user before doing anything.
4. Only read `memory/phase_XX_report.md` files when the task file tells you to or you
   genuinely need a detail from them.

## Source-of-truth map
| Question | Source |
|---|---|
| What to build, in what order | `docs/plan.md` + current `tasks/phase_XX_*.md` |
| How it looks | `design/handoff/screenshots/` (visual truth) + `design/handoff/components.md`, `design/handoff/screens.md` |
| How it moves | `design/handoff/motion.md` |
| Colours, type, radius, shadows | `design/handoff/tokens.css` (copied into `src/styles/tokens.css`) |
| Every user-facing string | `src/content/copy.vi.json` (copied from `design/handoff/copy.vi.json`; new keys go here only) |
| Business rules | `src/domain/` (once Phase 2 is done) — never re-implement them in UI code |

`design/handoff/prototype/` is written in a custom Claude Design format (`dc-import`, `sc-if`),
NOT React. Use it to understand behaviour and exact styling values; never copy its code
structure or `support.js`.

## Invariant rules
- **Never edit anything under `design/`.** It is a read-only reference.
- **Before any `shadcn` CLI command:** confirm `components.json → tailwind.css` is
  `src/app/globals.css`; afterwards `git status design/` must be clean. shadcn here is the
  **Base UI** flavour (`@base-ui/react`) — read its API, don't assume Radix. Replace
  shadcn `bg-accent` hover classes with `bg-hover` (token `--accent` is terracotta).
  If the shadcn registry is unreachable, hand-write the wrapper in `src/components/ui/`
  over the matching Base UI part; the API reference is
  `node_modules/@base-ui/react/docs/react/components/*.md` — read it, don't guess.
- **New token scale → register it in `src/lib/utils.ts` (`createCn`)** or `cn()` drops it.
- **Stack is locked:** Next.js (App Router) + React + TypeScript (strict) + Tailwind CSS v4
  + shadcn/ui (Base UI), pnpm, Vitest, date-fns v4 + @date-fns/tz, Supabase. Do not add another
  UI kit, CSS approach, state library or date library without logging a Moderate discovery.
- **No hard-coded Vietnamese strings in components.** Use `t('key')` from `src/lib/copy.ts`.
  If a string is missing from copy.vi.json, add it there (Minor) — keep the same tone.
- **No hard-coded colours/radii/shadows.** Use token classes (`bg-paper`, `text-ink-3`,
  `rounded-card`, `shadow-lg`…). No raw hex in components.
- **Tone is non-punitive:** no red, no warning icons for missed/unfinished work.
- **Time is always injected.** Domain functions take `now: Date` and `settings`; never
  call `new Date()` inside `src/domain/`. Logical dates are `'YYYY-MM-DD'` strings.
- **Responsive breakpoint:** the `app:` variant (≥720px, from `--breakpoint-app`) =
  sidebar layout; below it = bottom tabs. Use viewport variants, not container queries.
- **Phase 2 screens (Goals, Weekly review, `@goal` syntax) are placeholders only.**
- **Secrets:** env vars live in `.env.local` (git-ignored). Never print, log or commit
  key values. Never use the service-role key in client code.
- **Supabase MCP (from Phase 7 onward only):**
  - Every schema change = a SQL file in `supabase/migrations/` committed to git, then
    applied via the MCP. No ad-hoc DDL through `execute_sql`.
  - Never run DROP / TRUNCATE / DELETE without rows filter / ALTER that loses data
    without asking the user first.
  - Every user-data table has RLS enabled with `user_id = auth.uid()` policies.
- Before ending a phase run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`.
  Every new route goes into the warm-up list in `e2e/global-setup.ts`.
- Commit at the end of each phase: `git commit -m "phase-XX: <slug>"` (local repo; the
  user adds the GitHub remote later).

## Conflicts between a task file and the design
- On **appearance** (colour, format, spacing), the handoff screenshot wins; log the deviation.
- On a **rule** (what counts, thresholds, data), the task file wins.

## Protocol for discoveries the plan didn't anticipate
- **Minor** (local detail, no effect on other phases): handle it, note it in the phase report.
- **Moderate** (an assumption was wrong, clear fix, no architecture change): handle it
  with best judgment, log reasoning in `memory/discoveries.md`.
- **Major** (affects architecture, a later phase's contract, the data model, or a
  business rule in `docs/plan.md`): STOP. Do not decide alone, do not edit plan.md.
  Write a proposal in `memory/discoveries.md`, end the phase early, tell the user.

`docs/plan.md` is only ever edited by the user + the planning model.

## When a phase finishes (mandatory)
1. Write `memory/phase_XX_report.md`.
2. Overwrite `memory/STATE.md` (replace, don't append).
3. Update `memory/discoveries.md` if there were Moderate/Major findings.
4. Commit.
