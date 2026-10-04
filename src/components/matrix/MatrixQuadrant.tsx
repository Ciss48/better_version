'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Tag } from '@/components/common/Tag';
import { TaskCheckbox } from '@/components/today/TaskCheckbox';
import type { Quadrant, Task } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface MatrixQuadrantProps {
  quadrant: Quadrant;
  tasks: Task[];
  isDropTarget: boolean;
  interaction: 'drag' | 'tap';
  onTapTask?(id: string): void;
  onToggleDone(id: string): void;
  /** Set while this task is being dragged, so its chip fades to .4. */
  draggingId?: string | null;
}

export const QUADRANT_TITLE = {
  q1: 'today.matrix.q1.title',
  q2: 'today.matrix.q2.title',
  q3: 'today.matrix.q3.title',
  q4: 'today.matrix.q4.title',
} satisfies Record<Quadrant, CopyKey>;

export const QUADRANT_SUB = {
  q1: 'today.matrix.q1.sub',
  q2: 'today.matrix.q2.sub',
  q3: 'today.matrix.q3.sub',
  q4: 'today.matrix.q4.sub',
} satisfies Record<Quadrant, CopyKey>;

const QUADRANT_FILL: Record<Quadrant, string> = {
  q1: 'bg-matrix-q1',
  q2: 'bg-matrix-q2',
  q3: 'bg-matrix-q3',
  q4: 'bg-matrix-q4',
};

function MatrixChip({
  task,
  interaction,
  onTapTask,
  onToggleDone,
  dragging,
}: {
  task: Task;
  interaction: 'drag' | 'tap';
  onTapTask?(id: string): void;
  onToggleDone(id: string): void;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
    disabled: interaction === 'tap',
  });

  const isDone = task.status === 'done';

  return (
    <div
      ref={setNodeRef}
      {...(interaction === 'drag' ? { ...attributes, ...listeners } : {})}
      className={cn(
        'flex items-center gap-2.5 rounded-row bg-paper px-3 py-2.5 shadow-sm',
        'transition-opacity duration-[150ms]',
        interaction === 'drag' ? 'cursor-grab' : 'cursor-pointer',
        dragging && 'opacity-40',
      )}
    >
      <TaskCheckbox
        checked={isDone}
        size={18}
        label={task.title}
        onToggle={() => onToggleDone(task.id)}
      />
      {interaction === 'tap' ? (
        <button
          type="button"
          onClick={() => onTapTask?.(task.id)}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-left text-body-sm leading-[1.35]',
            isDone ? 'text-ink-3 line-through' : 'text-ink',
          )}
        >
          {task.title}
        </button>
      ) : (
        <span
          className={cn(
            'min-w-0 flex-1 text-body-sm leading-[1.35]',
            isDone ? 'text-ink-3 line-through' : 'text-ink',
          )}
        >
          {task.title}
        </span>
      )}
      {task.mit ? (
        <span className="shrink-0 text-[10.5px] font-bold text-accent-ink">{t('common.mit')}</span>
      ) : null}
      {task.adhoc ? (
        <span className="shrink-0 text-[10.5px] font-semibold text-ink-3">
          {t('today.matrix.adhocTag')}
        </span>
      ) : null}
    </div>
  );
}

/** One quadrant of the Eisenhower board: a drop target holding task chips. */
export function MatrixQuadrant({
  quadrant,
  tasks,
  isDropTarget,
  interaction,
  onTapTask,
  onToggleDone,
  draggingId,
}: MatrixQuadrantProps) {
  const { setNodeRef } = useDroppable({ id: quadrant, disabled: interaction === 'tap' });

  return (
    <div
      ref={setNodeRef}
      data-quadrant={quadrant}
      className={cn(
        'flex min-h-[210px] flex-col gap-2.5 rounded-card px-3.5 pb-3.5 pt-[18px]',
        'transition-[background-color,box-shadow] duration-[150ms]',
        isDropTarget
          ? 'bg-matrix-drop shadow-[inset_0_0_0_2px_var(--matrix-drop-ring)]'
          : QUADRANT_FILL[quadrant],
      )}
    >
      <div className="flex items-start justify-between gap-2.5 px-1.5">
        <div className="flex flex-col gap-0.5">
          <span className="font-display text-display-xs">{t(QUADRANT_TITLE[quadrant])}</span>
          <span className="text-[12.5px] text-ink-3">{t(QUADRANT_SUB[quadrant])}</span>
        </div>
        <span className="font-num text-[22px] leading-none text-ink-3">{tasks.length}</span>
      </div>

      {quadrant === 'q2' ? (
        <Tag variant="success" className="ml-1.5 self-start text-[11.5px] leading-none">
          {t('today.matrix.q2.note')}
        </Tag>
      ) : null}

      <div className="flex flex-col gap-1.5">
        {tasks.map((task) => (
          <MatrixChip
            key={task.id}
            task={task}
            interaction={interaction}
            onTapTask={onTapTask}
            onToggleDone={onToggleDone}
            dragging={draggingId === task.id}
          />
        ))}
        {tasks.length === 0 ? (
          <p className="rounded-row border-[1.5px] border-dashed border-line px-2 py-3.5 text-center text-caption text-ink-3">
            {t('today.matrix.dropHere')}
          </p>
        ) : null}
      </div>
    </div>
  );
}
