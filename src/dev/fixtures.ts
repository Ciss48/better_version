import type { ISODate, Task } from '@/domain';

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
};
