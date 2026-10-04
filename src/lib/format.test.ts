import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatDateLong,
  formatDateShort,
  formatWeekdayDayMonth,
  formatDayMonth,
  formatDuration,
  formatHourLoose,
  formatMonth,
  formatMonthShort,
  weekdayLong,
  weekdayShort,
} from './format';

describe('formatDateLong', () => {
  it('formats a Saturday', () => {
    expect(formatDateLong('2026-10-03')).toBe('Thứ Bảy, 3 tháng 10');
  });

  it('formats a Sunday (weekday index wraps to 0)', () => {
    expect(formatDateLong('2026-10-04')).toBe('Chủ Nhật, 4 tháng 10');
  });

  it('does not pad the day or month', () => {
    expect(formatDateLong('2026-01-05')).toBe('Thứ Hai, 5 tháng 1');
  });
});

describe('formatDateShort', () => {
  it('formats weekday, day and month', () => {
    expect(formatDateShort('2026-10-03')).toBe('T7 3/10');
  });

  it('formats a Wednesday', () => {
    expect(formatDateShort('2026-10-14')).toBe('T4 14/10');
  });
});

describe('formatWeekdayDayMonth', () => {
  it('spells the weekday out but keeps the date short', () => {
    expect(formatWeekdayDayMonth('2026-10-04')).toBe('Chủ Nhật, 4/10');
  });

  it('does not pad the day or the month', () => {
    expect(formatWeekdayDayMonth('2026-01-05')).toBe('Thứ Hai, 5/1');
  });
});

describe('formatDayMonth', () => {
  it('drops the weekday', () => {
    expect(formatDayMonth('2026-10-03')).toBe('3/10');
    expect(formatDayMonth('2026-10-10')).toBe('10/10');
  });
});

describe('formatMonth', () => {
  it('formats a YYYY-MM month', () => {
    expect(formatMonth('2026-10')).toBe('Tháng 10, 2026');
    expect(formatMonth('2027-01')).toBe('Tháng 1, 2027');
  });
});

describe('formatMonthShort', () => {
  it('formats a short month', () => {
    expect(formatMonthShort('2026-10')).toBe('thg 10');
    expect(formatMonthShort('2026-09')).toBe('thg 9');
  });
});

describe('formatDuration', () => {
  it('formats minutes only', () => {
    expect(formatDuration(45)).toBe('45 phút');
  });

  it('formats whole hours without minutes', () => {
    expect(formatDuration(60)).toBe('1 giờ');
    expect(formatDuration(120)).toBe('2 giờ');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(105)).toBe('1 giờ 45 phút');
  });

  it('handles zero and negatives without going below zero', () => {
    expect(formatDuration(0)).toBe('0 phút');
    expect(formatDuration(-5)).toBe('0 phút');
  });

  it('rounds fractional minutes', () => {
    expect(formatDuration(44.6)).toBe('45 phút');
  });
});

describe('formatClock', () => {
  it('converts a UTC instant to local wall-clock time', () => {
    expect(formatClock('2026-10-03T07:10:00Z', 'Asia/Ho_Chi_Minh')).toBe('14:10');
  });

  it('accepts a Date', () => {
    expect(formatClock(new Date('2026-10-03T13:00:00Z'), 'Asia/Ho_Chi_Minh')).toBe('20:00');
  });

  it('pads and wraps across the local midnight', () => {
    expect(formatClock('2026-10-03T17:05:00Z', 'Asia/Ho_Chi_Minh')).toBe('00:05');
  });

  it('respects other zones', () => {
    expect(formatClock('2026-10-03T07:10:00Z', 'UTC')).toBe('07:10');
  });
});

describe('weekday names', () => {
  it('reads the CN=0 … T7=6 arrays from copy', () => {
    expect(weekdayLong('2026-10-04')).toBe('Chủ Nhật');
    expect(weekdayShort('2026-10-05')).toBe('T2');
    expect(weekdayShort('2026-10-03')).toBe('T7');
  });
});

describe('formatHourLoose', () => {
  it('drops the leading zero of the hour and keeps the minutes', () => {
    expect(formatHourLoose('03:00')).toBe('3:00');
    expect(formatHourLoose('10:00')).toBe('10:00');
    expect(formatHourLoose('00:00')).toBe('0:00');
  });
});
