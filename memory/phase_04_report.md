# Phase 04 report — Components B: ritual, stats, history, settings, onboarding

**Finished:** 2026-10-04 · committed as `phase-04: components rest`

## What was done

### Part B — the injected clock (done first, whole suite green before anything else)
- **`src/lib/clock.tsx`** — `ClockValue { now, today, settings }`, `ClockProvider`, `useClock()`
  (throws a named error when no provider is mounted).
- **`formatClockLocal` is gone.** `TaskItem` now renders "thêm lúc …" with
  `formatClock(task.createdAt, useClock().settings.timezone)`. `format.ts` no longer imports
  `DEFAULT_SETTINGS` at all.
- **`formatHourLoose(hhmm)`** added (`'03:00' → '3:00'`), with the three cases from the task
  file as tests. The gallery's late-night `PlanStatus` row now passes it, so the pill reads
  "Ngày của bạn kết thúc lúc 3:00" exactly as `components.md` specifies.
- **`DatePicker`** passes `today={toDate(useClock().today)}` to react-day-picker, closing the
  Phase 3 open issue: the "today" cell is the injected day, not the machine's.
- **`src/test/render.tsx`** — `renderWithClock(ui, value?)` + the shared `TEST_CLOCK`
  (2026-10-03T07:10:00Z / `'2026-10-03'` / `DEFAULT_SETTINGS`). The provider is passed as
  RTL's `wrapper`, so `rerender()` keeps it (the first version wrapped `ui` directly and
  broke on rerender). Phase 3's `TaskItem` and `DatePickerChips` tests were migrated to it.
- `/dev/components` is wrapped in a `ClockProvider` with `GALLERY_CLOCK`; the ritual
  playground wraps itself in `RITUAL_CLOCK` (`now = 2026-10-03T14:30:00Z`, 21:30 Saturday).

### Part A — primitives
**The shadcn CLI worked this time.** `ui.shadcn.com` was reachable (it timed out in Phase 3),
and `pnpm exec shadcn add select switch radio-group --yes` created the three files. See
"New findings" — it is a reversal of discovery 7, logged in `memory/discoveries.md`.

All three were then rewritten over the same Base UI primitives with the project's tokens:
the generated code was pure shadcn (8px radii, 32×18px switch, `focus:bg-accent` — the very
`--accent` clash STATE warns about) and imported `cn` from `cn` rather than `@/lib/utils`.

| File | Kept from the CLI | Rewritten |
|---|---|---|
| `ui/select.tsx` | Base UI structure Root → Trigger → Portal → Positioner → Popup → List | 46px pill trigger, `paper`/`radius-card`/`shadow-lg` popup, `bg-hover` highlight (never `bg-accent`) |
| `ui/switch.tsx` | `Switch.Root` + `Thumb` | 54×32 track, 26px thumb, `success` when on, `justify-content` slide |
| `ui/radio-group.tsx` | `RadioGroup` + `Radio.Root` | left unstyled on purpose — the project's radio groups are chips, cards and 52px circles, so each consumer brings its own classes and only the a11y/roving-focus wiring is shared |

No new packages. `components.json → tailwind.css` was checked before running the CLI
(Phase 1 discovery 1); `globals.css`, `src/styles/tokens.css`, `package.json` and
`design/` all came out byte-identical.

### Part C — 21 new components
`src/components/ritual/` Stepper · ReviewRow · RitualFooter · ReflectionForm ·
TomorrowPlanList · RitualSummary ·
`src/components/stats/` StatCard · Heatmap · WeekdayChart · InsightCard ·
`src/components/history/` CalendarMonth · DayDetail ·
`src/components/settings/` SettingsSection · TimeSelect · Switch · PlanWindowTimeline ·
DayEndChips · `src/components/onboarding/` HabitCardGroup · TimeChips · OnboardingDots ·
OnboardingSummary · `src/components/common/` Phase2Notice.

All props-only. The only `@/domain` value imports anywhere in `src/components` are
`parseQuickAdd`, `dateChipOptions`, `quadrantOf`, `addDays`, `isoWeekday` and `completion` —
all on the allowed list. No stats are computed: StatCard, Heatmap, WeekdayChart,
InsightCard and CalendarMonth render the numbers they are given.

### Part D — 17 gallery sections + the ritual playground
`src/app/dev/components/Demos.tsx` holds the state wrappers (a presentational component
cannot demo itself), `RitualPlayground.tsx` runs the real loop: step 1 ticks call
`toggleDone` and apply the Mutation at once, MIT toggles on an existing tomorrow task call
`patchTask`, and "Hoàn tất & đóng ngày" builds a full `CloseDayInput` — collecting
`otherTargets` from the live task list for every distinct non-tomorrow move date — calls
`closeDay`, applies the Mutation, toasts the notices with scope `tomorrow` and renders
`RitualSummary` from the result. It has a reset button.

