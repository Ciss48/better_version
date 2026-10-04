'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
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
import type { Decision, ISODate, Task } from '@/domain';
import {
  GALLERY_SAMPLES,
  MATRIX_TASKS,
  MATRIX_TASKS_WITH_EMPTY,
  TASK_STATES,
  TODAY,
} from '@/dev/fixtures';
import { t, tRaw } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { noticeKey, showToast } from '@/lib/toast';
import { Playground } from './Playground';

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

const WELCOME_STEPS = tRaw<{ title: string; body: string }[]>('today.welcome.steps');

export default function ComponentsGalleryPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 p-4 app:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-display-md">Component gallery · phase 03</h1>
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
            <PlanStatus locked lockAt="10:00" minutesLeft={null} lateNight={{ dayEnd: '03:00' }} />
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

      <Section
        id="playground"
        title="Today playground"
        note="Fixed now = 2026-10-03T07:10:00Z (14:10 Saturday, plan locked). Every interaction runs the real domain function and applies the returned Mutation."
      >
        <Playground />
      </Section>
    </div>
  );
}
