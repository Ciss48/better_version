import { describe, expect, it } from 'vitest';
import { buildDaySummaries, settingsForHabit } from '@/domain';
import type { DaySummary, ISODate } from '@/domain';
import { monthSummary, planTimingOf } from '../month';
import { day, eveningAt, lateAt, morningAt, SETTINGS, TODAY } from './helpers';

/** Summaries of October 2026 up to `to`, from the tasks given. */
function october(to: ISODate, tasks = [] as Parameters<typeof buildDaySummaries>[2]): DaySummary[] {
  return buildDaySummaries('2026-10-01', to, tasks, TODAY);
}

describe('monthSummary', () => {
  it('counts the month up to today and averages the days that are finished', () => {
    const tasks = [
      ...day('2026-10-01', { pct: 84, count: 100 }),
      ...day('2026-10-02', { pct: 100, count: 100 }),
      ...day(TODAY, { pct: 10, count: 100 }),
    ];
    // Today is the 3rd: the 4th onwards is not part of the month yet.
    const summary = monthSummary(october('2026-10-31', tasks), '2026-10', TODAY);
    expect(summary).toEqual({ planned: 3, total: 3, avg: 92 });
  });

  it('counts a day with no plan in the total but not in the average', () => {
    const tasks = [...day('2026-10-01', { pct: 60, count: 100 })];
    const summary = monthSummary(october(TODAY, tasks), '2026-10', TODAY);
    expect(summary).toEqual({ planned: 1, total: 3, avg: 60 });
  });

  it('averages 0 when the only planned day is today', () => {
    const summary = monthSummary(october(TODAY, day(TODAY, { pct: 40 })), '2026-10', TODAY);
    expect(summary).toEqual({ planned: 1, total: 3, avg: 0 });
  });

  it('is null for a month with no plan at all', () => {
    expect(monthSummary(october(TODAY), '2026-10', TODAY)).toBeNull();
    expect(monthSummary([], '2026-09', TODAY)).toBeNull();
  });

  it('sums a whole past month', () => {
    const tasks = [
      ...day('2026-09-10', { pct: 50, count: 100 }),
      ...day('2026-09-11', { pct: 70, count: 100 }),
    ];
    const days = buildDaySummaries('2026-09-01', '2026-09-30', tasks, TODAY);
    expect(monthSummary(days, '2026-09', TODAY)).toEqual({ planned: 2, total: 30, avg: 60 });
  });

  it('does not confuse a month with one whose name starts the same', () => {
    const tasks = day('2026-01-05', { pct: 80, count: 100 });
    const days = buildDaySummaries('2026-01-01', '2026-01-31', tasks, TODAY);
    expect(monthSummary(days, '2026-1', TODAY)).toBeNull();
  });
});

describe('planTimingOf', () => {
  const date: ISODate = '2026-10-02';

  it('reads an evening plan as the local time it was written', () => {
    const tasks = day(date, { pct: 0, count: 2, createdAt: eveningAt(date) });
    // 2026-10-01T13:00Z is 20:00 in Asia/Ho_Chi_Minh.
    expect(planTimingOf(tasks, date, SETTINGS)).toEqual({ kind: 'evening', time: '20:00' });
  });

  it('reads a morning plan the same way', () => {
    const tasks = day(date, { pct: 0, count: 2, createdAt: morningAt(date) });
    expect(planTimingOf(tasks, date, SETTINGS)).toEqual({ kind: 'morning', time: '08:30' });
  });

  it('is null for a plan written after the lock', () => {
    const tasks = day(date, { pct: 0, count: 2, createdAt: lateAt(date) });
    expect(planTimingOf(tasks, date, SETTINGS)).toBeNull();
  });

  it('takes the earliest planned task and ignores adhoc ones', () => {
    const tasks = [
      ...day(date, { pct: 0, count: 1, createdAt: `${date}T02:00:00.000Z`, key: 'b-' }),
      ...day(date, { pct: 0, count: 1, createdAt: morningAt(date), key: 'a-' }),
      ...day(date, { pct: 0, count: 1, createdAt: `${date}T00:10:00.000Z`, flags: { adhoc: true }, key: 'x-' }),
    ];
    expect(planTimingOf(tasks, date, SETTINGS)).toEqual({ kind: 'morning', time: '08:30' });
  });

  it('is null for a day with no plan', () => {
    expect(planTimingOf([], date, SETTINGS)).toBeNull();
    expect(
      planTimingOf(day(date, { pct: 0, count: 2, flags: { adhoc: true } }), date, SETTINGS),
    ).toBeNull();
  });

  it('follows the day-end setting, not the calendar', () => {
    // With a 03:00 day end, 01:00 local still counts as the evening before.
    const settings = { ...settingsForHabit(SETTINGS, 'evening'), dayEnd: '03:00' };
    const tasks = day(date, { pct: 0, count: 1, createdAt: '2026-10-01T18:00:00.000Z' });
    expect(planTimingOf(tasks, date, settings)).toEqual({ kind: 'evening', time: '01:00' });
  });
});
