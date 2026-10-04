import { addDays, DEFAULT_SETTINGS } from '@/domain';
import type { DayLog, ISODate, Settings, Task } from '@/domain';
import type { SeedData } from '@/data';
import { HISTORY_DAY_LOG, historyTasks, sampleTasks } from './fixtures';

/**
 * Dev-only datasets behind `?seed=<name>`, so every state in
 * design/handoff/screens.md can be reproduced for a screenshot or an e2e run.
 *
 * Everything is generated relative to the **seed anchor** 2026-10-03 — the
 * design's "today", a Saturday — and is fully deterministic, so two runs with
 * the same seed produce byte-identical screenshots.
 *
 * Like `fixtures.ts` this file lives under `src/dev/`, the only place in the
 * app allowed to hard-code Vietnamese: it is sample data, not UI copy, and it
 * never reaches a production bundle (see `DevParams.tsx`).
 */

export const SEED_ANCHOR: ISODate = '2026-10-03';
/** How much history the `demo` family carries before the anchor. */
const HISTORY_DAYS = 45;
const HISTORY_FROM: ISODate = addDays(SEED_ANCHOR, -HISTORY_DAYS);
const YESTERDAY: ISODate = addDays(SEED_ANCHOR, -1);

export const SEED_NAMES = ['new', 'demo', 'empty', 'missed', 'complete', 'latenight'] as const;
export type SeedName = (typeof SEED_NAMES)[number];

export function isSeedName(value: string): value is SeedName {
  return (SEED_NAMES as readonly string[]).includes(value);
}

/** Deterministic pseudo-random in [0, 1) — same shape as fixtures.ts. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** A stable integer per date, so a date always generates the same day. */
function dateSeed(date: ISODate): number {
  return Number(date.slice(0, 4)) * 10_000 + Number(date.slice(5, 7)) * 100 + Number(date.slice(8, 10));
}

const HISTORY_TITLES = [
  'Học 1 chương Databricks',
  'Đọc 20 trang sách',
  'Chạy bộ 5km quanh hồ',
  'Gửi báo cáo tuần',
  'Tối ưu truy vấn ClickHouse',
  'Dọn hộp thư, trả lời email tồn',
  'Gọi điện cho bố mẹ',
  'Chuẩn bị slide sprint review',
  'Viết blog về tối ưu Spark',
  'Review thiết kế kho dữ liệu',
  'Đi chợ cho cả tuần',
  'Dọn bàn làm việc',
];

const GOOD_LINES = [
  'Vẫn chạy bộ dù trời mưa',
  'Ngủ đủ 7 tiếng',
  'Bắt đầu việc khó trước 9 giờ',
  '',
];

const IMPROVE_LINES = [
  'Nghỉ 5 phút sau mỗi 50 phút',
  'Không mở điện thoại trước khi làm MIT',
  '',
];

const SIZES = ['S', 'M', 'L'] as const;

/** The onboarded user the `demo` family describes. */
function onboardedSettings(patch: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    onboardedAt: `${HISTORY_FROM}T13:00:00.000Z`,
    ...patch,
  };
}

/** A day written the evening before, as the evening habit does. */
function plannedAt(date: ISODate): string {
  return `${addDays(date, -1)}T13:00:00.000Z`;
}

/**
 * One historical day: 4–6 planned tasks, the first two of them MITs, and a
 * deterministic share of them done; the rest were dropped in that evening's
 * ritual. Returns no tasks at all for a day with no plan.
 *
 * Deliberately no `moved` tasks: a move creates a copy on another day, which
 * would give a day that is supposed to have no plan one anyway. The anchor day
 * and the ritual flow exercise moving instead.
 */
function historyDay(date: ISODate): { tasks: Task[]; dayLog: DayLog | null } {
  const seed = dateSeed(date);
  if (noise(seed) <= 0.14) return { tasks: [], dayLog: null };

  const count = 4 + Math.floor(noise(seed + 1) * 3);
  const target = 0.3 + noise(seed + 2) * 0.68;
  const tasks: Task[] = [];

  for (let i = 0; i < count; i += 1) {
    const r = noise(seed * 13 + i);
    const done = noise(seed * 29 + i * 7) < target;
    tasks.push({
      id: `s-${date}-${i}`,
      planDate: date,
      title: HISTORY_TITLES[(seed + i * 5) % HISTORY_TITLES.length],
      important: r > 0.35,
      urgent: noise(seed * 7 + i) > 0.65,
      mit: i < 2,
      size: SIZES[Math.floor(r * 3)],
      status: done ? 'done' : 'dropped',
      postponedCount: 0,
      adhoc: false,
      position: i,
      createdAt: plannedAt(date),
      completedAt: done ? `${date}T05:00:00.000Z` : null,
      movedTo: null,
      originTaskId: null,
    });
  }

  const dayLog: DayLog = {
    planDate: date,
    closedAt: `${date}T14:30:00.000Z`,
    energy: (1 + Math.floor(noise(seed + 3) * 5)) as DayLog['energy'],
    good: GOOD_LINES[Math.floor(noise(seed + 4) * GOOD_LINES.length)],
    improve: IMPROVE_LINES[Math.floor(noise(seed + 5) * IMPROVE_LINES.length)],
  };

  return { tasks, dayLog };
}

/** Everything before the anchor: 45 days, a few of them without a plan. */
function history(options: { includeYesterday: boolean }): { tasks: Task[]; dayLogs: DayLog[] } {
  const tasks: Task[] = [];
  const dayLogs: DayLog[] = [];

  for (let date = HISTORY_FROM; date < YESTERDAY; date = addDays(date, 1)) {
    const day = historyDay(date);
    tasks.push(...day.tasks);
    if (day.dayLog !== null) dayLogs.push(day.dayLog);
  }

  if (options.includeYesterday) {
    // Yesterday is the day History and the missed-day banner lean on, so it
    // uses the hand-written fixture rather than generated noise.
    tasks.push(...historyTasks());
    dayLogs.push(HISTORY_DAY_LOG);
  }

  return { tasks, dayLogs };
}

/** The anchor day's plan, straight from the Today playground fixtures. */
function todayTasks(): Task[] {
  return sampleTasks();
}

function allDone(tasks: Task[]): Task[] {
  return tasks.map((task) =>
    task.adhoc || task.status === 'done'
      ? task
      : { ...task, status: 'done', completedAt: `${SEED_ANCHOR}T09:00:00.000Z` },
  );
}

export function buildSeed(name: SeedName): SeedData {
  if (name === 'new') {
    return { settings: null, tasks: [], dayLogs: [] };
  }

  const past = history({ includeYesterday: name !== 'missed' });
  const settings = onboardedSettings(name === 'latenight' ? { dayEnd: '03:00' } : {});

  const today =
    name === 'empty' || name === 'missed'
      ? []
      : name === 'complete'
        ? allDone(todayTasks())
        : todayTasks();

  return {
    settings,
    tasks: [...past.tasks, ...today],
    dayLogs: past.dayLogs,
  };
}
