import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/domain';
import type { DayLog, Settings, Task, TaskEvent } from '@/domain';
import {
  dayLogToRow,
  eventToRow,
  rowToDayLog,
  rowToEvent,
  rowToSettings,
  rowToTask,
  settingsToRow,
  taskToRow,
  toIsoZ,
} from '../mappers';
import type { DayLogRow, SettingsRow, TaskEventRow, TaskRow } from '../mappers';

const TASK: Task = {
  id: 't1',
  planDate: '2026-10-03',
  title: 'Viết báo cáo',
  important: true,
  urgent: false,
  mit: true,
  size: 'M',
  status: 'done',
  postponedCount: 2,
  adhoc: false,
  position: 3,
  createdAt: '2026-10-03T01:00:00.000Z',
  completedAt: '2026-10-03T05:30:00.000Z',
  movedTo: null,
  originTaskId: null,
};

const TASK_NULLS: Task = {
  ...TASK,
  id: 't2',
  size: null,
  status: 'moved',
  completedAt: null,
  movedTo: '2026-10-04',
  originTaskId: 't1',
};

function taskRowOf(task: Task, userId = 'u1'): TaskRow {
  const upsert = taskToRow(task);
  return {
    ...upsert,
    // Postgres hands back the offset form; the round-trip must normalise it.
    created_at: upsert.created_at.replace('Z', '+00:00'),
    completed_at: upsert.completed_at === null ? null : upsert.completed_at.replace('Z', '+00:00'),
    user_id: userId,
    updated_at: '2026-10-03T06:00:00+00:00',
  };
}

describe('toIsoZ', () => {
  it('normalises an offset instant to a Z-suffixed ISO string', () => {
    expect(toIsoZ('2026-10-03T01:00:00+00:00')).toBe('2026-10-03T01:00:00.000Z');
  });
});

describe('task mappers', () => {
  it('round-trips every field, including nulls', () => {
    expect(rowToTask(taskRowOf(TASK))).toEqual(TASK);
    expect(rowToTask(taskRowOf(TASK_NULLS))).toEqual(TASK_NULLS);
  });

  it('taskToRow never includes user_id — the column defaults to auth.uid()', () => {
    expect(taskToRow(TASK)).not.toHaveProperty('user_id');
  });
});

describe('settings mappers', () => {
  const SETTINGS: Settings = { ...DEFAULT_SETTINGS, habit: 'morning', windowStart: { hour: 6, dayOffset: 0 } };

  function settingsRowOf(s: Settings): SettingsRow {
    const upsert = settingsToRow(s);
    return {
      ...upsert,
      onboarded_at: upsert.onboarded_at,
      user_id: 'u1',
      created_at: '2026-10-01T00:00:00+00:00',
      updated_at: '2026-10-01T00:00:00+00:00',
    };
  }

  it('round-trips windowStart across its two columns', () => {
    expect(rowToSettings(settingsRowOf(SETTINGS))).toEqual(SETTINGS);
  });

  it('round-trips onboardedAt, including null', () => {
    const onboarded: Settings = { ...DEFAULT_SETTINGS, onboardedAt: '2026-10-01T12:00:00.000Z' };
    const row = settingsRowOf(onboarded);
    row.onboarded_at = onboarded.onboardedAt!.replace('Z', '+00:00');
    expect(rowToSettings(row).onboardedAt).toBe(onboarded.onboardedAt);
    expect(rowToSettings(settingsRowOf(DEFAULT_SETTINGS)).onboardedAt).toBeNull();
  });
});

describe('dayLog mappers', () => {
  const LOG: DayLog = {
    planDate: '2026-10-03',
    closedAt: '2026-10-03T14:00:00.000Z',
    energy: 4,
    good: 'Ngủ đủ',
    improve: 'Dậy sớm hơn',
  };

  function rowOf(log: DayLog): DayLogRow {
    const upsert = dayLogToRow(log);
    return {
      ...upsert,
      closed_at: upsert.closed_at === null ? null : upsert.closed_at.replace('Z', '+00:00'),
      user_id: 'u1',
      updated_at: '2026-10-03T14:00:00+00:00',
    };
  }

  it('round-trips every field, including a null closedAt', () => {
    expect(rowToDayLog(rowOf(LOG))).toEqual(LOG);
    expect(rowToDayLog(rowOf({ ...LOG, closedAt: null }))).toEqual({ ...LOG, closedAt: null });
  });
});

describe('event mapper', () => {
  const EVENT: TaskEvent = {
    id: 'e1',
    type: 'task_moved',
    taskId: 't1',
    planDate: '2026-10-03',
    occurredAt: '2026-10-03T01:00:00.000Z',
    payload: { from: '2026-10-03', to: '2026-10-04' },
  };

  it('eventToRow carries the payload through as JSON', () => {
    const row = eventToRow(EVENT);
    expect(row).toMatchObject({
      id: 'e1',
      task_id: 't1',
      plan_date: '2026-10-03',
      type: 'task_moved',
      occurred_at: '2026-10-03T01:00:00.000Z',
      payload: { from: '2026-10-03', to: '2026-10-04' },
    });
  });

  it('round-trips a day_closed event with a null task_id', () => {
    const row: TaskEventRow = {
      id: 'e2',
      user_id: 'u1',
      task_id: null,
      plan_date: '2026-10-03',
      type: 'day_closed',
      payload: {},
      occurred_at: '2026-10-03T14:00:00+00:00',
      seq: 1,
    };
    expect(rowToEvent(row)).toEqual({
      id: 'e2',
      type: 'day_closed',
      taskId: null,
      planDate: '2026-10-03',
      occurredAt: '2026-10-03T14:00:00.000Z',
      payload: {},
    });
  });
});
