import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@/domain';
import type { DayLog, ISODate, Mutation, Settings, Task, TaskEvent } from '@/domain';
import type { Repository } from '../repository';

/**
 * The behaviour every `Repository` implementation must share, written once and
 * run against each of them (`repository.test.ts`). Phase 7's Supabase
 * implementation is expected to be added to that list, not to get its own
 * bespoke tests.
 *
 * This file is deliberately **not** named `*.test.ts`: vitest only collects
 * `src/**\/*.test.{ts,tsx}`, so the suite runs once per implementation rather
 * than once on its own with nothing to test.
 */

// A real UUID, not a counter: `tasks.id` and `task_events.id` are `uuid`
// columns in Postgres, so the Supabase repository rejects anything else — and
// this suite is shared by `repository.test.ts` (Memory/Local) *and* the
// Supabase contract run (`pnpm test:supabase`).
const nextId = () => crypto.randomUUID();

export function makeTask(planDate: ISODate, overrides: Partial<Task> = {}): Task {
  return {
    id: nextId(),
    planDate,
    title: 'Task',
    important: false,
    urgent: false,
    mit: false,
    size: null,
    status: 'todo',
    postponedCount: 0,
    adhoc: false,
    position: 0,
    createdAt: '2026-10-03T01:00:00.000Z',
    completedAt: null,
    movedTo: null,
    originTaskId: null,
    ...overrides,
  };
}

function makeEvent(planDate: ISODate, taskId: string | null): TaskEvent {
  return {
    id: nextId(),
    type: 'task_created',
    taskId,
    planDate,
    occurredAt: '2026-10-03T01:00:00.000Z',
    payload: {},
  };
}

function mutation(partial: Partial<Mutation> = {}): Mutation {
  return { upserts: [], deletes: [], events: [], notices: [], ...partial };
}

function makeDayLog(planDate: ISODate, overrides: Partial<DayLog> = {}): DayLog {
  return {
    planDate,
    closedAt: '2026-10-03T14:00:00.000Z',
    energy: 4,
    good: 'Ngủ đủ',
    improve: '',
    ...overrides,
  };
}

const ALL = { from: '2000-01-01', to: '2100-01-01' };

