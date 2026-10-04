'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { cn } from '@/lib/utils';

/**
 * react-day-picker restyled with the design tokens. Its own stylesheet is not
 * imported, so every class here is load-bearing: with `navLayout="around"` the
 * month element holds prev · caption · next · grid as siblings, which the
 * flex-wrap below lays out as one header row plus a full-width grid.
 */
function Chevron({
  orientation,
  className,
}: {
  orientation?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}) {
  const Icon = orientation === 'right' ? ChevronRight : ChevronLeft;
  return <Icon size={15} strokeWidth={2.75} className={className} aria-hidden />;
}

const NAV_BUTTON =
  'grid size-9 place-items-center rounded-full border-[1.5px] border-line bg-transparent text-ink ' +
  'hover:bg-hover aria-disabled:pointer-events-none aria-disabled:opacity-35';

function Calendar({
  className,
  classNames,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      weekStartsOn={1}
      navLayout="around"
      showOutsideDays
      className={cn('text-ink', className)}
      components={{ Chevron }}
      classNames={{
        root: 'flex flex-col gap-2.5',
        months: 'flex flex-col',
        month: 'flex flex-wrap items-center gap-2',
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        month_caption: 'flex flex-1 justify-center',
        caption_label: 'text-[14.5px] font-semibold',
        month_grid: 'mt-2.5 w-full basis-full border-separate border-spacing-0.5',
        weekdays: '',
        weekday: 'h-7 text-caption font-normal text-ink-3',
        week: '',
        day: 'p-0 text-center',
        day_button:
          'h-10 w-full cursor-pointer rounded-pill border-0 bg-transparent text-[14px] text-ink ' +
          'transition-colors duration-[120ms] ease-out hover:bg-hover',
        selected:
          '[&_button]:bg-accent [&_button]:font-semibold [&_button]:text-on-accent [&_button]:hover:bg-accent',
        today: '[&_button]:bg-accent-soft [&_button]:font-semibold [&_button]:text-accent-ink',
        outside: '[&_button]:text-ink-3 [&_button]:opacity-60',
        disabled:
          '[&_button]:pointer-events-none [&_button]:cursor-not-allowed [&_button]:opacity-35',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
