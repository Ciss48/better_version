import type { Decision, ISODate, ParsedTask, Reflection } from '@/domain';

/**
 * Everything the evening ritual has decided but not yet committed. Ticking a
 * task done is a fact and is applied immediately; the rest stays a draft until
 * "Hoàn tất & đóng ngày" (docs/plan.md §2, "Ritual state").
 *
 * The draft is kept in localStorage per day so "Để sau" / Esc can leave the
 * ritual and come back to it, and so a reload mid-ritual loses nothing.
 */
export interface RitualDraft {
  date: ISODate;
  /** 0–2 are the stepper's steps; 3 is the summary after a successful close. */
  step: 0 | 1 | 2 | 3;
  decisions: Record<string, Decision>;
  reflection: Reflection;
  /** MIT overrides for tasks carried to tomorrow, keyed by ORIGINAL task id. */
  tomorrowMit: Record<string, boolean>;
  tomorrowNew: { id: string; parsed: ParsedTask }[];
}

const PREFIX = 'bed:v1:ritual:';

export function draftKey(date: ISODate): string {
  return `${PREFIX}${date}`;
}

export function emptyDraft(date: ISODate): RitualDraft {
  return {
    date,
    step: 0,
    decisions: {},
    reflection: { energy: 0, good: '', improve: '' },
    tomorrowMit: {},
    tomorrowNew: [],
  };
}

/** Narrow enough to reject anything that is not a draft for `date`. */
function isDraft(value: unknown, date: ISODate): value is RitualDraft {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Partial<RitualDraft>;
  return (
    d.date === date &&
    typeof d.step === 'number' &&
    typeof d.decisions === 'object' &&
    d.decisions !== null &&
    typeof d.reflection === 'object' &&
    d.reflection !== null &&
    Array.isArray(d.tomorrowNew)
  );
}

/** The stored draft for `date`, or a fresh one. Never throws. */
export function loadDraft(date: ISODate): RitualDraft {
  if (typeof window === 'undefined') return emptyDraft(date);
  const raw = window.localStorage.getItem(draftKey(date));
  if (raw === null) return emptyDraft(date);
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isDraft(parsed, date)) throw new Error('shape');
    // A draft that was saved on the summary step has already been committed.
    return parsed.step === 3 ? { ...parsed, step: 2 } : parsed;
  } catch (error) {
    console.error(`[ritual] draft for ${date} is unusable — starting a new one.`, error);
    return emptyDraft(date);
  }
}

export function saveDraft(d: RitualDraft): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(draftKey(d.date), JSON.stringify(d));
}

export function clearDraft(date: ISODate): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(draftKey(date));
}
