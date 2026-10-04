import { describe, expect, it } from 'vitest';

import { selectBanners } from '../banners';
import { settingsForHabit } from '../settings';
import { logicalDate } from '../time';
import type { BannerInput } from '../banners';
import { settings, task } from './helpers';

/** 22:00 local on 2026-10-03: after the 21:30 plan reminder, after the 18:00 ritual hour. */
const LATE_EVENING = '2026-10-03T15:00:00Z';

function input(overrides: Partial<BannerInput> = {}): BannerInput {
  return {
    now: new Date(LATE_EVENING),
    settings: settings(),
    today: '2026-10-03',
    todayTasks: [],
    tomorrowTasks: [],
    todayClosed: false,
    firstPlanDate: '2026-10-01',
    yesterdayHasPlan: true,
    planReminderDismissedOn: null,
    ...overrides,
  };
}

const MORNING_SETTINGS = settingsForHabit(settings(), 'morning');

describe('planReminder', () => {
  it('asks the evening-habit user to plan tomorrow', () => {
    expect(selectBanners(input())).toEqual([{ variant: 'planReminder', target: '2026-10-04' }]);
  });

  it('suppresses the ritual banner while it is shown', () => {
    const banners = selectBanners(input());
    expect(banners.map((b) => b.variant)).not.toContain('ritual');
  });

  it('is silent before the reminder time', () => {
    // 21:00 local, before remindPlan 21:30.
    const banners = selectBanners(input({ now: new Date('2026-10-03T14:00:00Z') }));
    expect(banners).toEqual([{ variant: 'ritual' }]);
  });

  it('asks the morning-habit user to plan today', () => {
    // 08:00 local: after remindPlan 07:00, before the 10:00 lock.
    const banners = selectBanners(
      input({ settings: MORNING_SETTINGS, now: new Date('2026-10-03T01:00:00Z') }),
    );
    expect(banners).toEqual([{ variant: 'planReminder', target: '2026-10-03' }]);
  });

  it('is silent once the plan window has locked', () => {
    // 10:00 local = the lock instant for the morning habit's target (today).
    expect(
      selectBanners(input({ settings: MORNING_SETTINGS, now: new Date('2026-10-03T03:00:00Z') })),
    ).toEqual([]);
  });

  it('is silent when reminders are off', () => {
    expect(selectBanners(input({ settings: settings({ remindOn: false }) }))).toEqual([
      { variant: 'ritual' },
    ]);
  });

  it('is silent once dismissed today', () => {
    expect(selectBanners(input({ planReminderDismissedOn: '2026-10-03' }))).toEqual([
      { variant: 'ritual' },
    ]);
  });

  it('reappears when the dismissal was for another day', () => {
    expect(selectBanners(input({ planReminderDismissedOn: '2026-10-02' }))).toEqual([
      { variant: 'planReminder', target: '2026-10-04' },
    ]);
  });

  it('is silent when the target already has a planned task', () => {
    expect(
      selectBanners(input({ tomorrowTasks: [task({ planDate: '2026-10-04' })] })),
    ).toEqual([{ variant: 'ritual' }]);
  });

  it('ignores adhoc tasks on the target day', () => {
    expect(
      selectBanners(input({ tomorrowTasks: [task({ planDate: '2026-10-04', adhoc: true })] })),
    ).toEqual([{ variant: 'planReminder', target: '2026-10-04' }]);
  });
});

describe('ritual', () => {
  const quiet = settings({ remindOn: false });

  it('appears from 18:00 local', () => {
    expect(
      selectBanners(input({ settings: quiet, now: new Date('2026-10-03T11:00:00Z') })),
    ).toEqual([{ variant: 'ritual' }]);
  });

  it('is silent one minute earlier', () => {
    expect(
      selectBanners(input({ settings: quiet, now: new Date('2026-10-03T10:59:00Z') })),
    ).toEqual([]);
  });

  it('is silent once the day is closed', () => {
    expect(selectBanners(input({ settings: quiet, todayClosed: true }))).toEqual([]);
  });

  it('still appears at 01:00 during late night', () => {
    const s = settings({ dayEnd: '03:00' });
    const now = new Date('2026-10-03T18:00:00Z'); // 01:00 local on 10-04
    const today = logicalDate(now, s);
    expect(today).toBe('2026-10-03');
    const banners = selectBanners(
      input({
        settings: s,
        now,
        today,
        // tomorrow was already planned during the ritual, so planReminder stays silent
        tomorrowTasks: [task({ planDate: '2026-10-04' })],
      }),
    );
    expect(banners).toEqual([{ variant: 'ritual' }]);
  });
});

describe('missedDay', () => {
  it('appears when yesterday had no plan and the habit is older than that', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          firstPlanDate: '2026-10-01',
          yesterdayHasPlan: false,
        }),
      ),
    ).toEqual([{ variant: 'missedDay' }]);
  });

  it('is silent for a brand-new user whose first plan was yesterday', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          firstPlanDate: '2026-10-02',
          yesterdayHasPlan: false,
        }),
      ),
    ).toEqual([]);
  });

  it('is silent when yesterday had a plan', () => {
    expect(
      selectBanners(
        input({ settings: settings({ remindOn: false }), todayClosed: true }),
      ),
    ).toEqual([]);
  });
});

describe('complete', () => {
  it('appears when every planned task of today is done', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          todayTasks: [task({ status: 'done' }), task({ status: 'dropped' })],
        }),
      ),
    ).toEqual([{ variant: 'complete' }]);
  });

  it('is silent while something is still open', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          todayTasks: [task({ status: 'done' }), task({ status: 'todo' })],
        }),
      ),
    ).toEqual([]);
  });

  it('is silent on a day with no planned task', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          todayTasks: [task({ status: 'done', adhoc: true })],
        }),
      ),
    ).toEqual([]);
  });
});

describe('welcome', () => {
  it('appears for a user who has never planned a day', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          firstPlanDate: null,
        }),
      ),
    ).toEqual([{ variant: 'welcome' }]);
  });

  it('is silent once today has a planned task', () => {
    expect(
      selectBanners(
        input({
          settings: settings({ remindOn: false }),
          todayClosed: true,
          firstPlanDate: null,
          todayTasks: [task({ status: 'todo' })],
        }),
      ),
    ).toEqual([]);
  });
});

describe('ordering', () => {
  it('stacks missedDay and complete after the ritual slot, in contract order', () => {
    const banners = selectBanners(
      input({
        settings: settings({ remindOn: false }),
        yesterdayHasPlan: false,
        todayTasks: [task({ status: 'done' })],
      }),
    );
    expect(banners).toEqual([
      { variant: 'ritual' },
      { variant: 'missedDay' },
      { variant: 'complete' },
    ]);
  });

  it('stacks missedDay and complete without the ritual banner once the day is closed', () => {
    const banners = selectBanners(
      input({
        settings: settings({ remindOn: false }),
        todayClosed: true,
        yesterdayHasPlan: false,
        todayTasks: [task({ status: 'done' })],
      }),
    );
    expect(banners).toEqual([{ variant: 'missedDay' }, { variant: 'complete' }]);
  });
});
