import { Tag } from '@/components/common/Tag';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface MITSectionProps {
  /** Active MITs — the "{n}/3 MIT" counter. */
  count: number;
  children?: React.ReactNode;
  className?: string;
}

/** The `surface` card holding today's most important tasks. */
export function MITSection({ count, children, className }: MITSectionProps) {
  const empty = children === undefined || children === null || children === false;

  return (
    <section
      className={cn('flex flex-col gap-0.5 rounded-panel bg-surface px-2.5 pb-2.5 pt-5', className)}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 pb-2.5">
        <h2 className="font-display text-display-sm tracking-[-0.01em]">{t('today.mit.title')}</h2>
        <Tag variant="mit">{t('today.mit.count', { n: count })}</Tag>
      </div>
      {empty ? (
        <p className="px-3.5 pb-3 pt-1.5 text-body-sm text-ink-3">{t('today.mit.empty')}</p>
      ) : (
        children
      )}
    </section>
  );
}
