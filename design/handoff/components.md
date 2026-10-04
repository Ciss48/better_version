# Components — Better Every Day

Stack: React + TypeScript + Tailwind v4 + shadcn/ui. Every token below is defined in `tokens.css`. Copy lives in `copy.vi.json` (the key is shown in brackets). Animation specs are in `motion.md`.

Shared types:

```ts
type Size = 'S' | 'M' | 'L';
type TaskStatus = 'todo' | 'done' | 'moved' | 'dropped';
interface Task {
  id: string; title: string;
  important: boolean; urgent: boolean; mit: boolean; size: Size | null;
  status: TaskStatus; postponedCount: number;
  adhoc: boolean;            // "Phát sinh" — added after the plan locked
  addedAt?: string;          // "14:10"
  movedTo?: string;          // ISO date
}
type Quadrant = 'q1' | 'q2' | 'q3' | 'q4'; // q1 I+U, q2 I, q3 U, q4 none
type Decision = { kind: 'move'; date: string } | { kind: 'drop' };
```

**Weighted completion** (used by ProgressBar, StatCard, Heatmap and CalendarMonth):
- Weight = S 1 · M 2 (also when size is null) · L 3, multiplied by 2 for MIT.
- `pct = Σweight(done) / Σweight(status ≠ dropped)`.
- The calculation only covers planned tasks, so `adhoc` tasks are excluded.
- `moved` counts as not done.

Global rules:
- **Focus:** a 2px `--accent` outline with 2px offset.
- **Disabled:** opacity .45 and `cursor: not-allowed`.
- **Hover:** `bg-hover`.
- **Touch targets:** at least 44px on mobile.

---

## AppShell
**Purpose.** The app frame, which switches layout based on the width of the **app container** (not the viewport).
```ts
interface AppShellProps { view: ViewKey; onNavigate(v: ViewKey): void; theme: 'light'|'dark'|'system'; onToggleTheme(): void; consistency: { days: DaySummary[]; planned: number }; children: ReactNode }
type ViewKey = 'today'|'ritual'|'stats'|'history'|'settings'|'onboarding'|'goals'|'weekly'|'more';
```
**Layout.**
- At ≥720px: a 248px sidebar (`bg`) and a main "paper" sheet with `radius-panel` and a 12px margin.
- At <720px: a top bar (logo + theme toggle), full-width paper, and a fixed 5-tab bottom bar (Hôm nay · Buổi tối · Hành trình · Lịch sử · Thêm).

**States.** The bottom bar is hidden in `ritual` and `onboarding`, and the sidebar is hidden in `onboarding`.

**Nav items.**
- Active item: `bg-paper` with weight 600.
- Phase 2 items carry a "Phase 2" tag (`nav.tag.phase2`).

**A11y.** Use `<nav aria-label>`, `aria-current="page"` on the active item, and give the tabs `aria-label` text.

## NavItem
```ts
{ icon: LucideIcon; label: string; active?: boolean; tag?: string; onClick(): void }
```
- **Look:** a 42px pill. Icons are Lucide at stroke-width 2.75, 18px.
- **States:** default, hover (`bg-hover`), active, focus.

## ConsistencyMini (sidebar)
```ts
{ days: { date: string; hasPlan: boolean; pct: number; isToday: boolean }[] /* 30 */ }
```
- **Content:** "26/30 ngày có plan" plus a 10×3 grid of dots. Dot colours follow the Heatmap scale; a day without a plan is an empty dot with a `line` ring; today gets an accent ring.
- **Rule:** the score never resets — it replaces the streak.

