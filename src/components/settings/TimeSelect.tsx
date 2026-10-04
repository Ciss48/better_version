'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HHMM } from '@/domain';
import { cn } from '@/lib/utils';

export interface TimeSelectProps {
  value: HHMM;
  options: { value: HHMM; label: string }[];
  onChange(v: HHMM): void;
  ariaLabel: string;
  className?: string;
}

/**
 * The 46px pill select used for the window, lock and reminder times. The
 * options are labelled by the caller — only it knows whether 18:00 belongs to
 * the previous day or the same one.
 */
export function TimeSelect({ value, options, onChange, ariaLabel, className }: TimeSelectProps) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (typeof next === 'string') onChange(next);
      }}
    >
      <SelectTrigger aria-label={ariaLabel} className={cn(className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
