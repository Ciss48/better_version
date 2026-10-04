import { describe, expect, it } from 'vitest';

import { DomainError } from '../errors';
import {
  activeMitCount,
  createTask,
  dropTask,
  moveTask,
  patchTask,
  restoreTask,
  toggleDone,
} from '../tasks';
import { flagsForQuadrant } from '../weights';
import type { ParsedTask, Task } from '../types';
import { ctx, task } from './helpers';

/** 20:00 local on 2026-10-03 — the plan for 10-03 is locked, the plan for 10-04 is not. */
const EVENING = '2026-10-03T13:00:00Z';
/** 12:00 local on 2026-10-03 — after the 10:00 lock. */
const MIDDAY = '2026-10-03T05:00:00Z';
/** 08:00 local on 2026-10-03 — before the 10:00 lock. */
const MORNING = '2026-10-03T01:00:00Z';

function parsed(overrides: Partial<ParsedTask> = {}): ParsedTask {
  return { title: 'Việc mới', mit: false, important: false, urgent: false, size: null, ...overrides };
}

function mits(n: number, planDate = '2026-10-04'): Task[] {
  return Array.from({ length: n }, () => task({ planDate, mit: true, status: 'todo' }));
}

describe('activeMitCount', () => {
  it('counts only todo and done MITs', () => {
    const dayTasks = [
      task({ mit: true, status: 'todo' }),
      task({ mit: true, status: 'done' }),
      task({ mit: true, status: 'moved', movedTo: '2026-10-04' }),
      task({ mit: true, status: 'dropped' }),
      task({ mit: false, status: 'todo' }),
    ];
    expect(activeMitCount(dayTasks)).toBe(2);
  });

  it('is 0 for an empty day', () => {
    expect(activeMitCount([])).toBe(0);
  });
});

describe('createTask', () => {
  it('creates a planned task before the lock', () => {
    const c = ctx(MORNING);
    const m = createTask(
      parsed({ title: '  Đọc sách  ', mit: true, important: true, size: 'L' }),
      { planDate: '2026-10-03', dayTasks: [] },
      c,
    );
    expect(m.upserts).toHaveLength(1);
    expect(m.upserts[0]).toEqual({
      id: 'id1',
      planDate: '2026-10-03',
      title: 'Đọc sách',
      important: true,
      urgent: false,
      mit: true,
      size: 'L',
      status: 'todo',
      postponedCount: 0,
      adhoc: false,
      position: 0,
      createdAt: '2026-10-03T01:00:00.000Z',
      completedAt: null,
      movedTo: null,
      originTaskId: null,
    });
    expect(m.deletes).toEqual([]);
    expect(m.notices).toEqual([]);
    expect(m.events).toHaveLength(1);
    expect(m.events[0]).toMatchObject({
      type: 'task_created',
      taskId: 'id1',
      planDate: '2026-10-03',
      payload: {
        title: 'Đọc sách',
        important: true,
        urgent: false,
        mit: true,
        size: 'L',
        adhoc: false,
        originTaskId: null,
      },
    });
  });

  it('marks a task adhoc once the day is locked and notices it', () => {
    const m = createTask(parsed(), { planDate: '2026-10-03', dayTasks: [] }, ctx(MIDDAY));
    expect(m.upserts[0].adhoc).toBe(true);
    expect(m.notices).toEqual(['adhocAdded']);
    expect(m.events[0].payload.adhoc).toBe(true);
  });

  it('stays planned for a future day', () => {
    const m = createTask(parsed(), { planDate: '2026-10-04', dayTasks: [] }, ctx(EVENING));
    expect(m.upserts[0].adhoc).toBe(false);
    expect(m.notices).toEqual([]);
  });

  it('downgrades the 4th MIT of a day', () => {
    const m = createTask(
      parsed({ mit: true }),
      { planDate: '2026-10-04', dayTasks: mits(3) },
      ctx(EVENING),
    );
    expect(m.upserts[0].mit).toBe(false);
    expect(m.notices).toEqual(['mitLimit']);
    expect(m.events[0].payload.mit).toBe(false);
  });

  it('allows a 3rd MIT', () => {
    const m = createTask(
      parsed({ mit: true }),
      { planDate: '2026-10-04', dayTasks: mits(2) },
      ctx(EVENING),
    );
    expect(m.upserts[0].mit).toBe(true);
    expect(m.notices).toEqual([]);
  });

  it('does not count a dropped or moved MIT toward the limit', () => {
    const dayTasks = [
      ...mits(2),
      task({ planDate: '2026-10-04', mit: true, status: 'dropped' }),
      task({ planDate: '2026-10-04', mit: true, status: 'moved', movedTo: '2026-10-05' }),
    ];
    const m = createTask(parsed({ mit: true }), { planDate: '2026-10-04', dayTasks }, ctx(EVENING));
    expect(m.upserts[0].mit).toBe(true);
    expect(m.notices).toEqual([]);
  });

  it('appends after the highest existing position', () => {
    const dayTasks = [
      task({ planDate: '2026-10-04', position: 2 }),
      task({ planDate: '2026-10-04', position: 7 }),
    ];
    const m = createTask(parsed(), { planDate: '2026-10-04', dayTasks }, ctx(EVENING));
    expect(m.upserts[0].position).toBe(8);
  });

  it('can report adhoc and mitLimit together', () => {
    const m = createTask(
      parsed({ mit: true }),
      { planDate: '2026-10-03', dayTasks: mits(3, '2026-10-03') },
      ctx(MIDDAY),
    );
    expect(m.notices).toEqual(['adhocAdded', 'mitLimit']);
  });

  it('throws empty_title on a blank title', () => {
    const c = ctx(EVENING);
    expect(() =>
      createTask(parsed({ title: '   ' }), { planDate: '2026-10-04', dayTasks: [] }, c),
    ).toThrow(DomainError);
    try {
      createTask(parsed({ title: '' }), { planDate: '2026-10-04', dayTasks: [] }, c);
    } catch (e) {
      expect((e as DomainError).code).toBe('empty_title');
    }
  });
});