## Banner
**Purpose.** Contextual messages at the top of Today.
```ts
interface BannerProps { variant: 'ritual'|'planReminder'|'missedDay'|'complete'|'welcome'; title: string; body?: string; primary?: { label: string; onClick(): void; kbd?: string }; secondary?: { label: string; onClick(): void } }
```
| variant | Background | Shown when | Copy |
|---|---|---|---|
| ritual | surface | now ≥ 18:00, day not closed, no planReminder | `today.ritualBanner.*`; CTA opens the ritual (E) |
| planReminder | accent-soft + bell icon on accent | inside the planning window, now ≥ `remindPlan`, no plan for tomorrow, not dismissed | `today.planReminder.*`; "Để sau" dismisses it for the day |
| missedDay | accent-soft | yesterday had no plan | `today.missed.*` (no CTA, never reproachful) |
| complete | success-soft + 2 decorative circles | 100% of the plan done | `today.complete.*` |
| welcome | surface | new user with no plan | `today.welcome.*` + 3 step cards + CTA to onboarding |

Priority: planReminder > ritual. Missed, complete and welcome can stack.

**A11y.** `role="status"`. Don't pull focus.

## PlanStatus
```ts
{ locked: boolean; lockAt: string; timeLeft?: string; lateNight?: { dayEnd: string } }
```
- **Open:** a sage pill "Đang mở · khóa lúc 10:00" plus "còn 1 giờ 45 phút để chỉnh plan".
- **Locked:** a neutral pill with a lock icon, "Plan đã khóa lúc 10:00", plus the hint "Việc thêm mới sẽ vào nhóm Phát sinh".
- **lateNight** (current time is between 0:00 and dayEnd):
  - the date stays on the previous day;
  - the kicker reads "Vẫn là hôm nay · 01:00 sáng Chủ Nhật";
  - an accent-soft pill with a moon icon reads "Ngày của bạn kết thúc lúc 3:00".

## ProgressBar
```ts
{ value: number /*0–100*/; done: number; total: number; size?: 'md'|'sm' }
```
- **Number:** `font-num` 44px, with the % sign at 22px in `ink-3`.
- **Track:** 10px tall, pill-shaped, `line-2`; the fill is `success`.
- **Tooltip** (`title` or shadcn Tooltip): "MIT ×2 · L=3, M=2, S=1 · Việc phát sinh không tính".
- **Motion:** the width animates over 600ms with `ease-out-soft`.
- **A11y:** `role="progressbar" aria-valuenow`.

## TaskInput (QuickAdd)
```ts
{ locked: boolean; onAdd(t: ParsedTask): void; placeholder?: string; autoFocusKey?: 'n' }
interface ParsedTask { title: string; mit: boolean; important: boolean; urgent: boolean; size: Size|null }
```
- **Look:** a 54px pill on `bg` with a 2px border (`line`, switching to `accent` on focus), a + icon on the left and a round 40px Enter button in `ink` on the right.
- **Inline syntax:** separate tokens with spaces — `*` MIT, `!` Quan trọng, `^` Gấp, `~S ~M ~L` size. They can be combined (`!^`). When the input contains tokens, preview chips (accent-soft) appear inside the field.
- **Behaviour:**
  - Enter adds the task and clears the field.
  - If the plan is locked, the new task becomes `adhoc` with `addedAt = now` and the toast "Đã thêm vào nhóm Phát sinh" appears.
  - If there are already 3 MITs, the task is added as a normal task with a toast.
- **Shortcuts:** `N` or `/` focuses the field; Esc blurs it.
- **States:** default, focus, locked (the hint row adds `today.input.lockedHint` in accent-ink).

## TaskItem
```ts
interface TaskItemProps { task: Task; expanded: boolean; onToggleExpand(): void; onToggleDone(): void; onPatch(p: Partial<Task>): void; onMove(date: string): void; onPickDate(anchor: HTMLElement): void; onDrop(): void; onRestore(): void }
```
**Anatomy.**
- A round 24px checkbox (2px border).
- The title (15.5px, `text-wrap: pretty`).
- A meta row: chips "Quan trọng" (solid outline) and "Gấp" (dashed outline), plus "thêm lúc 14:10" (adhoc), "đã dời n lần" (n = 1–2), the warning chip "Dời 3 lần · chia nhỏ hoặc cân nhắc bỏ?" (n ≥ 3, accent-soft), and the status line "Đã dời → T4 14/10" or "Đã bỏ".
- A round size badge on the right.

