'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from '@/lib/utils';

/**
 * Base UI popover, restyled with the design tokens.
 *
 * Base UI splits what Radix calls `Content` into `Positioner` (placement) and
 * `Popup` (the box), so `align`/`side`/`sideOffset` go on the positioner.
 * Motion follows design/handoff/motion.md §4.
 */
function Popover(props: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive.Positioner>,
    'align' | 'side' | 'sideOffset' | 'alignOffset' | 'collisionPadding'
  >;

function PopoverContent({
  className,
  align = 'start',
  side = 'bottom',
  sideOffset = 8,
  alignOffset,
  collisionPadding = 12,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        collisionPadding={collisionPadding}
        className="z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            'origin-[var(--transform-origin)] rounded-card bg-paper p-3.5 text-ink shadow-lg outline-none',
            'transition-[opacity,transform] [transition-duration:180ms,280ms] [transition-timing-function:var(--ease-out-soft)]',
            'data-starting-style:-translate-y-1.5 data-starting-style:scale-[0.97] data-starting-style:opacity-0',
            'data-ending-style:scale-[0.97] data-ending-style:opacity-0 data-ending-style:[transition-duration:120ms]',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverContent, PopoverTrigger };