describe('toggleDone', () => {
  it('ticks a todo task', () => {
    const t = task({ status: 'todo' });
    const m = toggleDone(t, ctx(MIDDAY));
    expect(m.upserts[0].status).toBe('done');
    expect(m.upserts[0].completedAt).toBe('2026-10-03T05:00:00.000Z');
    expect(m.events.map((e) => e.type)).toEqual(['task_completed']);
    expect(m.events[0].taskId).toBe(t.id);
    expect(m.notices).toEqual([]);
  });

  it('un-ticks a done task', () => {
    const t = task({ status: 'done', completedAt: '2026-10-03T04:00:00.000Z' });
    const m = toggleDone(t, ctx(MIDDAY));
    expect(m.upserts[0].status).toBe('todo');
    expect(m.upserts[0].completedAt).toBeNull();
    expect(m.events.map((e) => e.type)).toEqual(['task_uncompleted']);
  });

  it('throws not_tickable for moved and dropped tasks', () => {
    for (const status of ['moved', 'dropped'] as const) {
      try {
        toggleDone(task({ status }), ctx(MIDDAY));
        throw new Error('expected a throw');
      } catch (e) {
        expect((e as DomainError).code).toBe('not_tickable');
      }
    }
  });
});

describe('patchTask', () => {
  it('records only the fields that actually changed', () => {
    const t = task({ title: 'A', important: false, urgent: true, size: 'M' });
    const m = patchTask(t, { title: ' B ', urgent: true, size: 'L' }, [t], ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ title: 'B', urgent: true, size: 'L' });
    expect(m.events).toHaveLength(1);
    expect(m.events[0]).toMatchObject({
      type: 'task_updated',
      taskId: t.id,
      payload: { changes: { title: 'B', size: 'L' } },
    });
  });

  it('is a no-op when nothing changes', () => {
    const t = task({ title: 'A', size: 'M' });
    const m = patchTask(t, { title: 'A', size: 'M' }, [t], ctx(MIDDAY));
    expect(m).toEqual({ upserts: [], deletes: [], events: [], notices: [] });
  });

  it('applies a matrix move through flagsForQuadrant', () => {
    const t = task({ important: false, urgent: false });
    const m = patchTask(t, flagsForQuadrant('q1'), [t], ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ important: true, urgent: true });
    expect(m.events[0].payload).toEqual({ changes: { important: true, urgent: true } });
  });

  it('refuses the 4th MIT but still applies the other fields', () => {
    const t = task({ planDate: '2026-10-04', mit: false, title: 'A' });
    const dayTasks = [t, ...mits(3)];
    const m = patchTask(t, { mit: true, title: 'B' }, dayTasks, ctx(EVENING));
    expect(m.upserts[0].mit).toBe(false);
    expect(m.upserts[0].title).toBe('B');
    expect(m.notices).toEqual(['mitLimit']);
    expect(m.events[0].payload).toEqual({ changes: { title: 'B' } });
  });

  it('still notices the MIT limit when nothing else changes', () => {
    const t = task({ planDate: '2026-10-04', mit: false });
    const m = patchTask(t, { mit: true }, [t, ...mits(3)], ctx(EVENING));
    expect(m.upserts).toEqual([]);
    expect(m.events).toEqual([]);
    expect(m.notices).toEqual(['mitLimit']);
  });

  it('excludes the patched task itself from the MIT count', () => {
    const t = task({ planDate: '2026-10-04', mit: true });
    const dayTasks = [t, ...mits(2)];
    const m = patchTask(t, { mit: false }, dayTasks, ctx(EVENING));
    expect(m.upserts[0].mit).toBe(false);
    expect(m.notices).toEqual([]);
  });

  it('promotes to MIT while the day has room', () => {
    const t = task({ planDate: '2026-10-04', mit: false });
    const m = patchTask(t, { mit: true }, [t, ...mits(2)], ctx(EVENING));
    expect(m.upserts[0].mit).toBe(true);
    expect(m.notices).toEqual([]);
  });

  it('throws empty_title on a blank title', () => {
    const t = task();
    try {
      patchTask(t, { title: '  ' }, [t], ctx(MIDDAY));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DomainError).code).toBe('empty_title');
    }
  });
});

