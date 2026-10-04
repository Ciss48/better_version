import { cn } from '@/lib/utils';

export interface OnboardingDotsProps {
  step: 0 | 1 | 2;
  className?: string;
}

/**
 * Three progress dots; the current one stretches 10 → 34px over 300ms
 * (motion.md §6). Decorative — the step kicker carries the text.
 */
export function OnboardingDots({ step, className }: OnboardingDotsProps) {
  return (
    <div aria-hidden className={cn('flex gap-1.5', className)}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            'h-2.5 rounded-pill transition-all duration-[300ms]',
            index === step ? 'w-[34px]' : 'w-2.5',
            index <= step ? 'bg-accent' : 'bg-line',
          )}
        />
      ))}
    </div>
  );
}
