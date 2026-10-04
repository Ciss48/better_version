# Screens — Better Every Day

**Layout rule.** The layout switches on the width of the **app container**: ≥720px is "desktop" (sidebar), <720px is "compact" (bottom tabs).
- Desktop content max-width: Today/Ritual 760px, Stats/History/Settings/Phase 2 1080px, Onboarding 640px.
- Main padding: 44px on desktop; 20px 16px on mobile, with 110px bottom padding to clear the tab bar.

**Screenshots** live in `screenshots/desktop/` (1280px wide, full content height) and `screenshots/mobile/` (390×844). File names follow `<screen>_<state>_<light|dark>.png`.

| Screen | Scope |
|---|---|
| Today (Hôm nay) | **MVP** |
| Today – Eisenhower matrix | **MVP** |
| Evening ritual (Nghi thức buổi tối) | **MVP** |
| Journey / Stats (Hành trình) | **MVP** |
| History (Lịch sử) | **MVP** |
| Settings (Cài đặt) | **MVP** |
| Onboarding | **MVP** |
| "More" menu (mobile) | **MVP** (holds Settings + Phase 2 entries) |
| Goals (Mục tiêu) | **Phase 2** — placeholder, carries the Phase 2 label |
| Weekly review (Tổng kết tuần) | **Phase 2** — placeholder, carries the Phase 2 label |

---

## 1. Today — `today`
**Components:**
- AppShell
- PlanStatus
- ProgressBar
- Banner (ritual / planReminder / missedDay / complete / welcome)
- TaskInput
- ViewToggle
- MITSection
- TaskGroup (default, adhoc)
- TaskItem
- EmptyState
- DatePicker (popover/sheet from "Ngày khác…")
- Toast

**Desktop layout, top to bottom:**
1. A header row: kicker + H1 date + PlanStatus on the left, ProgressBar (≤280px) on the right, wrapping when narrow.
2. Banners.
3. TaskInput (flex 1, min 320) and ViewToggle on one row.
4. MITSection.
5. "Các việc khác".
6. "Phát sinh".

**Mobile layout:** the same order in one column. The H1 is 30px, the ProgressBar takes the full width, and ViewToggle wraps under the input.

| State | Trigger | Screenshot |
|---|---|---|
| Plan locked + adhoc tasks | now > lockAt, adhoc tasks exist | `today_locked-adhoc` |
| Planning window open | now < lockAt | `today_window-open` |
| No plan today | 0 tasks, window open | `today_empty` |
| Missed day | yesterday had no plan | `today_missed-day` |
| 100% complete | pct = 100 | `today_complete-100` |
| New user | no history, onboarding not done | `today_new-user` |
| After midnight, before day end | 0:00 ≤ now < dayEnd → still shows the previous day + "Ngày của bạn kết thúc lúc 3:00" | `today_after-midnight` |
| Plan reminder | in the window for tomorrow, now ≥ remindPlan, no plan for tomorrow | `today_plan-reminder` |
| Matrix | view = matrix | `today_matrix`, mobile `today_matrix-sheet` |
| Task expanded | click a row | interactive in the prototype |
| Toast / adhoc add | Enter while locked | interactive |

**Breakpoints.**
- **Matrix grid:** `auto-fit minmax(260px,1fr)` gives 2×2 on desktop and 1 column on mobile.
- **Interaction:** drag on desktop, tap → MatrixBottomSheet on mobile.

## 2. Evening ritual — `ritual` (stepper)
**Components:**
- AppShell (no bottom tabs on mobile)
- Stepper
- ReviewRow
- DatePickerChips
- DatePicker
- RitualFooter
- ReflectionForm (EnergyScale)
- TomorrowPlanList
- TaskInput
- RitualSummary
- Toast

**Layout:** a single column, max 680px.
- **Top bar:** the label "Nghi thức buổi tối" plus "Để sau (Esc)".
- **Stepper:** 3 steps.

**The three steps:**
1. **Review today (Nhìn lại hôm nay).** Tick what's done. Every unfinished task (including adhoc ones) needs a decision: Mai / Thứ 2 tới / Cuối tuần / +1 tuần / Chọn ngày… / Bỏ. A task postponed ≥3 times gets a nudge. "Tiếp tục" stays **disabled** while `remaining > 0`.
2. **Reflection (Phản tỉnh).** Energy 1–5, "Làm tốt điều gì?" and "Cải thiện điều gì?", all optional. The button reads "Bỏ qua" while everything is empty.
3. **Plan tomorrow.**
   - Tasks moved to "Mai" appear already, tagged "Dời từ hôm nay" and keeping their MIT flag.
   - Quick-add new tasks.
   - Choose MITs (≤3).
   - "Hoàn tất & đóng ngày" applies the decisions: moved tasks get `postponedCount+1`, the rest become `dropped`.
4. **Summary.** Weighted %, headline, stats, a quote, tomorrow's MITs and the consistency line, then "Về trang Hôm nay".

**Navigation:** click an earlier step in the stepper, or use "Quay lại". Future steps can't be skipped. Esc or "Để sau" goes back to Today and keeps the ritual's state.

**Mobile:** the footer is sticky. DatePicker opens as a bottom sheet with a confirm button.

| State | Screenshot |
|---|---|
| Step 1 — review (gate active) | `ritual_step1-review` |
| Step 1 — date picker open | `ritual_step1-datepicker` (desktop popover), mobile `ritual_step1-datepicker-sheet` |
| Step 2 — reflection | `ritual_step2-reflection` |
| Step 3 — plan tomorrow | `ritual_step3-plan-tomorrow` |
| Summary | `ritual_summary` |

## 3. Journey — `stats`
**Components:** StatCard ×6, Heatmap, WeekdayChart, InsightCard, Banner (sparse).

**Desktop layout:**
1. Header.
2. Stat cards in an `auto-fit minmax(200px)` grid (4 + 2).
3. Heatmap, 26 weeks.
4. Two columns: WeekdayChart and Insights (`minmax(340px)`).

**Mobile layout:**
- stat cards at `minmax(150px)`, two columns;
- the heatmap shows 13 weeks and scrolls horizontally;
- the remaining cards are stacked.

**The six cards:**
- average completion over 7 and over 30 days (delta against the previous period);
- consistency score n/30;
- % "Quan trọng nhưng không gấp";
- % adhoc;
- % moved.

| State | Screenshot |
|---|---|
| Enough data | `stats_default` |
| Not enough data (< 7 days with a plan): progress dots n/7, values "—", insight placeholder | `stats_not-enough-data` |

Clicking a heatmap cell opens History for that day.

## 4. History — `history`
**Components:** CalendarMonth, DayDetail (read-only).

**Layout:** desktop puts CalendarMonth (1.15fr) and DayDetail (1fr) in two columns; mobile stacks them.

**Default selection:** yesterday.

| State | Treatment |
|---|---|
| Day with a plan | task list + reflection (`history_default`) |
| Day with no plan | `history.noPlan` |
| Today | "Ngày này vẫn đang diễn ra" + "Mở Hôm nay" |
| Month without data | summary "Chưa có dữ liệu"; prev/next disabled at the limits |

## 5. Settings — `settings`
**Components:** SettingsSection, Segmented, TimeSelect, PlanWindowTimeline, Switch, plus a link to onboarding.

**Sections:**
- **Planning window:** habit, opening time, lock time, timeline.
- **Day end time:** chips 00:00–05:00.
- **Reminders:** a switch plus 2 TimeSelects.
- **Theme:** Light / Dark / System.
- **How the completion rate is calculated:** read-only.

Every change saves immediately; there's no Save button. A change to the lock time shows up straight away in Today's PlanStatus.

Screenshot: `settings_default`.

## 6. Onboarding — `onboarding`
**Layout:** full screen with no sidebar or tabs, a single column of max 600px. Steps:
1. Planning habit.
2. Reminders.
3. Day end time.
4. Summary → "Viết plan đầu tiên", which goes to Today and focuses the input.

"Bỏ qua, dùng mặc định" is available on every step. Defaults: evening habit, 18:00 → 10:00, end of day 00:00, reminders 21:30 and 21:00.

Screenshot: `onboarding_step1`. The other steps are interactive in the prototype.

## 7. "More" — `more` (mobile only)
A list of large buttons: Mục tiêu (Phase 2), Tổng kết tuần (Phase 2), Cài đặt.

Screenshot: `mobile/more-menu`.

## 8. Goals — `goals` · **Phase 2**
- **Phase2Notice** at the top.
- Goal cards: horizon, progress, this week's focus, linked tasks.
- An "+ Thêm mục tiêu" tile.
- The `@tên-mục-tiêu` syntax is described only, not implemented.

Screenshot: `goals_phase2`.

## 9. Weekly review — `weekly` · **Phase 2**
- **Phase2Notice**.
- 3 stats.
- A 7-day chart.
- "Trọng tâm cho tuần tới" inputs. They don't save — illustration only.

Screenshot: `weekly-review_phase2`.

---

## Business rules the UI enforces
1. **Planning window.** The plan for day D can be written from `start` (default 18:00 on D-1) to `lock` (10:00 on D). After `lock`, new tasks get `adhoc = true` and appear in a separate group with a dashed border. They are excluded from the %.
2. **Day end.** Defaults to 03:00 (configurable 00–05). Between 0:00 and dayEnd the app still shows the previous day.
3. **MIT limit.** At most 3, enforced everywhere a task can become an MIT (TaskItem, TaskInput `*`, step 3).
4. **Postponing.** Each move adds 1 to `postponedCount`; at ≥3 a warning appears (non-punitive copy).
5. **Closing the day.** The day can't close until every unfinished task has a decision.
6. **Consistency score.** Shown as days with a plan out of 30 instead of a streak.