export function describeRepositoryContract(
  name: string,
  create: () => Repository,
): void {
  describe(`${name} — Repository contract`, () => {
    let repo: Repository;

    beforeEach(async () => {
      repo = create();
      await repo.reset();
    });

    it('reports no settings before anything was ever saved', async () => {
      expect(await repo.loadSettings()).toBeNull();
    });

    it('round-trips settings', async () => {
      const settings: Settings = { ...DEFAULT_SETTINGS, lockTime: '12:00', theme: 'dark' };
      await repo.saveSettings(settings);
      expect(await repo.loadSettings()).toEqual(settings);
    });

    it('overwrites settings rather than merging them', async () => {
      await repo.saveSettings({ ...DEFAULT_SETTINGS, lockTime: '12:00' });
      await repo.saveSettings({ ...DEFAULT_SETTINGS, dayEnd: '03:00' });
      const loaded = await repo.loadSettings();
      expect(loaded?.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
      expect(loaded?.dayEnd).toBe('03:00');
    });

    it('does not alias the caller’s settings object', async () => {
      const settings: Settings = { ...DEFAULT_SETTINGS };
      await repo.saveSettings(settings);
      settings.lockTime = '14:00';
      expect((await repo.loadSettings())?.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
    });

    it('loads tasks by planDate, inclusive at both ends', async () => {
      const before = makeTask('2026-09-30');
      const from = makeTask('2026-10-01');
      const inside = makeTask('2026-10-02');
      const to = makeTask('2026-10-03');
      const after = makeTask('2026-10-04');
      await repo.commit(mutation({ upserts: [before, from, inside, to, after] }));

      const loaded = await repo.loadTasks({ from: '2026-10-01', to: '2026-10-03' });
      expect(loaded.map((t) => t.id).sort()).toEqual([from.id, inside.id, to.id].sort());
    });

    it('returns an empty list for a range with nothing in it', async () => {
      await repo.commit(mutation({ upserts: [makeTask('2026-10-03')] }));
      expect(await repo.loadTasks({ from: '2026-11-01', to: '2026-11-30' })).toEqual([]);
      expect(await repo.loadDayLogs({ from: '2026-11-01', to: '2026-11-30' })).toEqual([]);
    });

    it('upserts: a second commit of the same id replaces it', async () => {
      const task = makeTask('2026-10-03', { title: 'Trước' });
      await repo.commit(mutation({ upserts: [task] }));
      await repo.commit(mutation({ upserts: [{ ...task, title: 'Sau', status: 'done' }] }));

      const loaded = await repo.loadTasks(ALL);
      expect(loaded).toHaveLength(1);
      expect(loaded[0]).toMatchObject({ title: 'Sau', status: 'done' });
    });

    it('deletes the ids a mutation lists', async () => {
      const keep = makeTask('2026-10-03');
      const gone = makeTask('2026-10-03');
      await repo.commit(mutation({ upserts: [keep, gone] }));
      await repo.commit(mutation({ deletes: [gone.id] }));
      expect((await repo.loadTasks(ALL)).map((t) => t.id)).toEqual([keep.id]);
    });

    it('applies upserts and deletes of one mutation as a unit', async () => {
      const original = makeTask('2026-10-03');
      const copy = makeTask('2026-10-04', { originTaskId: original.id });
      await repo.commit(mutation({ upserts: [original, copy] }));

      // restoreTask's shape: the original comes back, the copy disappears.
      await repo.commit(
        mutation({
          upserts: [{ ...original, status: 'todo', movedTo: null }],
          deletes: [copy.id],
        }),
      );
      const loaded = await repo.loadTasks(ALL);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe(original.id);
    });

    it('ignores a delete of an unknown id', async () => {
      // A syntactically valid id that was never written — `tasks.id` is a
      // Postgres `uuid` column, so an arbitrary string would fail to cast
      // before the "unknown id" behaviour this case is testing ever runs.
      await repo.commit(mutation({ deletes: [crypto.randomUUID()] }));
      expect(await repo.loadTasks(ALL)).toEqual([]);
    });

    it('stores a dayLog only when one is passed, keyed by planDate', async () => {
      await repo.commit(mutation(), makeDayLog('2026-10-02'));
      await repo.commit(mutation());
      const logs = await repo.loadDayLogs(ALL);
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ planDate: '2026-10-02', energy: 4 });
    });

    it('replaces the dayLog of a day that is closed twice', async () => {
      await repo.commit(mutation(), makeDayLog('2026-10-02', { energy: 2 }));
      await repo.commit(mutation(), makeDayLog('2026-10-02', { energy: 5 }));
      const logs = await repo.loadDayLogs(ALL);
      expect(logs).toHaveLength(1);
      expect(logs[0].energy).toBe(5);
    });

    it('persists tasks, events and the dayLog of one commit together', async () => {
      const task = makeTask('2026-10-02', { status: 'dropped' });
      await repo.commit(
        mutation({ upserts: [task], events: [makeEvent('2026-10-02', task.id)] }),
        makeDayLog('2026-10-02'),
      );
      expect(await repo.loadTasks(ALL)).toHaveLength(1);
      expect(await repo.loadDayLogs(ALL)).toHaveLength(1);
    });

    it('firstPlanDate is the earliest planDate with a planned task', async () => {
      expect(await repo.firstPlanDate()).toBeNull();
      await repo.commit(
        mutation({
          upserts: [makeTask('2026-10-05'), makeTask('2026-10-01'), makeTask('2026-10-09')],
        }),
      );
      expect(await repo.firstPlanDate()).toBe('2026-10-01');
    });

    it('firstPlanDate ignores adhoc tasks', async () => {
      await repo.commit(
        mutation({
          upserts: [makeTask('2026-09-01', { adhoc: true }), makeTask('2026-10-01')],
        }),
      );
      expect(await repo.firstPlanDate()).toBe('2026-10-01');
    });

    it('firstPlanDate counts moved and dropped tasks — the plan existed', async () => {
      await repo.commit(
        mutation({ upserts: [makeTask('2026-08-20', { status: 'dropped' })] }),
      );
      expect(await repo.firstPlanDate()).toBe('2026-08-20');
    });

    it('reset wipes settings, tasks and dayLogs', async () => {
      await repo.saveSettings(DEFAULT_SETTINGS);
      await repo.commit(
        mutation({ upserts: [makeTask('2026-10-03')], events: [makeEvent('2026-10-03', null)] }),
        makeDayLog('2026-10-03'),
      );
      await repo.reset();

      expect(await repo.loadSettings()).toBeNull();
      expect(await repo.loadTasks(ALL)).toEqual([]);
      expect(await repo.loadDayLogs(ALL)).toEqual([]);
      expect(await repo.firstPlanDate()).toBeNull();
    });

    it('survives a reload: a fresh instance sees what was committed', async () => {
      await repo.saveSettings({ ...DEFAULT_SETTINGS, dayEnd: '02:00' });
      await repo.commit(mutation({ upserts: [makeTask('2026-10-03', { title: 'Giữ lại' })] }));

      // Only meaningful for persistent implementations; for MemoryRepository
      // `create()` returns the same instance, which is also a valid outcome.
      const reopened = create();
      expect((await reopened.loadSettings())?.dayEnd).toBe('02:00');
      expect((await reopened.loadTasks(ALL)).map((t) => t.title)).toEqual(['Giữ lại']);
    });
  });
}
