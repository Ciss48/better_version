// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StoreApi, UseBoundStore } from 'zustand';
import { MemoryRepository } from '@/data';
import type { Repository } from '@/data';
import {
  activeMitCount,
  addDays,
  DEFAULT_SETTINGS,
  parseQuickAdd,
  type DayLog,
  type ISODate,
  type Mutation,
  type ParsedTask,
  type Settings,
  type Task,
  type TaskEvent,
} from '@/domain';
import { setNowOverride } from '../clock-source';
import { draftKey, emptyDraft } from '../ritual-draft';
import { tasksOn } from '../selectors';
import { createAppStore, repairSettings } from '../store';
import type { AppState, RitualDraft } from '../store';

/**
 * The store against a `MemoryRepository`. Every action in the Phase 5 contract
 * has a happy path here plus the two failure modes that matter: a domain rule
 * saying no (nothing changes) and a repository that cannot write (everything
 * rolls back).
 */

const TODAY: ISODate = '2026-10-03';
const TOMORROW: ISODate = '2026-10-04';
/** 14:10 Saturday in Asia/Ho_Chi_Minh — the plan for 10-03 locked at 10:00. */
const LOCKED_NOW = new Date('2026-10-03T07:10:00Z');
/** 08:15 Saturday — the window is still open. */
const OPEN_NOW = new Date('2026-10-03T01:15:00Z');

const toasts: string[] = [];

vi.mock('sonner', () => ({
  toast: (message: string) => {
    toasts.push(message);
  },
}));

type Store = UseBoundStore<StoreApi<AppState>>;

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    planDate: TODAY,
    title: `Việc ${id}`,
    important: false,
    urgent: false,
    mit: false,
    size: null,
    status: 'todo',
    postponedCount: 0,
    adhoc: false,
    position: 0,
    createdAt: '2026-10-02T13:00:00.000Z',
    completedAt: null,
    movedTo: null,
    originTaskId: null,
    ...overrides,
  };
}

const onboarded: Settings = { ...DEFAULT_SETTINGS, onboardedAt: '2026-09-01T13:00:00.000Z' };

async function boot(options: {
  tasks?: Task[];
  dayLogs?: DayLog[];
  settings?: Settings | null;
  now?: Date;
  repo?: Repository;
} = {}): Promise<{ store: Store; repo: MemoryRepository }> {
  setNowOverride(options.now ?? LOCKED_NOW);
  const repo = new MemoryRepository();
  await repo.seed({
    settings: options.settings === undefined ? onboarded : options.settings,
    tasks: options.tasks ?? [],
    dayLogs: options.dayLogs ?? [],
  });
  const store = createAppStore(options.repo ?? repo);
  await store.getState().init();
  return { store, repo };
}

function parse(input: string): ParsedTask {
  const parsed = parseQuickAdd(input);
  if (parsed === null) throw new Error(`unparsable: ${input}`);
  return parsed;
}

/** A repository whose writes always fail. */
function brokenRepo(inner: MemoryRepository): Repository {
  return {
    loadSettings: () => inner.loadSettings(),
    saveSettings: () => Promise.reject(new Error('offline')),
    loadTasks: (r) => inner.loadTasks(r),
    loadDayLogs: (r) => inner.loadDayLogs(r),
    firstPlanDate: () => inner.firstPlanDate(),
    commit: () => Promise.reject(new Error('offline')),
    reset: () => inner.reset(),
  };
}

beforeEach(() => {
  toasts.length = 0;
  window.localStorage.clear();
});

afterEach(() => {
  setNowOverride(null);
  vi.restoreAllMocks();
});

