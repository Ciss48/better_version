import { addDays, DEFAULT_SETTINGS, isoWeekday } from '@/domain';
import type { DayLog, DaySummary, ISODate, Task } from '@/domain';
import type { ClockValue } from '@/lib/clock';

/**
 * Sample data for /dev/components, copied from the titles and flags of
 * design/handoff/prototype/BedApp.dc.html so the gallery can be compared with
 * design/handoff/screenshots directly.
 *
 * Fixtures live here, outside src/components, which is why this is the only
 * place in the app with hard-coded Vietnamese.
 */

/** 14:10 Saturday in Asia/Ho_Chi_Minh — the plan for 10-03 locked at 10:00. */
export const PLAYGROUND_NOW = new Date('2026-10-03T07:10:00Z');
export const TODAY: ISODate = '2026-10-03';

/** The clock every /dev/components section is rendered with. */
export const GALLERY_CLOCK: ClockValue = {
  now: PLAYGROUND_NOW,
  today: TODAY,
  settings: DEFAULT_SETTINGS,
};

/** 21:30 Saturday — the ritual playground runs after the evening window opens. */
export const RITUAL_NOW = new Date('2026-10-03T14:30:00Z');
export const RITUAL_CLOCK: ClockValue = {
  now: RITUAL_NOW,
  today: TODAY,
  settings: DEFAULT_SETTINGS,
};

const BASE: Omit<Task, 'id' | 'title'> = {
  planDate: TODAY,
  important: false,
  urgent: false,
  mit: false,
  size: null,
  status: 'todo',
  postponedCount: 0,
  adhoc: false,
  position: 0,
  createdAt: '2026-10-02T11:00:00.000Z',
  completedAt: null,
  movedTo: null,
  originTaskId: null,
};

function task(id: string, title: string, overrides: Partial<Task> = {}): Task {
  return { ...BASE, id, title, ...overrides };
}

/** The ten sample tasks of the prototype's "normal" scenario, in plan order. */
export function sampleTasks(): Task[] {
  return [
    task('t1', 'Học 2 chương Databricks', {
      important: true,
      mit: true,
      size: 'L',
      status: 'done',
      completedAt: '2026-10-03T03:00:00.000Z',
      position: 0,
    }),
    task('t2', 'Hoàn thiện slide demo quý 4 cho buổi họp thứ Hai', {
      important: true,
      urgent: true,
      mit: true,
      size: 'L',
      postponedCount: 3,
      position: 1,
    }),
    task('t3', 'Chạy bộ 5km quanh hồ', {
      important: true,
      mit: true,
      size: 'M',
      status: 'done',
      completedAt: '2026-10-03T00:30:00.000Z',
      position: 2,
    }),
    task('t4', 'Gửi báo cáo tuần', {
      important: true,
      urgent: true,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-03T02:10:00.000Z',
      position: 3,
    }),
    task('t5', 'Đặt lịch khám răng', {
      urgent: true,
      size: 'S',
      postponedCount: 1,
      position: 4,
    }),
    task('t6', 'Đọc 20 trang "Atomic Habits"', { important: true, size: 'S', position: 5 }),
    task('t7', 'Dọn hộp thư, trả lời email tồn', {
      size: 'S',
      status: 'done',
      completedAt: '2026-10-03T04:00:00.000Z',
      position: 6,
    }),
    task('t8', 'Gọi điện cho mẹ', {
      important: true,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-03T05:00:00.000Z',
      position: 7,
    }),
    // adhoc: added at 14:10 and 17:30 local (UTC+7).
    task('t9', 'Sửa lỗi dashboard doanh thu cho chị Hạnh', {
      urgent: true,
      size: 'M',
      status: 'done',
      completedAt: '2026-10-03T08:00:00.000Z',
      adhoc: true,
      createdAt: '2026-10-03T07:10:00.000Z',
      position: 8,
    }),
    task('t10', 'Mua quà sinh nhật Minh', {
      size: 'S',
      adhoc: true,
      createdAt: '2026-10-03T10:30:00.000Z',
      position: 9,
    }),
  ];
}

/** Single-task fixtures for the task-item gallery row. */
export const TASK_STATES = {
  todo: task('g-todo', 'Đọc 20 trang "Atomic Habits"', { important: true, size: 'S' }),
  done: task('g-done', 'Gửi báo cáo tuần', {
    important: true,
    urgent: true,
    size: 'S',
    status: 'done',
    completedAt: '2026-10-03T02:10:00.000Z',
  }),
  expanded: task('g-expanded', 'Chạy bộ 5km quanh hồ', { important: true, mit: true, size: 'M' }),
  allFlags: task('g-flags', 'Hoàn thiện slide demo quý 4 cho buổi họp thứ Hai', {
    important: true,
    urgent: true,
    mit: true,
    size: 'L',
  }),
  adhoc: task('g-adhoc', 'Sửa lỗi dashboard doanh thu cho chị Hạnh', {
    urgent: true,
    size: 'M',
    adhoc: true,
    createdAt: '2026-10-03T07:10:00.000Z',
  }),
  postponed1: task('g-postponed1', 'Đặt lịch khám răng', {
    urgent: true,
    size: 'S',
    postponedCount: 1,
  }),
  postponed3: task('g-postponed3', 'Hoàn thiện slide demo quý 4', {
    important: true,
    urgent: true,
    size: 'L',
    postponedCount: 3,
  }),
  moved: task('g-moved', 'Mua quà sinh nhật Minh', {
    size: 'S',
    status: 'moved',
    movedTo: '2026-10-14',
  }),
  dropped: task('g-dropped', 'Dọn hộp thư, trả lời email tồn', { size: 'S', status: 'dropped' }),
} satisfies Record<string, Task>;