### Part E
`scripts/shots.ts` lists 32 ids and waits on `#phase2-notice` instead of `#playground`.

### Motion (step 4)
Stepper bars `transition-colors 300ms`; incoming step content fades up over 220ms with
`--ease-out-soft`; the gate's `.45 → 1` opacity is a 150ms transition; energy circle
`220ms --ease-spring-soft` + `scale(1.08)`; onboarding dots `width 10→34px, 300ms`;
timeline segment `all 300ms`; switch track + thumb 200ms. Reduced motion is handled
globally by `tokens.css`.

## Results (Definition of Done)

| DoD item | Result |
|---|---|
| `pnpm lint` | exit 0 |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0 — **33 files, 233 tests** (was 21/204) |
| `pnpm build` | exit 0 — 13 routes, all static |
| `pnpm test:coverage` ≥90% lines for `src/domain/**` | **100% lines** / 99.69% stmts / 99.54% branches (domain untouched) |
| every listed test exists and passes; Phase 3 tests still pass | yes — Stepper 2, ReviewRow 3, RitualFooter 2, ReflectionForm 2, TomorrowPlanList 3, RitualSummary 1, StatCard 3, Heatmap 3, CalendarMonth 3, DayDetail 3, PlanWindowTimeline 3, `formatHourLoose` 1, playground smoke 1 |
| `grep -rn "formatClockLocal" src` | nothing |
| `/dev/components` 200 with one element per id | yes — all **32** ids present exactly once |
| `pnpm shots` exit 0, **128** PNGs | yes — `128/128 screenshots written`, `artifacts/shots/` holds 128 |
| no hard-coded Vietnamese in `src/components` / `src/app` / `src/lib` | nothing outside test assertions (three comments were rewritten in English; all fixtures stay in `src/dev/`) |
| `grep -rnE "#[0-9a-fA-F]{3,8}\b" src/components --include=*.tsx` | nothing |
| `grep -rnE "new Date\(\)\|Date\.now\(" src/components` | nothing |
| components import only types + the allowed read-only helpers | yes (list above); mutating functions appear only in `src/app/dev/**` and tests |
| `git status design/` clean | clean |
| `git diff --stat HEAD -- src/domain` empty | empty |

## Screenshot comparison

`artifacts/shots/<id>_<theme>_<width>.png` versus `design/handoff/screenshots/`. The gallery
renders components on a bare `paper` sheet with no AppShell, so sidebar/tab chrome, page
padding and column widths differ by design; only component-level differences are listed.
Dark theme was checked for every new section — tokens carry it, no `dark:` overrides.