**Toolbar** (when `expanded`, indented 48px):
- toggles "★ MIT", "Quan trọng" and "Gấp" (when active: fill `ink`, text `bg`);
- a segmented S/M/L control;
- actions "Dời sang mai", "Ngày khác…" (opens the DatePicker) and "Bỏ";
- when the task is moved or dropped, only "Khôi phục" is shown.

**States.**

| State | Treatment |
|---|---|
| default | — |
| hover | `bg-hover` |
| expanded | `bg-hover` + toolbar |
| done | sage checkbox, `ink-3` title with a strike line (colour transition) |
| moved / dropped | `ink-3` title, `line` checkbox, not tickable; dropped also gets the strike line |
| adhoc | — |
| postponed ≥3 | warning chip |
| focus | focus ring |

**Rules.** At most 3 MITs; trying to add a 4th shows the toast "Tối đa 3 MIT — bỏ bớt một việc trước nhé".

**A11y.**
- The checkbox is a `<button role="checkbox" aria-checked>` with an aria-label taken from the title.
- The row toggles with Enter or Space.
- The toolbar is a `role="toolbar"`.

## MITSection
```ts
{ tasks: Task[]; count: number /* active MITs */ }
```
- **Look:** a `surface` card with `radius-panel`, the heading "Việc quan trọng nhất" (display-sm) and the tag "2/3 MIT".
- **Empty state:** the hint `today.mit.empty`.
- **Content:** MIT tasks, including adhoc MITs.

## TaskGroup
```ts
{ variant: 'default'|'adhoc'; title: string; count?: number; doneCount?: number; tasks: Task[] }
```
- **adhoc:** a 2px dashed `line` border, the neutral tag "Phát sinh" and the note "Thêm sau giờ khóa · 1/2 xong · không tính vào tỉ lệ". It is deliberately non-punitive: no red, no warning icon.

## ViewToggle
```ts
{ value: 'list'|'matrix'; onChange(v): void }
```
- **Look:** a pill segmented control on `line-2`; the active segment is `paper` with `shadow-sm`.
- **Shortcut:** `M` switches between the two values.
- **Implementation:** shadcn ToggleGroup type="single".

## MatrixQuadrant
```ts
{ quadrant: Quadrant; title: string; subtitle: string; tasks: Task[]; note?: string; isDropTarget: boolean; onDropTask(id: string): void; onTapTask?(id: string): void; interaction: 'drag'|'tap' }
```
- **Grid:** `repeat(auto-fit, minmax(260px, 1fr))`, with a 12px gap and min-height 210.
- **Header:** title (display-xs) and subtitle on the left, count (`font-num`) on the right. Q2 gets the badge "Vùng của tiến bộ dài hạn" (success-soft).
- **Chips:** `paper` with `radius-row` and `shadow-sm`, holding a small 18px checkbox and tags MIT / phát sinh.
- **Interaction.**
  - Desktop (`drag`): drag a chip (HTML5 DnD, or dnd-kit with keyboard support). While a chip is over a quadrant, that quadrant fills with `matrix-drop` and gets a 2px `matrix-drop-ring` ring. The dragged chip is shown at opacity .4. Dropping sets `important`/`urgent`.
  - Mobile (`tap`): drag is disabled. Tapping a chip (outside its checkbox) opens MatrixBottomSheet.
- **Empty state:** the dashed box "Kéo việc vào đây".
- **A11y:** if you use dnd-kit, provide KeyboardSensor (Space to pick up, arrows to move, Space to drop) and `aria-describedby` with instructions.

