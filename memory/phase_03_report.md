# Phase 03 report — Components A: core & Today

**Finished:** 2026-10-04 · committed as `phase-03: components core`

## What was done

### Part A — domain amendments
- **`CloseDayInput.otherTargets: Record<ISODate, Task[]>`** (required). `closeDay` keeps a
  running task list per move target: `tomorrow` for date+1 (unchanged), and a list seeded
  from `otherTargets[date]` for every other date. The MIT limit is therefore enforced per
  target day — existing tasks first, then moved-in tasks in `todayTasks` order — and the
  copy's `position` now follows that day's existing tasks instead of always being 0.
  A move to a date with no `otherTargets` entry throws the new
  `DomainError('missing_target_day')`. `'missing_target_day'` was added to `DomainErrorCode`.
- **`restoreTask` re-checks the MIT limit.** New private helper `mitOnRestore(task, related)`
  counts `activeMitCount` over `related` filtered to `task.planDate` and excluding the task
  itself. Over the limit → the restored task comes back with `mit: false`, the mutation
  carries `'mitLimit'`, and the `task_restored` payload gains `mitDowngraded: true` (the key
  is omitted when nothing was downgraded, so the existing `toMatchObject` assertions still
  hold). Applied to both the `dropped` and the `moved` branch — a moved task coming home
  re-occupies a MIT slot exactly like a dropped one. Signature unchanged.
- **9 new domain tests** (4 for `closeDay`, 5 for `restoreTask`); the existing
  "ignores a tomorrowMit entry for a task moved elsewhere" and the full-day test now pass
  `otherTargets`. `index.test.ts` is unchanged — no new exported names.

### Part B — dependencies
| Package | Why | Notes |
|---|---|---|
| `@dnd-kit/core` 6.3.1 | matrix drag | PointerSensor + KeyboardSensor |
| `sonner` 2.0.8 | toasts | wrapped by `src/components/common/Toaster.tsx` |
| `react-day-picker` 10.0.2 | calendar | wrapped by `src/components/ui/calendar.tsx` |
| dev: `@testing-library/react`, `/user-event`, `/jest-dom`, `jsdom`, `@playwright/test`, `tsx` | tests + shots | `playwright install chromium` run |

**The shadcn CLI could not be used** — see "New findings" and `memory/discoveries.md`.
The primitives were hand-written over **Base UI**, which is what the CLI installs anyway:

| `src/components/ui/…` | Built on | Depends on |
|---|---|---|
| `popover.tsx` | `@base-ui/react/popover` | Base UI only |
| `drawer.tsx` | `@base-ui/react/drawer` | Base UI only — **no vaul, no Radix** |
| `tooltip.tsx` | `@base-ui/react/tooltip` | Base UI only |
| `toggle-group.tsx` | `@base-ui/react/toggle-group` + `/toggle` | Base UI only |
| `calendar.tsx` | `react-day-picker` | + `lucide-react` chevrons |

Base UI 1.8 ships its own `Drawer` with swipe-to-dismiss, a backdrop, a focus trap and
focus return, so the "if drawer pulls in vaul that is acceptable" allowance was not needed
and no Radix package entered the tree.

### Parts C/D — helpers
`src/lib/format.ts` (+ 20 tests), `src/lib/toast.ts`, `src/lib/hooks/use-media.ts`,
`src/lib/hooks/use-shortcut.ts`, `src/test/setup-dom.ts`. `Toaster` is mounted in
`src/app/layout.tsx`; the AppShell's hand-rolled `T` handler was replaced with
`useShortcut('t', toggle)`.

### Parts E/F/G
All 20 component files from the contract, the 15-section `/dev/components` gallery with the
domain-driven Today playground, 7 jsdom test files, and `scripts/shots.ts`.

## Results (Definition of Done)

