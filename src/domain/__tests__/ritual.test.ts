import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors';
import { closeDay, ritualRemaining } from '../ritual';
import { completion } from '../weights';
import type { CloseDayInput } from '../ritual';
import type { Decision, ParsedTask, Reflection, Task } from '../types';
import { ctx, task } from './helpers';

/** 20:00 local on 2026-10-03 — the ritual hour. */
const EVENING = '2026-10-03T13:00:00Z';

const REFLECTION: Reflection = { energy: 4, good: '  ngủ đủ  ', improve: '  ít điện thoại  ' };

function parsed(overrides: Partial<ParsedTask> = {}): ParsedTask {
  return { title: 'Việc mai', mit: false, important: false, urgent: false, size: null, ...overrides };
}

function input(overrides: Partial<CloseDayInput> = {}): CloseDayInput {
  return {
    date: '2026-10-03',
    todayTasks: [],
    decisions: {},
    tomorrowExisting: [],
    tomorrowMit: {},
    tomorrowNew: [],
    reflection: REFLECTION,
    ...overrides,
  };
}

describe('ritualRemaining', () => {
  it('counts undecided todo tasks, planned and adhoc alike', () => {
    const a = task({ status: 'todo' });
    const b = task({ status: 'todo', adhoc: true });
    const c = task({ status: 'todo' });
    const done = task({ status: 'done' });
    const decisions: Record<string, Decision> = { [c.id]: { kind: 'drop' } };
    expect(ritualRemaining([a, b, c, done], decisions)).toBe(2);
  });

  it('is 0 when every todo task has a decision', () => {
    const a = task({ status: 'todo' });
    expect(ritualRemaining([a, task({ status: 'done' })], { [a.id]: { kind: 'drop' } })).toBe(0);
  });

  it('is 0 for an empty day', () => {
    expect(ritualRemaining([], {})).toBe(0);
  });
});

