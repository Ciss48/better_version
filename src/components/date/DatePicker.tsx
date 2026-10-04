'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ISODate } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatDateShort, formatMonth } from '@/lib/format';
import { useIsDesktop } from '@/lib/hooks/use-media';

export interface DatePickerProps {
  /** The element the picker hangs off — a chip or a toolbar button. */
  trigger: React.ReactElement;
  /** Earliest selectable day, usually `addDays(today, 1)`. */
  min: ISODate;
  selected?: ISODate;
  /** Shown as the sheet's subtitle. */
  taskTitle?: string;
  onSelect(date: ISODate): void;
  open?: boolean;
  onOpenChange?(open: boolean): void;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 'YYYY-MM-DD' → a Date at local noon, so no timezone can shift the day. */
function toDate(date: ISODate): Date {
  return new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 12);
}

function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** The calendar itself, shared by the popover and the sheet. */
function PickerCalendar({
  min,
  selected,
  onSelect,
}: {
  min: ISODate;
  selected?: ISODate;
  onSelect(date: ISODate): void;
}) {
  const minDate = toDate(min);
  const weekdays = tRaw<string[]>('date.weekdayShort');
  // The "today" cell is the injected logical day, not the machine's clock.
  const { today } = useClock();

  return (
    <Calendar
      mode="single"
      autoFocus
      today={toDate(today)}
      selected={selected === undefined ? undefined : toDate(selected)}
      defaultMonth={toDate(selected ?? min)}
      startMonth={new Date(minDate.getFullYear(), minDate.getMonth(), 1)}
      disabled={{ before: minDate }}
      onSelect={(day) => {
        if (day !== undefined) onSelect(toISODate(day));
      }}
      formatters={{
        // The header cells are already in T2…CN order; each one just needs its
        // Vietnamese short name (copy indexes CN=0 … T7=6).
        formatWeekdayName: (day) => weekdays[day.getDay()],
        formatCaption: (month) => formatMonth(`${month.getFullYear()}-${pad2(month.getMonth() + 1)}`),
      }}
      labels={{
        labelPrevious: () => t('datePicker.prevMonth'),
        labelNext: () => t('datePicker.nextMonth'),
      }}
    />
  );
}

/**
 * Picks a day for a move. Desktop gets a popover that commits on click; below
 * the `app:` breakpoint a bottom sheet selects first and commits with its own
 * button (design/handoff/components.md → DatePicker).
 */
export function DatePicker({
  trigger,
  min,
  selected,
  taskTitle,
  onSelect,
  open,
  onOpenChange,
}: DatePickerProps) {
  const isDesktop = useIsDesktop();
  const [draft, setDraft] = useState<ISODate | undefined>(selected);

  // Until the media query resolves, render the trigger alone: neither branch
  // can be chosen on the server, and the popup is closed anyway.
  if (isDesktop === undefined) return trigger;

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger render={trigger} />
        <PopoverContent className="w-[340px]">
          <PickerCalendar min={min} selected={selected} onSelect={onSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  const confirmable = draft !== undefined;

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(selected);
        onOpenChange?.(next);
      }}
    >
      <DrawerTrigger render={trigger} />
      <DrawerContent>
        <div className="flex flex-col gap-0.5 px-1">
          <DrawerTitle>{t('datePicker.sheet.title')}</DrawerTitle>
          {taskTitle === undefined ? null : <DrawerDescription>{taskTitle}</DrawerDescription>}
        </div>
        <PickerCalendar min={min} selected={draft} onSelect={setDraft} />
        <div className="flex gap-2">
          <DrawerClose className="h-[50px] flex-1 rounded-pill border-2 border-line bg-transparent text-body font-medium text-ink">
            {t('datePicker.sheet.cancel')}
          </DrawerClose>
          <button
            type="button"
            disabled={!confirmable}
            onClick={() => {
              if (draft !== undefined) onSelect(draft);
            }}
            className="h-[50px] flex-[1.4] rounded-pill bg-accent text-body font-semibold text-on-accent disabled:cursor-not-allowed disabled:opacity-45"
          >
            {confirmable
              ? t('datePicker.sheet.confirm', { date: formatDateShort(draft) })
              : t('datePicker.sheet.confirmEmpty')}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
