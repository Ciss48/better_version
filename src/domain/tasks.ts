import { DomainError } from './errors';
import { makeEvent } from './events';
import { isLocked, logicalDate } from './time';
import type { Ctx, ISODate, Mutation, Notice, ParsedTask, Task } from './types';

const MIT_LIMIT = 3;

/** MITs that count toward the limit of 3: mit && status ∈ {todo, done}. */
export function activeMitCount(dayTasks: Task[]): number {
  return dayTasks.filter((t) => t.mit && (t.status === 'todo' || t.status === 'done')).length;
}

function nextPosition(dayTasks: Task[]): number {
  if (dayTasks.length === 0) return 0;
  return Math.max(...dayTasks.map((t) => t.position)) + 1;
}

export function createTask(
  input: ParsedTask,
  at: { planDate: ISODate; dayTasks: Task[] },
  ctx: Ctx,
): Mutation {
  const title = input.title.trim();
  if (title === '') throw new DomainError('empty_title');

  const notices: Notice[] = [];
  const adhoc = isLocked(at.planDate, ctx.now, ctx.settings);
  if (adhoc) notices.push('adhocAdded');

  let mit = input.mit;
  if (mit && activeMitCount(at.dayTasks) >= MIT_LIMIT) {
    mit = false;
    notices.push('mitLimit');
  }

  const task: Task = {
    id: ctx.newId(),
    planDate: at.planDate,
    title,
    important: input.important,
    urgent: input.urgent,
    mit,
    size: input.size,
    status: 'todo',
    postponedCount: 0,
    adhoc,
    position: nextPosition(at.dayTasks),
    createdAt: ctx.now.toISOString(),
    completedAt: null,
    movedTo: null,
    originTaskId: null,
  };

  return {
    upserts: [task],
    deletes: [],
    events: [
      makeEvent(
        'task_created',
        task.id,
        task.planDate,
        {
          title: task.title,
          important: task.important,
          urgent: task.urgent,
          mit: task.mit,
          size: task.size,
          adhoc: task.adhoc,
          originTaskId: task.originTaskId,
        },
        ctx,
      ),
    ],
    notices,
  };
}

export function toggleDone(task: Task, ctx: Ctx): Mutation {
  if (task.status !== 'todo' && task.status !== 'done') {
    throw new DomainError('not_tickable');
  }
  const next: Task =
    task.status === 'todo'
      ? { ...task, status: 'done', completedAt: ctx.now.toISOString() }
      : { ...task, status: 'todo', completedAt: null };

  return {
    upserts: [next],
    deletes: [],
    events: [
      makeEvent(
        next.status === 'done' ? 'task_completed' : 'task_uncompleted',
        task.id,
        task.planDate,
        {},
        ctx,
      ),
    ],
    notices: [],
  };
}

type Patchable = Pick<Task, 'title' | 'important' | 'urgent' | 'mit' | 'size'>;

export function patchTask(
  task: Task,
  patch: Partial<Patchable>,
  dayTasks: Task[],
  ctx: Ctx,
): Mutation {
  const notices: Notice[] = [];
  const next: Patchable = {
    title: task.title,
    important: task.important,
    urgent: task.urgent,
    mit: task.mit,
    size: task.size,
  };

  if (patch.title !== undefined) {
    const title = patch.title.trim();
    if (title === '') throw new DomainError('empty_title');
    next.title = title;
  }
  if (patch.important !== undefined) next.important = patch.important;
  if (patch.urgent !== undefined) next.urgent = patch.urgent;
  if (patch.size !== undefined) next.size = patch.size;

  if (patch.mit !== undefined) {
    const others = dayTasks.filter((t) => t.id !== task.id);
    if (patch.mit && !task.mit && activeMitCount(others) >= MIT_LIMIT) {
      notices.push('mitLimit');
    } else {
      next.mit = patch.mit;
    }
  }

  const changes: Partial<Patchable> = {};
  if (next.title !== task.title) changes.title = next.title;
  if (next.important !== task.important) changes.important = next.important;
  if (next.urgent !== task.urgent) changes.urgent = next.urgent;
  if (next.mit !== task.mit) changes.mit = next.mit;
  if (next.size !== task.size) changes.size = next.size;

  if (Object.keys(changes).length === 0) {
    return { upserts: [], deletes: [], events: [], notices };
  }

  return {
    upserts: [{ ...task, ...next }],
    deletes: [],
    events: [makeEvent('task_updated', task.id, task.planDate, { changes }, ctx)],
    notices,
  };
}

export function moveTask(
  task: Task,
  toDate: ISODate,
  target: { dayTasks: Task[] },
  ctx: Ctx,
): Mutation {
  if (task.status !== 'todo') throw new DomainError('not_movable');
  if (toDate <= task.planDate || toDate <= logicalDate(ctx.now, ctx.settings)) {
    throw new DomainError('invalid_move_date');
  }

  const notices: Notice[] = [];
  let mit = task.mit;
  if (mit && activeMitCount(target.dayTasks) >= MIT_LIMIT) {
    mit = false;
    notices.push('mitLimit');
  }

  const moved: Task = { ...task, status: 'moved', movedTo: toDate };
  const copy: Task = {
    id: ctx.newId(),
    planDate: toDate,
    title: task.title,
    important: task.important,
    urgent: task.urgent,
    mit,
    size: task.size,
    status: 'todo',
    postponedCount: task.postponedCount + 1,
    adhoc: false,
    position: nextPosition(target.dayTasks),
    createdAt: ctx.now.toISOString(),
    completedAt: null,
    movedTo: null,
    originTaskId: task.id,
  };

  return {
    upserts: [moved, copy],
    deletes: [],
    events: [
      makeEvent('task_moved', task.id, task.planDate, { to: toDate, newTaskId: copy.id }, ctx),
      makeEvent(
        'task_created',
        copy.id,
        copy.planDate,
        {
          title: copy.title,
          important: copy.important,
          urgent: copy.urgent,
          mit: copy.mit,
          size: copy.size,
          adhoc: copy.adhoc,
          originTaskId: copy.originTaskId,
        },
        ctx,
      ),
    ],
    notices,
  };
}

export function dropTask(task: Task, ctx: Ctx): Mutation {
  if (task.status !== 'todo') throw new DomainError('not_movable');
  const dropped: Task = { ...task, status: 'dropped' };
  return {
    upserts: [dropped],
    deletes: [],
    events: [makeEvent('task_dropped', task.id, task.planDate, {}, ctx)],
    notices: [],
  };
}

export function restoreTask(task: Task, related: Task[], ctx: Ctx): Mutation {
  if (task.status === 'dropped') {
    const restored: Task = { ...task, status: 'todo' };
    return {
      upserts: [restored],
      deletes: [],
      events: [makeEvent('task_restored', task.id, task.planDate, { from: 'dropped' }, ctx)],
      notices: [],
    };
  }

  if (task.status === 'moved') {
    const copy = related.find((t) => t.originTaskId === task.id);
    if (!copy || copy.status !== 'todo') throw new DomainError('cannot_restore');
    const restored: Task = { ...task, status: 'todo', movedTo: null };
    return {
      upserts: [restored],
      deletes: [copy.id],
      events: [
        makeEvent(
          'task_restored',
          task.id,
          task.planDate,
          { from: 'moved', removedTaskId: copy.id },
          ctx,
        ),
      ],
      notices: [],
    };
  }

  throw new DomainError('cannot_restore');
}