describe('init', () => {
  it('starts in loading and ends ready', async () => {
    const store = createAppStore(new MemoryRepository());
    expect(store.getState().status).toBe('loading');
    setNowOverride(LOCKED_NOW);
    await store.getState().init();
    expect(store.getState().status).toBe('ready');
  });

  it('falls back to the default settings on a first run and is not onboarded', async () => {
    const { store } = await boot({ settings: null });
    expect(store.getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(store.getState().onboarded).toBe(false);
  });

  it('is onboarded only when the stored settings carry an onboardedAt', async () => {
    const { store } = await boot({ settings: { ...DEFAULT_SETTINGS } });
    expect(store.getState().onboarded).toBe(false);
    const second = await boot({ settings: onboarded });
    expect(second.store.getState().onboarded).toBe(true);
  });

  it('loads 190 days back and 30 forward around today', async () => {
    const { store } = await boot();
    expect(store.getState().loaded).toEqual({
      from: addDays(TODAY, -190),
      to: addDays(TODAY, 30),
    });
  });

  it('loads tasks, dayLogs and firstPlanDate', async () => {
    const { store } = await boot({
      tasks: [task('a', { planDate: '2026-09-20' }), task('b')],
      dayLogs: [
        {
          planDate: '2026-09-20',
          closedAt: '2026-09-20T14:00:00.000Z',
          energy: 3,
          good: '',
          improve: '',
        },
      ],
    });
    const s = store.getState();
    expect(Object.keys(s.tasks).sort()).toEqual(['a', 'b']);
    expect(s.dayLogs['2026-09-20']?.energy).toBe(3);
    expect(s.firstPlanDate).toBe('2026-09-20');
  });

  it('repairs invalid stored settings field by field and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot({
      settings: { ...onboarded, lockTime: '23:00' } as Settings,
    });
    expect(store.getState().settings.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
    expect(store.getState().settings.onboardedAt).toBe(onboarded.onboardedAt);
    expect(warn).toHaveBeenCalled();
  });

  it('restores the persisted Today preferences', async () => {
    window.localStorage.setItem(
      'bed:v1:ui',
      JSON.stringify({ todayView: 'matrix', planReminderDismissedOn: TODAY }),
    );
    const { store } = await boot();
    expect(store.getState().ui.todayView).toBe('matrix');
    expect(store.getState().ui.planReminderDismissedOn).toBe(TODAY);
  });

  it('ends in error when the repository cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const repo = new MemoryRepository();
    vi.spyOn(repo, 'loadTasks').mockRejectedValue(new Error('nope'));
    setNowOverride(LOCKED_NOW);
    const store = createAppStore(repo);
    await store.getState().init();
    expect(store.getState().status).toBe('error');
  });
});

