import { describe, expect, it } from 'vitest';
import { addDays } from '@/domain';
import type { DayLog, ISODate, Task } from '@/domain';
import { computeStats } from '../compute';
import type { Insight, InsightKind, StatsResult } from '../types';
import { day, filler, log, run, SETTINGS, TODAY } from './helpers';

/**
 * One test per row of the Phase 06 definitions table, each with the value just
 * below its threshold and the value at it.
 */

function stats(tasks: Task[], dayLogs: DayLog[] = []): StatsResult {
  return computeStats({ tasks, dayLogs, today: TODAY, settings: SETTINGS });
}

function ago(n: number): ISODate {
  return addDays(TODAY, -n);
}

function insight(result: StatsResult, kind: InsightKind): Insight | undefined {
  return result.insights.find((item) => item.kind === kind);
}

describe('avg7 / avg30', () => {
  const week = run(ago(1), 7, { pct: 80 });
  const weekBefore = run(ago(8), 7, { pct: 60 });

  it('averages the last seven completed planned days against the seven before', () => {
    const result = stats([...week, ...weekBefore]);
    expect(result.cards.avg7).toEqual({ value: 80, delta: 20 });
  });

  it('averages 30 days the same way', () => {
    const result = stats([
      ...run(ago(1), 30, { pct: 70 }),
      ...run(ago(31), 30, { pct: 55 }),
    ]);
    expect(result.cards.avg30).toEqual({ value: 70, delta: 15 });
  });

  it('leaves today out of both averages but keeps it in consistency and the heat map', () => {
    const withToday = [...week, ...weekBefore, ...day(TODAY, { pct: 0, count: 1 })];
    const result = stats(withToday);

    expect(result.cards.avg7.value).toBe(80);
    expect(result.cards.avg30.value).toBe(70);
    // 14 past days + today, all inside the 30-day consistency window.
    expect(result.cards.consistency).toEqual({ planned: 15 });
    expect(result.heatmap.at(-1)).toMatchObject({ date: TODAY, hasPlan: true, isToday: true });
  });

  it('has no delta when the previous window holds no planned day', () => {
    const result = stats(week);
    expect(result.cards.avg7).toEqual({ value: 80, delta: null });
    expect(result.cards.avg30).toEqual({ value: 80, delta: null });
  });

  it('is null when no day in the window carries a plan', () => {
    // Seven planned days, all of them older than the 30-day window.
    const result = stats(filler(TODAY, 7));
    expect(result.sparse).toBe(false);
    expect(result.cards.avg7).toEqual({ value: null, delta: null });
    expect(result.cards.avg30).toEqual({ value: null, delta: null });
  });
});

describe('consistency', () => {
  it('counts planned days in the domain 30-day window, today included', () => {
    const result = stats([...run(ago(0), 31, { pct: 50, count: 1 })]);
    expect(result.cards.consistency).toEqual({ planned: 30 });
  });

  it('survives the sparse rule — it is the one card that always shows', () => {
    const result = stats(run(ago(1), 3, { pct: 50, count: 1 }));
    expect(result.sparse).toBe(true);
    expect(result.cards.consistency).toEqual({ planned: 3 });
  });
});

