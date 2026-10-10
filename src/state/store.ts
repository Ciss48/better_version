'use client';

import { create } from 'zustand';
import {
  addDays,
  closeDay as closeDayDomain,
  completion,
  createTask,
  DEFAULT_SETTINGS,
  DomainError,
  dropTask as dropTaskDomain,
  flagsForQuadrant,
  logicalDate,
  moveTask as moveTaskDomain,
  patchTask as patchTaskDomain,
  restoreTask as restoreTaskDomain,
  settingsForHabit,
  toggleDone as toggleDoneDomain,
  validateSettings,
} from '@/domain';
import type {
  CloseDayInput,
  Ctx,
  DayLog,
  ISODate,
  Mutation,
  ParsedTask,
  Quadrant,
  Settings,
  Task,
} from '@/domain';
import { applyMutation, getRepository } from '@/data';
import type { DateRange, Repository } from '@/data';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { formatDateShort } from '@/lib/format';
import { noticeKey, showToast } from '@/lib/toast';
import { getNow } from './clock-source';
import { clearDraft } from './ritual-draft';
import { tasksOn } from './selectors';
import { storageKey } from './storage-namespace';
import { applyTheme } from './theme-bridge';

export type { RitualDraft } from './ritual-draft';
import type { RitualDraft } from './ritual-draft';

/** How much history and future the app keeps in memory around `today`. */
const PAST_DAYS = 190;
const FUTURE_DAYS = 30;

export type TodayViewMode = 'list' | 'matrix';

interface UiPrefs {
  todayView: TodayViewMode;
  planReminderDismissedOn: ISODate | null;
}

const DEFAULT_UI: UiPrefs = { todayView: 'list', planReminderDismissedOn: null };

/** An empty range: every date is outside it, so `ensureLoaded` always loads. */
const NOTHING_LOADED: DateRange = { from: '9999-12-31', to: '0000-01-01' };

const QUADRANT_TITLE = {
  q1: 'today.matrix.q1.title',
  q2: 'today.matrix.q2.title',
  q3: 'today.matrix.q3.title',
  q4: 'today.matrix.q4.title',
} satisfies Record<Quadrant, CopyKey>;

/** The two Today preferences that should survive a reload. */
function loadUiPrefs(): UiPrefs {
  if (typeof window === 'undefined') return DEFAULT_UI;
  const raw = window.localStorage.getItem(storageKey('ui'));
  if (raw === null) return DEFAULT_UI;
  try {
    const parsed = JSON.parse(raw) as Partial<UiPrefs>;
    return {
      todayView: parsed.todayView === 'matrix' ? 'matrix' : 'list',
      planReminderDismissedOn:
        typeof parsed.planReminderDismissedOn === 'string'
          ? parsed.planReminderDismissedOn
          : null,
    };
  } catch (error) {
    console.error('[state] ui preferences are unreadable — using defaults.', error);
    return DEFAULT_UI;
  }
}

function saveUiPrefs(ui: UiPrefs): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey('ui'), JSON.stringify(ui));
}

export interface AppState {
  status: 'loading' | 'ready' | 'error';
  settings: Settings;
  /** Settings were saved **and** onboarding was finished. */
  onboarded: boolean;
  tasks: Record<string, Task>;
  dayLogs: Record<ISODate, DayLog>;
  loaded: DateRange;
  firstPlanDate: ISODate | null;
  ui: {
    todayView: TodayViewMode;
    expandedTaskId: string | null;
    planReminderDismissedOn: ISODate | null;
  };
  /** The result of the last successful close — what the ritual summary reads. */
  lastClose: { result: Mutation & { dayLog: DayLog }; date: ISODate } | null;

