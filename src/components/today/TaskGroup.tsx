import { Tag } from '@/components/common/Tag';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface TaskGroupProps {
  variant: 'default' | 'adhoc';
  title: string;
  doneCount?: number;
  totalCount?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * A list section. The `adhoc` variant is the dashed "added after the lock"
 * group — deliberately non-punitive: no red, no warning icon.
 */
export function TaskGroup({
  variant,
  title,
  doneCount,
  totalCount,
  children,
  className,
}: TaskGroupProps) {
  if (variant === 'adhoc') {
    return (
      <section
        className={cn(
          'flex flex-col gap-0.5 rounded-panel border-2 border-dashed border-line px-2.5 pb-2 pt-4',
          className,
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 px-3.5 pb-2">
          <Tag variant="neutral">{title}</Tag>
          {doneCount === undefined || totalCount === undefined ? null : (
            <span className="text-caption text-ink-3">
              {t('today.adhoc.note', { done: doneCount, total: totalCount })}
            </span>
          )}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className={cn('flex flex-col gap-0.5', className)}>
      <div className="flex items-baseline gap-2.5 px-3 pb-2">
        <h3 className="font-sans text-caption font-semibold uppercase tracking-[0.08em] text-ink-3">
          {title}
        </h3>
        {totalCount === undefined ? null : (
          <span className="text-caption text-ink-3">{totalCount}</span>
        )}
      </div>
      {children}
    </section>
  );
}
