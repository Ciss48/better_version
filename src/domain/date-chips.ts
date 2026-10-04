import { addDays, isoWeekday } from './time';
import type { ISODate } from './types';

export type DateChipKey = 'tomorrow' | 'nextMonday' | 'weekend' | 'plusWeek';

/** Days from `today` to the next occurrence of `weekday`, strictly after today. */
function daysUntilWeekday(today: ISODate, weekday: number): number {
  const delta = (weekday - isoWeekday(today) + 7) % 7;
  return delta === 0 ? 7 : delta;
}

/**
 * The "move to" chips, in fixed order, with duplicates of an earlier chip's date removed.
 */
export function dateChipOptions(today: ISODate): { key: DateChipKey; date: ISODate }[] {
  const candidates: { key: DateChipKey; date: ISODate }[] = [
    { key: 'tomorrow', date: addDays(today, 1) },
    { key: 'nextMonday', date: addDays(today, daysUntilWeekday(today, 1)) },
    { key: 'weekend', date: addDays(today, daysUntilWeekday(today, 6)) },
    { key: 'plusWeek', date: addDays(today, 7) },
  ];

  const seen = new Set<ISODate>();
  const options: { key: DateChipKey; date: ISODate }[] = [];
  for (const option of candidates) {
    if (seen.has(option.date)) continue;
    seen.add(option.date);
    options.push(option);
  }
  return options;
}