  init(): Promise<void>;
  ensureLoaded(dates: ISODate[]): Promise<void>;
  /** Every date of a 'YYYY-MM' month, for History's older months. */
  ensureMonthLoaded(month: string): Promise<void>;
  addTask(planDate: ISODate, p: ParsedTask, scope: 'today' | 'tomorrow'): Promise<void>;
  toggleDone(id: string): Promise<void>;
  patchTask(
    id: string,
    patch: Partial<Pick<Task, 'title' | 'important' | 'urgent' | 'mit' | 'size'>>,
  ): Promise<void>;
  setQuadrant(id: string, q: Quadrant): Promise<void>;
  moveTask(id: string, date: ISODate): Promise<void>;
  dropTask(id: string): Promise<void>;
  restoreTask(id: string): Promise<void>;
  closeDay(draft: RitualDraft): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  completeOnboarding(s: Settings): Promise<void>;
  dismissPlanReminder(today: ISODate): void;
  setTodayView(v: TodayViewMode): void;
  setExpanded(id: string | null): void;
  /** Supabase mode only: drops every loaded field back to the pre-`init()` state. */
  signOut(): void;
}

function byId(tasks: Task[]): Record<string, Task> {
  return Object.fromEntries(tasks.map((task) => [task.id, task]));
}

function byDate(logs: DayLog[]): Record<ISODate, DayLog> {
  return Object.fromEntries(logs.map((log) => [log.planDate, log]));
}

/**
 * Settings as the app can actually use them: anything stored that no longer
 * validates falls back field by field, so one bad value cannot lock the user
 * out of their own data.
 */
export function repairSettings(stored: Settings | null): {
  settings: Settings;
  problems: string[];
} {
  const base: Settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  if (typeof base.windowStart !== 'object' || base.windowStart === null) {
    base.windowStart = { ...DEFAULT_SETTINGS.windowStart };
  }
  const problems = validateSettings(base);
  if (problems.length === 0) return { settings: base, problems };

  let candidate = base;
  // A habit and a windowStart that disagree is the likeliest corruption, and
  // the habit is the field that carries the user's intent — so trust it.
  const byHabit = settingsForHabit(base, base.habit);
  if (validateSettings(byHabit).length < problems.length) candidate = byHabit;

  const fields: (keyof Settings)[] = [
    'habit',
    'windowStart',
    'lockTime',
    'dayEnd',
    'remindPlan',
    'remindRitual',
  ];
  for (const field of fields) {
    const current = validateSettings(candidate);
    if (current.length === 0) break;
    const trial = { ...candidate, [field]: DEFAULT_SETTINGS[field] } as Settings;
    if (validateSettings(trial).length < current.length) candidate = trial;
  }
  if (validateSettings(candidate).length > 0) {
    candidate = {
      ...DEFAULT_SETTINGS,
      timezone: base.timezone,
      theme: base.theme,
      remindOn: base.remindOn,
      onboardedAt: base.onboardedAt,
    };
  }
  return { settings: candidate, problems };
}

/** min(existing, the planDate of any planned task this mutation introduces). */
function mergeFirstPlanDate(current: ISODate | null, upserts: Task[]): ISODate | null {
  let next = current;
  for (const task of upserts) {
    if (task.adhoc) continue;
    if (next === null || task.planDate < next) next = task.planDate;
  }
  return next;
}

/** Runs a domain call, turning a `DomainError` into "nothing happened". */
function tryDomain<T>(label: string, fn: () => T): T | null {
  try {
    return fn();
  } catch (error) {
    if (error instanceof DomainError) {
      console.warn(`[domain] ${label} refused: ${error.code}`);
      return null;
    }
    throw error;
  }
}

interface Toast {
  key: CopyKey;
  vars?: Record<string, string | number>;
}

interface Outcome {
  mutation: Mutation;
  dayLog?: DayLog;
  /** How this action's `Notice`s should read. */
  notice: { action: 'add' | 'toggle'; scope: 'today' | 'tomorrow' };
  extra?: Toast[];
  /** `closeDay` says it its own way; it must not also shout "100%". */
  skipCompleteToast?: boolean;
}

/**
 * Creates a store. The app uses the singleton below; tests create their own
 * against a `MemoryRepository`, which is also how Phase 7 can test the Supabase
 * repository against the same actions.
 */