describe('closeDay', () => {
  it('throws undecided_tasks while something is still undecided', () => {
    const t = task({ status: 'todo' });
    try {
      closeDay(input({ todayTasks: [t] }), ctx(EVENING));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DomainError).code).toBe('undecided_tasks');
    }
  });

  it('closes a full day: a move to tomorrow, a move further out, a drop and two new tasks', () => {
    const doneTask = task({ planDate: '2026-10-03', size: 'M', status: 'done', position: 0 });
    const toTomorrow = task({
      planDate: '2026-10-03',
      title: 'Viết báo cáo',
      size: 'M',
      mit: true,
      status: 'todo',
      position: 1,
    });
    const toNextWeek = task({ planDate: '2026-10-03', size: 'M', status: 'todo', position: 2 });
    const adhocTask = task({
      planDate: '2026-10-03',
      size: 'M',
      status: 'todo',
      adhoc: true,
      position: 3,
    });
    const todayTasks = [doneTask, toTomorrow, toNextWeek, adhocTask];
    const tomorrowExisting = [
      task({ planDate: '2026-10-04', mit: true, position: 0 }),
      task({ planDate: '2026-10-04', mit: true, position: 1 }),
      task({ planDate: '2026-10-04', mit: true, position: 2 }),
    ];

    const result = closeDay(
      input({
        todayTasks,
        decisions: {
          [toTomorrow.id]: { kind: 'move', date: '2026-10-04' },
          [toNextWeek.id]: { kind: 'move', date: '2026-10-10' },
          [adhocTask.id]: { kind: 'drop' },
          // A decision on a task that is already done is ignored.
          [doneTask.id]: { kind: 'drop' },
        },
        tomorrowExisting,
        tomorrowMit: { [toTomorrow.id]: false },
        tomorrowNew: [parsed({ title: 'Chạy bộ', mit: true }), parsed({ title: 'Gọi mẹ' })],
      }),
      ctx(EVENING),
    );

    // The done task is untouched.
    expect(result.upserts.map((t) => t.id)).not.toContain(doneTask.id);

    const moved = result.upserts.find((t) => t.id === toTomorrow.id) as Task;
    expect(moved).toMatchObject({ status: 'moved', movedTo: '2026-10-04', mit: true });

    const copy = result.upserts.find((t) => t.originTaskId === toTomorrow.id) as Task;
    expect(copy).toMatchObject({
      planDate: '2026-10-04',
      title: 'Viết báo cáo',
      mit: false, // MIT override switched off in step 2
      status: 'todo',
      postponedCount: 1,
      adhoc: false,
      position: 3,
    });

    const farMoved = result.upserts.find((t) => t.id === toNextWeek.id) as Task;
    expect(farMoved).toMatchObject({ status: 'moved', movedTo: '2026-10-10' });
    const farCopy = result.upserts.find((t) => t.originTaskId === toNextWeek.id) as Task;
    expect(farCopy).toMatchObject({ planDate: '2026-10-10', position: 0, mit: false });

    expect(result.upserts.find((t) => t.id === adhocTask.id)).toMatchObject({
      status: 'dropped',
    });

    const newTasks = result.upserts.filter(
      (t) => t.planDate === '2026-10-04' && t.originTaskId === null,
    );
    expect(newTasks.map((t) => [t.title, t.mit, t.position])).toEqual([
      ['Chạy bộ', false, 4],
      ['Gọi mẹ', false, 5],
    ]);

    // The 4th MIT of tomorrow is downgraded, and the notice appears once.
    expect(result.notices).toEqual(['mitLimit']);

    expect(result.events.map((e) => e.type)).toEqual([
      'task_moved',
      'task_created',
      'task_moved',
      'task_created',
      'task_dropped',
      'task_created',
      'task_created',
      'day_closed',
    ]);

    const closed = result.events[result.events.length - 1];
    expect(closed.taskId).toBeNull();
    expect(closed.planDate).toBe('2026-10-03');
    const after = todayTasks.map(
      (t) => result.upserts.find((u) => u.id === t.id) ?? t,
    );
    expect(closed.payload).toEqual({ ...completion(after), energy: 4 });
    expect(closed.payload).toEqual({ pct: 25, done: 1, total: 3, energy: 4 });

    expect(result.dayLog).toEqual({
      planDate: '2026-10-03',
      closedAt: '2026-10-03T13:00:00.000Z',
      energy: 4,
      good: 'ngủ đủ',
      improve: 'ít điện thoại',
    });

    const ids = result.upserts.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.deletes).toEqual([]);
  });

  it('enforces the MIT limit of tomorrow across existing, moved-in and new tasks in order', () => {
    const a = task({ planDate: '2026-10-03', mit: true, status: 'todo', position: 0 });
    const b = task({ planDate: '2026-10-03', mit: true, status: 'todo', position: 1 });
    const result = closeDay(
      input({
        todayTasks: [a, b],
        decisions: {
          [a.id]: { kind: 'move', date: '2026-10-04' },
          [b.id]: { kind: 'move', date: '2026-10-04' },
        },
        tomorrowExisting: [task({ planDate: '2026-10-04', mit: true, position: 0 })],
        tomorrowNew: [parsed({ title: 'Thứ tư', mit: true })],
      }),
      ctx(EVENING),
    );

    const copies = result.upserts.filter((t) => t.planDate === '2026-10-04');
    expect(copies.map((t) => t.mit)).toEqual([true, true, false]);
    expect(result.notices).toEqual(['mitLimit']);
  });

  it('keeps a MIT override that switches a non-MIT task on', () => {
    const a = task({ planDate: '2026-10-03', mit: false, status: 'todo' });
    const result = closeDay(
      input({
        todayTasks: [a],
        decisions: { [a.id]: { kind: 'move', date: '2026-10-04' } },
        tomorrowMit: { [a.id]: true },
      }),
      ctx(EVENING),
    );
    expect(result.upserts.find((t) => t.originTaskId === a.id)?.mit).toBe(true);
    expect(result.upserts.find((t) => t.id === a.id)?.mit).toBe(false);
    expect(result.notices).toEqual([]);
  });

  it('ignores a tomorrowMit entry for a task moved elsewhere', () => {
    const a = task({ planDate: '2026-10-03', mit: true, status: 'todo' });
    const result = closeDay(
      input({
        todayTasks: [a],
        decisions: { [a.id]: { kind: 'move', date: '2026-10-10' } },
        tomorrowMit: { [a.id]: false },
      }),
      ctx(EVENING),
    );
    expect(result.upserts.find((t) => t.originTaskId === a.id)?.mit).toBe(true);
  });

  it('closes an empty day with a 0% day_closed event', () => {
    const result = closeDay(input({ reflection: { energy: 0, good: '', improve: '' } }), ctx(EVENING));
    expect(result.upserts).toEqual([]);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].payload).toEqual({ pct: 0, done: 0, total: 0, energy: 0 });
    expect(result.dayLog.good).toBe('');
  });
});
