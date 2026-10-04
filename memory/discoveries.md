# Discoveries Log

Log Moderate/Major findings per the protocol in CLAUDE.md. Major findings need the
user to bring this file back to the planning session to update docs/plan.md.

Entry format:

## [Phase <N>] <short title> — Tier: <Moderate/Major>
**Finding:** what differs from the plan's assumption.
**Impact:** which phase(s) are affected, and how.
**How it was handled (if Moderate):** direction chosen + reasoning.
**Proposal (if Major):** concrete proposal for the planning model. Not self-implemented.
**Status:** unresolved / plan.md updated on <date>

---

## [Phase 1] shadcn's CLI writes into `design/` — Tier: Moderate
**Finding:** `pnpm dlx shadcn@latest init` auto-detects "the project's CSS file" and picked
`design/handoff/tokens.css`, overwriting it with its own neutral oklch palette, a `.dark`
block, `--sidebar-*`/`--chart-*` variables and a base layer. `design/` is declared
read-only in CLAUDE.md, so the plan never anticipated a tool editing it.
**Impact:** any later phase that runs a `shadcn` CLI command (Phase 3 adds Dialog, Popover,
Sheet, Tooltip, Switch, Segmented…) can silently corrupt the design handoff.
**How it was handled:** the damage was caught by diffing against `src/styles/tokens.css`
(copied before init) and reverted byte-for-byte; `components.json` was repointed at
`src/app/globals.css`, after which `shadcn add button` left `design/` untouched.
**Rule for later phases:** before running any `shadcn` command, confirm
`components.json → tailwind.css === "src/app/globals.css"`; afterwards run
`diff design/handoff/tokens.css src/styles/tokens.css` and `git status design/`.
**Status:** resolved in Phase 1 — no plan.md change needed.

## [Phase 1] `next dev` appends an agent-rules block to `CLAUDE.md` — Tier: Moderate
**Finding:** Next.js 16 generates `AGENTS.md` and appends a
`<!-- BEGIN:nextjs-agent-rules -->` block to `CLAUDE.md` on every `next dev` run.
`CLAUDE.md` is hand-written and owned by the user + planning model.
**Impact:** every phase that runs the dev server would re-dirty `CLAUDE.md` and pollute the
project's own instructions with Next.js boilerplate.
**How it was handled:** the appended block was stripped and `agentRules: false` set in
`next.config.ts`; a subsequent `next dev` was verified to add nothing and to create no
`AGENTS.md`.
**Status:** resolved in Phase 1 — no plan.md change needed.

