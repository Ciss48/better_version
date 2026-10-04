import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings';
import {
  addDays,
  classifyPlanTiming,
  isLateNight,
  isLocked,
  isoWeekday,
  localParts,
  logicalDate,
  minutesToLock,
  planWindow,
  reminderAt,
  zonedInstant,
} from '../time';
import { settings } from './helpers';

const VN = 'Asia/Ho_Chi_Minh';
const MORNING = settings({ habit: 'morning', windowStart: { hour: 6, dayOffset: 0 }, remindPlan: '07:00' });

describe('localParts', () => {
  it('reads wall-clock parts in the given timezone', () => {
    expect(localParts(new Date('2026-10-03T03:00:00Z'), VN)).toEqual({
      date: '2026-10-03',
      hhmm: '10:00',
      minutes: 600,
    });
  });

  it('crosses midnight into the next calendar day', () => {
    expect(localParts(new Date('2026-10-03T18:00:00Z'), VN)).toEqual({
      date: '2026-10-04',
      hhmm: '01:00',
      minutes: 60,
    });
  });

  it('works in a DST timezone', () => {
    expect(localParts(new Date('2026-10-04T14:00:00Z'), 'America/New_York')).toEqual({
      date: '2026-10-04',
      hhmm: '10:00',
      minutes: 600,
    });
  });
});

describe('zonedInstant', () => {
  it('resolves a wall-clock time in Asia/Ho_Chi_Minh (UTC+7)', () => {
    expect(zonedInstant('2026-10-04', '10:00', VN).toISOString()).toBe('2026-10-04T03:00:00.000Z');
  });

  it('resolves a wall-clock time in America/New_York (EDT)', () => {
    expect(zonedInstant('2026-10-04', '10:00', 'America/New_York').toISOString()).toBe(
      '2026-10-04T14:00:00.000Z',
    );
  });
});

describe('addDays', () => {
  it('moves forward and backward over month and year ends', () => {
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04');
    expect(addDays('2026-10-03', 7)).toBe('2026-10-10');
    expect(addDays('2026-10-01', -1)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addDays('2026-10-03', 0)).toBe('2026-10-03');
  });
});

describe('isoWeekday', () => {
  it('returns Mon=1 … Sun=7', () => {
    expect(isoWeekday('2026-10-03')).toBe(6);
    expect(isoWeekday('2026-10-04')).toBe(7);
    expect(isoWeekday('2026-10-05')).toBe(1);
  });
});

describe('isLateNight / logicalDate', () => {
  it('10:00 local is a normal daytime instant', () => {
    const now = new Date('2026-10-03T03:00:00Z');
    expect(isLateNight(now, DEFAULT_SETTINGS)).toBe(false);
    expect(logicalDate(now, DEFAULT_SETTINGS)).toBe('2026-10-03');
  });

  it('01:00 local with dayEnd 03:00 still belongs to the previous day', () => {
    const now = new Date('2026-10-03T18:00:00Z');
    const s = settings({ dayEnd: '03:00' });
    expect(isLateNight(now, s)).toBe(true);
    expect(logicalDate(now, s)).toBe('2026-10-03');
  });

  it('01:00 local with dayEnd 00:00 is already the next day', () => {
    const now = new Date('2026-10-03T18:00:00Z');
    expect(isLateNight(now, DEFAULT_SETTINGS)).toBe(false);
    expect(logicalDate(now, DEFAULT_SETTINGS)).toBe('2026-10-04');
  });
});

describe('planWindow', () => {
  it('opens 18:00 the day before and locks at lockTime for the evening habit', () => {
    const { opensAt, locksAt } = planWindow('2026-10-04', DEFAULT_SETTINGS);
    expect(opensAt.toISOString()).toBe('2026-10-03T11:00:00.000Z');
    expect(locksAt.toISOString()).toBe('2026-10-04T03:00:00.000Z');
  });

  it('opens 06:00 the same day for the morning habit', () => {
    const { opensAt, locksAt } = planWindow('2026-10-04', MORNING);
    expect(opensAt.toISOString()).toBe('2026-10-03T23:00:00.000Z');
    expect(locksAt.toISOString()).toBe('2026-10-04T03:00:00.000Z');
  });

  it('locks at 10:00 New York time for a non-VN user', () => {
    const s = settings({ timezone: 'America/New_York', lockTime: '10:00' });
    expect(planWindow('2026-10-04', s).locksAt.toISOString()).toBe('2026-10-04T14:00:00.000Z');
  });
});

describe('isLocked / minutesToLock', () => {
  it('flips exactly at the lock instant', () => {
    expect(isLocked('2026-10-03', new Date('2026-10-03T02:59:59Z'), DEFAULT_SETTINGS)).toBe(false);
    expect(isLocked('2026-10-03', new Date('2026-10-03T03:00:00Z'), DEFAULT_SETTINGS)).toBe(true);
  });

  it('counts whole minutes up to the lock', () => {
    expect(minutesToLock('2026-10-03', new Date('2026-10-03T01:15:00Z'), DEFAULT_SETTINGS)).toBe(
      105,
    );
  });

  it('rounds a partial minute up', () => {
    expect(minutesToLock('2026-10-03', new Date('2026-10-03T02:58:30Z'), DEFAULT_SETTINGS)).toBe(2);
  });

  it('returns null once locked', () => {
    expect(
      minutesToLock('2026-10-03', new Date('2026-10-03T03:00:00Z'), DEFAULT_SETTINGS),
    ).toBeNull();
  });
});

describe('classifyPlanTiming', () => {
  it('classifies before dayEnd as evening, before lock as morning, after as late', () => {
    expect(classifyPlanTiming(new Date('2026-10-02T14:00:00Z'), '2026-10-03', DEFAULT_SETTINGS)).toBe(
      'evening',
    );
    expect(classifyPlanTiming(new Date('2026-10-03T01:00:00Z'), '2026-10-03', DEFAULT_SETTINGS)).toBe(
      'morning',
    );
    expect(classifyPlanTiming(new Date('2026-10-03T05:00:00Z'), '2026-10-03', DEFAULT_SETTINGS)).toBe(
      'late',
    );
  });

  it('moves the evening/morning boundary with dayEnd', () => {
    const s = settings({ dayEnd: '03:00' });
    // 2026-10-02T19:00Z = 02:00 local on 10-03, still before dayEnd 03:00.
    expect(classifyPlanTiming(new Date('2026-10-02T19:00:00Z'), '2026-10-03', s)).toBe('evening');
  });
});

describe('reminderAt', () => {
  it('fires on the evening before for the evening habit', () => {
    expect(reminderAt('2026-10-04', DEFAULT_SETTINGS).toISOString()).toBe(
      '2026-10-03T14:30:00.000Z',
    );
  });

  it('fires the same morning for the morning habit', () => {
    expect(reminderAt('2026-10-04', MORNING).toISOString()).toBe('2026-10-04T00:00:00.000Z');
  });
});