describe('q2Share', () => {
  const q2Tasks = (date: ISODate, n: number) =>
    day(date, { pct: 100, count: n, flags: { important: true }, key: 'q2-' });
  const q1Tasks = (date: ISODate, n: number) =>
    day(date, { pct: 100, count: n, flags: { important: true, urgent: true }, key: 'q1-' });

  it('is the share of important-not-urgent work among the real plan', () => {
    const result = stats([...filler(TODAY, 7), ...q2Tasks(ago(2), 4), ...q1Tasks(ago(2), 6)]);
    expect(result.cards.q2Share).toEqual({ value: 40, delta: null });
  });

  it('compares against the window before it', () => {
    const result = stats([
      ...filler(TODAY, 7),
      ...q2Tasks(ago(2), 4),
      ...q1Tasks(ago(2), 6),
      ...q2Tasks(ago(40), 2),
      ...q1Tasks(ago(40), 8),
    ]);
    expect(result.cards.q2Share).toEqual({ value: 40, delta: 20 });
  });

  it('ignores dropped and adhoc tasks', () => {
    const result = stats([
      ...filler(TODAY, 7),
      ...q2Tasks(ago(2), 4),
      ...q1Tasks(ago(2), 6),
      ...day(ago(2), { pct: 0, count: 20, flags: { status: 'dropped' }, key: 'x-' }),
      ...day(ago(2), { pct: 0, count: 20, flags: { adhoc: true }, key: 'a-' }),
    ]);
    expect(result.cards.q2Share.value).toBe(40);
  });

  it('is null when the window holds no considered task', () => {
    const result = stats(filler(TODAY, 7));
    expect(result.cards.q2Share).toEqual({ value: null, delta: null });
  });
});

describe('adhocShare and movedShare', () => {
  it('counts adhoc tasks against every task of the window, with no delta', () => {
    const result = stats([
      ...filler(TODAY, 7),
      ...day(ago(2), { pct: 100, count: 8, key: 'p-' }),
      ...day(ago(2), { pct: 100, count: 2, flags: { adhoc: true }, key: 'a-' }),
      // A previous window that would produce a delta if one were ever shown.
      ...day(ago(40), { pct: 100, count: 10, flags: { adhoc: true }, key: 'ap-' }),
    ]);
    expect(result.cards.adhocShare).toEqual({ value: 20, delta: null });
  });

  it('counts moved tasks against the planned ones only, with no delta', () => {
    const result = stats([
      ...filler(TODAY, 7),
      ...day(ago(2), { pct: 0, count: 3, flags: { status: 'moved', movedTo: ago(1) }, key: 'm-' }),
      ...day(ago(2), { pct: 100, count: 7, key: 'p-' }),
      ...day(ago(2), { pct: 0, count: 30, flags: { adhoc: true }, key: 'a-' }),
      ...day(ago(40), { pct: 0, count: 10, flags: { status: 'moved' }, key: 'mp-' }),
    ]);
    expect(result.cards.movedShare).toEqual({ value: 30, delta: null });
  });

  it('is null when the window holds no task at all', () => {
    const result = stats(filler(TODAY, 7));
    expect(result.cards.adhocShare).toEqual({ value: null, delta: null });
    expect(result.cards.movedShare).toEqual({ value: null, delta: null });
  });
});

describe('sparse', () => {
  it('holds every figure back at six planned days', () => {
    const result = stats(run(ago(1), 6, { pct: 90 }));

    expect(result.daysWithPlan).toBe(6);
    expect(result.sparse).toBe(true);
    expect(result.cards.avg7).toEqual({ value: null, delta: null });
    expect(result.cards.avg30).toEqual({ value: null, delta: null });
    expect(result.cards.q2Share).toEqual({ value: null, delta: null });
    expect(result.cards.adhocShare).toEqual({ value: null, delta: null });
    expect(result.cards.movedShare).toEqual({ value: null, delta: null });
    expect(result.weekday.every((value) => value.pct === null)).toBe(true);
    expect(result.insights).toEqual([]);
  });

  it('releases them at seven', () => {
    const result = stats(run(ago(1), 7, { pct: 90 }));
    expect(result.daysWithPlan).toBe(7);
    expect(result.sparse).toBe(false);
    expect(result.cards.avg7.value).toBe(90);
    expect(result.weekday.some((value) => value.pct !== null)).toBe(true);
  });

  it('counts a date once, however many tasks it holds, and ignores the future', () => {
    const result = stats([
      ...day(ago(1), { pct: 50, count: 40 }),
      ...day(addDays(TODAY, 5), { pct: 0, count: 10, key: 'future-' }),
    ]);
    expect(result.daysWithPlan).toBe(1);
  });

  it('ignores adhoc-only days', () => {
    const result = stats(day(ago(1), { pct: 100, count: 3, flags: { adhoc: true } }));
    expect(result.daysWithPlan).toBe(0);
    expect(result.firstUseDate).toBeNull();
  });
});

