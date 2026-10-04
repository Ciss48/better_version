import { DEFAULT_SETTINGS } from '../settings';
import type { Ctx, Settings, Task } from '../types';

export function settings(overrides: Partial<Settings> = {}): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

/** Deterministic id generator: 'id1', 'id2', … */
export function idGen(prefix = 'id'): () => string {
  let n = 0;
  return () => `${prefix}${++n}`;
}

export function ctx(nowIso: string, overrides: Partial<Settings> = {}): Ctx {
  return {
    now: new Date(nowIso),
    settings: settings(overrides),
    newId: idGen(),
  };
}

let taskSeq = 0;

export function task(overrides: Partial<Task> = {}): Task {
  taskSeq += 1;
  return {
    id: `t${taskSeq}`,
    planDate: '2026-10-03',
    title: `Task ${taskSeq}`,
    important: false,
    urgent: false,
    mit: false,
    size: 'M',
    status: 'todo',
    postponedCount: 0,
    adhoc: false,
    position: taskSeq,
    createdAt: '2026-10-02T12:00:00.000Z',
    completedAt: null,
    movedTo: null,
    originTaskId: null,
    ...overrides,
  };
}
