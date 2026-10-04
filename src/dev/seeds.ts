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
/**
 * How much history the `demo` family carries before the anchor. It matches the
 * store's own past window, so the 26-week heat map and the 26-week weekday
 * chart are both full rather than half grey.
 */
const HISTORY_DAYS = 190;
const HISTORY_FROM: ISODate = addDays(SEED_ANCHOR, -HISTORY_DAYS);
const YESTERDAY: ISODate = addDays(SEED_ANCHOR, -1);

export const SEED_NAMES = [
  'new',
  'demo',
  'empty',
  'missed',
  'complete',
  'latenight',
  'sparse',
] as const;
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

const ADHOC_TITLES = [
  'Sửa lỗi dashboard doanh thu cho chị Hạnh',
  'Họp đột xuất với team data',
  'Mua quà sinh nhật Minh',
];

const SIZES = ['S', 'M', 'L'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** The onboarded user the `demo` family describes. */
function onboardedSettings(patch: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    onboardedAt: `${HISTORY_FROM}T13:00:00.000Z`,
    ...patch,
  };
}

/** 20:00 local on the day before — the evening habit. */
function eveningPlannedAt(date: ISODate): string {
  return `${addDays(date, -1)}T13:00:00.000Z`;
}

/** Between 08:00 and 09:59 local on the day itself, before the 10:00 lock. */
function morningPlannedAt(date: ISODate, seed: number): string {
  const hour = 1 + Math.floor(noise(seed) * 2);
  const minute = Math.floor(noise(seed + 1) * 60);
  return `${date}T${pad2(hour)}:${pad2(minute)}:00.000Z`;
}

/**
 * One historical day.
 *
 * The numbers are deterministic noise, but they are not independent noise: the
 * Journey screen's four insights are all *comparisons*, so the seed has to
 * carry the correlations they look for, or `?seed=demo` would show an empty
 * insight card.
 *
 * - two days in three are planned the evening before, and those days go better
 *   → the "evening" insight;
 * - the two MITs of a day are likelier to get done than the rest → "mit";
 * - the day log's energy tracks how the day went → "energy";
 * - the weekday insight falls out of the first one on its own.
 *
 * Unfinished work is spread over moved / dropped / untouched rather than all
 * being dropped: a day where everything was dropped reads as 100%, which would
 * make every historical day look perfect.
 *
 * A `moved` task here does **not** get a copy on its target day — a seed is a
 * picture of the past, and the copy would hand a day that is supposed to have
 * no plan one anyway. Moving for real is exercised on the anchor day.
 */
function historyDay(
  date: ISODate,
  options: { force?: boolean } = {},
): { tasks: Task[]; dayLog: DayLog | null } {
  const seed = dateSeed(date);
  if (options.force !== true && noise(seed) <= 0.17) return { tasks: [], dayLog: null };

  const eveningPlan = noise(seed + 11) > 0.35;
  const target = (eveningPlan ? 0.52 : 0.38) + noise(seed + 2) * 0.34;
  const createdAt = eveningPlan
    ? eveningPlannedAt(date)
    : morningPlannedAt(date, seed + 17);

  const count = 4 + Math.floor(noise(seed + 1) * 3);
  const tasks: Task[] = [];

  for (let i = 0; i < count; i += 1) {
    const r = noise(seed * 13 + i);
    const mit = i < 2;
    const done = noise(seed * 29 + i * 7) < (mit ? Math.min(0.97, target + 0.14) : target);
    const fate = noise(seed * 37 + i * 3);
    const status: Task['status'] = done
      ? 'done'
      : fate < 0.5
        ? 'moved'
        : fate < 0.75
          ? 'dropped'
          : 'todo';

    tasks.push({
      id: `s-${date}-${i}`,
      planDate: date,
      title: HISTORY_TITLES[(seed + i * 5) % HISTORY_TITLES.length],
      important: r > 0.35,
      urgent: noise(seed * 7 + i) > 0.65,
      mit,
      size: SIZES[Math.floor(r * 3)],
      status,
      postponedCount: 0,
      adhoc: false,
      position: i,
      createdAt,
      completedAt: done ? `${date}T05:00:00.000Z` : null,
      movedTo: status === 'moved' ? addDays(date, 1) : null,
      originTaskId: null,
    });
  }

  // Roughly every third day, something lands after the lock.
  if (noise(seed + 23) > 0.66) {
    const adhocDone = noise(seed + 29) > 0.3;
    tasks.push({
      id: `s-${date}-adhoc`,
      planDate: date,
      title: ADHOC_TITLES[seed % ADHOC_TITLES.length],
      important: false,
      urgent: true,
      mit: false,
      size: 'M',
      status: adhocDone ? 'done' : 'todo',
      postponedCount: 0,
      adhoc: true,
      position: count,
      createdAt: `${date}T07:30:00.000Z`,
      completedAt: adhocDone ? `${date}T09:00:00.000Z` : null,
      movedTo: null,
      originTaskId: null,
    });
  }

  const dayLog: DayLog = {
    planDate: date,
    closedAt: `${date}T14:30:00.000Z`,
    energy: (target > 0.74 ? 5 : target > 0.64 ? 4 : target > 0.52 ? 3 : target > 0.44 ? 2 : 1) as DayLog['energy'],
    good: GOOD_LINES[Math.floor(noise(seed + 4) * GOOD_LINES.length)],
    improve: IMPROVE_LINES[Math.floor(noise(seed + 5) * IMPROVE_LINES.length)],
  };

  return { tasks, dayLog };
}

/** Everything before the anchor: 190 days, a few of them without a plan. */
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

/** The `sparse` user: four planned days in a row, the last one yesterday. */
function sparseHistory(): { tasks: Task[]; dayLogs: DayLog[] } {
  const tasks: Task[] = [];
  const dayLogs: DayLog[] = [];

  for (let ago = 4; ago >= 1; ago -= 1) {
    const day = historyDay(addDays(SEED_ANCHOR, -ago), { force: true });
    tasks.push(...day.tasks);
    if (day.dayLog !== null) dayLogs.push(day.dayLog);
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

  if (name === 'sparse') {
    const past = sparseHistory();
    return {
      settings: onboardedSettings({
        onboardedAt: `${addDays(SEED_ANCHOR, -4)}T13:00:00.000Z`,
      }),
      tasks: past.tasks,
      dayLogs: past.dayLogs,
    };
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
