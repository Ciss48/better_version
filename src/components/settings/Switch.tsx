'use client';

import { Switch as SwitchPrimitive } from '@/components/ui/switch';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange(v: boolean): void;
  ariaLabel: string;
  className?: string;
}

/** The 54×32 settings toggle; `success` when on, never a colour of warning. */
export function Switch({ checked, onCheckedChange, ariaLabel, className }: SwitchProps) {
  return (
    <SwitchPrimitive
      aria-label={ariaLabel}
      checked={checked}
      onCheckedChange={(next) => onCheckedChange(next)}
      className={className}
    />
  );
}
