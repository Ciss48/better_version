import type { Habit, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  timezone: 'Asia/Ho_Chi_Minh',
  habit: 'evening',
  windowStart: { hour: 18, dayOffset: -1 },
  lockTime: '10:00',
  dayEnd: '00:00',
  remindOn: true,
  remindPlan: '21:30',
  remindRitual: '21:00',
  theme: 'system',
  onboardedAt: null,
};

const HABIT_DEFAULTS: Record<
  Habit,
  { windowStart: Settings['windowStart']; remindPlan: Settings['remindPlan'] }
> = {
  evening: { windowStart: { hour: 18, dayOffset: -1 }, remindPlan: '21:30' },
  morning: { windowStart: { hour: 6, dayOffset: 0 }, remindPlan: '07:00' },
};

/** Returns a copy with habit + its windowStart ({18,-1} | {6,0}) and remindPlan ('21:30' | '07:00'). */
export function settingsForHabit(s: Settings, habit: Habit): Settings {
  const d = HABIT_DEFAULTS[habit];
  return {
    ...s,
    habit,
    windowStart: { ...d.windowStart },
    remindPlan: d.remindPlan,
  };
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isHhmm(value: string): boolean {
  return HHMM_RE.test(value);
}

function hour(value: string): number {
  return Number(value.slice(0, 2));
}

function minute(value: string): number {
  return Number(value.slice(3, 5));
}

/**
 * Returns a list of human-readable problems; [] means valid.
 * Rules: HH:MM format everywhere; lockTime 07:00–14:00; dayEnd ∈ {00..05}:00;
 * evening → windowStart.hour 17–20 & dayOffset -1; morning → hour 5–6 & dayOffset 0.
 */
export function validateSettings(s: Settings): string[] {
  const problems: string[] = [];

  const timeFields: [keyof Settings, string][] = [
    ['lockTime', s.lockTime],
    ['dayEnd', s.dayEnd],
    ['remindPlan', s.remindPlan],
    ['remindRitual', s.remindRitual],
  ];
  for (const [name, value] of timeFields) {
    if (!isHhmm(value)) problems.push(`${String(name)} must be a HH:MM time, got "${value}"`);
  }

  if (isHhmm(s.lockTime)) {
    const h = hour(s.lockTime);
    if (h < 7 || h > 14 || (h === 14 && minute(s.lockTime) > 0)) {
      problems.push('lockTime must be between 07:00 and 14:00');
    }
  }

  if (isHhmm(s.dayEnd)) {
    const h = hour(s.dayEnd);
    if (h > 5 || minute(s.dayEnd) !== 0) {
      problems.push('dayEnd must be a whole hour between 00:00 and 05:00');
    }
  }

  if (s.habit === 'evening') {
    if (s.windowStart.hour < 17 || s.windowStart.hour > 20) {
      problems.push('evening habit requires windowStart.hour between 17 and 20');
    }
    if (s.windowStart.dayOffset !== -1) {
      problems.push('evening habit requires windowStart.dayOffset -1');
    }
  } else {
    if (s.windowStart.hour < 5 || s.windowStart.hour > 6) {
      problems.push('morning habit requires windowStart.hour between 5 and 6');
    }
    if (s.windowStart.dayOffset !== 0) {
      problems.push('morning habit requires windowStart.dayOffset 0');
    }
  }

  return problems;
}
