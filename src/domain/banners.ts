import { addDays, planWindow, reminderAt, zonedInstant } from './time';
import { completion } from './weights';
import type { ISODate, Settings, Task } from './types';

export type BannerVariant = 'planReminder' | 'ritual' | 'missedDay' | 'complete' | 'welcome';

export interface BannerInput {
  now: Date;
  settings: Settings;
  /** = logicalDate(now, settings) */
  today: ISODate;
  todayTasks: Task[];
  tomorrowTasks: Task[];
  todayClosed: boolean;
  /** earliest date that has ≥1 planned (adhoc=false) task, ever */
  firstPlanDate: ISODate | null;
  yesterdayHasPlan: boolean;
  planReminderDismissedOn: ISODate | null;
}

const RITUAL_FROM = '18:00';

function hasPlanned(tasks: Task[]): boolean {
  return tasks.some((t) => !t.adhoc);
}

export function selectBanners(i: BannerInput): { variant: BannerVariant; target?: ISODate }[] {
  const s = i.settings;
  const nowMs = i.now.getTime();
  const banners: { variant: BannerVariant; target?: ISODate }[] = [];

  const target = s.habit === 'evening' ? addDays(i.today, 1) : i.today;
  const targetTasks = s.habit === 'evening' ? i.tomorrowTasks : i.todayTasks;
  const planReminder =
    s.remindOn &&
    nowMs >= reminderAt(target, s).getTime() &&
    nowMs < planWindow(target, s).locksAt.getTime() &&
    !hasPlanned(targetTasks) &&
    i.planReminderDismissedOn !== i.today;

  if (planReminder) {
    banners.push({ variant: 'planReminder', target });
  } else if (
    !i.todayClosed &&
    nowMs >= zonedInstant(i.today, RITUAL_FROM, s.timezone).getTime()
  ) {
    banners.push({ variant: 'ritual' });
  }

  if (i.firstPlanDate !== null && i.firstPlanDate < addDays(i.today, -1) && !i.yesterdayHasPlan) {
    banners.push({ variant: 'missedDay' });
  }

  const c = completion(i.todayTasks);
  if (c.total > 0 && c.pct === 100) {
    banners.push({ variant: 'complete' });
  }

  if (i.firstPlanDate === null && !hasPlanned(i.todayTasks)) {
    banners.push({ variant: 'welcome' });
  }

  return banners;
}
