'use client';

import { dateChipOptions } from '@/domain';
import type { Decision, ISODate } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { formatDateShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DatePicker } from './DatePicker';

export interface DatePickerChipsProps {
  today: ISODate;
  value?: Decision;
  onChange(d: Decision | undefined): void;
  allowDrop?: boolean;
  taskTitle?: string;
  className?: string;
}

/** The copy key per chip — note `plusWeek` is spelled `nextWeek` in copy. */
const CHIP_LABEL = {
  tomorrow: 'datePicker.chips.tomorrow',
  nextMonday: 'datePicker.chips.nextMonday',
  weekend: 'datePicker.chips.weekend',
  plusWeek: 'datePicker.chips.nextWeek',
} satisfies Record<string, CopyKey>;

// 44px touch target below the app breakpoint, 34px in the desktop layouts.
const CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-pill border-[1.5px] px-[13px] text-caption ' +
  'font-medium transition-colors duration-[150ms] app:min-h-[34px]';

function chipClasses(selected: boolean): string {
  return cn(
    CHIP,
    selected
      ? 'border-ink bg-ink text-bg'
      : 'border-line bg-transparent text-ink-2 hover:bg-hover',
  );
}

/**
 * The move/drop chips of the ritual review and the TaskItem toolbar. The chip
 * list is whatever `dateChipOptions` returns — three or four, since on a
 * Saturday the "+1 week" chip collapses into the "weekend" one.
 */
export function DatePickerChips({
  today,
  value,
  onChange,
  allowDrop = false,
  taskTitle,
  className,
}: DatePickerChipsProps) {
  const options = dateChipOptions(today);
  const selectedDate = value?.kind === 'move' ? value.date : undefined;
  const customDate =
    selectedDate !== undefined && !options.some((o) => o.date === selectedDate)
      ? selectedDate
      : undefined;

  function pickDate(date: ISODate) {
    onChange(selectedDate === date ? undefined : { kind: 'move', date });
  }

  return (
    <div
      role="radiogroup"
      aria-label={t('datePicker.sheet.title')}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {options.map((option) => {
        const selected = selectedDate === option.date;
        const day = Number(option.date.slice(8, 10));
        const month = Number(option.date.slice(5, 7));
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => pickDate(option.date)}
            className={chipClasses(selected)}
          >
            {option.key === 'tomorrow' || option.key === 'plusWeek'
              ? t(CHIP_LABEL[option.key])
              : t('datePicker.chipWithDate', {
                  label: t(CHIP_LABEL[option.key]),
                  d: day,
                  m: month,
                })}
          </button>
        );
      })}

      <DatePicker
        min={options[0].date}
        selected={customDate}
        taskTitle={taskTitle}
        onSelect={pickDate}
        trigger={
          <button
            type="button"
            role="radio"
            aria-checked={customDate !== undefined}
            className={chipClasses(customDate !== undefined)}
          >
            {customDate === undefined ? t('datePicker.chips.pick') : formatDateShort(customDate)}
          </button>
        }
      />

      {allowDrop ? (
        <button
          type="button"
          role="radio"
          aria-checked={value?.kind === 'drop'}
          onClick={() => onChange(value?.kind === 'drop' ? undefined : { kind: 'drop' })}
          className={chipClasses(value?.kind === 'drop')}
        >
          {t('datePicker.chips.drop')}
        </button>
      ) : null}
    </div>
  );
}
