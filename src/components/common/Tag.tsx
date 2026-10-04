import { cn } from '@/lib/utils';

export type TagVariant =
  | 'mit'
  | 'important'
  | 'urgent'
  | 'adhoc'
  | 'warn'
  | 'success'
  | 'neutral'
  | 'phase2';

export interface TagProps {
  variant: TagVariant;
  children: React.ReactNode;
  className?: string;
}

/**
 * Padding and weight per variant follow the prototype: the outline chips
 * (important, urgent) and the warning chip are regular weight, the filled
 * ones are semibold.
 */
const VARIANTS: Record<TagVariant, string> = {
  mit: 'bg-accent-soft px-2.5 py-1 font-semibold text-accent-ink',
  important: 'border-[1.5px] border-line px-[9px] py-1 text-ink-2',
  urgent: 'border-[1.5px] border-dashed border-ink-3 px-[9px] py-1 text-ink-2',
  adhoc: 'bg-line-2 px-2.5 py-1 font-semibold text-ink-3',
  warn: 'bg-accent-soft px-[9px] py-1 text-accent-ink',
  success: 'bg-success-soft px-2.5 py-[3px] font-semibold text-success-ink',
  neutral: 'bg-line-2 px-2.5 py-1 font-semibold text-ink-2',
  phase2: 'bg-accent px-2.5 py-1 font-semibold text-on-accent',
};

/** The small pills from design/handoff/components.md: MIT, important, urgent, adhoc… */
export function Tag({ variant, children, className }: TagProps) {
  return (
    <span
      data-variant={variant}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-pill text-[12px] leading-none',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