export function createAppStore(repo?: Repository) {
  const repository = (): Repository => repo ?? getRepository();

  return create<AppState>()((set, get) => {
    const ctx = (): Ctx => ({
      now: getNow(),
      settings: get().settings,
      newId: () => crypto.randomUUID(),
    });

    const today = (): ISODate => logicalDate(getNow(), get().settings);

    /**
     * Applies a mutation optimistically, persists it, and reverts everything on
     * a failed commit. Toasts only fire once the write has landed.
     */
    const perform = async (outcome: Outcome | null): Promise<boolean> => {
      if (outcome === null) return false;

      const before = get();
      const snapshot = {
        tasks: before.tasks,
        dayLogs: before.dayLogs,
        firstPlanDate: before.firstPlanDate,
      };
      const day = today();
      const pctBefore = completion(tasksOn(before.tasks, day)).pct;

      const tasks = { ...before.tasks };
      applyMutation(tasks, outcome.mutation);
      set({
        tasks,
        dayLogs:
          outcome.dayLog === undefined
            ? before.dayLogs
            : { ...before.dayLogs, [outcome.dayLog.planDate]: outcome.dayLog },
        firstPlanDate: mergeFirstPlanDate(before.firstPlanDate, outcome.mutation.upserts),
      });

      try {
        await repository().commit(outcome.mutation, outcome.dayLog);
      } catch (error) {
        console.warn('[state] could not save — rolling back.', error);
        set(snapshot);
        showToast('common.saveError');
        return false;
      }

      for (const notice of outcome.mutation.notices) {
        showToast(noticeKey(notice, outcome.notice.action, outcome.notice.scope));
      }
      for (const toast of outcome.extra ?? []) showToast(toast.key, toast.vars);

      if (outcome.skipCompleteToast !== true) {
        const after = completion(tasksOn(get().tasks, day));
        if (after.total > 0 && after.pct === 100 && pctBefore !== 100) {
          showToast('today.toast.complete');
        }
      }
      return true;
    };

    /** 'tomorrow' for anything after today — that is how the notices read. */
    const scopeOf = (planDate: ISODate): 'today' | 'tomorrow' =>
      planDate > today() ? 'tomorrow' : 'today';

    const taskOr = (id: string): Task | null => {
      const task = get().tasks[id];
      if (task === undefined) {
        console.warn(`[state] unknown task ${id}`);
        return null;
      }
      return task;
    };

    const patch = async (
      id: string,
      value: Partial<Pick<Task, 'title' | 'important' | 'urgent' | 'mit' | 'size'>>,
      extra?: Toast[],
    ): Promise<void> => {
      const task = taskOr(id);
      if (task === null) return;
      const mutation = tryDomain('patchTask', () =>
        patchTaskDomain(task, value, tasksOn(get().tasks, task.planDate), ctx()),
      );
      if (mutation === null) return;
      // The MIT limit can refuse a patch outright: say so, write nothing.
      if (mutation.upserts.length === 0) {
        for (const notice of mutation.notices) {
          showToast(noticeKey(notice, 'toggle', scopeOf(task.planDate)));
        }
        return;
      }
      await perform({
        mutation,
        notice: { action: 'toggle', scope: scopeOf(task.planDate) },
        extra,
      });
    };

    return {
      status: 'loading',
      settings: DEFAULT_SETTINGS,
      onboarded: false,
      tasks: {},
      dayLogs: {},
      loaded: NOTHING_LOADED,
      firstPlanDate: null,
      ui: { todayView: 'list', expandedTaskId: null, planReminderDismissedOn: null },
      lastClose: null,

      async init() {
        try {
          const repo = repository();
          const stored = await repo.loadSettings();
          const { settings, problems } = repairSettings(stored);
          if (problems.length > 0) {
            console.warn('[state] stored settings were invalid, repaired:', problems);
          }

          const day = logicalDate(getNow(), settings);
          const loaded: DateRange = {
            from: addDays(day, -PAST_DAYS),
            to: addDays(day, FUTURE_DAYS),
          };
          const [tasks, dayLogs, firstPlanDate] = await Promise.all([
            repo.loadTasks(loaded),
            repo.loadDayLogs(loaded),
            repo.firstPlanDate(),
          ]);
          const prefs = loadUiPrefs();

          set({
            status: 'ready',
            settings,
            onboarded: stored !== null && typeof settings.onboardedAt === 'string',
            tasks: byId(tasks),
            dayLogs: byDate(dayLogs),
            loaded,
            firstPlanDate,
            ui: { ...prefs, expandedTaskId: null },
            lastClose: null,
          });
        } catch (error) {
          console.error('[state] init failed.', error);
          set({ status: 'error' });
        }
      },

      async ensureLoaded(dates) {
        const { loaded } = get();
        const missing = dates.filter((date) => date < loaded.from || date > loaded.to);
        if (missing.length === 0) return;

        const from = missing.reduce((min, d) => (d < min ? d : min), loaded.from);
        const to = missing.reduce((max, d) => (d > max ? d : max), loaded.to);
        const gaps: DateRange[] = [];
        if (from < loaded.from) gaps.push({ from, to: addDays(loaded.from, -1) });
        if (to > loaded.to) gaps.push({ from: addDays(loaded.to, 1), to });

        const repo = repository();
        const loadedGaps = await Promise.all(
          gaps.map(async (gap) => ({
            tasks: await repo.loadTasks(gap),
            dayLogs: await repo.loadDayLogs(gap),
          })),
        );

        const state = get();
        const tasks = { ...state.tasks };
        const dayLogs = { ...state.dayLogs };
        for (const gap of loadedGaps) {
          for (const task of gap.tasks) tasks[task.id] = task;
          for (const log of gap.dayLogs) dayLogs[log.planDate] = log;
        }
        set({ tasks, dayLogs, loaded: { from, to } });
      },

      async ensureMonthLoaded(month) {
        const year = Number(month.slice(0, 4));
        const index = Number(month.slice(5, 7));
        // Day 0 of the next month is the last day of this one.
        const days = new Date(Date.UTC(year, index, 0)).getUTCDate();
        const dates = Array.from(
          { length: days },
          (_, day) => `${month}-${String(day + 1).padStart(2, '0')}` as ISODate,
        );
        await get().ensureLoaded(dates);
      },

      async addTask(planDate, p, scope) {
        await get().ensureLoaded([planDate]);
        const mutation = tryDomain('createTask', () =>
          createTask(p, { planDate, dayTasks: tasksOn(get().tasks, planDate) }, ctx()),
        );
        if (mutation === null) return;
        await perform({ mutation, notice: { action: 'add', scope } });
      },

      async toggleDone(id) {
        const task = taskOr(id);
        if (task === null) return;
        const mutation = tryDomain('toggleDone', () => toggleDoneDomain(task, ctx()));
        if (mutation === null) return;
        await perform({
          mutation,
          notice: { action: 'toggle', scope: scopeOf(task.planDate) },
        });
      },

      async patchTask(id, value) {
        await patch(id, value);
      },

      async setQuadrant(id, q) {
        await patch(id, flagsForQuadrant(q), [
          { key: 'today.toast.quadrantMoved', vars: { quadrant: t(QUADRANT_TITLE[q]) } },
        ]);
      },

      async moveTask(id, date) {
        const task = taskOr(id);
        if (task === null) return;
        await get().ensureLoaded([date]);
        const mutation = tryDomain('moveTask', () =>
          moveTaskDomain(task, date, { dayTasks: tasksOn(get().tasks, date) }, ctx()),
        );
        if (mutation === null) return;
        await perform({
          mutation,
          notice: { action: 'toggle', scope: scopeOf(task.planDate) },
          extra: [{ key: 'today.toast.movedTo', vars: { date: formatDateShort(date) } }],
        });
      },

      async dropTask(id) {
        const task = taskOr(id);
        if (task === null) return;
        const mutation = tryDomain('dropTask', () => dropTaskDomain(task, ctx()));
        if (mutation === null) return;
        await perform({
          mutation,
          notice: { action: 'toggle', scope: scopeOf(task.planDate) },
        });
      },

      async restoreTask(id) {
        const task = taskOr(id);
        if (task === null) return;
        // `restoreTask` needs the copy a move created, which may sit on a day
        // outside the loaded window.
        if (task.status === 'moved' && task.movedTo !== null) {
          await get().ensureLoaded([task.movedTo]);
        }
        const state = get();
        const related = [
          ...tasksOn(state.tasks, task.planDate),
          ...(task.movedTo === null ? [] : tasksOn(state.tasks, task.movedTo)),
        ];
        const mutation = tryDomain('restoreTask', () =>
          restoreTaskDomain(task, related, ctx()),
        );
        if (mutation === null) return;
        await perform({
          mutation,
          notice: { action: 'toggle', scope: scopeOf(task.planDate) },
        });
      },

      async closeDay(draft) {
        const date = draft.date;
        const nextDate = addDays(date, 1);
        const moveDates = Object.values(draft.decisions)
          .filter((d) => d.kind === 'move')
          .map((d) => d.date);
        await get().ensureLoaded([nextDate, ...moveDates]);

        const state = get();
        const otherTargets: Record<ISODate, Task[]> = {};
        for (const target of moveDates) {
          if (target === nextDate) continue;
          otherTargets[target] = tasksOn(state.tasks, target);
        }

        const input: CloseDayInput = {
          date,
          todayTasks: tasksOn(state.tasks, date),
          decisions: draft.decisions,
          tomorrowExisting: tasksOn(state.tasks, nextDate),
          tomorrowMit: draft.tomorrowMit,
          tomorrowNew: draft.tomorrowNew.map((item) => item.parsed),
          otherTargets,
          reflection: draft.reflection,
        };

        const result = tryDomain('closeDay', () => closeDayDomain(input, ctx()));
        if (result === null) return;

        const saved = await perform({
          mutation: result,
          dayLog: result.dayLog,
          notice: { action: 'add', scope: 'tomorrow' },
          extra: [{ key: 'today.toast.dayClosed' }],
          skipCompleteToast: true,
        });
        if (!saved) return;

        set({ lastClose: { result, date } });
        clearDraft(date);
      },

      async updateSettings(value) {
        const current = get().settings;
        const merged =
          value.habit !== undefined && value.habit !== current.habit
            ? { ...settingsForHabit(current, value.habit), ...value, habit: value.habit }
            : { ...current, ...value };

        const problems = validateSettings(merged);
        if (problems.length > 0) {
          console.warn('[state] refusing invalid settings:', problems);
          return;
        }

        const previous = current;
        set({ settings: merged });
        try {
          await repository().saveSettings(merged);
        } catch (error) {
          console.warn('[state] could not save settings — rolling back.', error);
          set({ settings: previous });
          showToast('common.saveError');
          return;
        }
        if (merged.theme !== previous.theme) applyTheme(merged.theme);
      },

      async completeOnboarding(s) {
        const settings: Settings = { ...s, onboardedAt: getNow().toISOString() };
        const problems = validateSettings(settings);
        if (problems.length > 0) {
          console.warn('[state] onboarding produced invalid settings:', problems);
          return;
        }
        const previous = get().settings;
        set({ settings, onboarded: true });
        try {
          await repository().saveSettings(settings);
        } catch (error) {
          console.warn('[state] could not save onboarding — rolling back.', error);
          set({ settings: previous, onboarded: false });
          showToast('common.saveError');
          return;
        }
        applyTheme(settings.theme);
      },

      dismissPlanReminder(day) {
        const ui = { ...get().ui, planReminderDismissedOn: day };
        set({ ui });
        saveUiPrefs({ todayView: ui.todayView, planReminderDismissedOn: day });
      },

      setTodayView(v) {
        const ui = { ...get().ui, todayView: v };
        set({ ui });
        saveUiPrefs({ todayView: v, planReminderDismissedOn: ui.planReminderDismissedOn });
      },

      setExpanded(id) {
        set({ ui: { ...get().ui, expandedTaskId: id } });
      },

      signOut() {
        set({
          status: 'loading',
          settings: DEFAULT_SETTINGS,
          onboarded: false,
          tasks: {},
          dayLogs: {},
          loaded: NOTHING_LOADED,
          firstPlanDate: null,
          ui: { todayView: 'list', expandedTaskId: null, planReminderDismissedOn: null },
          lastClose: null,
        });
      },
    };
  });
}

/** The store the app runs on. */
export const useStore = createAppStore();
