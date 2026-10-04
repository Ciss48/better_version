import { addDays, buildDaySummaries, classifyPlanTiming, consistency, isoWeekday } from '@/domain';
import type { DayLog, DaySummary, ISODate, Settings, Task } from '@/domain';
import {
  deltaOf,
  firstPlannedAt,
  groupByDate,
  inWindow,
  roundMean,
  shareOf,
  tasksIn,
  windowOf,
} from './helpers';
import type { Window } from './helpers';
import type { CardValue, Insight, StatsInput, StatsResult, WeekdayValue } from './types';

/**
 * Every number on the Journey screen, in one pass over a snapshot of the data.
 *
 * Two rules run through all of it:
 *
 * - **"Completed days" are the days strictly before `today`.** Today is still
 *   being written, so counting it would drag every average down all morning.
 *   The only places today does count are the consistency score (it asks "did
 *   you write a plan", not "did you finish it") and the heat map.
 * - **Too little data shows nothing, never a zero.** Under seven planned days
 *   every card reads "—": an average over two days is noise with a number on it.
 */

/** 26 columns of seven days, ending on `today`. */
const HEATMAP_DAYS = 26 * 7;
/** The widest window any rule below reaches back: the weekday chart's 26 weeks. */
const SPAN_DAYS = 182;
/** Below this many planned days the screen holds its figures back. */
const SPARSE_LIMIT = 7;
/** Insights need a fortnight of material before they mean anything. */
const INSIGHT_MIN_DAYS = 14;
/** Each side of an insight's comparison needs this many days…  */
const INSIGHT_MIN_GROUP_DAYS = 3;
/** …or this many tasks. */
const INSIGHT_MIN_GROUP_TASKS = 5;
/** Point gaps below these are within the noise — say nothing. */
const INSIGHT_MIN_GAP = 5;
const WEEKDAY_MIN_GAP = 10;
/** A weekday average built on one single day is not an average. */
const WEEKDAY_MIN_SAMPLE = 2;

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function blank(): CardValue {
  return { value: null, delta: null };
}

function isDone(task: Task): boolean {
  return task.status === 'done';
}

/** Mean completion of the planned days inside `w`; `null` if there are none. */
function avgPct(days: DaySummary[], w: Window): number | null {
  return roundMean(days.filter((day) => day.hasPlan && inWindow(day.date, w)).map((d) => d.pct));
}

/** Share of long-horizon work: important, not urgent, among the day's real plan. */
function q2Share(tasks: Task[], w: Window): number | null {
  const pool = tasksIn(tasks, w).filter((task) => !task.adhoc && task.status !== 'dropped');
  return shareOf(pool, (task) => task.important && !task.urgent);
}

/** "Những ngày bạn plan từ tối hôm trước…" — evening plans against morning ones. */
function eveningInsight(
  days: DaySummary[],
  byDate: Map<ISODate, Task[]>,
  settings: Settings,
): Insight | null {
  const evening: number[] = [];
  const morning: number[] = [];

  for (const day of days) {
    const at = firstPlannedAt(byDate.get(day.date) ?? []);
    if (at === null) continue;
    // A plan written after the lock is neither habit — it says nothing here.
    const kind = classifyPlanTiming(at, day.date, settings);
    if (kind === 'evening') evening.push(day.pct);
    else if (kind === 'morning') morning.push(day.pct);
  }

  if (evening.length < INSIGHT_MIN_GROUP_DAYS || morning.length < INSIGHT_MIN_GROUP_DAYS) {
    return null;
  }
  const gap = Math.round((roundMean(evening) ?? 0) - (roundMean(morning) ?? 0));
  if (gap < INSIGHT_MIN_GAP) return null;
  return { kind: 'evening', tone: 'success', vars: { n: gap } };
}

/** "Bạn hoàn thành {mit}% việc MIT…" — done-rate of MITs against the rest. */
function mitInsight(tasks: Task[], w: Window): Insight | null {
  const pool = tasksIn(tasks, w).filter((task) => !task.adhoc && task.status !== 'dropped');
  const mits = pool.filter((task) => task.mit);
  const others = pool.filter((task) => !task.mit);
  if (mits.length < INSIGHT_MIN_GROUP_TASKS || others.length < INSIGHT_MIN_GROUP_TASKS) {
    return null;
  }

  const mit = shareOf(mits, isDone) ?? 0;
  const other = shareOf(others, isDone) ?? 0;
  if (mit - other < INSIGHT_MIN_GAP) return null;
  return { kind: 'mit', tone: 'accent', vars: { mit, other } };
}

/**
 * "{best} là ngày bạn làm tốt nhất…". The module deals in ISO weekday numbers;
 * the screen turns them into names (`date.weekdayLong`) — copy stays in the UI.
 */