| DoD item | Result |
|---|---|
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0 — **21 files, 204 tests** |
| `pnpm build` | exit 0 — 13 routes, all static |
| `pnpm test:coverage` ≥90% lines for `src/domain/**` | **100% lines** / 99.69% stmts / 99.54% branches |
| Part A tests exist and pass; `index.test.ts` unchanged | yes |
| `format.test.ts` covers every Part D example | yes, 20 tests incl. `formatClock('2026-10-03T07:10:00Z','Asia/Ho_Chi_Minh') === '14:10'` and `formatDateLong('2026-10-04') === 'Chủ Nhật, 4 tháng 10'` |
| All listed component tests pass | yes — TaskInput 3, TaskItem 7, DatePickerChips 7, MatrixBoard 3, ProgressBar 2, Banner 3, ViewToggle 4 |
| `/dev/components` 200 + an element per Part F id | yes, all 15 ids present once |
| `pnpm shots` exit 0, 15×2×2 = 60 PNGs | yes, `artifacts/shots/` holds exactly 60 |
| no hard-coded Vietnamese in `src/components`, `src/app`, `src/lib` | grep returns nothing (comments were rewritten in English; the gallery's sample strings moved to `src/dev/fixtures.ts → GALLERY_SAMPLES`, which also now feeds `/dev/tokens`'s type specimen) |
| no hex colours in `src/components` | grep returns nothing |
| no `bg-accent` used as a hover tint in `src/components/ui` | 2 hits in `calendar.tsx`, both the **selected-day fill** (`--accent` terracotta / `--on-accent`), which is the designed treatment — not shadcn's hover tint. No `bg-accent` hover tints anywhere |
| no `motion` / `framer-motion` import | grep returns nothing |
| `git status design/` clean | clean; `design/handoff/tokens.css` still byte-identical to `src/styles/tokens.css` |
| components import only types + the allowed read-only domain helpers | yes — only `parseQuickAdd`, `dateChipOptions`, `quadrantOf`, `addDays` plus types. Mutations appear only in `src/app/dev/components/Playground.tsx` and tests |

## Screenshot comparison

Gallery PNGs in `artifacts/shots/` versus `design/handoff/screenshots/`. The gallery renders
components on a bare `paper` sheet with no AppShell, so sidebar/tab-bar chrome, page padding
and column widths are expected to differ; only component-level differences are listed.

| Gallery PNG | Design PNG | Verdict |
|---|---|---|
| `plan-status_*` | `today_locked-adhoc`, `today_window-open`, `today_after-midnight` | **matches** — sage dot pill, neutral lock pill, accent-soft moon pill, same order and copy. The design renders dayEnd as `3:00` where the gallery passes the `HHMM` value `03:00`; PlanStatus prints what the caller gives it |
| `progress_*` | `today_locked-adhoc` | **matches** — `font-num` 44px number, 22px `ink-3` percent sign, 10px sage track |
| `task-input_*` | `today_locked-adhoc`, `today_window-open` | **matches** — 54px pill, 2px border, `+` icon, round 40px `ink` enter button, syntax row, accent-ink locked hint. Difference: the design wraps the locked hint onto its own line because the column is narrower; at 390px the gallery clips a long preview-chip row instead of pushing the enter button off-screen |
| `task-item_*` | `today_locked-adhoc` (rows), `TaskItem.dc.html` (toolbar) | **matches** — chips, size badge, strike-through colour transition, 48px-indented toolbar, restore-only toolbar for moved/dropped |
| `mit-section_*` | `today_locked-adhoc` | **matches** — `surface` + `radius-panel` card, display-sm heading, accent-soft `n/3 MIT` tag, empty hint |
| `task-group_*` | `today_locked-adhoc` | **matches** — uppercase kicker + count for `default`; 2px dashed border, neutral tag and note for `adhoc` |
| `banners_*` | `today_plan-reminder`, `today_complete-100`, `today_new-user`, `today_missed-day` | **matches** — accent-soft reminder with the 40px bell, success-soft complete with both decorative circles, surface welcome with its 3 step cards and 46px CTA |
| `matrix_*` | `today_matrix` | **matches** apart from two deliberate items: (1) the gallery is 1080px wide so `auto-fit minmax(260px,1fr)` lays 3 columns out where the design's narrower paper sheet gives 2×2 — same rule, different container; (2) a ticked chip shows the drawn tick inside the sage circle, while the prototype's 18px chip checkbox is a plain filled circle. Chips, MIT/phát sinh labels, the Q2 success badge and the dashed empty box match |
| `date-chips_*` | `ritual_step1-review` | **matches** — 3 chips on a Saturday, 4 on a Tuesday, selected chip filled `ink`/`bg`, custom date shown as `T4 14/10` |
| `date-picker_*` (+ a manual capture of the open popover/sheet) | `ritual_step1-datepicker`, mobile `ritual_step1-datepicker-sheet` | **close** — T2…CN header, `Tháng 10, 2026` title, 36px round nav buttons, 40px day pills, accent selection, accent-soft today, disabled days at .35, sheet title + task name + `Hủy` / `Dời sang …` buttons all match. **One difference:** the design greys the previous month's trailing days (28/29/30) in the first row; react-day-picker *hides* any day before `startMonth`, so those cells render blank. Keeping `startMonth` is what disables the "previous month" button at the minimum month, which the prototype also does — the two cannot both be had from rdp's options |
| `empty-state_*` | `today_empty` | **matches** — 2px dashed `line`, `radius-card`, display-sm title, `ink-2` body |
| `toast_*` (+ a manual capture of a fired toast) | Toast spec in `components.md` | **matches** — `ink` pill, `bg` text, `shadow-lg`, bottom-centred 24px up on desktop and 92px on mobile, 2.6s |
| `view-toggle_*`, `tags_*` | `today_matrix` header, chips throughout | **matches** — `line-2` track, active segment `paper` + `shadow-sm`; tag weights/padding were corrected to the prototype's values after the first screenshot pass |
| `playground_*` | `today_locked-adhoc` | **matches** — same fixtures produce the same 62%, `3/3 MIT`, `5/8 việc đã định`, the same five "Các việc khác" rows and the same dashed Phát sinh group with `1/2 xong` |