/** Four tasks, one per quadrant, for the matrix gallery row. */
export const MATRIX_TASKS: Task[] = [
  task('m1', 'Hoàn thiện slide demo quý 4', {
    important: true,
    urgent: true,
    mit: true,
    size: 'L',
  }),
  task('m2', 'Đọc 20 trang "Atomic Habits"', { important: true, size: 'S' }),
  task('m3', 'Sửa lỗi dashboard doanh thu cho chị Hạnh', {
    urgent: true,
    size: 'M',
    adhoc: true,
    createdAt: '2026-10-03T07:10:00.000Z',
  }),
  task('m4', 'Xem lại danh sách đọc', { size: 'S', status: 'done' }),
];

/** Three tasks in q1/q2/q3 only, so one quadrant stays empty. */
export const MATRIX_TASKS_WITH_EMPTY: Task[] = MATRIX_TASKS.slice(0, 3);

/**
 * Sample values the gallery feeds into components that take plain strings.
 * They live here so no Vietnamese is hard-coded under src/app or src/components.
 */
export const GALLERY_SAMPLES = {
  /** Tomorrow, as the plan-reminder banner would render it. */
  tomorrowLong: 'Chủ Nhật, 4/10',
  tomorrowWeekday: 'Chủ Nhật',
  /** Quick-add input showing every preview chip. */
  quickAdd: 'Học 2 chương Databricks * !^ ~L',
  /** Type specimen for /dev/tokens — needs the full Vietnamese diacritic set. */
  typeSpecimen: 'Tiến bộ 1% mỗi ngày — Việc quan trọng nhất',
  /** Ritual step 2, filled in. */
  reflectionGood: 'Vẫn chạy bộ dù trời mưa',
  reflectionImprove: 'Bắt đầu việc khó trước 9 giờ',
  /** Tomorrow's MITs, as the ritual summary lists them. */
  summaryMitTitles: [
    'Hoàn thiện slide demo quý 4 cho buổi họp thứ Hai',
    'Viết blog về tối ưu Spark',
  ],
};

/** Tomorrow's plan as ritual step 3 shows it: 2 carried, 1 typed, 2 of 3 MITs. */
export const TOMORROW_ITEMS = [
  {
    id: 'ti1',
    title: 'Hoàn thiện slide demo quý 4 cho buổi họp thứ Hai',
    mit: true,
    carried: true,
    postponedCount: 4,
    removable: false,
  },
  {
    id: 'ti2',
    title: 'Đọc 20 trang "Atomic Habits"',
    mit: false,
    carried: true,
    postponedCount: 0,
    removable: false,
  },
  {
    id: 'ti3',
    title: 'Viết blog về tối ưu Spark',
    mit: true,
    carried: false,
    postponedCount: 0,
    removable: true,
  },
];

// ── Phase 04 fixtures ───────────────────────────────────────────────────────

/** Deterministic pseudo-random in [0, 1) — the gallery must not move between runs. */
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** The Monday of `date`'s week. */
function mondayOf(date: ISODate): ISODate {
  return addDays(date, -(isoWeekday(date) - 1));
}

/** The user's first day in the app, well before the 26-week window. */
export const FIRST_USE: ISODate = '2026-04-27';

/**
 * One summary per day from the first column of a `weeks`-wide heatmap up to
 * TODAY, with realistic gaps: every seventh-ish day has no plan.
 */
export function statsDays(weeks: 26 | 13 = 26): DaySummary[] {
  const start = addDays(mondayOf(TODAY), -(weeks - 1) * 7);
  const days: DaySummary[] = [];
  for (let date = start; date <= TODAY; date = addDays(date, 1)) {
    const seed = Number(date.slice(5, 7)) * 100 + Number(date.slice(8, 10));
    const r = noise(seed);
    const hasPlan = date === TODAY || (date >= FIRST_USE && r > 0.14);
    days.push({
      date,
      hasPlan,
      pct: hasPlan ? Math.round(28 + noise(seed + 7) * 72) : 0,
      isToday: date === TODAY,
    });
  }
  return days;
}