describe('moveTask', () => {
  it('moves a task forward, keeping flags and bumping postponedCount', () => {
    const t = task({
      planDate: '2026-10-03',
      title: 'Viết báo cáo',
      important: true,
      urgent: true,
      mit: true,
      size: 'L',
      postponedCount: 2,
      position: 4,
    });
    const target = [task({ planDate: '2026-10-04', position: 1 })];
    const m = moveTask(t, '2026-10-04', { dayTasks: target }, ctx(EVENING));

    const [moved, copy] = m.upserts;
    expect(moved).toMatchObject({ id: t.id, status: 'moved', movedTo: '2026-10-04' });
    expect(copy).toEqual({
      id: 'id1',
      planDate: '2026-10-04',
      title: 'Viết báo cáo',
      important: true,
      urgent: true,
      mit: true,
      size: 'L',
      status: 'todo',
      postponedCount: 3,
      adhoc: false,
      position: 2,
      createdAt: '2026-10-03T13:00:00.000Z',
      completedAt: null,
      movedTo: null,
      originTaskId: t.id,
    });
    expect(m.events.map((e) => e.type)).toEqual(['task_moved', 'task_created']);
    expect(m.events[0]).toMatchObject({
      taskId: t.id,
      planDate: '2026-10-03',
      payload: { to: '2026-10-04', newTaskId: 'id1' },
    });
    expect(m.events[1]).toMatchObject({ taskId: 'id1', planDate: '2026-10-04' });
    expect(m.events[1].payload.originTaskId).toBe(t.id);
    expect(m.notices).toEqual([]);
    expect(m.deletes).toEqual([]);
  });

  it('starts the copy at position 0 on an empty target day', () => {
    const t = task({ planDate: '2026-10-03' });
    const m = moveTask(t, '2026-10-04', { dayTasks: [] }, ctx(EVENING));
    expect(m.upserts[1].position).toBe(0);
  });

  it('drops the MIT flag when the target day already has 3', () => {
    const t = task({ planDate: '2026-10-03', mit: true });
    const m = moveTask(t, '2026-10-04', { dayTasks: mits(3) }, ctx(EVENING));
    expect(m.upserts[1].mit).toBe(false);
    expect(m.notices).toEqual(['mitLimit']);
    expect(m.events[1].payload.mit).toBe(false);
  });

  it('throws not_movable unless the task is todo', () => {
    for (const status of ['done', 'moved', 'dropped'] as const) {
      try {
        moveTask(task({ status }), '2026-10-05', { dayTasks: [] }, ctx(EVENING));
        throw new Error('expected a throw');
      } catch (e) {
        expect((e as DomainError).code).toBe('not_movable');
      }
    }
  });

  it('throws invalid_move_date for the same or an earlier date', () => {
    const t = task({ planDate: '2026-10-03' });
    for (const to of ['2026-10-03', '2026-10-02']) {
      try {
        moveTask(t, to, { dayTasks: [] }, ctx(EVENING));
        throw new Error('expected a throw');
      } catch (e) {
        expect((e as DomainError).code).toBe('invalid_move_date');
      }
    }
  });

  it('throws invalid_move_date when the target is not after today', () => {
    const t = task({ planDate: '2026-10-01' });
    try {
      moveTask(t, '2026-10-03', { dayTasks: [] }, ctx(EVENING));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DomainError).code).toBe('invalid_move_date');
    }
  });
});