Dark theme was checked for every section; tokens carry it with no `dark:` overrides anywhere.

## New findings

1. **The shadcn registry is unreachable (Moderate, logged).** `ui.shadcn.com` times out;
   only `registry.npmjs.org` is reachable from this machine. Primitives were hand-written
   over the same libraries. Details and the rule for later phases: `memory/discoveries.md`.
2. **Base UI API gotchas** (the Radix habits that do *not* transfer):
   - **Popover/Tooltip have no `Content`.** It is `Root → Trigger → Portal → Positioner →
     Popup`, and `align` / `side` / `sideOffset` / `collisionPadding` live on **`Positioner`**,
     not on the popup.
   - **`ToggleGroup`'s value is a `string[]`** even in single-select mode, single select is
     `multiple={false}` (the default) rather than `type="single"`, and the handler signature
     is `(groupValue: string[], eventDetails)`. It also allows un-pressing the active item,
     so `Segmented` ignores an empty change to keep one segment selected.
   - **Composition is `render={<El/>}`, not `asChild`.** `DatePicker` takes a `trigger`
     element and passes it to `PopoverTrigger`/`DrawerTrigger` via `render`.
   - **Base UI has a first-class `Drawer`** (`Root/Portal/Backdrop/Viewport/Popup/Content/
     Title/Description/Close`) with `swipeDirection` defaulting to `'down'`, and exposes
     `--drawer-swipe-movement-y` / `--drawer-swipe-progress` plus `data-swiping`,
     `data-starting-style` and `data-ending-style` for the open/close transitions.
   - **The docs ship inside the package** — `node_modules/@base-ui/react/docs/react/components/*.md`
     is the authoritative API reference and was used instead of guessing.
3. **dnd-kit breaks hydration without an explicit `id`.** `useUniqueId` uses a module-level
   counter, so the `aria-describedby` it puts on every draggable drifts between the server
   and client renders. `MatrixBoard` now passes `id={useId()}` to `DndContext`.
4. **`devIndicators: false`** was added to `next.config.ts`: the floating Next dev badge is
   fixed-position and landed inside `pnpm shots` section screenshots.
5. **react-day-picker 10 needs full styling from scratch** — its stylesheet is not imported,
   and with `navLayout="around"` the month element holds prev · caption · next · grid as
   siblings, so the header row is produced by `flex-wrap` plus `basis-full` on the grid.
