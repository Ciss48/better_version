'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Base UI select, restyled with the project tokens. Added by the shadcn CLI and
 * then rewritten: the generated file used shadcn's own aliases, including the
 * `--accent` highlight that clashes with the token terracotta (see
 * memory/discoveries.md). Highlight and hover are `bg-hover` here.
 *
 * Structure is Base UI's: Root → Trigger → Portal → Positioner → Popup → List.
 * Placement props live on the Positioner, never on the popup.
 */

const Select = SelectPrimitive.Root;

function SelectTrigger({ className, children, ...props }: SelectPrimitive.Trigger.Props) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex h-[46px] w-full items-center justify-between gap-2 rounded-pill border-2 border-line',
        'bg-paper px-4 text-left text-[14.5px] text-ink outline-none select-none',
        'transition-colors duration-[150ms] hover:bg-hover',
        'data-disabled:cursor-not-allowed data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-ink-3" />}
      />
    </SelectPrimitive.Trigger>
  );
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn('flex-1 truncate', className)}
      {...props}
    />
  );
}

function SelectContent({
  className,
  children,
  side = 'bottom',
  sideOffset = 6,
  align = 'start',
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, 'align' | 'side' | 'sideOffset'>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignItemWithTrigger={false}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          className={cn(
            'max-h-(--available-height) min-w-(--anchor-width) overflow-y-auto rounded-card',
            'bg-paper p-1.5 text-ink shadow-lg outline-none',
            'origin-(--transform-origin) transition-[opacity,transform] duration-[180ms]',
            '[transition-timing-function:var(--ease-out-soft)]',
            'data-starting-style:scale-[.97] data-starting-style:opacity-0',
            'data-ending-style:scale-[.97] data-ending-style:opacity-0',
            className,
          )}
          {...props}
        >
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-pill py-2 pl-3.5 pr-8',
        'text-body text-ink-2 outline-none transition-colors duration-[150ms]',
        'data-highlighted:bg-hover data-highlighted:text-ink',
        'data-selected:font-semibold data-selected:text-ink',
        'data-disabled:pointer-events-none data-disabled:opacity-45',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex-1">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-3 grid place-items-center" />}
      >
        <CheckIcon className="size-4 text-accent" strokeWidth={2.75} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue };
