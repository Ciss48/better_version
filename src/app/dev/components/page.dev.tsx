'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
import { Phase2Notice } from '@/components/common/Phase2Notice';
import { DayDetail } from '@/components/history/DayDetail';
import { OnboardingDots } from '@/components/onboarding/OnboardingDots';
import { OnboardingSummary } from '@/components/onboarding/OnboardingSummary';
import { RitualFooter } from '@/components/ritual/RitualFooter';
import { RitualSummary } from '@/components/ritual/RitualSummary';
import { Stepper } from '@/components/ritual/Stepper';
import { PlanWindowTimeline } from '@/components/settings/PlanWindowTimeline';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Heatmap } from '@/components/stats/Heatmap';
import { InsightCard } from '@/components/stats/InsightCard';
import { StatCard } from '@/components/stats/StatCard';
import { WeekdayChart } from '@/components/stats/WeekdayChart';
import { EmptyState } from '@/components/common/EmptyState';
import { Kbd } from '@/components/common/Kbd';
import { Segmented } from '@/components/common/Segmented';
import { Tag } from '@/components/common/Tag';
import type { TagVariant } from '@/components/common/Tag';
import { DatePicker } from '@/components/date/DatePicker';
import { DatePickerChips } from '@/components/date/DatePickerChips';
import { MatrixBoard } from '@/components/matrix/MatrixBoard';
import { MatrixBottomSheet } from '@/components/matrix/MatrixBottomSheet';
import { Banner } from '@/components/today/Banner';
import { MITSection } from '@/components/today/MITSection';
import { PlanStatus } from '@/components/today/PlanStatus';
import { ProgressBar } from '@/components/today/ProgressBar';
import { TaskGroup } from '@/components/today/TaskGroup';
import { TaskInput } from '@/components/today/TaskInput';
import { TaskItem } from '@/components/today/TaskItem';
import { ViewToggle } from '@/components/today/ViewToggle';
import type { ViewMode } from '@/components/today/ViewToggle';
import { DEFAULT_SETTINGS, settingsForHabit } from '@/domain';
import type { Decision, HHMM, ISODate, Settings, Task } from '@/domain';
import {
  FIRST_USE,
  GALLERY_CLOCK,
  GALLERY_SAMPLES,
  HISTORY_DAY_LOG,
  HISTORY_MONTH,
  HISTORY_SELECTED,
  historyDays,
  historyTasks,
  MATRIX_TASKS,
  MATRIX_TASKS_WITH_EMPTY,
  NEW_USER_FIRST_USE,
  newUserDays,
  statsDays,
  TASK_STATES,
  TODAY,
  TOMORROW_ITEMS,
  WEEKDAY_EMPTY,
  WEEKDAY_VALUES,
} from '@/dev/fixtures';
import { ClockProvider } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatHourLoose } from '@/lib/format';
import type { CopyKey } from '@/lib/copy';
import { noticeKey, showToast } from '@/lib/toast';
import {
  CalendarMonthDemo,
  DayEndChipsDemo,
  HabitDemo,
  ReflectionDemo,
  ReviewRowDemo,
  SwitchDemo,
  TimeChipsDemo,
  TimeSelectDemo,
  TomorrowListDemo,
} from './Demos';
import { Playground } from './Playground';
import { RitualPlayground } from './RitualPlayground';

/**
 * Component gallery. Headings and labels here are developer-facing, so they
 * are in English — the Vietnamese-string grep over src/components stays
 * meaningful that way. Every section id is also a screenshot target for
 * scripts/shots.ts.
 */

const noop = () => {};

function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-4 rounded-panel bg-paper p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-sans text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
          {id}
        </h2>
        <p className="font-display text-display-sm">{title}</p>
        {note === undefined ? null : <p className="text-body-sm text-ink-3">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-micro uppercase tracking-[0.08em] text-ink-3">{label}</p>
      {children}
    </div>
  );
}

