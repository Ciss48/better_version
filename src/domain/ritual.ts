import { DomainError } from './errors';
import { makeEvent } from './events';
import { createTask, dropTask, moveTask } from './tasks';
import { addDays } from './time';
import { completion } from './weights';
import type {
  Ctx,
  DayLog,
  Decision,
  ISODate,
  Mutation,
  Notice,
  ParsedTask,
  Reflection,
  Task,
  TaskEvent,
} from './types';

/** Tasks still waiting for a move/drop decision before the day can be closed. */
export function ritualRemaining(
  todayTasks: Task[],
  decisions: Record<string, Decision>,
): number {
  return todayTasks.filter((t) => t.status === 'todo' && decisions[t.id] === undefined).length;
}

export interface CloseDayInput {
  /** the day being closed */
  date: ISODate;
  /** every task of `date`, incl. adhoc */
  todayTasks: Task[];
  /** keyed by task id */
  decisions: Record<string, Decision>;
  /** tasks already on date+1 */
  tomorrowExisting: Task[];
  /** MIT overrides for tasks moved to date+1, keyed by ORIGINAL task id */
  tomorrowMit: Record<string, boolean>;
  /** typed in step 3, in order */
  tomorrowNew: ParsedTask[];
  /**
   * Existing tasks of every distinct move date other than date+1, keyed by that date.
   * A key must be present (possibly `[]`) for each such date, so the MIT limit can be
   * enforced there too.
   */
  otherTargets: Record<ISODate, Task[]>;
  reflection: Reflection;
}

export function closeDay(input: CloseDayInput, ctx: Ctx): Mutation & { dayLog: DayLog } {
  if (ritualRemaining(input.todayTasks, input.decisions) > 0) {
    throw new DomainError('undecided_tasks');
  }

  const nextDate = addDays(input.date, 1);
  const upserts = new Map<string, Task>();
  const deletes: string[] = [];
  const events: TaskEvent[] = [];
  const notices: Notice[] = [];
  /** Running picture of date+1, so the MIT limit is applied in the contract's order. */
  const tomorrow: Task[] = [...input.tomorrowExisting];
  /** The same running picture for every other move target, seeded from `otherTargets`. */
  const others = new Map<ISODate, Task[]>();

  /** The target day's tasks so far; throws when the caller did not supply that day. */
  const targetTasks = (date: ISODate): Task[] => {
    if (date === nextDate) return tomorrow;
    const seeded = others.get(date);
    if (seeded !== undefined) return seeded;
    const existing = input.otherTargets[date];
    if (existing === undefined) throw new DomainError('missing_target_day');
    const running = [...existing];
    others.set(date, running);
    return running;
  };

  const absorb = (m: Mutation) => {
    for (const t of m.upserts) upserts.set(t.id, t);
    deletes.push(...m.deletes);
    events.push(...m.events);
    notices.push(...m.notices);
  };

  for (const task of input.todayTasks) {
    if (task.status !== 'todo') continue;
    const decision = input.decisions[task.id];
    if (decision === undefined) continue;

    if (decision.kind === 'drop') {
      absorb(dropTask(task, ctx));
      continue;
    }

    const toTomorrow = decision.date === nextDate;
    const dayTasks = targetTasks(decision.date);
    // The MIT flag of the copy may be overridden in ritual step 2; the original keeps its own.
    const seed: Task = toTomorrow
      ? { ...task, mit: input.tomorrowMit[task.id] ?? task.mit }
      : task;
    const m = moveTask(seed, decision.date, { dayTasks }, ctx);
    const [moved, copy] = m.upserts;
    absorb({ ...m, upserts: [{ ...moved, mit: task.mit }, copy] });
    dayTasks.push(copy);
  }

  for (const parsed of input.tomorrowNew) {
    const m = createTask(parsed, { planDate: nextDate, dayTasks: tomorrow }, ctx);
    absorb(m);
    tomorrow.push(m.upserts[0]);
  }

  const todayAfter = input.todayTasks.map((t) => upserts.get(t.id) ?? t);
  const { pct, done, total } = completion(todayAfter);
  events.push(
    makeEvent(
      'day_closed',
      null,
      input.date,
      { pct, done, total, energy: input.reflection.energy },
      ctx,
    ),
  );

  const dayLog: DayLog = {
    planDate: input.date,
    closedAt: ctx.now.toISOString(),
    energy: input.reflection.energy,
    good: input.reflection.good.trim(),
    improve: input.reflection.improve.trim(),
  };

  return {
    upserts: [...upserts.values()],
    deletes,
    events,
    notices: [...new Set(notices)],
    dayLog,
  };
}
