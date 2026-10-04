import type { Size } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface SizeBadgeProps {
  size: Size | null;
  className?: string;
}

/** The round S/M/L badge on the right of a task row. `null` renders nothing. */
export function SizeBadge({ size, className }: SizeBadgeProps) {
  if (size === null) return null;
  return (
    <span
      title={t('common.size')}
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full bg-line-2 text-micro font-bold text-ink-3',
        className,
      )}
    >
      {size}
    </span>
  );
}
