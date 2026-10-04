import { describe, expect, it } from 'vitest';

import { buildDaySummaries, consistency, summarizeDay } from '../summary';
import { addDays } from '../time';
import type { Task } from '../types';
import { task } from './helpers';

describe('summarizeDay', () => {
  it('reports a planned day that was only moved away as planned but 0%', () => {
    const tasks = [
      task({ planDate: '2026-10-01', status: 'moved', movedTo: '2026-10-02' }),
      task({ planDate: '2026-10-01', status: 'moved', movedTo: '2026-10-02' }),
    ];
    expect(summarizeDay('2026-10-01', tasks, '2026-10-03')).toEqual({
      date: '2026-10-01',
      hasPlan: true,
      pct: 0,
      isToday: false,
    });
  });

  it('marks today', () => {
    expect(summarizeDay('2026-10-03', [], '2026-10-03')).toEqual({
      date: '2026-10-03',
      hasPlan: false,
      pct: 0,
      isToday: true,
    });
  });

  it('ignores adhoc tasks when deciding whether a day had a plan', () => {
    expect(summarizeDay('2026-10-02', [task({ planDate: '2026-10-02', adhoc: true })], '2026-10-03'))
      .toMatchObject({ hasPlan: false });
  });

  it('reports the weighted percentage of the day', () => {
    const tasks = [
      task({ planDate: '2026-10-02', size: 'M', status: 'done' }),
      task({ planDate: '2026-10-02', size: 'M', status: 'todo' }),
    ];
    expect(summarizeDay('2026-10-02', tasks, '2026-10-03').pct).toBe(50);
  });
});

describe('buildDaySummaries', () => {
  it('returns one entry per day of a 30-day range, ascending', () => {
    const today = '2026-10-03';
    const from = addDays(today, -29);
    const summaries = buildDaySummaries(from, today, [], today);
    expect(summaries).toHaveLength(30);
    expect(summaries[0].date).toBe('2026-09-04');
    expect(summaries[29].date).toBe(today);
    expect(summaries.filter((s) => s.isToday)).toHaveLength(1);
  });

  it('groups tasks by planDate and leaves other days empty', () => {
    const tasks: Task[] = [
      task({ planDate: '2026-10-02', size: 'M', status: 'done' }),
      task({ planDate: '2026-10-03', size: 'M', status: 'todo' }),
      task({ planDate: '2026-10-03', size: 'M', status: 'done' }),
    ];
    const summaries = buildDaySummaries('2026-10-01', '2026-10-03', tasks, '2026-10-03');
    expect(summaries).toEqual([
      { date: '2026-10-01', hasPlan: false, pct: 0, isToday: false },
      { date: '2026-10-02', hasPlan: true, pct: 100, isToday: false },
      { date: '2026-10-03', hasPlan: true, pct: 50, isToday: true },
    ]);
  });

  it('returns an empty list when the range is inverted', () => {
    expect(buildDaySummaries('2026-10-04', '2026-10-03', [], '2026-10-03')).toEqual([]);
  });

  it('handles a single-day range', () => {
    expect(buildDaySummaries('2026-10-03', '2026-10-03', [], '2026-10-03')).toHaveLength(1);
  });
});

describe('consistency', () => {
  it('counts only planned days inside the last 30 logical days', () => {
    const today = '2026-10-03';
    const summaries = buildDaySummaries(
      addDays(today, -40),
      today,
      [
        task({ planDate: addDays(today, -35) }), // outside the window
        task({ planDate: addDays(today, -30) }), // outside the window (31st day back)
        task({ planDate: addDays(today, -29) }), // first day inside
        task({ planDate: addDays(today, -1) }),
        task({ planDate: today }),
      ],
      today,
    );
    expect(consistency(summaries, today)).toEqual({ planned: 3, total: 30 });
  });

  it('ignores future days', () => {
    const today = '2026-10-03';
    const summaries = buildDaySummaries(
      addDays(today, -29),
      addDays(today, 3),
      [task({ planDate: addDays(today, 1) })],
      today,
    );
    expect(consistency(summaries, today)).toEqual({ planned: 0, total: 30 });
  });

  it('is 0 for an empty history', () => {
    expect(consistency([], '2026-10-03')).toEqual({ planned: 0, total: 30 });
  });
});
