'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isoWeekday } from '@/domain';
import type { DaySummary, ISODate } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatDateLong, formatMonth } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface CalendarMonthProps {
  /** 'YYYY-MM' */
  month: string;
  days: DaySummary[];
  selected: ISODate;
  onSelect(d: ISODate): void;
  /** `null` renders `history.monthEmpty`. */
  summary: { planned: number; total: number; avg: number } | null;
  canPrev: boolean;
  canNext: boolean;
  onPrev(): void;
  onNext(): void;
  className?: string;
}

function daysInMonth(month: string): number {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** heat-3 and heat-4 are dark enough to need `on-accent` text. */
function heatFill(pct: number): { bg: string; text: string } {
  if (pct < 40) return { bg: 'bg-heat-1', text: 'text-ink' };
  if (pct < 60) return { bg: 'bg-heat-2', text: 'text-ink' };
  if (pct < 80) return { bg: 'bg-heat-3', text: 'text-on-accent' };
  return { bg: 'bg-heat-4', text: 'text-on-accent' };
}

const NAV_BUTTON =
  'grid size-10 shrink-0 place-items-center rounded-full border-0 bg-paper text-ink ' +
  'transition-opacity duration-[150ms] disabled:cursor-not-allowed disabled:opacity-35';

/** The History month grid. Weeks start on Monday, like every date surface here. */
export function CalendarMonth({
  month,
  days,
  selected,
  onSelect,
  summary,
  canPrev,
  canNext,
  onPrev,
  onNext,
  className,
}: CalendarMonthProps) {
  const { today } = useClock();
  const byDate = new Map(days.map((day) => [day.date, day]));
  const first: ISODate = `${month}-01`;
  const offset = isoWeekday(first) - 1;
  const total = daysInMonth(month);
  const weekdays = tRaw<string[]>('date.weekdayShort');

  return (
    <section
      className={cn('flex flex-col gap-3.5 rounded-panel bg-surface p-[18px]', className)}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={onPrev}
          aria-label={t('datePicker.prevMonth')}
          className={NAV_BUTTON}
        >
          <ChevronLeft size={16} strokeWidth={2.75} aria-hidden />
        </button>
        <div className="flex flex-col items-center">
          <span className="font-display text-[20px]">{formatMonth(month)}</span>
          <span className="text-[12.5px] text-ink-3">
            {summary === null
              ? t('history.monthEmpty')
              : t('history.monthSummary', {
                  planned: summary.planned,
                  total: summary.total,
                  avg: summary.avg,
                })}
          </span>
        </div>
        <button
          type="button"
          disabled={!canNext}
          onClick={onNext}
          aria-label={t('datePicker.nextMonth')}
          className={NAV_BUTTON}
        >
          <ChevronRight size={16} strokeWidth={2.75} aria-hidden />
        </button>
      </div>

      <div role="group" aria-label={t('history.calendarAria')} className="grid grid-cols-7 gap-1.5">
        {/* T2 … CN: copy indexes CN=0, so start at Monday and wrap. */}
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
          <span
            key={weekday}
            className="text-center text-[11.5px] font-semibold text-ink-3"
          >
            {weekdays[weekday % 7]}
          </span>
        ))}

        {Array.from({ length: offset }, (_, index) => (
          <span key={`pad-${index}`} aria-hidden />
        ))}

        {Array.from({ length: total }, (_, index) => {
          const day = index + 1;
          const date: ISODate = `${month}-${pad2(day)}`;
          const entry = byDate.get(date);
          const future = date > today;
          const isToday = date === today;
          const isSelected = date === selected;
          const planned = entry !== undefined && entry.hasPlan;
          const fill = planned ? heatFill(entry.pct) : null;
          const sub = planned ? (isToday ? t('history.todayCell') : `${entry.pct}%`) : entry ? '—' : '';

          return (
            <button
              key={date}
              type="button"
              aria-label={
                planned
                  ? t('stats.heatmap.cellPlanned', { date: formatDateLong(date), pct: entry.pct })
                  : t('stats.heatmap.cellNoPlan', { date: formatDateLong(date) })
              }
              aria-pressed={isSelected}
              disabled={entry === undefined}
              onClick={() => onSelect(date)}
              className={cn(
                'flex h-[46px] flex-col items-center justify-center gap-px rounded-item',
                'border-0 transition-shadow duration-[150ms] app:h-[62px]',
                fill === null ? 'bg-transparent text-ink-3' : `${fill.bg} ${fill.text}`,
                !planned && entry !== undefined && 'border-[1.5px] border-dashed border-heat-none',
                future && 'opacity-35',
                entry === undefined && 'cursor-default',
                isSelected
                  ? 'shadow-[inset_0_0_0_3px_var(--ink)]'
                  : isToday
                    ? 'shadow-[inset_0_0_0_2.5px_var(--accent)]'
                    : '',
              )}
            >
              <span className="text-body-sm font-semibold leading-none">{day}</span>
              {sub === '' ? null : (
                <span className="hidden text-[10.5px] leading-none opacity-85 app:block">
                  {sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
