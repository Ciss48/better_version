'use client';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange(v: T): void;
  ariaLabel: string;
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * Pill segmented control on `line-2`; the active segment is `paper` with
 * `shadow-sm`. Base UI's toggle group carries a `string[]` value even in
 * single mode, and lets the pressed item be un-pressed — a segmented control
 * must always keep one selected, so an empty change is ignored.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  size = 'md',
  className,
}: SegmentedProps<T>) {
  return (
    <ToggleGroup
      aria-label={ariaLabel}
      value={[value]}
      onValueChange={(groupValue) => {
        const next = groupValue[0] as T | undefined;
        if (next !== undefined && next !== value) onChange(next);
      }}
      className={cn(size === 'sm' && 'gap-0 p-0.5', className)}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={size === 'md' ? 'h-[42px] text-[13.5px]' : 'h-8 px-3 text-caption'}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
