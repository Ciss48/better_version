import { describe, expect, it } from 'vitest';
import { addDays, DEFAULT_SETTINGS } from '@/domain';
import type { DayLog, ISODate, Settings, Task } from '@/domain';
import type { ClockValue } from '@/lib/clock';
import { emptyDraft } from '../ritual-draft';
import type { RitualDraft } from '../ritual-draft';
import {
  consistencyView,
  historyDay,
  ritualReviewTasks,
  ritualTomorrowItems,
  statsView,
  tasksOn,
  todayView,
} from '../selectors';
import type { AppState } from '../store';

const TODAY: ISODate = '2026-10-03';
const TOMORROW: ISODate = '2026-10-04';
/** 14:10 Saturday in Asia/Ho_Chi_Minh — the plan for 10-03 locked at 10:00. */
const LOCKED = new Date('2026-10-03T07:10:00Z');
/** 08:15 Saturday — still inside the window. */
const OPEN = new Date('2026-10-03T01:15:00Z');
/** 21:40 Saturday — past the 21:30 plan reminder for Sunday. */
const EVENING = new Date('2026-10-03T14:40:00Z');

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

function state(partial: {
  tasks?: Task[];
  dayLogs?: DayLog[];
  firstPlanDate?: ISODate | null;
  planReminderDismissedOn?: ISODate | null;
  settings?: Settings;
}): AppState {
  return {
    status: 'ready',
    settings: partial.settings ?? DEFAULT_SETTINGS,
    onboarded: true,
    tasks: Object.fromEntries((partial.tasks ?? []).map((t) => [t.id, t])),
    dayLogs: Object.fromEntries((partial.dayLogs ?? []).map((l) => [l.planDate, l])),
    loaded: { from: '2026-01-01', to: '2027-01-01' },
    firstPlanDate: partial.firstPlanDate === undefined ? TODAY : partial.firstPlanDate,
    ui: {
      todayView: 'list',
      expandedTaskId: null,
      planReminderDismissedOn: partial.planReminderDismissedOn ?? null,
    },
    lastClose: null,
  } as AppState;
}

function clock(now: Date, settings: Settings = DEFAULT_SETTINGS, today: ISODate = TODAY): ClockValue {
  return { now, today, settings };
}

