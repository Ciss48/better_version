# Phase 02 report — Domain logic

**Date:** 2026-10-04 · **Commit:** `phase-02: domain`

## What was done
`src/domain/` now holds every business rule from `docs/plan.md` §2 as pure TypeScript —
no React, no I/O, no clock reads — with one test file per module.

Files created (exactly the layout in the task file):

| File | Contents |
|---|---|
| `types.ts` | all locked types (`Task`, `Settings`, `Mutation`, `Ctx`, `TaskEvent`, …) |
| `errors.ts` | `DomainError` + `DomainErrorCode` |
| `events.ts` | `makeEvent` |
| `settings.ts` | `DEFAULT_SETTINGS`, `settingsForHabit`, `validateSettings` |
| `time.ts` | `localParts`, `zonedInstant`, `addDays`, `isoWeekday`, `isLateNight`, `logicalDate`, `planWindow`, `isLocked`, `minutesToLock`, `classifyPlanTiming`, `reminderAt` |
| `weights.ts` | `taskWeight`, `completion`, `quadrantOf`, `flagsForQuadrant` |
| `quick-add.ts` | `parseQuickAdd` |
| `tasks.ts` | `activeMitCount`, `createTask`, `toggleDone`, `patchTask`, `moveTask`, `dropTask`, `restoreTask` |
| `date-chips.ts` | `dateChipOptions`, `DateChipKey` |
| `ritual.ts` | `ritualRemaining`, `closeDay`, `CloseDayInput` |
| `banners.ts` | `selectBanners`, `BannerInput`, `BannerVariant` |
| `summary.ts` | `summarizeDay`, `buildDaySummaries`, `consistency` |
| `index.ts` | the public barrel — exactly the contract's names, nothing more |
| `__tests__/helpers.ts` | `task()`, `ctx()`, `settings()`, `idGen()` fixture builders |
| `__tests__/*.test.ts` | 12 test files, 140 tests |

Also changed: `package.json` (added `date-fns@4.4.0`, `@date-fns/tz@1.5.0`,
`@vitest/coverage-v8`, script `test:coverage`), `pnpm-lock.yaml`, `vitest.config.ts`
(v8 coverage, `include: ['src/domain/**']`, `exclude: ['src/domain/__tests__/**']`).
Nothing outside those paths and `memory/` was touched.

Implementation notes worth knowing:
- All wall-clock maths goes through `@date-fns/tz`'s `TZDate`. **`TZDate.prototype.toISOString()`
  returns an offset string (`…+07:00`), not `Z`** — `zonedInstant` therefore returns
  `new Date(zoned.getTime())`, a plain `Date`. Never hand a `TZDate` to a caller.
- `addDays` / `isoWeekday` use UTC-midnight millisecond arithmetic, so they are immune to
  the host machine's timezone and to DST in the user's zone.
- Logical dates are compared with plain string `<`/`>` (`'YYYY-MM-DD'` sorts correctly).
- `hhmmToMinutes` is module-private in `time.ts` so the barrel exports exactly the contract.

## Results (Definition of Done)
| Check | Result |
|---|---|
| `pnpm lint` | exit 0, no warnings |
| `pnpm typecheck` | exit 0 |
| `pnpm test` | exit 0 — 13 files, **148 tests** (140 domain + 8 pre-existing `copy.test.ts`) |
| `pnpm build` | exit 0, 12 routes still static |
| `pnpm test:coverage` for `src/domain/**` | **lines 100%**, statements 99.66%, branches 99.51%, functions 100% (≥90% required) |
| `grep -rnE "new Date\(\)\|Date\.now\(" src/domain --include='*.ts' \| grep -v __tests__` | no matches |
| `grep -rnE "from ['\"](react\|next\|@supabase)" src/domain` | no matches |
| `index.ts` exports every contract name | asserted by `__tests__/index.test.ts` (and that it exports *nothing else*) |
| `git diff --stat` scope | only `package.json`, `pnpm-lock.yaml`, `vitest.config.ts` + new `src/domain/`, `memory/` |

Every fixture listed in Steps 3–10 of the task file exists as a passing test:

