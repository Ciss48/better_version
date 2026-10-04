'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TaskCheckboxProps {
  checked: boolean;
  disabled?: boolean;
  onToggle(): void;
  /** Accessible name — the task title. */
  label: string;
  size?: 24 | 18;
  className?: string;
}

/**
 * The round task checkbox. Ticking pops the circle and draws the tick
 * (motion.md §1); un-ticking reverses without the pop.
 */
export function TaskCheckbox({
  checked,
  disabled = false,
  onToggle,
  label,
  size = 24,
  className,
}: TaskCheckboxProps) {
  const [popping, setPopping] = useState(false);
  const wasChecked = useRef(checked);

  useEffect(() => {
    if (checked && !wasChecked.current) {
      setPopping(true);
      const timer = window.setTimeout(() => setPopping(false), 560);
      wasChecked.current = checked;
      return () => window.clearTimeout(timer);
    }
    wasChecked.current = checked;
  }, [checked]);

  const box = size === 24 ? 'size-6' : 'size-[18px]';
  const tick = size === 24 ? 13 : 10;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'grid shrink-0 place-items-center rounded-full border-2 bg-transparent',
        'transition-[background-color,border-color] duration-200 ease-out',
        box,
        checked ? 'border-success bg-success' : 'border-ink-3',
        disabled && 'cursor-not-allowed border-line opacity-45',
        popping && 'animate-tick-pop',
        className,
      )}
    >
      <svg width={tick} height={tick} viewBox="0 0 24 24" className="block" aria-hidden>
        <path
          d="M20 6 9 17l-5-5"
          fill="none"
          stroke="var(--on-accent)"
          strokeWidth="3.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="24"
          strokeDashoffset={checked ? 0 : 24}
          className="transition-[stroke-dashoffset] delay-[60ms] duration-[320ms] ease-out"
        />
      </svg>
    </button>
  );
}
