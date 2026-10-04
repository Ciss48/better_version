import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, settingsForHabit, validateSettings } from '../settings';
import { settings } from './helpers';

describe('DEFAULT_SETTINGS', () => {
  it('matches the locked business rules', () => {
    expect(DEFAULT_SETTINGS).toEqual({
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
    });
  });

  it('is valid', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toEqual([]);
  });
});

describe('settingsForHabit', () => {
  it('switches to morning window and reminder', () => {
    const s = settingsForHabit(DEFAULT_SETTINGS, 'morning');
    expect(s.habit).toBe('morning');
    expect(s.windowStart).toEqual({ hour: 6, dayOffset: 0 });
    expect(s.remindPlan).toBe('07:00');
    expect(validateSettings(s)).toEqual([]);
  });

  it('switches back to evening and does not mutate the input', () => {
    const morning = settingsForHabit(DEFAULT_SETTINGS, 'morning');
    const evening = settingsForHabit(morning, 'evening');
    expect(evening.windowStart).toEqual({ hour: 18, dayOffset: -1 });
    expect(evening.remindPlan).toBe('21:30');
    expect(morning.windowStart).toEqual({ hour: 6, dayOffset: 0 });
    expect(DEFAULT_SETTINGS.windowStart).toEqual({ hour: 18, dayOffset: -1 });
  });

  it('keeps unrelated fields', () => {
    const s = settingsForHabit(settings({ timezone: 'Europe/Berlin', theme: 'dark' }), 'morning');
    expect(s.timezone).toBe('Europe/Berlin');
    expect(s.theme).toBe('dark');
  });
});

describe('validateSettings', () => {
  it('rejects malformed HH:MM values', () => {
    const problems = validateSettings(
      settings({ lockTime: '9:00', dayEnd: '0:00', remindPlan: '25:00', remindRitual: 'abc' }),
    );
    expect(problems).toHaveLength(4);
    expect(problems.join(' ')).toContain('lockTime');
    expect(problems.join(' ')).toContain('remindRitual');
  });

  it('accepts the lockTime bounds and rejects outside them', () => {
    expect(validateSettings(settings({ lockTime: '07:00' }))).toEqual([]);
    expect(validateSettings(settings({ lockTime: '14:00' }))).toEqual([]);
    expect(validateSettings(settings({ lockTime: '06:59' }))).toEqual([
      'lockTime must be between 07:00 and 14:00',
    ]);
    expect(validateSettings(settings({ lockTime: '14:01' }))).toEqual([
      'lockTime must be between 07:00 and 14:00',
    ]);
    expect(validateSettings(settings({ lockTime: '15:00' }))).toEqual([
      'lockTime must be between 07:00 and 14:00',
    ]);
  });

  it('accepts whole hours 00:00–05:00 for dayEnd only', () => {
    expect(validateSettings(settings({ dayEnd: '05:00' }))).toEqual([]);
    expect(validateSettings(settings({ dayEnd: '06:00' }))).toEqual([
      'dayEnd must be a whole hour between 00:00 and 05:00',
    ]);
    expect(validateSettings(settings({ dayEnd: '03:30' }))).toEqual([
      'dayEnd must be a whole hour between 00:00 and 05:00',
    ]);
  });

  it('checks the window start against the habit', () => {
    expect(validateSettings(settings({ windowStart: { hour: 17, dayOffset: -1 } }))).toEqual([]);
    expect(validateSettings(settings({ windowStart: { hour: 20, dayOffset: -1 } }))).toEqual([]);
    expect(validateSettings(settings({ windowStart: { hour: 21, dayOffset: -1 } }))).toEqual([
      'evening habit requires windowStart.hour between 17 and 20',
    ]);
    expect(validateSettings(settings({ windowStart: { hour: 16, dayOffset: -1 } }))).toEqual([
      'evening habit requires windowStart.hour between 17 and 20',
    ]);
    expect(validateSettings(settings({ windowStart: { hour: 18, dayOffset: 0 } }))).toEqual([
      'evening habit requires windowStart.dayOffset -1',
    ]);

    const morning = settings({ habit: 'morning', remindPlan: '07:00' });
    expect(validateSettings({ ...morning, windowStart: { hour: 5, dayOffset: 0 } })).toEqual([]);
    expect(validateSettings({ ...morning, windowStart: { hour: 7, dayOffset: 0 } })).toEqual([
      'morning habit requires windowStart.hour between 5 and 6',
    ]);
    expect(validateSettings({ ...morning, windowStart: { hour: 4, dayOffset: 0 } })).toEqual([
      'morning habit requires windowStart.hour between 5 and 6',
    ]);
    expect(validateSettings({ ...morning, windowStart: { hour: 6, dayOffset: -1 } })).toEqual([
      'morning habit requires windowStart.dayOffset 0',
    ]);
  });
});