## [Phase 1] shadcn v4 ships Base UI + the `cn` package, not Radix + clsx/tailwind-merge — Tier: Moderate
**Finding:** `docs/plan.md` locks "shadcn/ui" assuming the classic Radix-based distribution.
shadcn CLI 4.21.1's default base installs **`@base-ui/react`**, and `src/lib/utils.ts` is a
re-export from the standalone **`cn`** package rather than `clsx` + `tailwind-merge`. It also
adds `shadcn` as a runtime dependency for `shadcn/tailwind.css` (keyframes, `data-*`
variants and utilities only — no colours, so it cannot fight `tokens.css`).
**Impact:** Phase 3 builds DatePicker, MatrixBottomSheet, Toast, Switch, Segmented and
Tooltip on these primitives — Base UI's API differs from Radix's. dnd-kit (Phase 3) and
zustand (Phase 4) are unaffected.
**How it was handled:** kept the CLI default, as the task file specified ("style: default for
the installed version"). Base UI is shadcn's own supported default and nothing in the design
handoff depends on Radix.
**Status:** resolved in Phase 1 — flagged so the planning model can note the primitive
library in plan.md if it wants to; no architecture change.

## [Phase 1] `cn()` silently dropped token size classes — Tier: Moderate
**Finding:** tailwind-merge only knows Tailwind's built-in t-shirt scales. It classified
token classes like `text-micro`, `text-caption`, `rounded-panel` as *colours*, so
`cn('text-micro', 'text-ink')` returned just `text-ink` — the bottom-tab labels lost their
11px size with no error anywhere.
**Impact:** every component phase. Any `cn()` call mixing a token size with a colour would
have produced quietly wrong styling.
**How it was handled:** `src/lib/utils.ts` now builds `cn` with
`createCn({ extend: { classGroups: { 'font-size': […], rounded: […] } } })`, registering the
project's `text-*` and `rounded-*` scales from `tokens.css`. Verified: token sizes now
survive next to colour classes and still override each other correctly.
**Rule for later phases:** when a new token scale is added to `tokens.css`, register it in
`src/lib/utils.ts` as well.
**Status:** resolved in Phase 1 — no plan.md change needed.

## [Phase 2] `closeDay` can only enforce the MIT limit on date+1 — Tier: Moderate
**Finding:** `CloseDayInput` carries `tomorrowExisting` (the tasks already on date+1) but
nothing about any other target day. Ritual step 2 lets a task be moved to an arbitrary date
(the date chips offer next Monday, the weekend, +1 week). For those moves the domain has no
way to know whether the target day already holds 3 MITs, so the copy keeps its MIT flag and
that day can end up with 4+ MITs — a state `createTask` / `moveTask` would never allow.
**Impact:** Phase 4 (ritual screen + repository) and Phase 5 (persistence). Either the
screen loads the task lists of every distinct target date and the contract grows a
`targets: Record<ISODate, Task[]>` field, or the over-limit day is accepted and repaired the
next time it is edited.
**How it was handled:** implemented exactly as specified — `moveTask` is called with an
empty target day for any date other than date+1, so the MIT flag survives the move. Encoded
in the test "ignores a tomorrowMit entry for a task moved elsewhere". Not changed on my own
authority because `CloseDayInput` is a locked contract that Phase 4/5 consume.
**Status:** **resolved in Phase 3.** The planning session chose the first option:
`CloseDayInput` now carries `otherTargets: Record<ISODate, Task[]>`, the MIT limit is
enforced per target date (existing tasks first, then moved-in tasks in `todayTasks` order),
and a move to a date with no `otherTargets` entry throws `DomainError('missing_target_day')`.
See `tasks/phase_03_components_core.md` Part A and `memory/phase_03_report.md`.

## [Phase 2] `validateSettings` returns English diagnostics, not Vietnamese copy — Tier: Moderate
**Finding:** the contract asks for "a list of human-readable problems", while CLAUDE.md
requires every user-facing string to live in `src/content/copy.vi.json` and forbids
hard-coded Vietnamese outside it. `copy.vi.json` contains no settings-validation strings at
all, and `src/domain/` must stay free of UI concerns.
**Impact:** Phase 3/4 Settings + Onboarding. These strings cannot be rendered to the user
as-is.
**How it was handled:** the function returns stable English developer diagnostics (e.g.
`'lockTime must be between 07:00 and 14:00'`) and is positioned as a guard for data loaded
from Supabase or an older local draft, not as form-field copy. The Settings and Onboarding
screens constrain the inputs to valid values with pickers (that is how the handoff designs
them), so they never need to surface a message; if a message is ever needed, add a copy key
and map it from the problem list rather than printing the raw string.
**Status:** resolved in Phase 2 — no plan.md change needed, but Phase 3/4 should not render
these strings directly.

## [Phase 3] The shadcn registry is unreachable from this machine — Tier: Moderate
**Finding:** `pnpm exec shadcn add …` fails with `connect ETIMEDOUT` on
`ui.shadcn.com`. Network egress from this machine reaches `registry.npmjs.org` and nothing
else (`github.com`, `vercel.com` and `www.npmjs.com` all fail or 403 the same way, with and
without the tool sandbox), so no version of the CLI can fetch a component.
**Impact:** Phase 3 Part B and every later phase that wants a new shadcn primitive.
**How it was handled:** the underlying libraries are all on npm, so they were installed
directly (`@base-ui/react` was already a dependency) and the thin wrappers the CLI would
have generated were hand-written into `src/components/ui/` in the same style as the
generated `button.tsx` — token-styled from the start, which the CLI output needs anyway.
Nothing about the locked stack changes: same libraries, same file layout, same aliases.
The pre-flight half of the CLAUDE.md shadcn rule was still run
(`components.json → tailwind.css === "src/app/globals.css"`), and `design/handoff/tokens.css`
was re-diffed against `src/styles/tokens.css` afterwards — identical, `git status design/`
clean.
**Rule for later phases:** try the CLI first; if `ui.shadcn.com` is still unreachable,
hand-write the primitive over the Base UI part that matches and keep it in
`src/components/ui/`. Check Base UI's bundled docs (`node_modules/@base-ui/react/docs/`)
rather than guessing a Radix-shaped API.
**Status:** resolved in Phase 3 — no plan.md change needed.
