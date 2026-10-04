'use client';

import { Tag } from '@/components/common/Tag';
import { DatePickerChips } from '@/components/date/DatePickerChips';
import { TaskCheckbox } from '@/components/today/TaskCheckbox';
import type { Decision, Task } from '@/domain';
import { useClock } from '@/lib/clock';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface ReviewRowProps {
  task: Task;
  decision?: Decision;
  onToggleDone(): void;
  onDecide(d: Decision | undefined): void;
  className?: string;
}

/**
 * One row of ritual step 1. A done task needs no decision, so its chips are
 * gone; an undecided one sits on `surface`, a decided one on `line-2`.
 * The nudge appears from the third postponement — unless the task is being
 * dropped, in which case the user already made the harder choice.
 */
export function ReviewRow({
  task,
  decision,
  onToggleDone,
  onDecide,
  className,
}: ReviewRowProps) {
  const { today } = useClock();
  const done = task.status === 'done';
  const needsDecision = !done;
  const showNudge = needsDecision && task.postponedCount >= 3 && decision?.kind !== 'drop';

  return (
    <div
      data-decided={decision !== undefined}
      className={cn(
        'flex flex-col gap-2.5 rounded-tile px-3.5 py-3 transition-colors duration-200',
        done ? 'bg-success-soft' : decision === undefined ? 'bg-surface' : 'bg-line-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
        <TaskCheckbox checked={done} onToggle={onToggleDone} label={task.title} />

        <div className="flex min-w-0 flex-[1_1_200px] flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className={cn('text-body-lg', done ? 'text-ink-2' : 'text-ink')}>
            {task.title}
          </span>
          {task.mit ? <Tag variant="mit">{t('common.mit')}</Tag> : null}
          {task.adhoc ? <Tag variant="adhoc">{t('common.adhoc')}</Tag> : null}
        </div>

        {needsDecision ? (
          <DatePickerChips
            today={today}
            value={decision}
            onChange={onDecide}
            allowDrop
            taskTitle={task.title}
          />
        ) : null}
      </div>

      {showNudge ? (
        <p className="ml-9 rounded-row bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-[1.45] text-pretty text-accent-ink">
          {t('ritual.step1.nudge', { n: task.postponedCount })}
        </p>
      ) : null}
    </div>
  );
}