6. **Vitest 5 / Vite 7 use oxc, not esbuild.** An `esbuild: { jsx: 'automatic' }` override
   is ignored (with a warning); the default transform already emits the automatic runtime,
   so no React plugin and no config override is needed for `.tsx` tests.

## Decisions made

- **`formatClockLocal(instant)`** was added to `src/lib/format.ts`. `TaskItem` must render
  "thêm lúc 14:10" but takes no `settings` prop and may not import `DEFAULT_SETTINGS` from
  `@/domain` itself. Resolving the zone in `src/lib` (which the DoD's import restriction
  does not cover) keeps components clean. **Phase 4 should replace it** once real settings
  are threaded through.
- **Two optional props beyond the contract**, both needed by the gallery states the task
  file asks for: `BannerProps.hint` (the welcome CTA's "hoặc gõ việc đầu tiên ngay bên dưới",
  which is not one of the 3 step cards) and `TaskInputProps.defaultValue` (the "pre-filled
  value showing preview chips" row). Nothing else deviates.
- **Copy keys added** (same tone, all Minor): `format.duration.minutes` / `.hours` /
  `.hoursMinutes`, `today.view.aria` ("Chế độ xem", the toggle group's accessible name) and
  `today.matrix.dragInstructions` (dnd-kit's screen-reader instructions).
- **`Tag` sizing** uses `text-[12px]`, not a token: the prototype's chips are 12px and the
  only 12px token (`--text-label`) carries `letter-spacing: .08em`, which is wrong here.
  Colours, radii and shadows remain tokens-only.
- **Clicking the active size in the TaskItem toolbar clears it** (`onPatch({ size: null })`),
  matching how the flag toggles behave.
- **`src/test/setup-dom.ts` is guarded on `document`** and imports jest-dom / Testing Library
  with top-level `await import`, so the node-environment domain tests can share one
  `setupFiles` entry.

## Open issues

- The DatePicker's "today" cell is react-day-picker's real today, not an injected date. It
  is only cosmetic, but a deterministic Today screen (and golden screenshots) will want a
  `today` prop threaded from `ctx.now` in Phase 4.
- `MatrixBoard` has no `DragOverlay`: the dragged chip stays in place at opacity .4, like
  the prototype's HTML5 drag. If a follower chip is wanted later, add `DragOverlay`.
- Sonner's own mobile breakpoint is 600px; the toast offset is driven by CSS variables on
  the toaster instead, so it switches at the project's 720px `app:` breakpoint.
- `@types/node` is still v20 while vitest 5 asks for ≥22 (pre-existing peer warning).
- `pnpm` reports `esbuild` as an ignored build script; `tsx` works regardless.

## Input for the next phase (Phase 04)

- **Everything in `src/components/` is presentational and prop-only.** Callbacks report
  intent; Phase 4's screens own the state and call the domain. `src/app/dev/components/Playground.tsx`
  is a working reference for the loop: call the domain fn → `showToast(noticeKey(...))` for
  every notice → apply `upserts`/`deletes`.
- **`closeDay` now requires `otherTargets`.** The ritual screen must collect the existing
  tasks of every distinct move date that is not date+1 (`[]` is fine, missing throws).
- **`restoreTask` now requires a full `related` list** — every task of `task.planDate`, plus
  the copy for a moved task — and may come back with `mit: false` + a `'mitLimit'` notice.
- Reusable here: `Tag`, `EmptyState`, `Segmented`, `Kbd`, `TaskCheckbox`, `SizeBadge`,
  `DatePickerChips`, `DatePicker`, `ProgressBar`, `TaskInput` (`scope="tomorrow"` is already
  wired for ritual step 3), `Toaster`, `useShortcut`, `useIsDesktop` and all of
  `src/lib/format.ts`.
- Still placeholders: Stepper, ReviewRow, RitualFooter, ReflectionForm, TomorrowPlanList,
  RitualSummary, StatCard, Heatmap, WeekdayChart, InsightCard, CalendarMonth, DayDetail,
  Settings controls, Onboarding pieces, Phase2Notice.
- Supabase and the Supabase MCP were not touched.