describe('firstUseDate', () => {
  it('is the earliest planDate that carries planned work', () => {
    const result = stats([
      ...day(ago(2), { pct: 100, count: 1 }),
      ...day(ago(90), { pct: 100, count: 1, key: 'old-' }),
      ...day(ago(120), { pct: 100, count: 1, flags: { adhoc: true }, key: 'adhoc-' }),
    ]);
    expect(result.firstUseDate).toBe(ago(90));
  });
});

describe('heatmap', () => {
  it('runs over the last 26 weeks, ending today', () => {
    const result = stats(run(ago(1), 7, { pct: 50, count: 1 }));
    expect(result.heatmap).toHaveLength(26 * 7);
    expect(result.heatmap[0].date).toBe(ago(26 * 7 - 1));
    expect(result.heatmap.at(-1)?.date).toBe(TODAY);
  });
});

describe('weekday', () => {
  // Mondays and Sundays inside the 26-week window, newest first.
  const mondays = ['2026-09-28', '2026-09-21', '2026-09-14', '2026-09-07', '2026-08-31', '2026-08-24', '2026-08-17'];
  const sundays = ['2026-09-27', '2026-09-20', '2026-09-13', '2026-09-06', '2026-08-30', '2026-08-23', '2026-08-16'];

  const onDates = (dates: string[], pct: number, key: string): Task[] =>
    dates.flatMap((date) => day(date, { pct, key }));

  it('averages completed planned days per ISO weekday and is null where there are none', () => {
    const result = stats([...onDates(mondays, 90, 'mon-'), ...onDates(sundays, 80, 'sun-')]);

    expect(result.weekday).toEqual([
      { weekday: 1, pct: 90 },
      { weekday: 2, pct: null },
      { weekday: 3, pct: null },
      { weekday: 4, pct: null },
      { weekday: 5, pct: null },
      { weekday: 6, pct: null },
      { weekday: 7, pct: 80 },
    ]);
  });

  it('ignores days outside the 26-week window', () => {
    const result = stats([
      ...run(ago(1), 7, { pct: 100, count: 1 }),
      ...day(ago(183), { pct: 0, count: 1, key: 'old-' }),
    ]);
    expect(result.weekday.every((value) => value.pct === null || value.pct === 100)).toBe(true);
  });
});

describe('the insight gate', () => {
  const evening = run(ago(1), 3, { pct: 80, timing: 'evening', key: 'e-' });
  const morning = run(ago(11), 3, { pct: 70, timing: 'morning', key: 'm-' });

  it('says nothing with thirteen planned days in the last 90', () => {
    const result = stats([...evening, ...morning, ...filler(TODAY, 7)]);
    expect(result.daysWithPlan).toBe(13);
    expect(result.insights).toEqual([]);
  });

  it('starts at fourteen', () => {
    const result = stats([...evening, ...morning, ...filler(TODAY, 8)]);
    expect(result.daysWithPlan).toBe(14);
    expect(insight(result, 'evening')).toBeDefined();
  });
});

describe('the evening insight', () => {
  /** `n` evening-planned days at `pct`, then `m` morning-planned ones. */
  function mix(eveningDays: number, eveningPct: number, morningDays: number, morningPct: number): Task[] {
    const tasks: Task[] = [];
    for (let index = 0; index < eveningDays; index += 1) {
      const date = ago(1 + index);
      tasks.push(...day(date, { pct: eveningPct, timing: 'evening', key: 'e-' }));
    }
    for (let index = 0; index < morningDays; index += 1) {
      const date = ago(11 + index);
      tasks.push(...day(date, { pct: morningPct, timing: 'morning', key: 'm-' }));
    }
    return [...tasks, ...filler(TODAY, 14)];
  }

  it('stays quiet when the gap is four points', () => {
    expect(insight(stats(mix(3, 80, 3, 76)), 'evening')).toBeUndefined();
  });

  it('speaks at five', () => {
    expect(insight(stats(mix(3, 80, 3, 75)), 'evening')).toEqual({
      kind: 'evening',
      tone: 'success',
      vars: { n: 5 },
    });
  });

  it('needs at least three days on each side', () => {
    expect(insight(stats(mix(2, 90, 3, 50)), 'evening')).toBeUndefined();
    expect(insight(stats(mix(3, 90, 2, 50)), 'evening')).toBeUndefined();
    expect(insight(stats(mix(3, 90, 3, 50)), 'evening')).toBeDefined();
  });

  it('ignores days planned after the lock', () => {
    const late = run(ago(21), 5, { pct: 10, timing: 'late', key: 'l-' });
    expect(insight(stats([...mix(3, 80, 3, 75), ...late]), 'evening')).toMatchObject({
      vars: { n: 5 },
    });
  });
});

