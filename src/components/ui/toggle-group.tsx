'use client';

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cn } from '@/lib/utils';

/**
 * Base UI toggle group. Two API differences from Radix: the value is a
 * `string[]` (even in single mode) and single select is `multiple={false}`
 * rather than `type="single"`.
 */
function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive>) {
  return (
    <ToggleGroupPrimitive
      data-slot="toggle-group"
      className={cn('inline-flex items-center gap-0.5 rounded-pill bg-line-2 p-1', className)}
      {...props}
    />
  );
}

function ToggleGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof TogglePrimitive>) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex items-center justify-center gap-[7px] rounded-pill border-0 bg-transparent',
        'px-3.5 font-medium text-ink-2 select-none transition-colors duration-[150ms] ease-out',
        'hover:not-data-pressed:bg-hover',
        'data-pressed:bg-paper data-pressed:text-ink data-pressed:shadow-sm',
        'data-disabled:pointer-events-none data-disabled:opacity-45',
        className,
      )}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
