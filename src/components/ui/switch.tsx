'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from '@/lib/utils';

/**
 * Base UI switch at the design's 54×32 with a 26px thumb. The track turns
 * `success` when on; the thumb slides with `justify-content`, like the
 * prototype (motion.md §6: 200ms track colour + thumb).
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'inline-flex h-8 w-[54px] shrink-0 items-center justify-start rounded-pill border-0 p-[3px]',
        'bg-line outline-none transition-colors duration-200',
        'data-checked:justify-end data-checked:bg-success',
        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[26px] rounded-full bg-paper shadow-sm"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
