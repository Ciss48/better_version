'use client';

import { dayEndChipClasses } from '@/components/settings/DayEndChips';
import { RadioGroup, RadioItem } from '@/components/ui/radio-group';
import type { HHMM } from '@/domain';
import { cn } from '@/lib/utils';

export interface TimeChipsProps {
  options: HHMM[];
  value: HHMM;
  onChange(v: HHMM): void;
  ariaLabel: string;
  className?: string;
}

/** Onboarding step 2: the reminder-time chips. Same pill as DayEndChips. */
export function TimeChips({ options, value, onChange, ariaLabel, className }: TimeChipsProps) {
  return (
    <RadioGroup
      aria-label={ariaLabel}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
      className={cn('gap-1.5', className)}
    >
      {options.map((option) => (
        <RadioItem
          key={option}
          value={option}
          className={cn(dayEndChipClasses(option === value), 'px-[18px] text-[14.5px]')}
        >
          {option}
        </RadioItem>
      ))}
    </RadioGroup>
  );
}