describe('repairSettings', () => {
  it('accepts valid settings unchanged', () => {
    expect(repairSettings(onboarded)).toEqual({ settings: onboarded, problems: [] });
  });

  it('fills in missing fields from the defaults', () => {
    const partial = { theme: 'dark' } as unknown as Settings;
    const { settings } = repairSettings(partial);
    expect(settings.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
    expect(settings.theme).toBe('dark');
  });

  it('trusts the habit and repairs the window around it', () => {
    const broken: Settings = { ...onboarded, habit: 'morning' };
    const { settings, problems } = repairSettings(broken);
    expect(problems.length).toBeGreaterThan(0);
    expect(settings.habit).toBe('morning');
    expect(settings.windowStart).toEqual({ hour: 6, dayOffset: 0 });
  });

  it('falls back wholesale when nothing else helps, keeping identity fields', () => {
    const nonsense = {
      timezone: 'Europe/Berlin',
      theme: 'dark',
      remindOn: false,
      onboardedAt: '2026-01-01T00:00:00.000Z',
      habit: 'evening',
      windowStart: 'nope',
      lockTime: 'x',
      dayEnd: 'y',
      remindPlan: 'z',
      remindRitual: 'w',
    } as unknown as Settings;
    const { settings } = repairSettings(nonsense);
    expect(settings.timezone).toBe('Europe/Berlin');
    expect(settings.theme).toBe('dark');
    expect(settings.remindOn).toBe(false);
    expect(settings.onboardedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(settings.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
  });
});

describe('ensureLoaded', () => {
  it('does nothing for dates already inside the window', async () => {
    const { store, repo } = await boot();
    const spy = vi.spyOn(repo, 'loadTasks');
    await store.getState().ensureLoaded([TODAY, TOMORROW]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('extends the window forward and merges what it finds', async () => {
    const far: ISODate = '2027-03-01';
    const { store, repo } = await boot();
    await repo.seed({ tasks: [task('far', { planDate: far })] });

    await store.getState().ensureLoaded([far]);
    expect(store.getState().loaded.to).toBe(far);
    expect(store.getState().tasks.far).toBeDefined();
  });

  it('extends the window backwards too', async () => {
    const old: ISODate = '2024-01-01';
    const { store, repo } = await boot();
    await repo.seed({ tasks: [task('old', { planDate: old })] });

    await store.getState().ensureLoaded([old]);
    expect(store.getState().loaded.from).toBe(old);
    expect(store.getState().tasks.old).toBeDefined();
  });
});

describe('addTask', () => {
  it('adds a planned task while the window is open', async () => {
    const { store, repo } = await boot({ now: OPEN_NOW });
    await store.getState().addTask(TODAY, parse('Học Databricks * ~L'), 'today');

    const added = tasksOn(store.getState().tasks, TODAY);
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ title: 'Học Databricks', mit: true, size: 'L', adhoc: false });
    expect(await repo.loadTasks({ from: TODAY, to: TODAY })).toHaveLength(1);
  });

  it('marks a task added after the lock as adhoc and says so', async () => {
    const { store } = await boot();
    await store.getState().addTask(TODAY, parse('Sửa dashboard'), 'today');

    expect(tasksOn(store.getState().tasks, TODAY)[0].adhoc).toBe(true);
    expect(toasts).toContain('Đã thêm vào nhóm Phát sinh');
  });

  it('downgrades a fourth MIT and explains it', async () => {
    const { store } = await boot({
      now: OPEN_NOW,
      tasks: [
        task('m1', { mit: true, position: 0 }),
        task('m2', { mit: true, position: 1 }),
        task('m3', { mit: true, position: 2 }),
      ],
    });
    await store.getState().addTask(TODAY, parse('Việc thứ tư *'), 'today');

    const added = tasksOn(store.getState().tasks, TODAY).at(-1);
    expect(added?.mit).toBe(false);
    expect(toasts).toContain('Đã có đủ 3 MIT — việc này thêm như việc thường');
  });

  it('uses the tomorrow wording when the scope says so', async () => {
    const { store } = await boot({
      now: OPEN_NOW,
      tasks: [
        task('m1', { planDate: TOMORROW, mit: true }),
        task('m2', { planDate: TOMORROW, mit: true }),
        task('m3', { planDate: TOMORROW, mit: true }),
      ],
    });
    await store.getState().addTask(TOMORROW, parse('Thêm nữa *'), 'tomorrow');
    expect(toasts).toContain('Đã đủ 3 MIT cho ngày mai');
  });

  it('updates firstPlanDate when the new task predates everything', async () => {
    const { store } = await boot({
      now: OPEN_NOW,
      tasks: [task('later', { planDate: TOMORROW })],
    });
    expect(store.getState().firstPlanDate).toBe(TOMORROW);

    await store.getState().addTask(TODAY, parse('Việc hôm nay'), 'today');
    expect(store.getState().firstPlanDate).toBe(TODAY);
  });

  it('leaves firstPlanDate alone for an adhoc task', async () => {
    const { store } = await boot({ tasks: [task('p', { planDate: TODAY })] });
    expect(store.getState().firstPlanDate).toBe(TODAY);
    // A past day is long locked, so this lands as adhoc and proves nothing
    // about when the user first planned.
    await store.getState().addTask('2026-09-01', parse('Phát sinh cũ'), 'today');
    expect(store.getState().tasks[Object.keys(store.getState().tasks).find((id) => id !== 'p') as string].adhoc).toBe(true);
    expect(store.getState().firstPlanDate).toBe(TODAY);
  });

  it('refuses an empty title without touching the state', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot();
    await store.getState().addTask(TODAY, { title: '  ', mit: false, important: false, urgent: false, size: null }, 'today');
    expect(Object.keys(store.getState().tasks)).toHaveLength(0);
  });

  it('rolls back and warns when the write fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    await inner.seed({ settings: onboarded });
    const { store } = await boot({ now: OPEN_NOW, repo: brokenRepo(inner) });

    await store.getState().addTask(TODAY, parse('Không lưu được'), 'today');
    expect(Object.keys(store.getState().tasks)).toHaveLength(0);
    expect(toasts).toContain('Chưa lưu được — thử lại nhé');
  });
});

describe('toggleDone', () => {
  it('ticks and unticks, persisting both ways', async () => {
    const { store, repo } = await boot({ tasks: [task('a')] });
    await store.getState().toggleDone('a');
    expect(store.getState().tasks.a.status).toBe('done');
    expect(store.getState().tasks.a.completedAt).not.toBeNull();

    await store.getState().toggleDone('a');
    expect(store.getState().tasks.a.status).toBe('todo');
    expect((await repo.loadTasks({ from: TODAY, to: TODAY }))[0].status).toBe('todo');
  });

  it('toasts when the day reaches 100%', async () => {
    const { store } = await boot({
      tasks: [task('a', { status: 'done', completedAt: '2026-10-03T01:00:00.000Z' }), task('b', { position: 1 })],
    });
    await store.getState().toggleDone('b');
    expect(toasts).toContain('Trọn vẹn 100% kế hoạch hôm nay. Làm tốt lắm!');
  });

  it('does not toast 100% twice', async () => {
    const { store } = await boot({ tasks: [task('a')] });
    await store.getState().toggleDone('a');
    await store.getState().patchTask('a', { size: 'L' });
    expect(toasts.filter((m) => m.startsWith('Trọn vẹn 100%'))).toHaveLength(1);
  });

  it('refuses a task that is not tickable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot({ tasks: [task('a', { status: 'dropped' })] });
    await store.getState().toggleDone('a');
    expect(store.getState().tasks.a.status).toBe('dropped');
  });

  it('warns about an unknown id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot();
    await store.getState().toggleDone('ghost');
    expect(warn).toHaveBeenCalled();
  });

  it('rolls back a failed write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    await inner.seed({ settings: onboarded, tasks: [task('a')] });
    const { store } = await boot({ repo: brokenRepo(inner), tasks: [task('a')] });

    await store.getState().toggleDone('a');
    expect(store.getState().tasks.a.status).toBe('todo');
    expect(toasts).toContain('Chưa lưu được — thử lại nhé');
  });
});