/** A brand-new user: five days of history and nothing before them. */
export function newUserDays(): DaySummary[] {
  const first = addDays(TODAY, -4);
  return statsDays(13).map((day, index) =>
    day.date < first
      ? { ...day, hasPlan: false, pct: 0 }
      : { ...day, hasPlan: true, pct: day.hasPlan ? day.pct : 40 + index * 7 },
  );
}

export const NEW_USER_FIRST_USE: ISODate = addDays(TODAY, -4);

/** Average weighted completion per weekday, Mon=1 … Sun=7. */
export const WEEKDAY_VALUES: { weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; pct: number | null }[] = [
  { weekday: 1, pct: 73 },
  { weekday: 2, pct: 77 },
  { weekday: 3, pct: 72 },
  { weekday: 4, pct: 72 },
  { weekday: 5, pct: 66 },
  { weekday: 6, pct: 60 },
  { weekday: 7, pct: 56 },
];

export const WEEKDAY_EMPTY: { weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; pct: number | null }[] =
  WEEKDAY_VALUES.map((value) => ({ ...value, pct: null }));

/** The month shown by the History gallery section. */
export const HISTORY_MONTH = '2026-10';
export const HISTORY_SELECTED: ISODate = '2026-10-02';

/**
 * Day summaries for October 2026 up to today. The first two days are pinned to
 * the values the design screenshot shows, so the gallery can be compared to it.
 */
export function historyDays(): DaySummary[] {
  const pinned: Record<string, number> = { '2026-10-01': 84, '2026-10-02': 100 };
  return statsDays(26)
    .filter((day) => day.date.startsWith(HISTORY_MONTH))
    .map((day) =>
      pinned[day.date] === undefined
        ? day
        : { ...day, hasPlan: true, pct: pinned[day.date] },
    );
}

/** The plan of 2026-10-02 as History shows it: done, moved and dropped rows. */
export function historyTasks(): Task[] {
  const base: Partial<Task> = { planDate: HISTORY_SELECTED };
  return [
    task('h1', 'Học 1 chương Databricks', {
      ...base,
      important: true,
      mit: true,
      size: 'L',
      status: 'dropped',
      position: 0,
    }),
    task('h2', 'Đọc 20 trang sách', {
      ...base,
      important: true,
      mit: true,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-02T13:00:00.000Z',
      position: 1,
    }),
    task('h3', 'Gọi điện cho bố mẹ', {
      ...base,
      important: true,
      mit: true,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-02T12:00:00.000Z',
      position: 2,
    }),
    task('h4', 'Tối ưu truy vấn ClickHouse', {
      ...base,
      important: true,
      size: 'M',
      status: 'done',
      completedAt: '2026-10-02T09:00:00.000Z',
      position: 3,
    }),
    task('h5', 'Gửi báo cáo tuần', {
      ...base,
      urgent: true,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-02T04:00:00.000Z',
      position: 4,
    }),
    task('h6', 'Dọn hộp thư', { ...base, size: 'S', status: 'dropped', position: 5 }),
    task('h7', 'Chuẩn bị slide sprint review', {
      ...base,
      important: true,
      size: 'M',
      status: 'done',
      completedAt: '2026-10-02T07:30:00.000Z',
      position: 6,
    }),
    task('h8', 'Dọn bàn làm việc', {
      ...base,
      size: 'S',
      status: 'done',
      completedAt: '2026-10-02T11:00:00.000Z',
      position: 7,
    }),
  ];
}

/** A day whose plan was written but whose ritual was skipped. */
export function historyNoPlanTasks(): Task[] {
  return [];
}

export const HISTORY_DAY_LOG: DayLog = {
  planDate: HISTORY_SELECTED,
  closedAt: '2026-10-02T15:00:00.000Z',
  energy: 3,
  good: 'Ngủ đủ 7 tiếng',
  improve: 'Nghỉ 5 phút sau mỗi 50 phút',
};

/** Tomorrow already has one MIT before the ritual starts. */
export function tomorrowExisting(): Task[] {
  return [
    task('tm1', 'Viết blog về tối ưu Spark', {
      planDate: '2026-10-04',
      important: true,
      mit: true,
      size: 'M',
      createdAt: '2026-10-03T13:00:00.000Z',
      position: 0,
    }),
  ];
}

/** 2026-10-05 is already full of MITs; 2026-10-10 is empty. */
export function otherTargets(): Record<ISODate, Task[]> {
  const day: ISODate = '2026-10-05';
  return {
    [day]: [
      task('o1', 'Chuẩn bị báo cáo quý', {
        planDate: day,
        important: true,
        mit: true,
        size: 'L',
        position: 0,
      }),
      task('o2', 'Phỏng vấn ứng viên data', {
        planDate: day,
        important: true,
        mit: true,
        size: 'M',
        position: 1,
      }),
      task('o3', 'Review thiết kế kho dữ liệu', {
        planDate: day,
        important: true,
        mit: true,
        size: 'M',
        position: 2,
      }),
    ],
    '2026-10-10': [],
  };
}