describe('tasksOn', () => {
  it('returns one day in plan order', () => {
    const tasks = {
      b: task('b', { position: 2 }),
      a: task('a', { position: 0 }),
      c: task('c', { position: 1 }),
      other: task('other', { planDate: TOMORROW }),
    };
    expect(tasksOn(tasks, TODAY).map((t) => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by position, not by id', () => {
    const tasks = {
      z: task('z', { position: 0 }),
      a: task('a', { position: 1 }),
    };
    expect(tasksOn(tasks, TODAY).map((t) => t.id)).toEqual(['z', 'a']);
  });
});

describe('todayView', () => {
  const tasks = [
    task('mit1', { mit: true, position: 0 }),
    task('mit2', { mit: true, adhoc: true, position: 1 }),
    task('other', { position: 2 }),
    task('adhoc', { adhoc: true, position: 3 }),
    task('tomorrow', { planDate: TOMORROW }),
  ];

  it('splits the day into MITs, others and adhoc', () => {
    const view = todayView(state({ tasks }), clock(LOCKED));
    expect(view.mit.map((t) => t.id)).toEqual(['mit1', 'mit2']);
    expect(view.others.map((t) => t.id)).toEqual(['other']);
    expect(view.adhoc.map((t) => t.id)).toEqual(['adhoc']);
    expect(view.dayTasks).toHaveLength(4);
  });

  it('reports the lock state and the countdown', () => {
    const locked = todayView(state({ tasks }), clock(LOCKED));
    expect(locked).toMatchObject({ locked: true, minutesLeft: null, lateNight: false });

    const open = todayView(state({ tasks }), clock(OPEN));
    expect(open.locked).toBe(false);
    expect(open.minutesLeft).toBe(105);
  });

  it('reports late night and keeps yesterday as today', () => {
    const settings: Settings = { ...DEFAULT_SETTINGS, dayEnd: '03:00' };
    // 01:00 Sunday local — the logical day is still Saturday.
    const view = todayView(
      state({ tasks, settings }),
      clock(new Date('2026-10-03T18:00:00Z'), settings),
    );
    expect(view.lateNight).toBe(true);
  });

  it('excludes adhoc tasks from the weighted progress', () => {
    const view = todayView(
      state({
        tasks: [
          task('p', { size: 'M' }),
          task('a', { size: 'L', adhoc: true, status: 'done', position: 1 }),
        ],
      }),
      clock(LOCKED),
    );
    expect(view.progress).toEqual({ pct: 0, done: 0, total: 1 });
  });

  it('shows the welcome banner for a user with no plan ever', () => {
    const view = todayView(state({ tasks: [], firstPlanDate: null }), clock(OPEN));
    expect(view.banners.map((b) => b.variant)).toContain('welcome');
  });

  it('shows the missed-day banner when yesterday was blank', () => {
    const view = todayView(
      state({ tasks: [task('a')], firstPlanDate: '2026-09-01' }),
      clock(OPEN),
    );
    expect(view.banners.map((b) => b.variant)).toContain('missedDay');
  });

  it('does not show the missed-day banner when yesterday had a plan', () => {
    const view = todayView(
      state({
        tasks: [task('a'), task('y', { planDate: '2026-10-02' })],
        firstPlanDate: '2026-09-01',
      }),
      clock(OPEN),
    );
    expect(view.banners.map((b) => b.variant)).not.toContain('missedDay');
  });

  it('shows the plan reminder once the reminder time passes with no plan for tomorrow', () => {
    const view = todayView(state({ tasks: [task('a')] }), clock(EVENING));
    const reminder = view.banners.find((b) => b.variant === 'planReminder');
    expect(reminder?.target).toBe(TOMORROW);
  });

  it('respects a dismissed plan reminder for the same day', () => {
    const view = todayView(
      state({ tasks: [task('a')], planReminderDismissedOn: TODAY }),
      clock(EVENING),
    );
    expect(view.banners.map((b) => b.variant)).not.toContain('planReminder');
    // The ritual banner takes the slot instead.
    expect(view.banners.map((b) => b.variant)).toContain('ritual');
  });

  it('drops the ritual banner once the day is closed', () => {
    const view = todayView(
      state({
        tasks: [task('a'), task('t', { planDate: TOMORROW })],
        dayLogs: [
          { planDate: TODAY, closedAt: '2026-10-03T14:00:00.000Z', energy: 3, good: '', improve: '' },
        ],
      }),
      clock(EVENING),
    );
    expect(view.banners.map((b) => b.variant)).not.toContain('ritual');
  });

  it('shows the complete banner at 100%', () => {
    const view = todayView(
      state({
        tasks: [
          task('a', { status: 'done', completedAt: '2026-10-03T01:00:00.000Z' }),
          task('t', { planDate: TOMORROW }),
        ],
      }),
      clock(LOCKED),
    );
    expect(view.banners.map((b) => b.variant)).toContain('complete');
  });
});

describe('consistencyView', () => {
  it('returns 30 days ending today and counts the planned ones', () => {
    const view = consistencyView(
      state({ tasks: [task('a'), task('b', { planDate: '2026-09-28' })] }),
      TODAY,
    );
    expect(view.days).toHaveLength(30);
    expect(view.days[29].date).toBe(TODAY);
    expect(view.days[29].isToday).toBe(true);
    expect(view.planned).toBe(2);
  });

  it('ignores adhoc-only days', () => {
    const view = consistencyView(state({ tasks: [task('a', { adhoc: true })] }), TODAY);
    expect(view.planned).toBe(0);
  });
});

describe('ritualReviewTasks', () => {
  it('lists tickable tasks, MITs first, then plan order', () => {
    const s = state({
      tasks: [
        task('a', { position: 0 }),
        task('m', { position: 3, mit: true }),
        task('b', { position: 1, status: 'done' }),
        task('gone', { position: 2, status: 'moved', movedTo: TOMORROW }),
      ],
    });
    expect(ritualReviewTasks(s, TODAY).map((t) => t.id)).toEqual(['m', 'a', 'b']);
  });
});

describe('ritualTomorrowItems', () => {
  function draft(partial: Partial<RitualDraft> = {}): RitualDraft {
    return { ...emptyDraft(TODAY), ...partial };
  }

  it('lists carried tasks, then existing tomorrow tasks, then new ones', () => {
    const s = state({
      tasks: [
        task('carry', { postponedCount: 1 }),
        task('stay', { position: 1 }),
        task('exists', { planDate: TOMORROW, mit: true }),
      ],
    });
    const items = ritualTomorrowItems(
      s,
      draft({
        decisions: { carry: { kind: 'move', date: TOMORROW }, stay: { kind: 'drop' } },
        tomorrowNew: [
          { id: 'n1', parsed: { title: 'Mới', mit: true, important: false, urgent: false, size: null } },
        ],
      }),
      TODAY,
    );

    expect(items.map((i) => i.id)).toEqual(['carry', 'exists', 'n1']);
    expect(items[0]).toMatchObject({ carried: true, postponedCount: 2, removable: false });
    expect(items[1]).toMatchObject({ carried: false, mit: true, removable: false });
    expect(items[2]).toMatchObject({ carried: false, mit: true, removable: true });
  });

  it('applies the MIT override of a carried task', () => {
    const s = state({ tasks: [task('carry', { mit: false })] });
    const items = ritualTomorrowItems(
      s,
      draft({
        decisions: { carry: { kind: 'move', date: TOMORROW } },
        tomorrowMit: { carry: true },
      }),
      TODAY,
    );
    expect(items[0].mit).toBe(true);
  });

  it('ignores a task moved somewhere other than tomorrow', () => {
    const s = state({ tasks: [task('later')] });
    const items = ritualTomorrowItems(
      s,
      draft({ decisions: { later: { kind: 'move', date: '2026-10-05' } } }),
      TODAY,
    );
    expect(items).toEqual([]);
  });
});

describe('statsView', () => {
  /** Nine planned days ending yesterday, every task done — enough to leave sparse. */
  function week(): Task[] {
    const tasks: Task[] = [];
    for (let index = 1; index <= 9; index += 1) {
      const date = addDays(TODAY, -index);
      tasks.push(
        task(`s${index}`, { planDate: date, status: 'done', size: 'S', completedAt: `${date}T05:00:00.000Z` }),
      );
    }
    return tasks;
  }

  it('hands the whole snapshot to the stats module', () => {
    const view = statsView(state({ tasks: week() }), clock(LOCKED));

    expect(view.daysWithPlan).toBe(9);
    expect(view.sparse).toBe(false);
    expect(view.cards.avg7.value).toBe(100);
    expect(view.cards.consistency.planned).toBe(9);
    expect(view.heatmap.at(-1)?.date).toBe(TODAY);
    expect(view.firstUseDate).toBe(addDays(TODAY, -9));
  });

  it('reads today from the clock, not from the data', () => {
    const view = statsView(state({ tasks: week() }), clock(LOCKED, DEFAULT_SETTINGS, TOMORROW));
    // One day later, the oldest of the nine falls out of the 7-day window.
    expect(view.heatmap.at(-1)?.date).toBe(TOMORROW);
  });

  it('is sparse with fewer than seven planned days', () => {
    const view = statsView(state({ tasks: [task('a', { planDate: addDays(TODAY, -1) })] }), clock(LOCKED));
    expect(view.sparse).toBe(true);
    expect(view.cards.avg7.value).toBeNull();
  });
});

describe('historyDay', () => {
  const yesterday = addDays(TODAY, -1);
  const log: DayLog = {
    planDate: yesterday,
    closedAt: `${yesterday}T15:00:00.000Z`,
    energy: 4,
    good: 'Ngủ đủ',
    improve: '',
  };

  it('returns the day in plan order with its log and plan timing', () => {
    const s = state({
      tasks: [
        task('b', { planDate: yesterday, position: 1, createdAt: `${yesterday}T02:00:00.000Z` }),
        task('a', { planDate: yesterday, position: 0, createdAt: '2026-10-01T13:00:00.000Z' }),
      ],
      dayLogs: [log],
    });
    const view = historyDay(s, yesterday, clock(LOCKED));

    expect(view.tasks.map((t) => t.id)).toEqual(['a', 'b']);
    expect(view.dayLog).toEqual(log);
    // 2026-10-01T13:00Z is 20:00 local, before the day end of 10-02.
    expect(view.planTiming).toEqual({ kind: 'evening', time: '20:00' });
    expect(view.mode).toBe('past');
  });

  it('marks today as today and reports a missing log as null', () => {
    const view = historyDay(state({ tasks: [task('t')] }), TODAY, clock(LOCKED));
    expect(view.mode).toBe('today');
    expect(view.dayLog).toBeNull();
  });

  it('has no plan timing for a day with no plan', () => {
    const view = historyDay(state({ tasks: [] }), yesterday, clock(LOCKED));
    expect(view.tasks).toEqual([]);
    expect(view.planTiming).toBeNull();
  });
});
