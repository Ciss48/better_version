import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface Phase2NoticeProps {
  /** Replaces the default notice line when a screen needs its own wording. */
  children?: React.ReactNode;
  className?: string;
}

/** The dashed banner that opens every Phase 2 placeholder screen. */
export function Phase2Notice({ children, className }: Phase2NoticeProps) {
  return (
    <div
      role="note"
      className={cn(
        'flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-card border-2 border-dashed border-accent px-[18px] py-3.5',
        className,
      )}
    >
      <span className="rounded-pill bg-accent px-3 py-1 text-[12px] font-bold uppercase tracking-[0.06em] text-on-accent">
        {t('phase2.tag')}
      </span>
      <span className="text-[13.5px] text-ink-2">{children ?? t('phase2.notice')}</span>
    </div>
  );
}