function weekdayInsight(values: WeekdayValue[], samples: Map<number, number>): Insight | null {
  const sampled = values.filter(
    (value) => value.pct !== null && (samples.get(value.weekday) ?? 0) >= WEEKDAY_MIN_SAMPLE,
  );
  if (sampled.length < 2) return null;

  let best = sampled[0];
  let worst = sampled[0];
  for (const value of sampled) {
    if ((value.pct ?? 0) > (best.pct ?? 0)) best = value;
    if ((value.pct ?? 0) < (worst.pct ?? 0)) worst = value;
  }
  if ((best.pct ?? 0) - (worst.pct ?? 0) < WEEKDAY_MIN_GAP) return null;

  return {
    kind: 'weekday',
    tone: 'success',
    vars: {
      best: best.weekday,
      bestPct: best.pct ?? 0,
      worst: worst.weekday,
      worstPct: worst.pct ?? 0,
    },
  };
}

/** "Ngày năng lượng 4–5…" — energy 4–5 days against energy 1–2 days. */
function energyInsight(days: DaySummary[], dayLogs: DayLog[]): Insight | null {
  const byDate = new Map(dayLogs.map((log) => [log.planDate, log]));
  const high: number[] = [];
  const low: number[] = [];

  for (const day of days) {
    const log = byDate.get(day.date);
    // Energy 0 means the question was skipped, not "exhausted".
    if (log === undefined || log.energy === 0) continue;
    if (log.energy >= 4) high.push(day.pct);
    else if (log.energy <= 2) low.push(day.pct);
  }

  if (high.length < INSIGHT_MIN_GROUP_DAYS || low.length < INSIGHT_MIN_GROUP_DAYS) return null;
  const highPct = roundMean(high) ?? 0;
  const lowPct = roundMean(low) ?? 0;
  if (highPct - lowPct < INSIGHT_MIN_GAP) return null;
  return { kind: 'energy', tone: 'accent', vars: { high: highPct, low: lowPct } };
}

export function computeStats(input: StatsInput): StatsResult {
  const { tasks, dayLogs, today, settings } = input;

  const summaries = buildDaySummaries(addDays(today, -SPAN_DAYS), today, tasks, today);
  const byDate = groupByDate(tasks);

  // One pass for the two facts that look at *all* of the loaded data rather
  // than a window: how many days carry a plan, and when the user started.
  const plannedDates = new Set<ISODate>();
  let firstUseDate: ISODate | null = null;
  for (const task of tasks) {
    if (task.adhoc) continue;
    if (task.planDate <= today) plannedDates.add(task.planDate);
    if (firstUseDate === null || task.planDate < firstUseDate) firstUseDate = task.planDate;
  }
  const daysWithPlan = plannedDates.size;
  const sparse = daysWithPlan < SPARSE_LIMIT;

  const last30 = windowOf(today, 30, 1);
  const prev30 = windowOf(today, 60, 31);

  const avg7 = avgPct(summaries, windowOf(today, 7, 1));
  const avg30 = avgPct(summaries, last30);
  const q2 = q2Share(tasks, last30);
  const adhoc = shareOf(tasksIn(tasks, last30), (task) => task.adhoc);
  const moved = shareOf(
    tasksIn(tasks, last30).filter((task) => !task.adhoc),
    (task) => task.status === 'moved',
  );

  // Weekday averages, plus how many days each one rests on — the insight
  // below refuses to compare weekdays it has barely seen.
  const weekdayWindow = windowOf(today, SPAN_DAYS, 1);
  const buckets = new Map<number, number[]>();
  for (const day of summaries) {
    if (!day.hasPlan || !inWindow(day.date, weekdayWindow)) continue;
    const weekday = isoWeekday(day.date);
    const bucket = buckets.get(weekday);
    if (bucket) bucket.push(day.pct);
    else buckets.set(weekday, [day.pct]);
  }
  const samples = new Map([...buckets].map(([weekday, pcts]) => [weekday, pcts.length]));
  const weekday: WeekdayValue[] = WEEKDAYS.map((value) => ({
    weekday: value,
    pct: sparse ? null : roundMean(buckets.get(value) ?? []),
  }));

  const insightDays = summaries.filter(
    (day) => day.hasPlan && inWindow(day.date, windowOf(today, 90, 1)),
  );
  const insights: Insight[] =
    sparse || insightDays.length < INSIGHT_MIN_DAYS
      ? []
      : [
          eveningInsight(insightDays, byDate, settings),
          mitInsight(tasks, last30),
          weekdayInsight(weekday, samples),
          energyInsight(insightDays, dayLogs),
        ].filter((insight): insight is Insight => insight !== null);

  return {
    daysWithPlan,
    sparse,
    firstUseDate,
    cards: {
      avg7: sparse ? blank() : { value: avg7, delta: deltaOf(avg7, avgPct(summaries, windowOf(today, 14, 8))) },
      avg30: sparse ? blank() : { value: avg30, delta: deltaOf(avg30, avgPct(summaries, prev30)) },
      consistency: { planned: consistency(summaries, today).planned },
      q2Share: sparse ? blank() : { value: q2, delta: deltaOf(q2, q2Share(tasks, prev30)) },
      adhocShare: sparse ? blank() : { value: adhoc, delta: null },
      movedShare: sparse ? blank() : { value: moved, delta: null },
    },
    heatmap: summaries.filter((day) => day.date >= addDays(today, -(HEATMAP_DAYS - 1))),
    weekday,
    insights,
  };
}