- **Step 3 (time):** all ten fixtures, incl. the two `dayEnd` variants of
  `2026-10-03T18:00:00Z`, both habits' `planWindow`, the `isLocked` second-boundary pair,
  `minutesToLock` = 105, the three `classifyPlanTiming` instants, the
  `America/New_York` lock at `2026-10-04T14:00:00.000Z`, and both `isoWeekday` values.
- **Step 4 (weights):** the six-task day → `{ pct: 64, done: 2, total: 4 }`; empty → zeroes;
  adhoc-only → zeroes; q1–q4 round-trips.
- **Step 5 (quick-add):** all eight fixtures.
- **Step 6 (tasks):** 4th MIT via `createTask` and via `patchTask`; dropped/moved MIT not
  counted; adhoc when locked; a move that preserves flags and lifts `postponedCount`
  2 → 3; a move into a day that already has 3 MITs; restore-moved deleting the copy vs a
  copy already `done` throwing `cannot_restore`; every mutation's event types and `taskId`s;
  every throw (`empty_title`, `not_tickable`, `not_movable`, `invalid_move_date`,
  `cannot_restore`).
- **Step 7 (date chips):** Sat `2026-10-03`, Fri `2026-10-02`, Sun `2026-10-04` as specified,
  plus Mon `2026-10-05` and Tue `2026-10-06`.
- **Step 8 (ritual):** the undecided throw; the full scenario (done / moved to tomorrow with
  the MIT override off / moved to 10-10 / adhoc dropped / 2 new tomorrow tasks / 3 existing
  tomorrow MITs → the new MIT downgraded with exactly one notice); `day_closed` payload
  equal to `completion(todayTasks after decisions)` (`{ pct: 25, done: 1, total: 3 }`);
  unique ids in `upserts`.
- **Step 9 (banners):** one test per rule, plus planReminder suppressing ritual, dismissal,
  the morning habit targeting today, late-night 01:00 showing ritual, and missed+complete
  stacking in contract order.
- **Step 10 (summary):** moved-only planned day → `hasPlan true, pct 0`; a 30-day range
  yielding 30 entries; `consistency` ignoring day −30 and the future.

## New findings
1. **`TZDate.toISOString()` is offset-formatted** (see above). This bit once during
   development; the domain now always converts to a plain `Date`. Phase 3's
   `src/lib/format.ts` must do the same.
2. **A Monday only gets three date chips.** `nextMonday` for a Monday is `today+7`, which
   equals `plusWeek`, so the dedupe rule hides `plusWeek`. Saturday hides `plusWeek` too
   (weekend is `today+7`). Only Tue–Fri show all four. Phase 3's DatePicker must not assume
   a fixed chip count.
3. **`minutesToLock` and `isLocked` agree exactly at the boundary** — `minutesToLock`
   returns `null` for `diff <= 0`, which is the same instant at which `isLocked` flips true.
   No one-minute window where a countdown shows `0`.
4. **`activeMitCount` is deliberately status-based, not flag-based.** A dropped or moved MIT
   frees a slot. That is what makes `restoreTask` able to push a day to 4 MITs — restoring a
   dropped MIT does not re-check the limit, because the contract gives `restoreTask` no
   `dayTasks` argument. Left as specified; flagged here for Phase 4.
5. The pre-existing Vite warning *"ESM syntax in a file loaded as CommonJS
   (vitest.config.ts:1:1)"* still prints on every test run. It predates this phase (the file
   was already ESM) and is cosmetic; fixing it means `"type": "module"` in `package.json`,
   which is a Next.js-wide decision, so it was left alone.

## Decisions made (ambiguous rules and how the tests encode them)
- **`patchTask` hitting the MIT limit with no other change** returns
  `{ upserts: [], deletes: [], events: [], notices: ['mitLimit'] }`. The contract says both
  "no-op patch → no event, no upsert" and "notice `'mitLimit'`"; the notice is kept because
  it is the only feedback the user gets that the tap was refused.
  Test: *"still notices the MIT limit when nothing else changes"*.
- **`patchTask` MIT downgrade only fires on an actual promotion.** `patch.mit === true` on a
  task that is already a MIT is a no-op and produces no notice, even in the (impossible)
  case that the rest of the day already holds 3 MITs. The task itself is always excluded
  from the count. Test: *"excludes the patched task itself from the MIT count"*.
