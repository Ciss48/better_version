'use client';

import { Tag } from '@/components/common/Tag';
import { completion } from '@/domain';
import type { DayLog, HHMM, ISODate, Task } from '@/domain';
import { t } from '@/lib/copy';
import { formatDateLong, formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface DayDetailProps {
  date: ISODate;
  tasks: Task[];
  dayLog: DayLog | null;
  /** When the plan for this day was first written; `null` if there was none. */
  planTiming: { kind: 'evening' | 'morning'; time: HHMM } | null;
  mode: 'past' | 'today';
  onOpenToday?(): void;
  className?: string;
}

/** The ✓ / → / × marker in front of a task. */
function StatusIcon({ status }: { status: Task['status'] }) {
  const done = status === 'done';
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-[22px] shrink-0 place-items-center rounded-full text-[12px] font-bold leading-none',
        done
          ? 'bg-success text-on-accent'
          : 'bg-transparent shadow-[inset_0_0_0_2px_var(--line)]',
        status === 'moved' ? 'text-ink-2' : done ? '' : 'text-ink-3',
      )}
    >
      {done ? '✓' : status === 'moved' ? '→' : status === 'dropped' ? '×' : ''}
    </span>
  );
}

/**
 * A finished day, read-only. MITs first, then planned, then adhoc — the order
 * the design shows. The percentage comes from the domain's `completion`.
 */
export function DayDetail({
  date,
  tasks,
  dayLog,
  planTiming,
  mode,
  onOpenToday,
  className,
}: DayDetailProps) {
  const planned = tasks.filter((task) => !task.adhoc);
  const { pct } = completion(tasks);
  const hasPlan = planned.length > 0;
  const good = dayLog?.good.trim() ?? '';
  const improve = dayLog?.improve.trim() ?? '';
  const hasReflection = good !== '' || improve !== '';

  const sorted = [...tasks].sort(
    (a, b) => Number(b.mit) - Number(a.mit) || Number(a.adhoc) - Number(b.adhoc),
  );

  return (
    <section
      className={cn(
        'flex flex-col gap-[18px] rounded-panel bg-paper p-[22px] shadow-[inset_0_0_0_2px_var(--line-2)]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex flex-col gap-1">
          <span className="font-display text-[24px] leading-[1.15]">{formatDateLong(date)}</span>
          {planTiming === null ? null : (
            <span className="text-caption text-ink-3">
              {t(
                planTiming.kind === 'evening'
                  ? 'history.planAtEvening'
                  : 'history.planAtMorning',
                { time: planTiming.time },
              )}
              {' · '}
              {t('history.plannedCount', { n: planned.length })}
            </span>
          )}
        </div>
        <Tag variant="neutral" className="font-semibold">
          {t('history.readOnly')}
        </Tag>
      </div>

      {mode === 'today' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile bg-surface px-[18px] py-4">
          <span className="text-ink-2">{t('history.today')}</span>
          <button
            type="button"
            onClick={onOpenToday}
            className="h-10 rounded-pill border-0 bg-accent px-[18px] font-semibold text-on-accent"
          >
            {t('history.todayCta')}
          </button>
        </div>
      ) : !hasPlan ? (
        <p className="text-pretty rounded-tile border-2 border-dashed border-line px-5 py-[18px] text-ink-2">
          {t('history.noPlan')}
        </p>
      ) : (
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-4">
            <span className="font-num text-[48px] leading-[0.9]">
              {pct}
              <span className="text-[0.45em] text-ink-3">%</span>
            </span>
            <div
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2.5 flex-1 overflow-hidden rounded-pill bg-line-2"
            >
              <div className="h-full rounded-pill bg-success" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {sorted.map((task) => (
              <div key={task.id} className="flex items-start gap-3 px-1 py-2">
                <StatusIcon status={task.status} />
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span
                    className={cn(
                      'text-[15px] leading-[1.4]',
                      task.status === 'done'
                        ? 'text-ink'
                        : task.status === 'dropped'
                          ? 'text-ink-3'
                          : 'text-ink-2',
                    )}
                  >
                    {task.title}
                  </span>
                  {task.mit ? <Tag variant="mit">{t('common.mit')}</Tag> : null}
                  {task.adhoc ? <Tag variant="adhoc">{t('common.adhoc')}</Tag> : null}
                  {task.status === 'moved' && task.movedTo !== null ? (
                    <span className="text-[12px] italic text-ink-3">
                      {t('history.movedTo', { date: formatDateShort(task.movedTo) })}
                    </span>
                  ) : null}
                  {task.status === 'dropped' ? (
                    <span className="text-[12px] italic text-ink-3">{t('history.dropped')}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 rounded-tile bg-surface px-[18px] py-4">
            <div className="flex items-center justify-between gap-2.5">
              <b className="font-semibold">{t('history.reflection.title')}</b>
              <span className="text-caption text-ink-2">
                {t('history.reflection.energy', {
                  n: dayLog === null || dayLog.energy === 0 ? '—' : dayLog.energy,
                })}
              </span>
            </div>
            {hasReflection ? (
              <div className="flex flex-col gap-2 text-[14.5px] leading-[1.45]">
                {good === '' ? null : (
                  <p>
                    <span className="font-semibold text-success-ink">
                      {t('history.reflection.good')}
                    </span>
                    {good}
                  </p>
                )}
                {improve === '' ? null : (
                  <p>
                    <span className="font-semibold text-accent-ink">
                      {t('history.reflection.improve')}
                    </span>
                    {improve}
                  </p>
                )}
              </div>
            ) : (
              <span className="text-body-sm text-ink-3">{t('history.noReflection')}</span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
