import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  body?: React.ReactNode;
  variant?: 'dashed' | 'soft';
  className?: string;
}

/** A Today with no plan, an empty tomorrow, an empty matrix quadrant, a blank day. */
export function EmptyState({ title, body, variant = 'dashed', className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 rounded-card px-7 py-8',
        variant === 'dashed' ? 'border-2 border-dashed border-line' : 'bg-surface',
        className,
      )}
    >
      <p className="font-display text-display-sm text-ink">{title}</p>
      {body === undefined ? null : (
        <p className="max-w-[460px] text-pretty text-ink-2">{body}</p>
      )}
    </div>
  );
}