describe('the MIT insight', () => {
  function pool(mits: number, mitPct: number, others: number, otherPct: number): Task[] {
    return [
      ...day(ago(2), { pct: mitPct, count: mits, flags: { mit: true }, key: 'mit-' }),
      ...day(ago(2), { pct: otherPct, count: others, key: 'oth-' }),
      ...filler(TODAY, 14),
    ];
  }

  it('needs five tasks on each side', () => {
    expect(insight(stats(pool(4, 100, 20, 50)), 'mit')).toBeUndefined();
    expect(insight(stats(pool(5, 100, 4, 50)), 'mit')).toBeUndefined();
    expect(insight(stats(pool(5, 100, 20, 50)), 'mit')).toBeDefined();
  });

  it('stays quiet at a four-point gap and speaks at five', () => {
    expect(insight(stats(pool(25, 80, 25, 76)), 'mit')).toBeUndefined();
    expect(insight(stats(pool(5, 80, 20, 75)), 'mit')).toEqual({
      kind: 'mit',
      tone: 'accent',
      vars: { mit: 80, other: 75 },
    });
  });

  it('leaves dropped tasks out of both rates', () => {
    const result = stats([
      ...day(ago(2), { pct: 100, count: 5, flags: { mit: true }, key: 'mit-' }),
      ...day(ago(2), { pct: 0, count: 20, flags: { mit: true, status: 'dropped' }, key: 'md-' }),
      ...day(ago(2), { pct: 50, count: 20, key: 'oth-' }),
      ...filler(TODAY, 14),
    ]);
    expect(insight(result, 'mit')).toMatchObject({ vars: { mit: 100, other: 50 } });
  });
});

describe('the weekday insight', () => {
  const mondays = ['2026-09-28', '2026-09-21', '2026-09-14', '2026-09-07', '2026-08-31', '2026-08-24', '2026-08-17'];
  const sundays = ['2026-09-27', '2026-09-20', '2026-09-13', '2026-09-06', '2026-08-30', '2026-08-23', '2026-08-16'];
  const tuesdays = ['2026-09-29', '2026-09-22'];

  const onDates = (dates: string[], pct: number, key: string): Task[] =>
    dates.flatMap((date) => day(date, { pct, key }));

  it('stays quiet at a nine-point gap and speaks at ten', () => {
    expect(
      insight(stats([...onDates(mondays, 90, 'mon-'), ...onDates(sundays, 81, 'sun-')]), 'weekday'),
    ).toBeUndefined();

    expect(
      insight(stats([...onDates(mondays, 90, 'mon-'), ...onDates(sundays, 80, 'sun-')]), 'weekday'),
    ).toEqual({
      kind: 'weekday',
      tone: 'success',
      vars: { best: 1, bestPct: 90, worst: 7, worstPct: 80 },
    });
  });

  it('skips a weekday it has only seen once', () => {
    const one = stats([
      ...onDates(mondays, 90, 'mon-'),
      ...onDates(sundays, 80, 'sun-'),
      ...onDates(tuesdays.slice(0, 1), 20, 'tue-'),
    ]);
    expect(insight(one, 'weekday')).toMatchObject({ vars: { worst: 7, worstPct: 80 } });

    const two = stats([
      ...onDates(mondays, 90, 'mon-'),
      ...onDates(sundays, 80, 'sun-'),
      ...onDates(tuesdays, 20, 'tue-'),
    ]);
    expect(insight(two, 'weekday')).toMatchObject({ vars: { worst: 2, worstPct: 20 } });
  });
});