- **`closeDay`: the moved original keeps its own `mit`; only the copy takes the override.**
  `tomorrowMit` is described as "MIT overrides for tasks moved to date+1", and the original
  is a historical record of what was planned for the day being closed.
  Tests: *"keeps a MIT override that switches a non-MIT task on"* asserts
  `copy.mit === true` and `original.mit === false`.
- **`closeDay` deduplicates its whole `notices` list,** not just `mitLimit`. The contract
  only demands "notice at most once" for `mitLimit`, and a duplicate toast is never useful.
- **`closeDay` passes an empty target day to `moveTask` for any date other than date+1,** so
  the MIT flag survives such a move. Logged as a Moderate discovery (see below).
- **Event payloads the contract left unspecified:** `task_completed`, `task_uncompleted` and
  `task_dropped` carry `{}`. The event's `type`, `taskId`, `planDate` and `occurredAt`
  already say everything; `completedAt` lives on the task row.
- **`validateSettings` returns English developer diagnostics,** one string per problem, in a
  fixed order (format checks first). Logged as a Moderate discovery.
- **`validateSettings` checks only the five rules listed in the contract** — it does not
  validate `timezone`, `theme` or `onboardedAt`. An unknown IANA zone would throw inside
  `TZDate` instead; Phase 4/5 should validate the zone where it is chosen.
- **`buildDaySummaries` returns `[]` for an inverted range** (`from > to`) rather than
  throwing. Test: *"returns an empty list when the range is inverted"*.
- **`consistency` filters by date itself** (`[today−29, today]`) instead of trusting the
  caller's range, so passing a 40-day list of summaries still yields `total: 30`.
- **The ritual banner's 18:00 threshold is a module constant,** not a setting —
  `remindRitual` is explicitly "stored but only used by future push notifications" in
  `docs/plan.md`.

## Open issues
- **Moderate, unresolved:** `closeDay` cannot enforce the MIT limit for moves to any date
  other than date+1 (`memory/discoveries.md`). Needs a planning decision before Phase 4
  builds the ritual screen: extend `CloseDayInput` with the target days' tasks, or accept
  the over-limit day.
- **Moderate, resolved:** `validateSettings`'s English strings must not be rendered to the
  user (`memory/discoveries.md`).
- `restoreTask` does not re-check the MIT limit (finding 4) and cannot, with its current
  signature. Restoring a dropped MIT into a day that already has 3 is possible.
- Nothing in the domain knows about `@tên-mục-tiêu`, recurrence or reminders — all
  out of scope by the task file.

## Input for the next phase
- **Import everything from `@/domain`.** The barrel is the contract; `index.test.ts` fails if
  a name is added or removed, so Phase 3/4 will notice contract drift immediately.
- **Every mutating function returns `Mutation`** (`upserts` / `deletes` / `events` /
  `notices`). The repository persists one `Mutation` as a single unit; the store turns
  `notices` into toasts (`adhocAdded` → `today.adhoc.*`, `mitLimit` → the MIT-limit copy).
  `closeDay` additionally returns `dayLog`.
- **`Ctx` must be built once per action** (`{ now, settings, newId }`). Phase 4's `?now=`
  clock override just feeds a different `now`; `newId` should be `crypto.randomUUID`.
- **The UI must never re-derive** `%`, lock state, logical date, MIT limits, banner choice
  or chip dates. `completion()` gives `{ pct, done, total }` for "x/y việc đã định";
  `minutesToLock()` gives the countdown; `dateChipOptions()` gives the chips and their keys
  (map the key to copy, not the date).
- **Display formatting is Phase 3's job** (`src/lib/format.ts`): the domain returns
  `ISODate` strings, `Date` instants and raw numbers only.
- **`selectBanners` needs aggregate inputs the repository must provide:**
  `firstPlanDate` (earliest date with ≥1 planned task, ever), `yesterdayHasPlan`,
  `todayClosed` and `planReminderDismissedOn` (client-side, per logical day).
- **`classifyPlanTiming`** exists for Phase 6's plan-timing insight; the "first planned at"
  instant is derived as `min(created_at)` over planned tasks, per the data-model sketch.