describe('dropTask', () => {
  it('drops a todo task', () => {
    const t = task({ status: 'todo' });
    const m = dropTask(t, ctx(MIDDAY));
    expect(m.upserts[0].status).toBe('dropped');
    expect(m.events.map((e) => e.type)).toEqual(['task_dropped']);
    expect(m.events[0].taskId).toBe(t.id);
  });

  it('throws not_movable for any other status', () => {
    for (const status of ['done', 'moved', 'dropped'] as const) {
      try {
        dropTask(task({ status }), ctx(MIDDAY));
        throw new Error('expected a throw');
      } catch (e) {
        expect((e as DomainError).code).toBe('not_movable');
      }
    }
  });
});

describe('restoreTask', () => {
  it('restores a dropped task', () => {
    const t = task({ status: 'dropped' });
    const m = restoreTask(t, [], ctx(MIDDAY));
    expect(m.upserts[0].status).toBe('todo');
    expect(m.deletes).toEqual([]);
    expect(m.events[0]).toMatchObject({
      type: 'task_restored',
      taskId: t.id,
      payload: { from: 'dropped' },
    });
  });

  it('restores a moved task and deletes its copy', () => {
    const original = task({ status: 'moved', movedTo: '2026-10-04' });
    const copy = task({ planDate: '2026-10-04', status: 'todo', originTaskId: original.id });
    const m = restoreTask(original, [copy], ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ id: original.id, status: 'todo', movedTo: null });
    expect(m.deletes).toEqual([copy.id]);
    expect(m.events[0]).toMatchObject({
      type: 'task_restored',
      taskId: original.id,
      payload: { from: 'moved', removedTaskId: copy.id },
    });
  });

  it('throws cannot_restore when the copy is already done', () => {
    const original = task({ status: 'moved', movedTo: '2026-10-04' });
    const copy = task({ planDate: '2026-10-04', status: 'done', originTaskId: original.id });
    try {
      restoreTask(original, [copy], ctx(MIDDAY));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DomainError).code).toBe('cannot_restore');
    }
  });

  it('throws cannot_restore when the copy is missing', () => {
    const original = task({ status: 'moved', movedTo: '2026-10-04' });
    try {
      restoreTask(original, [task({ planDate: '2026-10-04' })], ctx(MIDDAY));
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as DomainError).code).toBe('cannot_restore');
    }
  });

  it('downgrades a restored MIT when the day is already full', () => {
    const t = task({ status: 'dropped', mit: true });
    const related = [...mits(3, '2026-10-03'), t];
    const m = restoreTask(t, related, ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ status: 'todo', mit: false });
    expect(m.notices).toEqual(['mitLimit']);
    expect(m.events[0].payload).toEqual({ from: 'dropped', mitDowngraded: true });
  });

  it('keeps the MIT flag when the day still has room', () => {
    const t = task({ status: 'dropped', mit: true });
    const related = [...mits(2, '2026-10-03'), t];
    const m = restoreTask(t, related, ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ status: 'todo', mit: true });
    expect(m.notices).toEqual([]);
    expect(m.events[0].payload).toEqual({ from: 'dropped' });
  });

  it('re-checks the MIT limit for a moved task coming back', () => {
    const original = task({ status: 'moved', movedTo: '2026-10-04', mit: true });
    const copy = task({ planDate: '2026-10-04', status: 'todo', originTaskId: original.id });
    const m = restoreTask(original, [...mits(3, '2026-10-03'), original, copy], ctx(MIDDAY));
    expect(m.upserts[0]).toMatchObject({ status: 'todo', movedTo: null, mit: false });
    expect(m.deletes).toEqual([copy.id]);
    expect(m.notices).toEqual(['mitLimit']);
    expect(m.events[0].payload).toEqual({
      from: 'moved',
      removedTaskId: copy.id,
      mitDowngraded: true,
    });
  });

  it('ignores MITs of other days when restoring', () => {
    const t = task({ status: 'dropped', mit: true });
    const m = restoreTask(t, [...mits(3, '2026-10-04'), t], ctx(MIDDAY));
    expect(m.upserts[0].mit).toBe(true);
    expect(m.notices).toEqual([]);
  });

  it('throws cannot_restore for todo and done tasks', () => {
    for (const status of ['todo', 'done'] as const) {
      try {
        restoreTask(task({ status }), [], ctx(MIDDAY));
        throw new Error('expected a throw');
      } catch (e) {
        expect((e as DomainError).code).toBe('cannot_restore');
      }
    }
  });
});
