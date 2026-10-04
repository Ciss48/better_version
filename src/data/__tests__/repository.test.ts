// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/domain';
import { KEYS, LocalRepository } from '../local-repository';
import { MemoryRepository } from '../memory-repository';
import { describeRepositoryContract, makeTask } from './repository.contract';

/**
 * The shared contract, run against both implementations. `create()` must hand
 * back a repository that looks at the *same* storage every time it is called,
 * so the contract's "survives a reload" case is meaningful.
 */
const memory = new MemoryRepository();
describeRepositoryContract('MemoryRepository', () => memory);
describeRepositoryContract('LocalRepository', () => new LocalRepository());

describe('LocalRepository — localStorage specifics', () => {
  let repo: LocalRepository;

  beforeEach(async () => {
    window.localStorage.clear();
    repo = new LocalRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes the documented keys and nothing else', async () => {
    await repo.saveSettings(DEFAULT_SETTINGS);
    await repo.commit(
      {
        upserts: [makeTask('2026-10-03')],
        deletes: [],
        events: [
          {
            id: 'e1',
            type: 'task_created',
            taskId: null,
            planDate: '2026-10-03',
            occurredAt: '2026-10-03T01:00:00.000Z',
            payload: {},
          },
        ],
        notices: [],
      },
      {
        planDate: '2026-10-03',
        closedAt: '2026-10-03T14:00:00.000Z',
        energy: 3,
        good: '',
        improve: '',
      },
    );

    expect(Object.keys(window.localStorage).sort()).toEqual(
      [KEYS.settings, KEYS.tasks, KEYS.dayLogs, KEYS.events].sort(),
    );
  });

  it('appends to the event log instead of replacing it', async () => {
    const event = (id: string) => ({
      id,
      type: 'task_created' as const,
      taskId: null,
      planDate: '2026-10-03',
      occurredAt: '2026-10-03T01:00:00.000Z',
      payload: {},
    });
    await repo.commit({ upserts: [], deletes: [], events: [event('a')], notices: [] });
    await repo.commit({ upserts: [], deletes: [], events: [event('b')], notices: [] });

    const log = JSON.parse(window.localStorage.getItem(KEYS.events) ?? '[]') as { id: string }[];
    expect(log.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('treats corrupt JSON as empty and says so', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(KEYS.tasks, '{not json');
    window.localStorage.setItem(KEYS.dayLogs, 'oops');

    expect(await repo.loadTasks({ from: '2026-10-01', to: '2026-10-31' })).toEqual([]);
    expect(await repo.loadDayLogs({ from: '2026-10-01', to: '2026-10-31' })).toEqual([]);
    expect(await repo.firstPlanDate()).toBeNull();
    expect(spy).toHaveBeenCalled();
  });

  it('recovers from corrupt JSON on the next commit', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    window.localStorage.setItem(KEYS.tasks, '{not json');
    const task = makeTask('2026-10-03');
    await repo.commit({ upserts: [task], deletes: [], events: [], notices: [] });
    expect((await repo.loadTasks({ from: '2026-10-01', to: '2026-10-31' })).map((t) => t.id)).toEqual([
      task.id,
    ]);
  });

  it('reset removes only the keys it owns', async () => {
    window.localStorage.setItem('bed-theme', 'dark');
    await repo.saveSettings(DEFAULT_SETTINGS);
    await repo.reset();
    expect(window.localStorage.getItem('bed-theme')).toBe('dark');
    expect(window.localStorage.getItem(KEYS.settings)).toBeNull();
  });
});