## MatrixBottomSheet (mobile)
```ts
{ open: boolean; task: Task; current: Quadrant; onSelect(q: Quadrant): void; onClose(): void }
```
- **Container:** shadcn Drawer (vaul) with top corners at `radius-panel`, a 40×5 handle, the title "Chuyển sang ô…" and the task name as subtitle.
- **Body:** a 2×2 mini grid of buttons, at least 96px tall.
- **Current quadrant:** `matrix-current` fill, an accent ring and the label "Đang ở đây".
- **Behaviour:** tapping a quadrant moves the task, closes the sheet and shows the toast "Đã chuyển sang “Lên lịch”". "Hủy", Esc, tapping the scrim or swiping down all close it.
- **A11y:** `role="dialog"`, focus trap, and focus returns to the chip on close.

## DatePickerChips
**Purpose.** Moving a task, used in Ritual step 1 and the TaskItem toolbar.
```ts
{ value?: Decision; onChange(d: Decision): void; today: string; onOpenPicker(anchor: HTMLElement): void; allowDrop?: boolean }
```
**Chips:**
- "Mai" (today + 1)
- "Thứ 2 tới · 5/10" (next Monday)
- "Cuối tuần · 10/10" (next Saturday)
- "+1 tuần" (today + 7)
- "Chọn ngày…"
- "Bỏ"

**Dedupe rule.** When two chips resolve to the same date, keep the first one. Example: on a Saturday, "+1 tuần" equals "Cuối tuần", so it is hidden.

**Selection.**
- The selected chip has fill `ink` and text `bg`.
- When a custom date is picked, "Chọn ngày…" shows that date ("T4 14/10") and is selected.
- Picking the same chip again deselects it.

**A11y.** `role="radiogroup"`; each chip is a `role="radio"`.

## DatePicker (CalendarPicker)
**Purpose.** A shadcn `Calendar` (react-day-picker) restyled with the tokens.
```ts
{ selected?: string; onSelect(date: string): void; min: string /* tomorrow */; mode: 'popover'|'sheet' }
```
- **Calendar:**
  - The week starts on Monday, with labels T2…CN.
  - The header shows "Tháng 10, 2026" with 36px round prev/next buttons.
  - Day cells are 40px pills.
- **Day states:**
  - selected: `accent` / `on-accent`;
  - today: `accent-soft`, weight 600;
  - outside the month: `ink-3` at 60% opacity;
  - before `min`: opacity .35 and not selectable;
  - hover: `hover`.
- **Popover (desktop, ≥720px):**
  - shadcn Popover anchored to the chip, `align="start"`, 340px wide, `radius-card`, `shadow-lg`, 14px padding;
  - it flips upward when it would overflow the bottom;
  - choosing a day **commits immediately** and closes the popover.
- **Sheet (mobile):**
  - shadcn Drawer with the title "Dời sang ngày khác" and the task name;
  - choosing a day only **selects** it; the confirm button "Dời sang T4 14/10" is disabled (.45) until a day is selected;
  - a "Hủy" button closes it.
- **A11y:**
  - Use the `role="grid"` from react-day-picker.
  - Arrow keys move between days, PageUp/PageDown change month, Enter selects, Esc closes.
  - Focus returns to the chip on close.

## Stepper
```ts
{ steps: string[]; current: number; onStepClick(i: number): void /* only i < current */ }
```
- **Bars:** three 6px pill bars. Completed steps are `success`, the current step is `accent`, and future steps are `line`.
- **Labels:** each label carries a `font-num` number. The current label is `ink`; the others are `ink-3`.
- **Navigation:** clicking an earlier step goes back to it (pointer cursor). Future steps are not clickable.
- **A11y:** `<ol aria-label="Tiến trình">` with `aria-current="step"` on the current step.