/** A TaskItem with the gallery's no-op callbacks. */
function StaticTaskItem({ task, expanded = false }: { task: Task; expanded?: boolean }) {
  const [open, setOpen] = useState(expanded);
  return (
    <TaskItem
      task={task}
      today={TODAY}
      expanded={open}
      onToggleExpand={() => setOpen(!open)}
      onToggleDone={noop}
      onPatch={noop}
      onMove={noop}
      onDrop={noop}
      onRestore={noop}
    />
  );
}

function ChipsDemo({
  today,
  initial,
  allowDrop = true,
}: {
  today: ISODate;
  initial?: Decision;
  allowDrop?: boolean;
}) {
  const [value, setValue] = useState<Decision | undefined>(initial);
  return (
    <DatePickerChips
      today={today}
      value={value}
      onChange={setValue}
      allowDrop={allowDrop}
      taskTitle={TASK_STATES.todo.title}
    />
  );
}

/** The bottom sheet on demand, so it can be inspected without a tap. */
function SheetDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-pill border-[1.5px] border-line px-4 py-2.5 text-caption text-ink-2 hover:bg-hover"
      >
        Open the bottom sheet
      </button>
      <MatrixBottomSheet
        open={open}
        task={MATRIX_TASKS[1]}
        onSelect={() => setOpen(false)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ViewToggleDemo({ initial }: { initial: ViewMode }) {
  const [value, setValue] = useState<ViewMode>(initial);
  return <ViewToggle value={value} onChange={setValue} />;
}

const TAG_VARIANTS: { variant: TagVariant; label: string }[] = [
  { variant: 'mit', label: t('common.mit') },
  { variant: 'important', label: t('common.important') },
  { variant: 'urgent', label: t('common.urgent') },
  { variant: 'adhoc', label: t('common.adhoc') },
  { variant: 'warn', label: t('today.task.postponedWarn', { n: 3 }) },
  { variant: 'success', label: t('today.matrix.q2.note') },
  { variant: 'neutral', label: t('today.mit.count', { n: 2 }) },
  { variant: 'phase2', label: t('phase2.tag') },
];

const TOAST_BUTTONS: { label: string; key: CopyKey }[] = [
  { label: 'adhocAdded', key: noticeKey('adhocAdded', 'add', 'today') },
  { label: 'mitLimit · add · today', key: noticeKey('mitLimit', 'add', 'today') },
  { label: 'mitLimit · toggle · today', key: noticeKey('mitLimit', 'toggle', 'today') },
  { label: 'mitLimit · add · tomorrow', key: noticeKey('mitLimit', 'add', 'tomorrow') },
  { label: 'mitLimit · toggle · tomorrow', key: noticeKey('mitLimit', 'toggle', 'tomorrow') },
];


const RITUAL_STEPS = tRaw<string[]>('ritual.steps');
const WEEKDAY_LONG = tRaw<string[]>('date.weekdayLong');

const MORNING_SETTINGS: Settings = settingsForHabit(DEFAULT_SETTINGS, 'morning');
const LATE_SETTINGS: Settings = {
  ...DEFAULT_SETTINGS,
  windowStart: { hour: 20, dayOffset: -1 },
  dayEnd: '03:00',
};

const START_OPTIONS: { value: HHMM; label: string }[] = [
  ...(['17:00', '18:00', '19:00', '20:00'] as HHMM[]).map((value) => ({
    value,
    label: t('settings.window.startOptionPrev', { time: value }),
  })),
  ...(['05:00', '06:00'] as HHMM[]).map((value) => ({
    value,
    label: t('settings.window.startOptionSame', { time: value }),
  })),
];

const LOCK_OPTIONS: { value: HHMM; label: string }[] = (
  ['08:00', '09:00', '10:00', '11:00', '12:00'] as HHMM[]
).map((value) => ({ value, label: t('settings.window.lockOption', { time: value }) }));

const INSIGHTS: { text: string; tone: 'success' | 'accent' }[] = [
  { text: t('stats.insights.evening', { n: 13 }), tone: 'success' },
  { text: t('stats.insights.mit', { mit: 83, other: 52 }), tone: 'accent' },
  {
    text: t('stats.insights.weekday', {
      best: WEEKDAY_LONG[2],
      bestPct: 77,
      worst: WEEKDAY_LONG[0],
      worstPct: 56,
    }),
    tone: 'success',
  },
];

const OCTOBER_SUMMARY = { planned: 2, total: 2, avg: 92 };

const WELCOME_STEPS = tRaw<{ title: string; body: string }[]>('today.welcome.steps');

export default function ComponentsGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <ClockProvider value={GALLERY_CLOCK}>
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 p-4 app:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-display-md">Component gallery · phase 04</h1>
        <p className="text-body-sm text-ink-3">
          Every section id below is a screenshot target for <code>pnpm shots</code>.
        </p>
      </header>

      <Section id="tags" title="Tag">
        <div className="flex flex-wrap items-center gap-2">
          {TAG_VARIANTS.map((item) => (
            <Tag key={item.variant} variant={item.variant}>
              {item.label}
            </Tag>
          ))}
        </div>
      </Section>

      <Section id="banners" title="Banner">
        <div className="flex flex-col gap-4">
          <Variant label="ritual">
            <Banner
              variant="ritual"
              title={t('today.ritualBanner.title')}
              body={t('today.ritualBanner.body')}
              primary={{ label: t('today.ritualBanner.cta'), onClick: noop, kbd: 'E' }}
            />
          </Variant>
          <Variant label="planReminder">
            <Banner
              variant="planReminder"
              title={t('today.planReminder.title', {
                tomorrow: GALLERY_SAMPLES.tomorrowLong,
              })}
              body={t('today.planReminder.body', {
                lockAt: '10:00',
                weekdayLong: GALLERY_SAMPLES.tomorrowWeekday,
              })}
              primary={{ label: t('today.planReminder.cta'), onClick: noop }}
              secondary={{ label: t('today.planReminder.dismiss'), onClick: noop }}
            />
          </Variant>
          <Variant label="missedDay">
            <Banner
              variant="missedDay"
              title={t('today.missed.title')}
              body={t('today.missed.body')}
            />
          </Variant>
          <Variant label="complete">
            <Banner
              variant="complete"
              title={t('today.complete.title')}
              body={t('today.complete.body')}
            />
          </Variant>
          <Variant label="welcome (3 step cards as children)">
            <Banner
              variant="welcome"
              title={t('today.welcome.title')}
              body={t('today.welcome.body')}
              primary={{ label: t('today.welcome.cta'), onClick: noop }}
              hint={t('today.welcome.ctaHint')}
            >
              <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
                {WELCOME_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex flex-col gap-1 rounded-tile bg-paper px-4 py-3.5"
                  >
                    <span className="font-num text-[22px] text-accent">{index + 1}</span>
                    <b className="font-semibold">{step.title}</b>
                    <span className="text-caption text-ink-3">{step.body}</span>
                  </div>
                ))}
              </div>
            </Banner>
          </Variant>
        </div>
      </Section>

      <Section id="plan-status" title="PlanStatus">
        <div className="flex flex-col gap-4">
          <Variant label="open · 105 minutes left">
            <PlanStatus locked={false} lockAt="10:00" minutesLeft={105} />
          </Variant>
          <Variant label="locked">
            <PlanStatus locked lockAt="10:00" minutesLeft={null} />
          </Variant>
          <Variant label="late night · dayEnd 03:00">
            <PlanStatus
              locked
              lockAt="10:00"
              minutesLeft={null}
              lateNight={{ dayEnd: formatHourLoose('03:00') }}
            />
          </Variant>
        </div>
      </Section>

      <Section id="progress" title="ProgressBar">
        <div className="flex flex-wrap gap-8">
          <Variant label="0%">
            <ProgressBar value={0} done={0} total={4} className="w-[260px]" />
          </Variant>
          <Variant label="64% · 2/4">
            <ProgressBar value={64} done={2} total={4} className="w-[260px]" />
          </Variant>
          <Variant label="100%">
            <ProgressBar value={100} done={4} total={4} className="w-[260px]" />
          </Variant>
          <Variant label="size sm">
            <ProgressBar value={64} done={2} total={4} size="sm" className="w-[260px]" />
          </Variant>
        </div>
      </Section>

      <Section id="task-input" title="TaskInput">
        <div className="flex flex-col gap-4">
          <Variant label="default">
            <TaskInput locked={false} onAdd={noop} />
          </Variant>
          <Variant label="locked (adds the locked hint)">
            <TaskInput locked onAdd={noop} />
          </Variant>
          <Variant label="scope=tomorrow">
            <TaskInput locked={false} onAdd={noop} scope="tomorrow" />
          </Variant>
          <Variant label="pre-filled · preview chips">
            <TaskInput locked={false} onAdd={noop} defaultValue={GALLERY_SAMPLES.quickAdd} />
          </Variant>
        </div>
      </Section>

      <Section id="task-item" title="TaskItem" note="Click a row to expand its toolbar.">
        <div className="flex flex-col gap-4">
          <Variant label="todo">
            <StaticTaskItem task={TASK_STATES.todo} />
          </Variant>
          <Variant label="done">
            <StaticTaskItem task={TASK_STATES.done} />
          </Variant>
          <Variant label="expanded (toolbar)">
            <StaticTaskItem task={TASK_STATES.expanded} expanded />
          </Variant>
          <Variant label="MIT + important + urgent + L">
            <StaticTaskItem task={TASK_STATES.allFlags} />
          </Variant>
          <Variant label="adhoc · added at 14:10">
            <StaticTaskItem task={TASK_STATES.adhoc} />
          </Variant>
          <Variant label="postponed 1">
            <StaticTaskItem task={TASK_STATES.postponed1} />
          </Variant>
          <Variant label="postponed 3 (warning chip)">
            <StaticTaskItem task={TASK_STATES.postponed3} />
          </Variant>
          <Variant label="moved · restore only">
            <StaticTaskItem task={TASK_STATES.moved} expanded />
          </Variant>
          <Variant label="dropped · restore only">
            <StaticTaskItem task={TASK_STATES.dropped} expanded />
          </Variant>
        </div>
      </Section>

      <Section id="mit-section" title="MITSection">
        <div className="flex flex-col gap-4">
          <Variant label="empty">
            <MITSection count={0} />
          </Variant>
          <Variant label="2 of 3 with items">
            <MITSection count={2}>
              <StaticTaskItem task={TASK_STATES.expanded} />
              <StaticTaskItem task={TASK_STATES.allFlags} />
            </MITSection>
          </Variant>
        </div>
      </Section>

      <Section id="task-group" title="TaskGroup">
        <div className="flex flex-col gap-4">
          <Variant label="default">
            <TaskGroup variant="default" title={t('today.others.title')} totalCount={2}>
              <StaticTaskItem task={TASK_STATES.todo} />
              <StaticTaskItem task={TASK_STATES.postponed1} />
            </TaskGroup>
          </Variant>
          <Variant label="adhoc · 1/2 done">
            <TaskGroup
              variant="adhoc"
              title={t('today.adhoc.tag')}
              doneCount={1}
              totalCount={2}
            >
              <StaticTaskItem task={TASK_STATES.adhoc} />
              <StaticTaskItem task={TASK_STATES.dropped} />
            </TaskGroup>
          </Variant>
        </div>
      </Section>

      <Section id="view-toggle" title="ViewToggle">
        <div className="flex flex-wrap items-start gap-6">
          <Variant label="value=list">
            <ViewToggleDemo initial="list" />
          </Variant>
          <Variant label="value=matrix">
            <ViewToggleDemo initial="matrix" />
          </Variant>
          <Variant label="Segmented (sm)">
            <Segmented
              value="a"
              ariaLabel="Segmented sizes"
              size="sm"
              options={[
                { value: 'a', label: 'S' },
                { value: 'b', label: 'M' },
                { value: 'c', label: 'L' },
              ]}
              onChange={noop}
            />
          </Variant>
          <Variant label="Kbd">
            <span className="flex gap-2">
              <Kbd>N</Kbd>
              <Kbd>M</Kbd>
              <Kbd>E</Kbd>
              <Kbd>T</Kbd>
            </span>
          </Variant>
        </div>
      </Section>

      <Section
        id="matrix"
        title="MatrixBoard"
        note="Drag mode is pointer + keyboard (Space to pick up, arrows to move). Tap mode opens the bottom sheet."
      >
        <div className="flex flex-col gap-6">
          <Variant label="drag · all four quadrants filled">
            <MatrixBoard
              tasks={MATRIX_TASKS}
              interaction="drag"
              onSetQuadrant={noop}
              onToggleDone={noop}
            />
          </Variant>
          <Variant label="drag · one empty quadrant">
            <MatrixBoard
              tasks={MATRIX_TASKS_WITH_EMPTY}
              interaction="drag"
              onSetQuadrant={noop}
              onToggleDone={noop}
            />
          </Variant>
          <Variant label="tap · click a task title to open the sheet">
            <MatrixBoard
              tasks={MATRIX_TASKS}
              interaction="tap"
              onSetQuadrant={noop}
              onToggleDone={noop}
            />
          </Variant>
          <Variant label="tap · MatrixBottomSheet">
            <SheetDemo />
          </Variant>
        </div>
      </Section>

      <Section
        id="date-chips"
        title="DatePickerChips"
        note="The chip count varies: on a Saturday the +1 week chip collapses into the weekend one."
      >
        <div className="flex flex-col gap-4">
          <Variant label="today = Sat 2026-10-03 · 3 date chips">
            <ChipsDemo today="2026-10-03" />
          </Variant>
          <Variant label="today = Tue 2026-10-06 · 4 date chips">
            <ChipsDemo today="2026-10-06" />
          </Variant>
          <Variant label="custom date selected (2026-10-14)">
            <ChipsDemo today="2026-10-03" initial={{ kind: 'move', date: '2026-10-14' }} />
          </Variant>
        </div>
      </Section>

      <Section
        id="date-picker"
        title="DatePicker"
        note="One component, two modes: the popover is used at or above the app breakpoint (720px) and the bottom sheet below it. Resize the window — or look at the 1280px and 390px screenshots — to see both."
      >
        <div className="flex flex-wrap gap-4">
          <Variant label="trigger (popover ≥720px, drawer <720px)">
            <DatePicker
              min="2026-10-04"
              taskTitle={TASK_STATES.todo.title}
              onSelect={noop}
              trigger={
                <button
                  type="button"
                  className="rounded-pill border-[1.5px] border-line px-4 py-2.5 text-caption text-ink-2 hover:bg-hover"
                >
                  {t('datePicker.chips.pick')}
                </button>
              }
            />
          </Variant>
          <Variant label="with a date already selected">
            <DatePicker
              min="2026-10-04"
              selected="2026-10-14"
              taskTitle={TASK_STATES.todo.title}
              onSelect={noop}
              trigger={
                <button
                  type="button"
                  className="rounded-pill border-[1.5px] border-ink bg-ink px-4 py-2.5 text-caption text-bg"
                >
                  T4 14/10
                </button>
              }
            />
          </Variant>
        </div>
      </Section>

      <Section id="empty-state" title="EmptyState">
        <div className="flex flex-col gap-4">
          <Variant label="dashed">
            <EmptyState
              title={t('today.empty.title')}
              body={t('today.empty.body', { lockAt: '10:00' })}
            />
          </Variant>
          <Variant label="soft">
            <EmptyState
              variant="soft"
              title={t('ritual.step3.empty')}
              body={t('today.mit.empty')}
            />
          </Variant>
        </div>
      </Section>

      <Section id="toast" title="Toaster + noticeKey">
        <div className="flex flex-wrap gap-2">
          {TOAST_BUTTONS.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={() => showToast(button.key)}
              className="rounded-pill border-[1.5px] border-line px-4 py-2.5 text-caption text-ink-2 hover:bg-hover"
            >
              {button.label}
            </button>
          ))}
        </div>
      </Section>


      <Section id="stepper" title="Stepper">
        <div className="flex flex-col gap-5">
          {([0, 1, 2] as const).map((current) => (
            <Variant key={current} label={`current=${current}`}>
              <Stepper steps={RITUAL_STEPS} current={current} onStepClick={noop} />
            </Variant>
          ))}
        </div>
      </Section>

      <Section id="review-row" title="ReviewRow" note="Ritual step 1 rows.">
        <div className="flex flex-col gap-4">
          <Variant label="done">
            <ReviewRowDemo task={TASK_STATES.done} />
          </Variant>
          <Variant label="undecided">
            <ReviewRowDemo task={TASK_STATES.todo} />
          </Variant>
          <Variant label="decided · move to tomorrow">
            <ReviewRowDemo
              task={TASK_STATES.expanded}
              initial={{ kind: 'move', date: '2026-10-04' }}
            />
          </Variant>
          <Variant label="decided · drop">
            <ReviewRowDemo task={TASK_STATES.postponed1} initial={{ kind: 'drop' }} />
          </Variant>
          <Variant label="adhoc">
            <ReviewRowDemo task={TASK_STATES.adhoc} />
          </Variant>
          <Variant label="postponed 3 · nudge">
            <ReviewRowDemo task={TASK_STATES.postponed3} />
          </Variant>
        </div>
      </Section>

      <Section id="ritual-footer" title="RitualFooter">
        <div className="flex flex-col gap-5">
          <Variant label="step 1 · blocked (remaining 2)">
            <RitualFooter
              status={{ remaining: 2 }}
              primaryLabel={t('ritual.step1.cta')}
              disabled
              onNext={noop}
              onBlockedClick={() => showToast('ritual.step1.blocked')}
            />
          </Variant>
          <Variant label="step 1 · ready">
            <RitualFooter
              status={{ remaining: 0 }}
              primaryLabel={t('ritual.step1.cta')}
              onNext={noop}
            />
          </Variant>
          <Variant label="step 2 · back + skip label">
            <RitualFooter
              primaryLabel={t('ritual.step2.ctaEmpty')}
              onNext={noop}
              onBack={noop}
            />
          </Variant>
        </div>
      </Section>

      <Section id="reflection" title="ReflectionForm">
        <div className="flex flex-col gap-8">
          <Variant label="empty">
            <ReflectionDemo initial={{ energy: 0, good: '', improve: '' }} />
          </Variant>
          <Variant label="energy 4 + both texts">
            <ReflectionDemo
              initial={{
                energy: 4,
                good: GALLERY_SAMPLES.reflectionGood,
                improve: GALLERY_SAMPLES.reflectionImprove,
              }}
            />
          </Variant>
        </div>
      </Section>

      <Section id="tomorrow-list" title="TomorrowPlanList">
        <div className="flex flex-col gap-8">
          <Variant label="empty">
            <TomorrowListDemo initial={[]} />
          </Variant>
          <Variant label="2 carried (one postponed 4) + 1 new · 2/3 MIT">
            <TomorrowListDemo initial={TOMORROW_ITEMS} />
          </Variant>
        </div>
      </Section>

      <Section id="ritual-summary" title="RitualSummary">
        <div className="flex flex-col gap-10">
          <Variant label="pct 100">
            <RitualSummary
              date={TODAY}
              pct={100}
              done={8}
              total={8}
              adhocDone={0}
              moved={0}
              dropped={0}
              energy={5}
              good={GALLERY_SAMPLES.reflectionGood}
              tomorrow={{ count: 4, mitTitles: GALLERY_SAMPLES.summaryMitTitles }}
              consistencyPlanned={26}
              onDone={noop}
            />
          </Variant>
          <Variant label="pct 62 · adhoc + moved + dropped">
            <RitualSummary
              date={TODAY}
              pct={62}
              done={5}
              total={8}
              adhocDone={1}
              moved={3}
              dropped={1}
              energy={4}
              good={GALLERY_SAMPLES.reflectionGood}
              tomorrow={{ count: 4, mitTitles: GALLERY_SAMPLES.summaryMitTitles }}
              consistencyPlanned={26}
              onDone={noop}
            />
          </Variant>
          <Variant label="pct 30 · no good text">
            <RitualSummary
              date={TODAY}
              pct={30}
              done={2}
              total={8}
              adhocDone={0}
              moved={4}
              dropped={0}
              energy={0}
              good=""
              tomorrow={{ count: 2, mitTitles: GALLERY_SAMPLES.summaryMitTitles.slice(0, 1) }}
              consistencyPlanned={21}
              onDone={noop}
            />
          </Variant>
        </div>
      </Section>

      <Section
        id="ritual-playground"
        title="Ritual playground"
        note="Fixed now = 2026-10-03T14:30:00Z (21:30 Saturday). Steps 1 → 3 run the real toggleDone / patchTask / closeDay and apply the returned Mutation."
      >
        <RitualPlayground />
      </Section>

      <Section id="stat-card" title="StatCard">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <StatCard label={t('stats.cards.avg7')} value={76} unit="%" delta={6} />
          <StatCard label={t('stats.cards.avg30')} value={75} unit="%" delta={-4} />
          <StatCard
            label={t('stats.cards.consistency.label')}
            value={26}
            unit="ratio30"
            note={t('stats.cards.consistency.note')}
          />
          <StatCard
            label={t('stats.cards.adhoc.label')}
            value={null}
            unit="%"
            delta={6}
            note={t('stats.cards.adhoc.note')}
          />
        </div>
      </Section>

      <Section id="heatmap" title="Heatmap">
        <div className="flex flex-col gap-5">
          <Variant label="26 weeks · gaps">
            <Heatmap
              days={statsDays(26)}
              weeks={26}
              firstUseDate={FIRST_USE}
              onSelectDay={noop}
            />
          </Variant>
          <Variant label="13 weeks">
            <Heatmap
              days={statsDays(13)}
              weeks={13}
              firstUseDate={FIRST_USE}
              onSelectDay={noop}
            />
          </Variant>
          <Variant label="new user · first use 5 days ago">
            <Heatmap
              days={newUserDays()}
              weeks={13}
              firstUseDate={NEW_USER_FIRST_USE}
              onSelectDay={noop}
            />
          </Variant>
        </div>
      </Section>

      <Section id="weekday-chart" title="WeekdayChart">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <WeekdayChart values={WEEKDAY_VALUES} />
          <WeekdayChart values={WEEKDAY_EMPTY} />
        </div>
      </Section>

      <Section id="insights" title="InsightCard">
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <InsightCard items={INSIGHTS} />
          <InsightCard items={[]} />
        </div>
      </Section>

      <Section id="calendar-month" title="CalendarMonth">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <Variant label="Oct 2026 · yesterday selected">
            <CalendarMonthDemo
              month={HISTORY_MONTH}
              days={historyDays()}
              initial={HISTORY_SELECTED}
              summary={OCTOBER_SUMMARY}
            />
          </Variant>
          <Variant label="empty month · prev disabled">
            <CalendarMonthDemo
              month="2026-11"
              days={[]}
              initial={HISTORY_SELECTED}
              summary={null}
              canPrev={false}
            />
          </Variant>
        </div>
      </Section>

      <Section id="day-detail" title="DayDetail">
        <div className="flex flex-col gap-5">
          <Variant label="past · tasks + reflection">
            <DayDetail
              date={HISTORY_SELECTED}
              tasks={historyTasks()}
              dayLog={HISTORY_DAY_LOG}
              planTiming={{ kind: 'morning', time: '07:59' }}
              mode="past"
            />
          </Variant>
          <Variant label="past · no reflection">
            <DayDetail
              date={HISTORY_SELECTED}
              tasks={historyTasks()}
              dayLog={{ ...HISTORY_DAY_LOG, energy: 0, good: '', improve: '' }}
              planTiming={{ kind: 'evening', time: '21:10' }}
              mode="past"
            />
          </Variant>
          <Variant label="past · no plan">
            <DayDetail
              date="2026-09-30"
              tasks={[]}
              dayLog={null}
              planTiming={null}
              mode="past"
            />
          </Variant>
          <Variant label="today">
            <DayDetail
              date={TODAY}
              tasks={historyTasks()}
              dayLog={null}
              planTiming={{ kind: 'evening', time: '21:10' }}
              mode="today"
              onOpenToday={noop}
            />
          </Variant>
        </div>
      </Section>

      <Section id="settings-controls" title="SettingsSection · TimeSelect · Switch · DayEndChips">
        <div className="flex flex-col gap-4">
          <SettingsSection
            title={t('settings.window.title')}
            description={t('settings.window.body')}
          >
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold">{t('settings.window.start')}</span>
                <TimeSelectDemo
                  initial="18:00"
                  options={START_OPTIONS}
                  ariaLabel={t('settings.window.start')}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-caption font-semibold">{t('settings.window.lock')}</span>
                <TimeSelectDemo
                  initial="10:00"
                  options={LOCK_OPTIONS}
                  ariaLabel={t('settings.window.lock')}
                />
              </label>
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.reminders.title')}>
            <div className="flex items-center gap-5">
              <SwitchDemo initial ariaLabel={t('settings.reminders.toggleAria')} />
              <SwitchDemo initial={false} ariaLabel={t('settings.reminders.toggleAria')} />
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.dayEnd.title')} description={t('settings.dayEnd.body')}>
            <DayEndChipsDemo initial="03:00" />
          </SettingsSection>

          <SettingsSection title={t('settings.theme.title')}>
            <Segmented
              value="light"
              ariaLabel={t('settings.theme.title')}
              options={[
                { value: 'light', label: t('settings.theme.light') },
                { value: 'dark', label: t('settings.theme.dark') },
                { value: 'system', label: t('settings.theme.system') },
              ]}
              onChange={noop}
              className="self-start"
            />
          </SettingsSection>
        </div>
      </Section>

      <Section id="plan-window-timeline" title="PlanWindowTimeline">
        <div className="flex flex-col gap-5">
          <Variant label="evening default · 18:00 → 10:00">
            <PlanWindowTimeline settings={DEFAULT_SETTINGS} />
          </Variant>
          <Variant label="morning · 06:00 same day">
            <PlanWindowTimeline settings={MORNING_SETTINGS} />
          </Variant>
          <Variant label="evening 20:00 · dayEnd 03:00">
            <PlanWindowTimeline settings={LATE_SETTINGS} />
          </Variant>
        </div>
      </Section>

      <Section id="onboarding" title="Onboarding">
        <div className="flex flex-col gap-6">
          <Variant label="dots · step 0 / 1 / 2">
            <div className="flex flex-col gap-2">
              {([0, 1, 2] as const).map((step) => (
                <OnboardingDots key={step} step={step} />
              ))}
            </div>
          </Variant>
          <Variant label="HabitCardGroup">
            <HabitDemo initial="evening" />
          </Variant>
          <Variant label="TimeChips · evening reminder options">
            <TimeChipsDemo
              options={['20:30', '21:00', '21:30', '22:00']}
              initial="21:30"
              ariaLabel={t('onboarding.step2.plan')}
            />
          </Variant>
          <Variant label="DayEndChips">
            <DayEndChipsDemo initial="00:00" />
          </Variant>
          <Variant label="OnboardingSummary">
            <OnboardingSummary settings={DEFAULT_SETTINGS} onFinish={noop} />
          </Variant>
        </div>
      </Section>

      <Section id="phase2-notice" title="Phase2Notice">
        <Phase2Notice />
      </Section>

      <Section
        id="playground"
        title="Today playground"
        note="Fixed now = 2026-10-03T07:10:00Z (14:10 Saturday, plan locked). Every interaction runs the real domain function and applies the returned Mutation."
      >
        <Playground />
      </Section>
    </div>
    </ClockProvider>
  );
}