describe('the energy insight', () => {
  /** Days carrying a `DayLog`; everything else is filler. */
  function energyDays(
    high: { days: number; pct: number },
    low: { days: number; pct: number },
  ): { tasks: Task[]; logs: DayLog[] } {
    const tasks: Task[] = [];
    const logs: DayLog[] = [];
    for (let index = 0; index < high.days; index += 1) {
      const date = ago(1 + index);
      tasks.push(...day(date, { pct: high.pct, timing: 'late', key: 'h-' }));
      logs.push(log(date, 5));
    }
    for (let index = 0; index < low.days; index += 1) {
      const date = ago(11 + index);
      tasks.push(...day(date, { pct: low.pct, timing: 'late', key: 'l-' }));
      logs.push(log(date, 2));
    }
    return { tasks: [...tasks, ...filler(TODAY, 14)], logs };
  }

  it('stays quiet at a four-point gap and speaks at five', () => {
    const near = energyDays({ days: 3, pct: 80 }, { days: 3, pct: 76 });
    expect(insight(stats(near.tasks, near.logs), 'energy')).toBeUndefined();

    const at = energyDays({ days: 3, pct: 80 }, { days: 3, pct: 75 });
    expect(insight(stats(at.tasks, at.logs), 'energy')).toEqual({
      kind: 'energy',
      tone: 'accent',
      vars: { high: 80, low: 75 },
    });
  });

  it('needs three days on each side', () => {
    const few = energyDays({ days: 2, pct: 90 }, { days: 3, pct: 50 });
    expect(insight(stats(few.tasks, few.logs), 'energy')).toBeUndefined();

    const enough = energyDays({ days: 3, pct: 90 }, { days: 3, pct: 50 });
    expect(insight(stats(enough.tasks, enough.logs), 'energy')).toBeDefined();
  });

  it('ignores a middling or unanswered energy', () => {
    const base = energyDays({ days: 3, pct: 80 }, { days: 3, pct: 75 });
    const noisy = [...base.logs, log(ago(21), 3), log(ago(22), 0)];
    const tasks = [
      ...base.tasks,
      ...day(ago(21), { pct: 0, timing: 'late', key: 'n1-' }),
      ...day(ago(22), { pct: 0, timing: 'late', key: 'n2-' }),
    ];
    expect(insight(stats(tasks, noisy), 'energy')).toMatchObject({ vars: { high: 80, low: 75 } });
  });
});

describe('insight order', () => {
  it('is evening, mit, weekday, energy', () => {
    const tasks: Task[] = [];
    const logs: DayLog[] = [];

    // Mondays run high and are planned the evening before, with every MIT done.
    for (const date of ['2026-09-28', '2026-09-21', '2026-09-14', '2026-09-07', '2026-08-31', '2026-08-24', '2026-08-17']) {
      tasks.push(...day(date, { pct: 90, count: 10, timing: 'evening', key: 'mon-' }));
      tasks.push(...day(date, { pct: 100, count: 5, flags: { mit: true }, timing: 'evening', key: 'monmit-' }));
      logs.push(log(date, 5));
    }
    // Sundays are planned in the morning and go worse.
    for (const date of ['2026-09-27', '2026-09-20', '2026-09-13', '2026-09-06', '2026-08-30', '2026-08-23', '2026-08-16']) {
      tasks.push(...day(date, { pct: 60, count: 10, timing: 'morning', key: 'sun-' }));
      logs.push(log(date, 1));
    }

    const result = stats(tasks, logs);
    expect(result.insights.map((item) => item.kind)).toEqual([
      'evening',
      'mit',
      'weekday',
      'energy',
    ]);
  });
});