| Gallery PNG | Design PNG | Verdict |
|---|---|---|
| `stepper_*` | `ritual_step1-review`, `ritual_step2-reflection`, `ritual_step3-plan-tomorrow` | **matches** — three 6px pill bars, done `success` / current `accent` / future `line`, `font-num` number + 13px label, current label `ink` |
| `review-row_*` | `ritual_step1-review` | **matches** — done rows `success-soft`, undecided `surface`, decided `line-2`; MIT / Phát sinh tags; 3 date chips on a Saturday + "Chọn ngày…" + "Bỏ"; the nudge box indented 36px in `accent-soft`. Chips wrap to a second line exactly as in the design |
| `ritual-footer_*` | `ritual_step1-review` (footer), `ritual_step2-reflection` (footer) | **matches** — accent-ink "Còn 2 việc cần quyết định" vs success-ink "Đã xử lý hết", 46px accent button with the arrow at .45 when gated, ghost "Quay lại" on steps 2–3 |
| `reflection_*` | `ritual_step2-reflection` | **matches** — five 52px circles with `font-num` numerals, selected filled `success` and scaled 1.08, labels below, two 50px pill inputs with 2px borders |
| `tomorrow-list_*` | `ritual_step3-plan-tomorrow` | **close** — 36px round star (filled `accent` when MIT), `surface` rows at `radius-tile`, "Dời từ hôm nay" neutral tag, "dời 4 lần · thử chia nhỏ?" in accent-soft, X only on the typed item, "2/3 MIT" accent-soft counter. **Difference:** the shared `TaskInput` always prints its quick-add syntax row (`* ! ^ ~S ~M ~L`), which the design's step 3 does not show. Changing that is a Phase 3 component behaviour change the task file forbids, so it was left; the placeholder already says `(* = MIT)` |
| `ritual-summary_*` | `ritual_summary` | **matches** — success-ink kicker, `num-xl` percentage with the .45em `%`, headline by band, 4 `surface` tiles at `radius-tile`, italic display quote in `success-soft`, bordered "Ngày mai đã sẵn sàng" card with accent dots, consistency line, `ink` CTA, both decorative circles at .22/.28 |
| `ritual-playground_*` | `ritual_step1-review` + mobile `ritual_step1-review` | **matches** — the same fixtures produce the same six-row review list, the same "Còn 4 việc cần quyết định" and the same gated button. **Difference:** the meta line reads "Thứ Bảy, 3 tháng 10 · 21:30" where the prototype prints "Thứ Bảy, 3/10 · 20:45" — `date.longFormat` in `copy.vi.json` is the long form; the time is this phase's fixed clock |
| `stat-card_*` | `stats_default` | **matches** — `surface` + `radius-card`, `num-md` value with the .5em `%`, success-soft `+6 điểm so với kỳ trước`, **neutral** `line-2` tag for −4, `26/30` ratio, `—` with no delta when the value is null |
| `heatmap_*` | `stats_default`, `stats_not-enough-data`, mobile `stats_default` | **matches** — 17px/5px cells for 26 weeks and 20px/4px for 13, rows T2/T4/T6/CN, "thg m" labels on the first week of a month, dashed `heat-none` ring for a planless day, flat `heat-empty` before first use, 2px accent outline on today, future cells not rendered at all, legend and hint identical |
| `weekday-chart_*` | `stats_default` | **matches** — 200px grid of 7, best bar `success` with success-ink value, others `heat-2`, `max-width:44px` pill bars, `—` in the all-null state |
| `insights_*` | `stats_default`, `stats_not-enough-data` | **matches** — 10px dots (success / accent), 15px sentences, the empty state falls back to `stats.insights.empty` on an ink-3 dot |
| `calendar-month_*` | `history_default`, mobile `history_default` | **matches** — Monday-first T2…CN header, 40px round nav with .35 at the limits, heat fills with `on-accent` text from heat-3 up, dashed ring + `—` for a planless day, "nay" on today, 3px `ink` inset on the selected cell and 2.5px accent on today, future at .35, 62px cells on desktop / 46px with the % line hidden on mobile, "2/2 ngày có plan · TB 92%" / "Chưa có dữ liệu" |
| `day-detail_*` | `history_default` | **matches** — `paper` panel with a 2px `line-2` inset, 24px display date, neutral "Chỉ đọc" tag, plan-time + planned-count meta, 48px `font-num` percentage beside a 10px sage bar, ✓/→/× status markers, MIT-first ordering, `surface` reflection box with "Làm tốt ·" in success-ink and "Cải thiện ·" in accent-ink, and the three empty states |
| `settings-controls_*` | `settings_default` | **close** — `surface` panels at `radius-panel`, 20px display titles, 46px pill selects, 54×32 success switch, ink-filled day-end chip, `line-2` segmented theme control. **Difference:** the 00:00 chip is labelled "Nửa đêm" (the task file's binding spec for `DayEndChips`) where the design's Settings screen prints "00:00"; onboarding step 3 in the design uses "Nửa đêm", so one component now serves both |
| `plan-window-timeline_*` | `settings_default` | **matches** — 16px `line-2` track, `success` segment 25% → 91.67% for the evening default, 3px accent marker overhanging ±5px, three labels and the sentence. The sentence prints the raw `03:00`, as the design does |
| `onboarding_*` | `onboarding_step1` | **matches** — 48px icon circle (accent fill when chosen), 17px title, 14px body, 12.5px window note, `surface` fill + 2px accent ring on the selected card and a `line` ring otherwise; dots 10→34px; 44px time chips; the summary's `surface` rows and 50px accent CTA |
| `phase2-notice_*` | `goals_phase2` | **matches** — 2px dashed accent border at `radius-card`, solid uppercase "Phase 2" pill, 13.5px ink-2 line |

## New findings

1. **`ui.shadcn.com` is reachable again (Moderate, logged).** The Phase 3 discovery that the
   registry times out no longer holds on this machine; `pnpm exec shadcn add` ran cleanly and
   touched nothing outside `src/components/ui/`. The rule stands: try the CLI first, check
   `components.json → tailwind.css` before running it, diff the token files afterwards — and
   **expect to rewrite what it generates**, because the generated components are shadcn-styled,
   not token-styled, and reintroduce the `--accent` hover clash.
2. **Base UI's `RadioGroup` cannot report a click on the already-selected item.** The energy
   scale has to clear itself when level 4 is clicked twice, so `ReflectionForm` puts an
   explicit `onClick` on each `Radio.Root` that sets energy 0 when it is already on.
   `onValueChange` alone never fires for that click.
3. **RTL's `rerender` drops a hand-rolled wrapper.** `renderWithClock` must pass the provider
   through `RenderOptions.wrapper`, not wrap `ui` itself, or any test that rerenders loses the
   clock and `useClock()` throws.
4. **Grid/gridcell roles do not survive a column-major layout.** The heatmap is laid out as one
   flex column per week, which is not a `role="grid"` row structure; it uses `role="group"` plus
   per-cell `aria-label` and a roving tabindex instead, which is what `components.md` asks for.
5. **`react-day-picker` takes a `today?: Date` prop**, which is all that was needed to close the
   Phase 3 open issue about the calendar's "today" cell.

## Decisions made

- **`DayEndChips` renders six chips, 00:00…05:00, with 00:00 labelled `onboarding.step3.midnight`**
  — the task file's spec, which overrides the Settings screenshot (that prints "00:00") and makes
  one component serve both Settings and onboarding step 3.
- **`formatHourLoose` is used at the call site, not inside `PlanStatus`.** Phase 3's component
  prints what it is given and its API may not change, so the gallery passes
  `formatHourLoose('03:00')`. The timeline sentence keeps the raw `HHMM`, as the design does.
- **`Heatmap`, `WeekdayChart`, `InsightCard` and `CalendarMonth` render their own section card**
  (title, legend, hint). None of them takes a title prop in the contract, so the copy key is
  chosen from `weeks` / the component identity.
- **Future heatmap cells render as empty spans, not hidden buttons**, so the DoD's "no cell
  button for any date after today" is true of the DOM and not only of the pixels.
- **A carried task's row in step 3 shows `postponedCount + 1`** — the move has not happened yet,
  and the design's "dời 4 lần" is the count the task will have tomorrow.
- **`src/components/settings/Switch.tsx` wraps `src/components/ui/switch.tsx`** rather than
  re-exporting it, so the contract's `ariaLabel` / `onCheckedChange(v)` signature is honoured
  without leaking Base UI's event-details argument.
- **Copy keys added** (Minor, same tone): `common.remove` ("Xóa"), `ritual.stepperAria`
  ("Tiến trình"), `history.calendarAria` ("Lịch tháng") — all accessible names, none rendered.
- **Fixtures**: `statsDays()` / `newUserDays()` generate deterministic pseudo-random history from
  a sine hash so the gallery never moves between runs; October 1–2 are pinned to the design's
  84% / 100% so `calendar-month` and `day-detail` can be compared with `history_default`.

## Open issues

- `TaskInput` shows its quick-add syntax row in ritual step 3, where the design does not. Fixing
  it means a `scope`-dependent behaviour change in a Phase 3 component — a one-line change
  whenever that is allowed.
- `DayDetail` prints "Năng lượng —/5" when the day has no reflection; the design only ever shows
  a real number there. Harmless, but Phase 5 may prefer to drop the row entirely.
- `ui/select.tsx` keeps Base UI's `alignItemWithTrigger={false}`: the aligned-to-trigger mode
  jumps the popup over the trigger, which looks wrong against a 46px pill.
- Still pre-existing: `@types/node` is v20 while vitest 5 wants ≥22; `esbuild` is an ignored
  build script under pnpm.

## Input for the next phase (Phase 05 — screens)

- **Everything in `src/components/` is presentational and prop-only.** Phase 5's screens own the
  state, call the domain and feed these components. Two working references for the loop:
  `src/app/dev/components/Playground.tsx` (Today) and `RitualPlayground.tsx` (the ritual +
  `closeDay`, including how `otherTargets` is collected).
- **Mount a `ClockProvider` at the top of the app shell** with the real `now`, `logicalDate(now, settings)`
  and the user's settings. `useClock()` throws without it, so any screen rendering `TaskItem`,
  `DatePicker`, `ReviewRow`, `Heatmap` or `CalendarMonth` needs it. Tests use `renderWithClock`.
- **The stats numbers do not exist yet.** `StatCard`/`Heatmap`/`WeekdayChart`/`InsightCard` take
  ready values; Phase 5 (or a later phase) has to compute the 7/30-day averages, the deltas, the
  per-weekday averages and the insight sentences from `buildDaySummaries` + the task list.
- `DayDetail` needs `planTiming` — derive it from the first task's `createdAt` via
  `classifyPlanTiming` (which returns `'evening' | 'morning' | 'late'`; the component takes the
  first two).
- Phase 2 screens stay placeholders; `Phase2Notice` is the only piece they get.
- Supabase and the Supabase MCP were not touched.
