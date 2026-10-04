'use client';

import { RadioGroup, RadioItem } from '@/components/ui/radio-group';
import type { HHMM } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface DayEndChipsProps {
  value: HHMM;
  onChange(v: HHMM): void;
  /**
   * How 00:00 reads. Onboarding explains the idea, so it says "Nửa đêm";
   * Settings lists times, so there it is just another time.
   */
  midnightLabel?: 'word' | 'time';
  className?: string;
}

/** 00:00 … 05:00, whole hours — the range `validateSettings` accepts. */
const OPTIONS: HHMM[] = ['00:00', '01:00', '02:00', '03:00', '04:00', '05:00'];

export const DAY_END_CHIP =
  'inline-flex h-11 items-center rounded-pill border-2 px-4 text-body-sm font-medium ' +
  'transition-colors duration-[150ms]';

export function dayEndChipClasses(selected: boolean): string {
  return cn(
    DAY_END_CHIP,
    selected
      ? 'border-ink bg-ink text-bg'
      : 'border-line bg-transparent text-ink-2 hover:bg-hover',
  );
}

/** The day-end picker, shared by Settings and onboarding step 3. */
export function DayEndChips({
  value,
  onChange,
  midnightLabel = 'word',
  className,
}: DayEndChipsProps) {
  return (
    <RadioGroup
      aria-label={t('settings.dayEnd.title')}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
      className={cn('gap-1.5', className)}
    >
      {OPTIONS.map((option) => (
        <RadioItem
          key={option}
          value={option}
          className={dayEndChipClasses(option === value)}
        >
          {option === '00:00' && midnightLabel === 'word'
            ? t('onboarding.step3.midnight')
            : option}
        </RadioItem>
      ))}
    </RadioGroup>
  );
}
