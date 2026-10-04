import type { Quadrant, Size, Task } from './types';

const SIZE_WEIGHT: Record<Size, number> = { S: 1, M: 2, L: 3 };

/** S1 · M2 · null→2 · L3; doubled for a MIT. */
export function taskWeight(t: Task): number {
  const base = t.size === null ? 2 : SIZE_WEIGHT[t.size];
  return t.mit ? base * 2 : base;
}

/** A task counts toward the day's percentage: planned (not adhoc) and not dropped. */
function isConsidered(t: Task): boolean {
  return !t.adhoc && t.status !== 'dropped';
}

/**
 * Weighted completion of a day. Only planned, non-dropped tasks count; moved = not done.
 * `done`/`total` are counts of considered tasks (for "3/5 việc đã định").
 */
export function completion(tasks: Task[]): { pct: number; done: number; total: number } {
  const considered = tasks.filter(isConsidered);
  let weightTotal = 0;
  let weightDone = 0;
  let done = 0;
  for (const t of considered) {
    const w = taskWeight(t);
    weightTotal += w;
    if (t.status === 'done') {
      weightDone += w;
      done += 1;
    }
  }
  const pct = weightTotal === 0 ? 0 : Math.round((100 * weightDone) / weightTotal);
  return { pct, done, total: considered.length };
}

export function quadrantOf(t: Pick<Task, 'important' | 'urgent'>): Quadrant {
  if (t.important && t.urgent) return 'q1';
  if (t.important) return 'q2';
  if (t.urgent) return 'q3';
  return 'q4';
}

export function flagsForQuadrant(q: Quadrant): { important: boolean; urgent: boolean } {
  switch (q) {
    case 'q1':
      return { important: true, urgent: true };
    case 'q2':
      return { important: true, urgent: false };
    case 'q3':
      return { important: false, urgent: true };
    case 'q4':
      return { important: false, urgent: false };
  }
}
