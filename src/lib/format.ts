import { DEFAULT_SETTINGS, isoWeekday, localParts } from '@/domain';
import type { HHMM, ISODate } from '@/domain';
import { t, tRaw } from '@/lib/copy';

/**
 * Vietnamese date/time formatting. Every string comes from copy.vi.json, so
 * nothing here hard-codes Vietnamese. The weekday arrays in copy are indexed
 * CN=0 … T7=6, which is `isoWeekday % 7`.
 */

function parts(date: ISODate): { d: number; m: number; y: number } {
  return {
    y: Number(date.slice(0, 4)),
    m: Number(date.slice(5, 7)),
    d: Number(date.slice(8, 10)),
  };
}

function weekdayIndex(date: ISODate): number {
  return isoWeekday(date) % 7;
}

export function weekdayLong(date: ISODate): string {
  return tRaw<string[]>('date.weekdayLong')[weekdayIndex(date)];
}

export function weekdayShort(date: ISODate): string {
  return tRaw<string[]>('date.weekdayShort')[weekdayIndex(date)];
}

/** The long form of a date — see format.test.ts for the exact output. */
export function formatDateLong(date: ISODate): string {
  const { d, m } = parts(date);
  return t('date.longFormat', { weekday: weekdayLong(date), d, m });
}

/** The short form: weekday, day and month. */
export function formatDateShort(date: ISODate): string {
  const { d, m } = parts(date);
  return t('date.shortFormat', { weekdayShort: weekdayShort(date), d, m });
}

/** Day and month only. */
export function formatDayMonth(date: ISODate): string {
  const { d, m } = parts(date);
  return `${d}/${m}`;
}

/** A 'YYYY-MM' month as the calendar title. */
export function formatMonth(ym: string): string {
  return t('date.month', { m: Number(ym.slice(5, 7)), y: Number(ym.slice(0, 4)) });
}

/** A 'YYYY-MM' month in its abbreviated form (heatmap labels). */
export function formatMonthShort(ym: string): string {
  return t('date.monthShort', { m: Number(ym.slice(5, 7)) });
}

/** Minutes as a duration: minutes only, whole hours, or hours + minutes. */
export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  const h = Math.floor(whole / 60);
  const m = whole % 60;
  if (h === 0) return t('format.duration.minutes', { m });
  if (m === 0) return t('format.duration.hours', { h });
  return t('format.duration.hoursMinutes', { h, m });
}

/**
 * A UTC instant as local wall-clock time: '2026-10-03T07:10:00Z' in
 * 'Asia/Ho_Chi_Minh' → '14:10'. Delegates to the domain's timezone handling so
 * a `TZDate` never leaks out of it (Phase 2 finding).
 */
export function formatClock(instant: Date | string, tz: string): HHMM {
  const at = typeof instant === 'string' ? new Date(instant) : instant;
  return localParts(at, tz).hhmm;
}

/**
 * `formatClock` in the app's own timezone. Presentational components get no
 * `settings` prop, and they must not reach into `@/domain` themselves, so the
 * default zone is resolved here until Phase 4 threads real settings through.
 */
export function formatClockLocal(instant: Date | string): HHMM {
  return formatClock(instant, DEFAULT_SETTINGS.timezone);
}
