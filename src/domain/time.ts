import { TZDate } from '@date-fns/tz';

import type { HHMM, ISODate, Settings } from './types';

const MS_PER_DAY = 86_400_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function formatISODate(year: number, month: number, day: number): ISODate {
  return `${String(year).padStart(4, '0')}-${pad2(month)}-${pad2(day)}`;
}

/** Parses 'YYYY-MM-DD' into its calendar parts (no timezone involved). */
function dateParts(date: ISODate): { year: number; month: number; day: number } {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Minutes since midnight for an 'HH:MM' string. */
function hhmmToMinutes(hhmm: HHMM): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}

/** Local wall-clock date, time and minutes-since-local-midnight of `now` in `tz`. */
export function localParts(
  now: Date,
  tz: string,
): { date: ISODate; hhmm: HHMM; minutes: number } {
  const z = TZDate.tz(tz, now.getTime());
  const hours = z.getHours();
  const minutes = z.getMinutes();
  return {
    date: formatISODate(z.getFullYear(), z.getMonth() + 1, z.getDate()),
    hhmm: `${pad2(hours)}:${pad2(minutes)}`,
    minutes: hours * 60 + minutes,
  };
}

/** The instant at which `hhmm` wall-clock time occurs on `date` in `tz`. */
export function zonedInstant(date: ISODate, hhmm: HHMM, tz: string): Date {
  const { year, month, day } = dateParts(date);
  const zoned = new TZDate(
    year,
    month - 1,
    day,
    Number(hhmm.slice(0, 2)),
    Number(hhmm.slice(3, 5)),
    0,
    0,
    tz,
  );
  return new Date(zoned.getTime());
}

/** Calendar-day arithmetic on a logical date string. */
export function addDays(date: ISODate, n: number): ISODate {
  const { year, month, day } = dateParts(date);
  const shifted = new Date(Date.UTC(year, month - 1, day) + n * MS_PER_DAY);
  return formatISODate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** Mon=1 … Sun=7. */
export function isoWeekday(date: ISODate): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const { year, month, day } = dateParts(date);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (dow === 0 ? 7 : dow) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

/** True between local midnight and `settings.dayEnd` — the previous logical day is still showing. */
export function isLateNight(now: Date, s: Settings): boolean {
  return localParts(now, s.timezone).minutes < hhmmToMinutes(s.dayEnd);
}

/** The logical day `now` belongs to: the local date, minus one day during late night. */
export function logicalDate(now: Date, s: Settings): ISODate {
  const { date } = localParts(now, s.timezone);
  return isLateNight(now, s) ? addDays(date, -1) : date;
}

export function planWindow(date: ISODate, s: Settings): { opensAt: Date; locksAt: Date } {
  const openDate = addDays(date, s.windowStart.dayOffset);
  const openHhmm: HHMM = `${pad2(s.windowStart.hour)}:00`;
  return {
    opensAt: zonedInstant(openDate, openHhmm, s.timezone),
    locksAt: zonedInstant(date, s.lockTime, s.timezone),
  };
}

export function isLocked(date: ISODate, now: Date, s: Settings): boolean {
  return now.getTime() >= planWindow(date, s).locksAt.getTime();
}

/** Whole minutes (rounded up) until the plan for `date` locks; null once it is locked. */
export function minutesToLock(date: ISODate, now: Date, s: Settings): number | null {
  const { locksAt } = planWindow(date, s);
  const diff = locksAt.getTime() - now.getTime();
  if (diff <= 0) return null;
  return Math.ceil(diff / 60_000);
}

/** When the plan for `date` was first written, relative to that day's boundaries. */
export function classifyPlanTiming(
  firstPlannedAt: Date,
  date: ISODate,
  s: Settings,
): 'evening' | 'morning' | 'late' {
  const dayEndAt = zonedInstant(date, s.dayEnd, s.timezone);
  if (firstPlannedAt.getTime() < dayEndAt.getTime()) return 'evening';
  if (firstPlannedAt.getTime() < planWindow(date, s).locksAt.getTime()) return 'morning';
  return 'late';
}

/** The instant the in-app plan reminder for `target` becomes due. */
export function reminderAt(target: ISODate, s: Settings): Date {
  return zonedInstant(addDays(target, s.windowStart.dayOffset), s.remindPlan, s.timezone);
}
