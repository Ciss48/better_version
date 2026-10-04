import { describe, expect, it } from 'vitest';

import * as domain from '@/domain';

/** Every runtime name the Phase 02 interface contract requires from `@/domain`. */
const CONTRACT_EXPORTS = [
  'DomainError',
  'makeEvent',
  'DEFAULT_SETTINGS',
  'settingsForHabit',
  'validateSettings',
  'localParts',
  'zonedInstant',
  'addDays',
  'isoWeekday',
  'isLateNight',
  'logicalDate',
  'planWindow',
  'isLocked',
  'minutesToLock',
  'classifyPlanTiming',
  'reminderAt',
  'taskWeight',
  'completion',
  'quadrantOf',
  'flagsForQuadrant',
  'parseQuickAdd',
  'activeMitCount',
  'createTask',
  'toggleDone',
  'patchTask',
  'moveTask',
  'dropTask',
  'restoreTask',
  'dateChipOptions',
  'ritualRemaining',
  'closeDay',
  'selectBanners',
  'summarizeDay',
  'buildDaySummaries',
  'consistency',
] as const;

describe('@/domain', () => {
  it('re-exports every public name in the contract', () => {
    for (const name of CONTRACT_EXPORTS) {
      expect(domain, name).toHaveProperty(name);
      expect(domain[name]).toBeDefined();
    }
  });

  it('exports nothing beyond the contract', () => {
    expect(Object.keys(domain).sort()).toEqual([...CONTRACT_EXPORTS].sort());
  });

  it('works end to end through the barrel', () => {
    const parsedTask = domain.parseQuickAdd('Viết plan * ~L');
    expect(parsedTask).not.toBeNull();
    const m = domain.createTask(
      parsedTask!,
      { planDate: '2026-10-04', dayTasks: [] },
      {
        now: new Date('2026-10-03T13:00:00Z'),
        settings: domain.DEFAULT_SETTINGS,
        newId: () => 'id1',
      },
    );
    expect(m.upserts[0]).toMatchObject({ title: 'Viết plan', mit: true, size: 'L' });
    expect(domain.completion(m.upserts)).toEqual({ pct: 0, done: 0, total: 1 });
  });
});
