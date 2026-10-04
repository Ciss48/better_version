'use client';

import { useRef, useState } from 'react';
import { addDays, isoWeekday } from '@/domain';
import type { DaySummary, ISODate } from '@/domain';
import { useClock } from '@/lib/clock';
import { t, tRaw } from '@/lib/copy';
import { formatDateLong, formatMonthShort } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface HeatmapProps {
  days: DaySummary[];
  weeks: 26 | 13;
  /** The user's first day in the app; earlier cells are flat `heat-empty`. */
  firstUseDate: ISODate | null;
  onSelectDay(date: ISODate): void;
  className?: string;
}

/** heat-1 <40 · heat-2 <60 · heat-3 <80 · heat-4 ≥80. */
function heatClass(pct: number): string {
  if (pct < 40) return 'bg-heat-1';
  if (pct < 60) return 'bg-heat-2';
  if (pct < 80) return 'bg-heat-3';
  return 'bg-heat-4';
}

/**
 * The completion map: one column per week, rows T2→CN, ending with the week
 * that contains the injected `today`. Percentages are supplied; this only
 * buckets them.
 *
 * Keyboard: one cell is in the tab order at a time; ↑↓ move a day, ←→ a week.
 */
export function Heatmap({ days, weeks, firstUseDate, onSelectDay, className }: HeatmapProps) {
  const { today } = useClock();
  const [focused, setFocused] = useState<ISODate>(today);
  const cells = useRef(new Map<ISODate, HTMLButtonElement>());

  const byDate = new Map(days.map((day) => [day.date, day]));
  // Monday of the current week, then back to the first column.
  const thisMonday = addDays(today, -(isoWeekday(today) - 1));
  const start = addDays(thisMonday, -(weeks - 1) * 7);

  const size = weeks === 26 ? 17 : 20;
  const gap = weeks === 26 ? 5 : 4;
  const rowLabels = tRaw<string[]>('stats.heatmap.rows');

  function move(from: ISODate, delta: number) {
    const next = addDays(from, delta);
    const element = cells.current.get(next);
    if (element === undefined) return;
    setFocused(next);
    element.focus();
  }

  function onKeyDown(event: React.KeyboardEvent, date: ISODate) {
    const deltas: Record<string, number> = {
      ArrowUp: -1,
      ArrowDown: 1,
      ArrowLeft: -7,
      ArrowRight: 7,
    };
    const delta = deltas[event.key];
    if (delta === undefined) return;
    event.preventDefault();
    move(date, delta);
  }

  return (
    <section
      className={cn('flex flex-col gap-4 rounded-panel bg-surface px-[22px] pb-[18px] pt-[22px]', className)}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <h2 className="font-display text-display-sm">
          {t(weeks === 26 ? 'stats.heatmap.title26' : 'stats.heatmap.title13')}
        </h2>
        <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
          <span className="size-[13px] rounded-full border-[1.5px] border-dashed border-heat-none" />
          <span className="mr-2">{t('stats.heatmap.legendNone')}</span>
          <span>{t('stats.heatmap.legendLow')}</span>
          <span className="size-[13px] rounded-full bg-heat-1" />
          <span className="size-[13px] rounded-full bg-heat-2" />
          <span className="size-[13px] rounded-full bg-heat-3" />
          <span className="size-[13px] rounded-full bg-heat-4" />
          <span>{t('stats.heatmap.legendHigh')}</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <div
          aria-hidden
          className="flex flex-col pt-[22px] text-[10.5px] text-ink-3"
          style={{ gap: `${gap}px` }}
        >
          {rowLabels.map((label, index) => (
            <span key={index} style={{ height: size, lineHeight: `${size}px` }}>
              {label}
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label={t(weeks === 26 ? 'stats.heatmap.title26' : 'stats.heatmap.title13')}
          className="flex"
          style={{ gap: `${gap}px` }}
        >
          {Array.from({ length: weeks }, (_, week) => {
            const monday = addDays(start, week * 7);
            const showMonth = Number(monday.slice(8, 10)) <= 7;

            return (
              <div key={monday} className="flex flex-col" style={{ gap: `${gap}px` }}>
                <span
                  aria-hidden
                  className="h-[18px] whitespace-nowrap text-[10.5px] text-ink-3"
                  style={{ width: size }}
                >
                  {showMonth ? formatMonthShort(monday.slice(0, 7)) : ''}
                </span>

                {Array.from({ length: 7 }, (_, row) => {
                  const date = addDays(monday, row);
                  if (date > today) {
                    return (
                      <span
                        key={date}
                        aria-hidden
                        className="block"
                        style={{ width: size, height: size }}
                      />
                    );
                  }

                  const summary = byDate.get(date);
                  const before = firstUseDate !== null && date < firstUseDate;
                  const planned = !before && summary !== undefined && summary.hasPlan;
                  const label = before
                    ? t('stats.heatmap.cellBefore')
                    : planned
                      ? t('stats.heatmap.cellPlanned', {
                          date: formatDateLong(date),
                          pct: Math.round(summary?.pct ?? 0),
                        })
                      : t('stats.heatmap.cellNoPlan', { date: formatDateLong(date) });

                  return (
                    <button
                      key={date}
                      ref={(element) => {
                        if (element === null) cells.current.delete(date);
                        else cells.current.set(date, element);
                      }}
                      type="button"
                      aria-label={label}
                      tabIndex={date === focused ? 0 : -1}
                      onFocus={() => setFocused(date)}
                      onKeyDown={(event) => onKeyDown(event, date)}
                      onClick={() => {
                        if (!before) onSelectDay(date);
                      }}
                      style={{ width: size, height: size }}
                      className={cn(
                        'rounded-full border-0 p-0',
                        before
                          ? 'cursor-default bg-heat-empty'
                          : planned
                            ? heatClass(summary?.pct ?? 0)
                            : 'border-[1.5px] border-dashed border-heat-none bg-transparent',
                        date === today && 'outline-2 outline-offset-1 outline-accent',
                      )}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <span className="text-[12px] text-ink-3">{t('stats.heatmap.hint')}</span>
    </section>
  );
}
