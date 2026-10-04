'use client';

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { cn } from '@/lib/utils';

/**
 * Base UI radio group, kept deliberately unstyled. The project's radio groups
 * are chips, cards and 52px circles rather than dots, so each consumer supplies
 * its own classes; this wrapper exists for the roving focus, arrow-key
 * navigation and `role="radiogroup"` / `aria-checked` wiring.
 *
 * The shadcn CLI's generated version was replaced: it hard-wired a 16px dot and
 * shadcn's `--accent` highlight, which is terracotta in this project.
 */
function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn('flex flex-wrap gap-1.5', className)}
      {...props}
    />
  );
}

function RadioItem({ className, ...props }: RadioPrimitive.Root.Props) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-item"
      className={cn('border-0 bg-transparent p-0 outline-none', className)}
      {...props}
    />
  );
}

export { RadioGroup, RadioItem };
