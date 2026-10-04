'use client';

import { addDays } from '@/domain';
import type { ISODate, Size, Task } from '@/domain';
import { DatePicker } from '@/components/date/DatePicker';
import { Tag } from '@/components/common/Tag';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/copy';
import { formatClock, formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SizeBadge } from './SizeBadge';
import { TaskCheckbox } from './TaskCheckbox';

export type TaskPatch = Partial<Pick<Task, 'important' | 'urgent' | 'mit' | 'size'>>;

export interface TaskItemProps {
  task: Task;
  today: ISODate;
  expanded: boolean;
  onToggleExpand(): void;
  onToggleDone(): void;
  onPatch(p: TaskPatch): void;
  onMove(date: ISODate): void;
  onDrop(): void;
  onRestore(): void;
  className?: string;
}

const SIZES: Size[] = ['S', 'M', 'L'];

const TOOLBAR_BUTTON =
  'inline-flex h-8 items-center rounded-pill border-[1.5px] px-3 text-[12.5px] font-medium ' +
  'transition-colors duration-[150ms]';

const GHOST_ACTION =
  'inline-flex h-8 items-center rounded-pill border-0 bg-transparent px-3 text-[12.5px] ' +
  'font-medium text-ink-2 transition-colors duration-[150ms] hover:bg-line-2';

function toggleClasses(active: boolean): string {
  return cn(
    TOOLBAR_BUTTON,
    active
      ? 'border-ink bg-ink text-bg'
      : 'border-line bg-transparent text-ink-2 hover:bg-hover',
  );
}

/**
 * One task row: checkbox, title, meta chips, size badge, and — when expanded —
 * a toolbar of flag toggles, a size control and the move/drop actions.
 * Every callback reports intent; the caller applies the domain function.
 */
export function TaskItem({
  task,
  today,
  expanded,
  onToggleExpand,
  onToggleDone,
  onPatch,
  onMove,
  onDrop,
  onRestore,
  className,
}: TaskItemProps) {
  const { settings } = useClock();
  const isDone = task.status === 'done';
  const isGone = task.status === 'moved' || task.status === 'dropped';
  const struck = isDone || task.status === 'dropped';
  const tickable = task.status === 'todo' || task.status === 'done';

  const showPostponed = task.postponedCount >= 1 && task.postponedCount <= 2;
  const showWarn = task.postponedCount >= 3;

  const statusText =
    task.status === 'moved' && task.movedTo !== null
      ? t('today.task.movedTo', { date: formatDateShort(task.movedTo) })
      : task.status === 'dropped'
        ? t('today.task.dropped')
        : null;

  const hasMeta =
    task.important ||
    task.urgent ||
    task.adhoc ||
    showPostponed ||
    showWarn ||
    statusText !== null;

  return (
    <div
      data-status={task.status}
      className={cn(
        'flex flex-col rounded-item transition-colors duration-[180ms] hover:bg-hover',
        expanded && 'bg-hover',
        className,
      )}
    >
      <div className="flex items-start gap-3 px-3 py-[11px]">
        <TaskCheckbox
          checked={isDone}
          disabled={!tickable}
          onToggle={onToggleDone}
          label={task.title}
        />

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 flex-col items-start gap-1.5 bg-transparent text-left"
        >
          <span
            className={cn(
              // The strike line is always drawn; only its colour transitions.
              'text-pretty text-body-lg line-through decoration-[1.5px]',
              'transition-[color,text-decoration-color] duration-300',
              isGone || isDone ? 'text-ink-3' : 'text-ink',
              struck ? 'decoration-ink-3' : 'decoration-transparent',
            )}
          >
            {task.title}
          </span>

          {hasMeta ? (
            <span className="flex flex-wrap items-center gap-1.5 text-micro leading-none">
              {task.important ? <Tag variant="important">{t('common.important')}</Tag> : null}
              {task.urgent ? <Tag variant="urgent">{t('common.urgent')}</Tag> : null}
              {task.adhoc ? (
                <span className="text-ink-3">
                  {t('today.task.addedAt', { time: formatClock(task.createdAt, settings.timezone) })}
                </span>
              ) : null}
              {showPostponed ? (
                <span className="text-ink-3">
                  {t('today.task.postponed', { n: task.postponedCount })}
                </span>
              ) : null}
              {showWarn ? (
                <Tag variant="warn">
                  {t('today.task.postponedWarn', { n: task.postponedCount })}
                </Tag>
              ) : null}
              {statusText === null ? null : (
                <span className="italic text-ink-3">{statusText}</span>
              )}
            </span>
          ) : null}
        </button>

        <SizeBadge size={task.size} />
      </div>

      {expanded ? (
        <div
          role="toolbar"
          aria-label={task.title}
          className="flex flex-wrap items-center gap-1.5 pb-3.5 pl-12 pr-3 duration-[150ms] animate-in fade-in"
        >
          {isGone ? (
            <button type="button" onClick={onRestore} className={GHOST_ACTION}>
              {t('today.task.toolbar.restore')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onPatch({ mit: !task.mit })}
                className={toggleClasses(task.mit)}
              >
                {t('today.task.toolbar.mit')}
              </button>
              <button
                type="button"
                onClick={() => onPatch({ important: !task.important })}
                className={toggleClasses(task.important)}
              >
                {t('today.task.toolbar.important')}
              </button>
              <button
                type="button"
                onClick={() => onPatch({ urgent: !task.urgent })}
                className={toggleClasses(task.urgent)}
              >
                {t('today.task.toolbar.urgent')}
              </button>

              <div
                role="group"
                aria-label={t('common.size')}
                className="flex overflow-hidden rounded-pill border-[1.5px] border-line"
              >
                {SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={task.size === size}
                    onClick={() => onPatch({ size: task.size === size ? null : size })}
                    className={cn(
                      'h-[29px] w-8 border-0 text-caption font-bold transition-colors duration-[150ms]',
                      task.size === size
                        ? 'bg-ink text-bg'
                        : 'bg-transparent text-ink-2 hover:bg-hover',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => onMove(addDays(today, 1))}
                className={GHOST_ACTION}
              >
                {t('today.task.toolbar.moveTomorrow')}
              </button>

              <DatePicker
                min={addDays(today, 1)}
                taskTitle={task.title}
                onSelect={onMove}
                trigger={
                  <button type="button" className={GHOST_ACTION}>
                    {t('today.task.toolbar.moveOther')}
                  </button>
                }
              />

              <button type="button" onClick={onDrop} className={GHOST_ACTION}>
                {t('today.task.toolbar.drop')}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
