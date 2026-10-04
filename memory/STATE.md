# State

**Last updated:** 2026-10-04 — Phase 3 complete, committed as `phase-03: components core`

## Where things stand
Current phase: 4 — not started, **task file not written yet**.
Phases 1–3 are done. The app has its scaffold, tokens, fonts, `t()`, AppShell and
placeholder routes (1); a fully-tested pure `src/domain/` (2); and the presentational
component library the Today screen needs, visible at `/dev/components` (3).
No real screens yet, no zustand store, no Repository, no persistence, no Supabase.

## Completed
- **Phase 1 — Scaffold & design system** (`memory/phase_01_report.md`).
- **Phase 2 — Domain logic** (`memory/phase_02_report.md`).
- **Phase 3 — Components A: core & Today** (`memory/phase_03_report.md`).
  20 components in `src/components/` (common · today · matrix · date) plus 5 token-styled
  primitives in `src/components/ui/`, `src/lib/format.ts` · `toast.ts` · `hooks/`,
  the `/dev/components` gallery with a domain-driven Today playground, and
  `scripts/shots.ts`. `pnpm lint`, `pnpm typecheck`, `pnpm test` (21 files, **204 tests**)
  and `pnpm build` all exit 0; `pnpm test:coverage` → **100% lines** for `src/domain/**`.
  `pnpm shots` writes exactly 60 PNGs to `artifacts/shots/` (git-ignored).

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
     Radix + clsx/tailwind-merge.
  4. `cn()` dropped token size classes. `src/lib/utils.ts` registers the project's `text-*`
     and `rounded-*` scales via `createCn`. Register any new token scale there too.
- shadcn's `--accent` (hover tint) clashes with the token `--accent` (terracotta).
  **tokens.css wins** — use `bg-hover` for hover tints.
- Fraunces renders Vietnamese with the `SOFT` axis; no heading fallback needed.
- Toolchain: node 24.11.1, **pnpm 10.34.6** installed via `npm i -g pnpm@10`.
- **Phase 2, two Moderate discoveries — both now settled:**
  5. The MIT limit on non-tomorrow move targets: **resolved in Phase 3**, `CloseDayInput`
     gained `otherTargets` (see below).
  6. `validateSettings` returns English developer diagnostics, not Vietnamese copy. Settings
     and Onboarding must constrain inputs with pickers rather than rendering these strings.
- `@date-fns/tz`'s `TZDate.toISOString()` returns an offset string (`…+07:00`), not `Z`.
  Always convert to a plain `Date` before handing it on. `src/lib/format.ts` sidesteps this
  by delegating to the domain's `localParts`.
- Date chips are not a fixed set: a Monday and a Saturday only yield three options. The
  DatePicker renders whatever `dateChipOptions()` returns.
- **Phase 3, one Moderate discovery** — see `memory/discoveries.md`:
  7. **`ui.shadcn.com` is unreachable from this machine** (only `registry.npmjs.org` is);
     the CLI cannot add components. The primitives in `src/components/ui/` were hand-written
     over the same libraries. Try the CLI first next time; fall back to hand-writing.
- **Base UI is not Radix.** Popover/Tooltip are `Root → Trigger → Portal → Positioner →
  Popup` (placement props on `Positioner`, there is no `Content`); `ToggleGroup`'s value is
  a `string[]` with `multiple={false}` for single select; composition is `render={<El/>}`,
  not `asChild`; Base UI has its own swipeable `Drawer`, so **no vaul and no Radix** are in
  the tree. The authoritative API docs ship inside the package at
  `node_modules/@base-ui/react/docs/react/components/*.md` — read them, don't guess.
- **dnd-kit needs an explicit `id` on `DndContext`** (`useId()`), otherwise its
  `aria-describedby` counter desyncs between SSR and hydration.
- Components are presentational and prop-only; they may import only types and the read-only
  domain helpers. **Mutating domain functions live in `src/app/dev/` and tests only** —
  Phase 4's screens become the next place they are allowed.
- `src/lib/format.ts` resolves the timezone from `DEFAULT_SETTINGS` via `formatClockLocal`.
  **Phase 4 should replace that with real settings** threaded through props.

## Next action
Phase 04 task file to be written by the planning session — bring `memory/STATE.md`,
`memory/phase_03_report.md` and `memory/discoveries.md` back to it.
