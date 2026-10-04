'use client';

import { Star, X } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { Tag } from '@/components/common/Tag';
import { TaskInput } from '@/components/today/TaskInput';
import type { ParsedTask } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface TomorrowItem {
  id: string;
  title: string;
  mit: boolean;
  /** Moved here from today during step 1. */
  carried: boolean;
  postponedCount: number;
  /** Only items typed in step 3 can be taken off again. */
  removable: boolean;
}

export interface TomorrowPlanListProps {
  items: TomorrowItem[];
  onToggleMit(id: string): void;
  onRemove(id: string): void;
  onAdd(p: ParsedTask): void;
  className?: string;
}

/** Ritual step 3: tomorrow's plan, its MIT counter and the quick-add field. */
export function TomorrowPlanList({
  items,
  onToggleMit,
  onRemove,
  onAdd,
  className,
}: TomorrowPlanListProps) {
  const mitCount = items.filter((item) => item.mit).length;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-body-sm text-ink-2">{t('ritual.step3.count', { n: items.length })}</span>
        <Tag variant="mit" className="px-2.5 py-1">
          {t('ritual.step3.mitCount', { n: mitCount })}
        </Tag>
      </div>

      <div className="flex flex-col gap-1.5">
        {items.length === 0 ? (
          <EmptyState title={t('ritual.step3.empty')} className="px-[18px] py-4" />
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-tile bg-surface py-2.5 pl-2 pr-2.5"
            >
              <button
                type="button"
                aria-label={t('common.mit')}
                aria-pressed={item.mit}
                onClick={() => onToggleMit(item.id)}
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full border-0',
                  'transition-colors duration-200',
                  item.mit ? 'bg-accent text-on-accent' : 'bg-paper text-ink-3',
                )}
              >
                <Star
                  size={17}
                  strokeWidth={2.4}
                  fill={item.mit ? 'currentColor' : 'none'}
                  aria-hidden
                />
              </button>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
                <span className="text-body-lg">{item.title}</span>
                {item.carried ? <Tag variant="neutral">{t('ritual.step3.carried')}</Tag> : null}
                {item.carried && item.postponedCount >= 3 ? (
                  <Tag variant="warn" className="whitespace-nowrap font-semibold">
                    {t('ritual.step3.carriedWarn', { n: item.postponedCount })}
                  </Tag>
                ) : null}
              </div>

              {item.removable ? (
                <button
                  type="button"
                  aria-label={t('common.remove')}
                  onClick={() => onRemove(item.id)}
                  className="grid size-8 shrink-0 place-items-center rounded-full border-0 bg-transparent text-ink-3 transition-colors duration-[150ms] hover:bg-hover"
                >
                  <X size={15} strokeWidth={2.75} aria-hidden />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <TaskInput locked={false} scope="tomorrow" onAdd={onAdd} />
    </div>
  );
}
