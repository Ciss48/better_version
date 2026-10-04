'use client';

import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface StepperProps {
  steps: string[];
  current: 0 | 1 | 2;
  /** Only called for steps before the current one. */
  onStepClick(i: number): void;
  className?: string;
}

/**
 * The three-step ritual progress bar. A completed step's bar is `success`, the
 * current one `accent`, future ones `line` (motion.md §2: 300ms colour).
 * Earlier steps are clickable; later ones are inert.
 */
export function Stepper({ steps, current, onStepClick, className }: StepperProps) {
  return (
    <ol aria-label={t('ritual.stepperAria')} className={cn('flex list-none gap-2 p-0', className)}>
      {steps.map((label, index) => {
        const done = index < current;
        const isCurrent = index === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? 'step' : undefined}
            className="flex flex-1 flex-col gap-2"
          >
            <button
              type="button"
              disabled={!done}
              onClick={() => onStepClick(index)}
              className={cn(
                'flex flex-col gap-2 border-0 bg-transparent p-0 text-left',
                done ? 'cursor-pointer' : 'cursor-default disabled:opacity-100',
              )}
            >
              <span
                className={cn(
                  'h-1.5 rounded-pill transition-colors duration-[300ms]',
                  done ? 'bg-success' : isCurrent ? 'bg-accent' : 'bg-line',
                )}
              />
              <span
                className={cn(
                  'flex items-center gap-2 text-caption font-medium',
                  isCurrent ? 'text-ink' : 'text-ink-3',
                )}
              >
                <span className="font-num">{index + 1}</span>
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
