'use client';

import { useReducer, useState } from 'react';
import { MatrixBoard } from '@/components/matrix/MatrixBoard';
import { MITSection } from '@/components/today/MITSection';
import { PlanStatus } from '@/components/today/PlanStatus';
import { ProgressBar } from '@/components/today/ProgressBar';
import { TaskGroup } from '@/components/today/TaskGroup';
import { TaskItem } from '@/components/today/TaskItem';
import type { TaskPatch } from '@/components/today/TaskItem';
import { TaskInput } from '@/components/today/TaskInput';
import { ViewToggle } from '@/components/today/ViewToggle';
import type { ViewMode } from '@/components/today/ViewToggle';
import {
  activeMitCount,
  completion,
  createTask,
  DEFAULT_SETTINGS,
  dropTask,
  flagsForQuadrant,
  isLocked,
  minutesToLock,
  moveTask,
  patchTask,
  restoreTask,
  toggleDone,
} from '@/domain';
import type { Ctx, ISODate, Mutation, ParsedTask, Quadrant, Task } from '@/domain';
import { PLAYGROUND_NOW, sampleTasks, TODAY } from '@/dev/fixtures';
import { t } from '@/lib/copy';
import { formatDateLong } from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks/use-media';
import { noticeKey, showToast } from '@/lib/toast';

/**
 * An interactive Today, wired to the real domain. This is the only place in
 * the app (outside tests) that calls the mutating domain functions, so the
 * components themselves stay presentational.
 */

let idSeq = 0;

const CTX: Ctx = {
  now: PLAYGROUND_NOW,
  settings: DEFAULT_SETTINGS,
  newId: () => `pg${++idSeq}`,
};

/** Applies a Mutation's upserts and deletes, keeping plan order by position. */
function reducer(tasks: Task[], mutation: Mutation | 'reset'): Task[] {
  if (mutation === 'reset') return sampleTasks();

  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const upsert of mutation.upserts) byId.set(upsert.id, upsert);
  for (const id of mutation.deletes) byId.delete(id);

  return [...byId.values()].sort((a, b) =>
    a.planDate === b.planDate ? a.position - b.position : a.planDate < b.planDate ? -1 : 1,
  );
}

export function Playground() {
  const [tasks, dispatch] = useReducer(reducer, undefined, sampleTasks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const isDesktop = useIsDesktop();

  const today = tasks.filter((task) => task.planDate === TODAY);
  const planned = today.filter((task) => !task.adhoc);
  const adhoc = today.filter((task) => task.adhoc);
  const mits = planned.filter((task) => task.mit);
  const others = planned.filter((task) => !task.mit);

  const { pct, done, total } = completion(today);
  const adhocDone = adhoc.filter((task) => task.status === 'done').length;
  const locked = isLocked(TODAY, CTX.now, CTX.settings);

  /** Applies a mutation and turns its notices into toasts. */
  function apply(mutation: Mutation, action: 'add' | 'toggle') {
    for (const notice of mutation.notices) {
      showToast(noticeKey(notice, action, 'today'));
    }
    dispatch(mutation);
  }

  function dayTasks(date: ISODate): Task[] {
    return tasks.filter((task) => task.planDate === date);
  }

  function onAdd(parsed: ParsedTask) {
    apply(createTask(parsed, { planDate: TODAY, dayTasks: today }, CTX), 'add');
  }

  function onToggleDone(task: Task) {
    apply(toggleDone(task, CTX), 'toggle');
  }

  function onPatch(task: Task, patch: TaskPatch) {
    apply(patchTask(task, patch, dayTasks(task.planDate), CTX), 'toggle');
  }

  function onMove(task: Task, date: ISODate) {
    apply(moveTask(task, date, { dayTasks: dayTasks(date) }, CTX), 'toggle');
    setOpenId(null);
  }

  function onSetQuadrant(taskId: string, quadrant: Quadrant) {
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (task === undefined) return;
    onPatch(task, flagsForQuadrant(quadrant));
  }

  function row(task: Task) {
    return (
      <TaskItem
        key={task.id}
        task={task}
        today={TODAY}
        expanded={openId === task.id}
        onToggleExpand={() => setOpenId(openId === task.id ? null : task.id)}
        onToggleDone={() => onToggleDone(task)}
        onPatch={(patch) => onPatch(task, patch)}
        onMove={(date) => onMove(task, date)}
        onDrop={() => apply(dropTask(task, CTX), 'toggle')}
        onRestore={() => apply(restoreTask(task, tasks, CTX), 'toggle')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-label font-semibold uppercase text-ink-3">
            {t('today.kicker', { time: '14:10' })}
          </p>
          <h2 className="font-display text-display-md app:text-display-xl">
            {formatDateLong(TODAY)}
          </h2>
          <PlanStatus
            locked={locked}
            lockAt={CTX.settings.lockTime}
            minutesLeft={minutesToLock(TODAY, CTX.now, CTX.settings)}
          />
        </div>
        <ProgressBar
          value={pct}
          done={done}
          total={total}
          className="max-w-[280px] flex-1 basis-[220px]"
        />
      </header>

      <div className="flex flex-wrap items-start gap-3">
        <TaskInput locked={locked} onAdd={onAdd} className="flex-1 basis-[320px]" />
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'list' ? (
        <div className="flex flex-col gap-6">
          <MITSection count={activeMitCount(planned)}>
            {mits.length === 0 ? null : mits.map(row)}
          </MITSection>

          {others.length === 0 ? null : (
            <TaskGroup variant="default" title={t('today.others.title')} totalCount={others.length}>
              {others.map(row)}
            </TaskGroup>
          )}

          {adhoc.length === 0 ? null : (
            <TaskGroup
              variant="adhoc"
              title={t('today.adhoc.tag')}
              doneCount={adhocDone}
              totalCount={adhoc.length}
            >
              {adhoc.map(row)}
            </TaskGroup>
          )}
        </div>
      ) : (
        <MatrixBoard
          tasks={today}
          interaction={isDesktop === false ? 'tap' : 'drag'}
          onSetQuadrant={onSetQuadrant}
          onToggleDone={(id) => {
            const task = tasks.find((candidate) => candidate.id === id);
            if (task !== undefined) onToggleDone(task);
          }}
        />
      )}

      <button
        type="button"
        onClick={() => {
          dispatch('reset');
          setOpenId(null);
        }}
        className="self-start rounded-pill border-[1.5px] border-line px-4 py-2 text-caption text-ink-2 hover:bg-hover"
      >
        Reset fixtures
      </button>
    </div>
  );
}