## ReviewRow (Ritual step 1)
```ts
{ task: Task; decision?: Decision; onToggleDone(): void; onDecide(d: Decision|undefined): void }
```
- **Background by state:** done → `success-soft`; undecided → `surface`; decided → `line-2`.
- **Content:** a checkbox, the title, MIT / Phát sinh tags, and DatePickerChips (only when the task isn't done).
- **Nudge:** when `postponedCount ≥ 3` and the decision isn't "Bỏ", show the accent-soft box "Việc này đã dời 3 lần…".
- **Re-opening:** ticking done clears any decision.

## RitualFooter
```ts
{ remaining: number; onNext(): void; onBack?(): void; primaryLabel: string }
```
- **Layout:** sticky to the bottom on `paper`. The left side shows "Còn 2 việc cần quyết định" in accent-ink, or "Đã xử lý hết — sẵn sàng khép ngày" in success-ink.
- **Gate:** in step 1 the primary button "Tiếp tục" is **disabled** (`aria-disabled`, .45) while `remaining > 0`. Clicking it anyway shows the toast `ritual.step1.blocked`.
- **Steps 2–3:** add "Quay lại" as a ghost button.

## ReflectionForm (Ritual step 2)
```ts
{ energy: 0|1|2|3|4|5; good: string; improve: string; onChange(p): void }
```
- **EnergyScale:** five 52px circles labelled 1–5 (Cạn kiệt · Hơi mệt · Bình thường · Khá tốt · Tràn đầy). The selected one is filled `success` and scales to 1.08. Clicking it again deselects it. Implement as a radiogroup.
- **Inputs:** two pill inputs, 50px tall. Every field is optional.
- **Primary button:** reads "Bỏ qua" while everything is empty, "Tiếp tục" otherwise.

## TomorrowPlanList (Ritual step 3)
```ts
{ items: { id: string; title: string; mit: boolean; carried: boolean; postponedCount: number }[]; onToggleMit(id): void; onRemove(id): void; onAdd(t: ParsedTask): void }
```
- **Rows:** `surface` with `radius-tile`.
- **Star button:** 36px round; when MIT it is filled `accent` with a star in `on-accent`.
- **Tags:** "Dời từ hôm nay", and "dời 4 lần · thử chia nhỏ?" (nowrap) when the count is ≥3.
- **Remove:** an X, only on newly added items.
- **Header and input:** a "2/3 MIT" counter above the list and a TaskInput below it (`*` marks an MIT).

## RitualSummary
- **Content:**
  - the kicker "Đã khép lại …";
  - the % in `num-xl`;
  - a headline chosen by % (≥100 / ≥75 / ≥50 / <50 — see `ritual.summary.headline.*`);
  - 4 stat tiles;
  - a quote of "Làm tốt" if one was written;
  - a "Ngày mai đã sẵn sàng" card listing tomorrow's MITs;
  - the consistency line.
- **Decoration:** 2 soft circles (success / accent at opacity .22–.28).

## StatCard
```ts
{ label: string; value: string|number; unit?: '%'; delta?: { value: number; label: string }; note?: string; loading?: boolean; empty?: boolean }
```
- **Look:** `surface` with `radius-card`, the value in `num-md`.
- **Delta:**
  - when ≥0: a success-soft tag "+6 điểm so với kỳ trước";
  - when <0: a **neutral** tag (line-2), never red.
- **Empty state:** the value shows "—", with no delta.

## Heatmap
```ts
{ days: DaySummary[]; weeks: 26 | 13; onSelectDay(date: string): void }
interface DaySummary { date: string; hasPlan: boolean; pct: number; isToday?: boolean }
```
- **Grid:** columns are weeks and rows are T2→CN, with row labels on T2/T4/T6/CN and month labels ("thg 9") on the first week of each month.
- **Cells:** round, 17px with a 5px gap on desktop (26 weeks); 20px with a 4px gap on mobile (13 weeks).
- **Cell states:**
  - before first use: `heat-empty`;
  - no plan: transparent with a 1.5px dashed `heat-none` ring;
  - with a plan: heat-1…4 by % (<40, <60, <80, ≥80);
  - today: a 2px accent outline;
  - future: hidden.
- **Legend:** "Không plan · Thấp ○○○○ Cao".
- **Click:** opens History for that day.
- **A11y:** each cell is a button with `aria-label="Thứ Năm, 1/10 · 72%"`. Arrow keys move between days (roving tabindex).

## WeekdayChart
```ts
{ values: { label: 'T2'|…|'CN'; pct: number|null }[] }
```
- **Bars:** pill-shaped, 44px max width, height = pct×1.5px (minimum 8). The best day is `success`, the rest `heat-2`. The value sits above each bar and the label below.
- **Empty state:** "—" in place of values.

## InsightCard
```ts
{ items: { text: string; tone: 'success'|'accent' }[]; empty?: boolean }
```
- **Content:** sentences, each led by a 10px dot. Generated from data — see `stats.insights.*` (templates with `{n}`).
- **Empty state:** `stats.insights.empty`.

## CalendarMonth (History)
```ts
{ month: string /* YYYY-MM */; days: DaySummary[]; selected: string; onSelect(d): void; minMonth: string; maxMonth: string }
```
- **Look:** a 7-column grid with cells of `radius-tile`, 62px tall on desktop and 46px on mobile (where the % line is hidden).
- **Cell states:**
  - fill follows the heat scale (text is `on-accent` from heat-3 up);
  - no plan: dashed ring;
  - today: 2.5px accent inset;
  - selected: 3px `ink` inset;
  - future: opacity .35.
- **Month header:** "26/30 ngày có plan · TB 66%". The prev/next buttons are disabled at the limits.

## DayDetail (History, read-only)
- **Content:**
  - the date, the "Chỉ đọc" tag and the plan time;
  - the % with a progress bar;
  - the task list, each with a status icon (✓ sage / → dời sang… / × đã bỏ);
  - a reflection box: energy plus "Làm tốt" / "Cải thiện".
- **States:**
  - no plan: `history.noPlan`;
  - today: `history.today` + CTA;
  - no reflection: `history.noReflection`.

## EmptyState
```ts
{ title: string; body?: string; variant?: 'dashed'|'soft' }
```
- **Look:** a 2px dashed `line` border with `radius-card`, the title in display-sm and the body in ink-2.
- **Used for:** a Today with no plan, a tomorrow with no tasks, the empty matrix drop zone, and a day with no plan in History.

## Toast
- **Look:** a pill on `ink` with `bg` text and `shadow-lg`, centred at the bottom (bottom 24px; 92px above the tab bar on mobile). It closes itself after 2.6s.
- **Implementation:** shadcn Sonner styled with the tokens.
- **A11y:** `role="status" aria-live="polite"`.

## SettingsSection, Segmented, TimeSelect, Switch
- **SettingsSection:** a `surface` card with `radius-panel`, a display title and a description.
- **Segmented:** see ViewToggle.
- **TimeSelect:** a shadcn Select, 46px pill.
- **Switch:** 54×32, `success` when on.
- **PlanWindowTimeline:**
  - a 16px track covering 12:00 the day before to 12:00 on day D;
  - the window between "mở" and "khóa" is drawn as a `success` segment;
  - a 3px accent marker shows when the day ends;
  - plus a one-line explanation sentence.

## Onboarding
- Three steps:
  1. **HabitCard** (radio card): a 48px icon, title, description and window note; selected state has `surface` fill and an accent ring.
  2. **TimeChips** for the two reminders.
  3. Day-end chips, with an example sentence in `success-soft`.
- After the steps, a summary screen.
- **Progress:** three dots; the current one stretches to 34px.
- "Bỏ qua, dùng mặc định" is always available.

## Phase 2 — GoalCard, WeeklyReview (placeholder only)
- Every Phase 2 screen opens with a **Phase2Notice**: a 2px dashed `accent` border and a solid "Phase 2" tag with the line "Thiết kế sơ bộ — không thuộc MVP…".
- These components are not developed further. The goal-linking syntax `@tên-mục-tiêu` is not implemented.

## Keyboard shortcuts (global, ignored while focus is in an input)
| Key | Action |
|---|---|
| N or / | Focus TaskInput (Today, list view) |
| M | Switch List / Matrix |
| E | Open the evening ritual |
| T | Switch light / dark theme |
| Esc | Close popover/sheet → close ritual → collapse TaskItem; inside an input: blur |
| Enter | Submit TaskInput / select a day in the DatePicker |
