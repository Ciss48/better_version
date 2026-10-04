import type { DayLog, DaySummary, HHMM, ISODate, Settings, Task } from '@/domain';

/**
 * Everything the Journey screen shows, computed from tasks and day logs.
 *
 * This module is pure TypeScript: it may read `@/domain` (the business rules
 * live there and are never re-implemented here) but nothing from React, the
 * store, Next.js or storage. The screen hands it a snapshot and renders the
 * result.
 */

export interface StatsInput {
  /** Everything loaded — the store's window is today−190 … today+30. */
  tasks: Task[];
  dayLogs: DayLog[];
  today: ISODate;
  /** Needed by `classifyPlanTiming` for the "evening" insight. */
  settings: Settings;
}

/** One stat card: `null` is "not enough data", never zero. */
export interface CardValue {
  value: number | null;
  delta: number | null;
}

export type InsightKind = 'evening' | 'mit' | 'weekday' | 'energy';

export interface Insight {
  kind: InsightKind;
  tone: 'success' | 'accent';
  /** Exactly the placeholders of `stats.insights.<kind>`. */
  vars: Record<string, string | number>;
}

export interface WeekdayValue {
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  pct: number | null;
}

export interface StatsResult {
  /** Loaded dates up to today that have a planned task. */
  daysWithPlan: number;
  /** Under seven planned days every figure but the consistency score is held back. */
  sparse: boolean;
  firstUseDate: ISODate | null;
  cards: {
    avg7: CardValue;
    avg30: CardValue;
    /** The domain's 30-day window; `total` is always 30. */
    consistency: { planned: number };
    q2Share: CardValue;
    /** Adhoc work is neither good nor bad, so it never carries a delta. */
    adhocShare: CardValue;
    /** Moving a task is not a failure either — no delta. */
    movedShare: CardValue;
  };
  /** [today − 26·7 + 1 … today], ascending. */
  heatmap: DaySummary[];
  /** Mon … Sun. */
  weekday: WeekdayValue[];
  /** Ordered evening, mit, weekday, energy. Empty until the data carries them. */
  insights: Insight[];
}

/** When the plan for a day was first written. */
export interface PlanTiming {
  kind: 'evening' | 'morning';
  time: HHMM;
}

export interface MonthSummary {
  planned: number;
  total: number;
  avg: number;
}
