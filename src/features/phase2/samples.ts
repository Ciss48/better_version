import samples from '@/content/phase2-samples.vi.json';

/**
 * The illustration data behind the two Phase 2 previews. It lives in
 * `src/content/` for the same reason copy does: no screen hard-codes
 * Vietnamese, not even make-believe Vietnamese.
 */

export type GoalTone = 'success' | 'accent' | 'heat';

export interface GoalSample {
  tone: GoalTone;
  horizon: string;
  title: string;
  metric: string;
  pct: number;
  focus: string;
  linked: number;
  linkedDone: number;
  /** Placeholder of the (disabled) "next week" field on the weekly preview. */
  next: string;
}

export interface WeeklySample {
  from: string;
  to: string;
  avg: string;
  planned: string;
  mit: string;
  days: { weekday: number; pct: number | null }[];
}

export const GOALS = samples.goals as GoalSample[];
export const WEEKLY = samples.weekly as WeeklySample;

/** The dot / bar / fill colour of a sample goal. */
export const TONE_FILL: Record<GoalTone, string> = {
  success: 'bg-success',
  accent: 'bg-accent',
  heat: 'bg-heat-4',
};