describe('patchTask and setQuadrant', () => {
  it('applies flag and size changes', async () => {
    const { store } = await boot({ tasks: [task('a')] });
    await store.getState().patchTask('a', { important: true, size: 'M' });
    expect(store.getState().tasks.a).toMatchObject({ important: true, size: 'M' });
  });

  it('writes nothing when the patch changes nothing', async () => {
    const { store, repo } = await boot({ tasks: [task('a')] });
    const spy = vi.spyOn(repo, 'commit');
    await store.getState().patchTask('a', { important: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('refuses a fourth MIT, explains it and writes nothing', async () => {
    const { store, repo } = await boot({
      tasks: [
        task('m1', { mit: true }),
        task('m2', { mit: true, position: 1 }),
        task('m3', { mit: true, position: 2 }),
        task('a', { position: 3 }),
      ],
    });
    const spy = vi.spyOn(repo, 'commit');
    await store.getState().patchTask('a', { mit: true });

    expect(store.getState().tasks.a.mit).toBe(false);
    expect(toasts).toContain('Tối đa 3 MIT — bỏ bớt một việc trước nhé');
    expect(spy).not.toHaveBeenCalled();
  });

  it('setQuadrant sets both flags and names the quadrant', async () => {
    const { store } = await boot({ tasks: [task('a', { important: true, urgent: true })] });
    await store.getState().setQuadrant('a', 'q2');
    expect(store.getState().tasks.a).toMatchObject({ important: true, urgent: false });
    expect(toasts).toContain('Đã chuyển sang “Lên lịch”');
  });

  it('activeMitCount stays within the limit after every patch', async () => {
    const { store } = await boot({ tasks: [task('a'), task('b', { position: 1 })] });
    await store.getState().patchTask('a', { mit: true });
    await store.getState().patchTask('b', { mit: true });
    expect(activeMitCount(tasksOn(store.getState().tasks, TODAY))).toBe(2);
  });
});

describe('moveTask, dropTask and restoreTask', () => {
  it('moves a task, leaving a moved original and a copy on the target day', async () => {
    const { store } = await boot({ tasks: [task('a', { mit: true })] });
    await store.getState().moveTask('a', TOMORROW);

    const original = store.getState().tasks.a;
    expect(original).toMatchObject({ status: 'moved', movedTo: TOMORROW });
    const copy = tasksOn(store.getState().tasks, TOMORROW)[0];
    expect(copy).toMatchObject({ originTaskId: 'a', postponedCount: 1, status: 'todo' });
    expect(toasts).toContain('Đã dời sang CN 4/10');
  });

  it('enforces the MIT limit on the target day', async () => {
    const { store } = await boot({
      tasks: [
        task('a', { mit: true }),
        task('t1', { planDate: TOMORROW, mit: true }),
        task('t2', { planDate: TOMORROW, mit: true, position: 1 }),
        task('t3', { planDate: TOMORROW, mit: true, position: 2 }),
      ],
    });
    await store.getState().moveTask('a', TOMORROW);
    const copy = tasksOn(store.getState().tasks, TOMORROW).find((t) => t.originTaskId === 'a');
    expect(copy?.mit).toBe(false);
    expect(toasts).toContain('Tối đa 3 MIT — bỏ bớt một việc trước nhé');
  });

  it('refuses an invalid move date', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot({ tasks: [task('a')] });
    await store.getState().moveTask('a', TODAY);
    expect(store.getState().tasks.a.status).toBe('todo');
  });

  it('loads the target day before moving onto it', async () => {
    const far: ISODate = '2027-05-05';
    const { store, repo } = await boot({ tasks: [task('a')] });
    await repo.seed({
      tasks: [
        task('f1', { planDate: far, mit: true }),
        task('f2', { planDate: far, mit: true, position: 1 }),
        task('f3', { planDate: far, mit: true, position: 2 }),
      ],
    });

    await store.getState().moveTask('a', far);
    // The limit could only be applied because the far day was fetched first.
    expect(store.getState().loaded.to).toBe(far);
    expect(tasksOn(store.getState().tasks, far)).toHaveLength(4);
  });

  it('drops a task', async () => {
    const { store } = await boot({ tasks: [task('a')] });
    await store.getState().dropTask('a');
    expect(store.getState().tasks.a.status).toBe('dropped');
  });

  it('restores a dropped task', async () => {
    const { store } = await boot({ tasks: [task('a', { status: 'dropped' })] });
    await store.getState().restoreTask('a');
    expect(store.getState().tasks.a.status).toBe('todo');
  });

  it('restores a moved task and deletes its copy, loading the copy’s day first', async () => {
    const far: ISODate = '2027-06-06';
    const inner = new MemoryRepository();
    await inner.seed({
      settings: onboarded,
      tasks: [
        task('a', { status: 'moved', movedTo: far }),
        task('copy', { planDate: far, originTaskId: 'a', postponedCount: 1 }),
      ],
    });
    setNowOverride(LOCKED_NOW);
    const store = createAppStore(inner);
    await store.getState().init();
    // The copy sits outside the loaded window.
    expect(store.getState().tasks.copy).toBeUndefined();

    await store.getState().restoreTask('a');
    expect(store.getState().tasks.a).toMatchObject({ status: 'todo', movedTo: null });
    expect(store.getState().tasks.copy).toBeUndefined();
    expect(await inner.loadTasks({ from: far, to: far })).toEqual([]);
  });

  it('downgrades a restored MIT when the day filled up meanwhile', async () => {
    const { store } = await boot({
      tasks: [
        task('a', { status: 'dropped', mit: true }),
        task('m1', { mit: true, position: 1 }),
        task('m2', { mit: true, position: 2 }),
        task('m3', { mit: true, position: 3 }),
      ],
    });
    await store.getState().restoreTask('a');
    expect(store.getState().tasks.a).toMatchObject({ status: 'todo', mit: false });
    expect(toasts).toContain('Tối đa 3 MIT — bỏ bớt một việc trước nhé');
  });

  it('rolls a failed move back completely', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    await inner.seed({ settings: onboarded, tasks: [task('a')] });
    const { store } = await boot({ repo: brokenRepo(inner), tasks: [task('a')] });

    await store.getState().moveTask('a', TOMORROW);
    expect(store.getState().tasks.a.status).toBe('todo');
    expect(tasksOn(store.getState().tasks, TOMORROW)).toHaveLength(0);
  });
});

describe('closeDay', () => {
  function draft(partial: Partial<RitualDraft> = {}): RitualDraft {
    return { ...emptyDraft(TODAY), ...partial };
  }

  it('applies decisions, writes the dayLog and records lastClose', async () => {
    const { store, repo } = await boot({
      tasks: [
        task('a', { status: 'done', completedAt: '2026-10-03T01:00:00.000Z' }),
        task('b', { position: 1 }),
        task('c', { position: 2 }),
      ],
    });
    await store.getState().closeDay(
      draft({
        decisions: { b: { kind: 'move', date: TOMORROW }, c: { kind: 'drop' } },
        reflection: { energy: 4, good: 'Vẫn chạy bộ', improve: '' },
        tomorrowNew: [{ id: 'n1', parsed: parse('Chạy bộ 5km *') }],
      }),
    );

    const s = store.getState();
    expect(s.tasks.b.status).toBe('moved');
    expect(s.tasks.c.status).toBe('dropped');
    expect(s.dayLogs[TODAY]).toMatchObject({ energy: 4, good: 'Vẫn chạy bộ' });
    expect(s.lastClose?.date).toBe(TODAY);

    const tomorrow = tasksOn(s.tasks, TOMORROW);
    expect(tomorrow.map((t) => t.title)).toContain('Chạy bộ 5km');
    expect(tomorrow.find((t) => t.title === 'Chạy bộ 5km')?.mit).toBe(true);
    expect((await repo.loadDayLogs({ from: TODAY, to: TODAY }))[0].closedAt).not.toBeNull();
    expect(toasts).toContain('Đã đóng ngày. Hẹn gặp lại sáng mai!');
  });

  it('honours the tomorrowMit override for a carried task', async () => {
    const { store } = await boot({ tasks: [task('b', { mit: false })] });
    await store.getState().closeDay(
      draft({
        decisions: { b: { kind: 'move', date: TOMORROW } },
        tomorrowMit: { b: true },
      }),
    );
    const copy = tasksOn(store.getState().tasks, TOMORROW)[0];
    expect(copy.mit).toBe(true);
    // The original keeps its own flag — history stays truthful.
    expect(store.getState().tasks.b.mit).toBe(false);
  });

  it('collects otherTargets for a move date outside the loaded window', async () => {
    const far: ISODate = '2027-07-07';
    const { store, repo } = await boot({ tasks: [task('b', { mit: true })] });
    await repo.seed({
      tasks: [
        task('f1', { planDate: far, mit: true }),
        task('f2', { planDate: far, mit: true, position: 1 }),
        task('f3', { planDate: far, mit: true, position: 2 }),
      ],
    });

    await store.getState().closeDay(
      draft({ decisions: { b: { kind: 'move', date: far } } }),
    );

    // Without otherTargets the domain would have thrown `missing_target_day`;
    // with it, the fourth MIT is downgraded instead.
    expect(store.getState().tasks.b.status).toBe('moved');
    const copy = tasksOn(store.getState().tasks, far).find((t) => t.originTaskId === 'b');
    expect(copy?.mit).toBe(false);
  });

  it('refuses to close while a task is undecided', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot({ tasks: [task('a'), task('b', { position: 1 })] });
    await store.getState().closeDay(draft({ decisions: { a: { kind: 'drop' } } }));

    expect(store.getState().dayLogs[TODAY]).toBeUndefined();
    expect(store.getState().lastClose).toBeNull();
  });

  it('clears the stored draft only after a successful close', async () => {
    const { store } = await boot({ tasks: [task('a')] });
    window.localStorage.setItem(draftKey(TODAY), JSON.stringify(draft()));
    await store.getState().closeDay(draft({ decisions: { a: { kind: 'drop' } } }));
    expect(window.localStorage.getItem(draftKey(TODAY))).toBeNull();
  });

  it('rolls back a failed close and keeps the draft', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    await inner.seed({ settings: onboarded, tasks: [task('a')] });
    const { store } = await boot({ repo: brokenRepo(inner), tasks: [task('a')] });
    window.localStorage.setItem(draftKey(TODAY), JSON.stringify(draft()));

    await store.getState().closeDay(draft({ decisions: { a: { kind: 'drop' } } }));

    expect(store.getState().tasks.a.status).toBe('todo');
    expect(store.getState().dayLogs[TODAY]).toBeUndefined();
    expect(store.getState().lastClose).toBeNull();
    expect(window.localStorage.getItem(draftKey(TODAY))).not.toBeNull();
    expect(toasts).toContain('Chưa lưu được — thử lại nhé');
  });

  it('does not shout "100%" on top of "day closed"', async () => {
    const { store } = await boot({
      tasks: [task('a'), task('b', { position: 1 })],
    });
    await store.getState().closeDay(
      draft({ decisions: { a: { kind: 'drop' }, b: { kind: 'drop' } } }),
    );
    expect(toasts.some((m) => m.startsWith('Trọn vẹn 100%'))).toBe(false);
  });

  it('records the mutation it committed in lastClose', async () => {
    const { store } = await boot({ tasks: [task('a')] });
    await store.getState().closeDay(draft({ decisions: { a: { kind: 'drop' } } }));
    const result = store.getState().lastClose?.result as Mutation & { dayLog: DayLog };
    expect(result.events.some((e: TaskEvent) => e.type === 'day_closed')).toBe(true);
    expect(result.dayLog.planDate).toBe(TODAY);
  });
});

