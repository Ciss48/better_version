import { cn } from '@/lib/utils';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

/** A keyboard hint, as in the sidebar shortcut list and the ritual CTA. */
export function Kbd({ children, className }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center rounded-sm bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-2',
        className,
      )}
    >
      {children}
    </kbd>
  );
}