describe('settings and onboarding', () => {
  it('saves a patch immediately', async () => {
    const { store, repo } = await boot();
    await store.getState().updateSettings({ lockTime: '12:00' });
    expect(store.getState().settings.lockTime).toBe('12:00');
    expect((await repo.loadSettings())?.lockTime).toBe('12:00');
  });

  it('switches the window start with the habit', async () => {
    const { store } = await boot();
    await store.getState().updateSettings({ habit: 'morning' });
    expect(store.getState().settings).toMatchObject({
      habit: 'morning',
      windowStart: { hour: 6, dayOffset: 0 },
      remindPlan: '07:00',
    });
  });

  it('refuses an invalid patch and warns', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { store } = await boot();
    await store.getState().updateSettings({ lockTime: '23:00' });
    expect(store.getState().settings.lockTime).toBe(DEFAULT_SETTINGS.lockTime);
    expect(warn).toHaveBeenCalled();
  });

  it('rolls a settings patch back when the write fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    await inner.seed({ settings: onboarded });
    const { store } = await boot({ repo: brokenRepo(inner) });

    await store.getState().updateSettings({ dayEnd: '03:00' });
    expect(store.getState().settings.dayEnd).toBe('00:00');
    expect(toasts).toContain('Chưa lưu được — thử lại nhé');
  });

  it('completeOnboarding stamps onboardedAt from the injected clock', async () => {
    const { store, repo } = await boot({ settings: null });
    await store.getState().completeOnboarding(DEFAULT_SETTINGS);

    expect(store.getState().onboarded).toBe(true);
    expect(store.getState().settings.onboardedAt).toBe(LOCKED_NOW.toISOString());
    expect((await repo.loadSettings())?.onboardedAt).toBe(LOCKED_NOW.toISOString());
  });

  it('completeOnboarding rolls back on a failed write', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const inner = new MemoryRepository();
    const { store } = await boot({ repo: brokenRepo(inner), settings: null });
    await store.getState().completeOnboarding(DEFAULT_SETTINGS);
    expect(store.getState().onboarded).toBe(false);
  });
});

describe('ui preferences', () => {
  it('persists the Today view', async () => {
    const { store } = await boot();
    store.getState().setTodayView('matrix');
    expect(store.getState().ui.todayView).toBe('matrix');
    expect(window.localStorage.getItem('bed:v1:ui')).toContain('matrix');
  });

  it('persists a dismissed plan reminder for the day', async () => {
    const { store } = await boot();
    store.getState().dismissPlanReminder(TODAY);
    expect(store.getState().ui.planReminderDismissedOn).toBe(TODAY);
    expect(window.localStorage.getItem('bed:v1:ui')).toContain(TODAY);
  });

  it('keeps the expanded row out of storage', async () => {
    const { store } = await boot();
    store.getState().setExpanded('a');
    expect(store.getState().ui.expandedTaskId).toBe('a');
    expect(window.localStorage.getItem('bed:v1:ui')).toBeNull();
  });
});
