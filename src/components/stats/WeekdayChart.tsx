import { t, tRaw } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface WeekdayChartProps {
  /** ISO weekdays, Mon=1 … Sun=7. `null` means "not enough data". */
  values: { weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7; pct: number | null }[];
  className?: string;
}

/** Average weighted completion per weekday. The best day is `success`. */
export function WeekdayChart({ values, className }: WeekdayChartProps) {
  const short = tRaw<string[]>('date.weekdayShort');
  const known = values.filter((v) => v.pct !== null).map((v) => v.pct as number);
  const best = known.length === 0 ? null : Math.max(...known);

  return (
    <section
      className={cn('flex flex-col gap-[18px] rounded-panel bg-surface p-[22px]', className)}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-display-sm">{t('stats.weekday.title')}</h2>
        <span className="text-caption text-ink-3">{t('stats.weekday.sub')}</span>
      </div>

      <div className="grid h-[200px] grid-cols-7 items-end gap-2">
        {values.map((value) => {
          const isBest = value.pct !== null && value.pct === best;
          return (
            <div
              key={value.weekday}
              className="flex h-full flex-col items-center justify-end gap-1.5"
            >
              <span
                className={cn(
                  'text-[12px] font-semibold',
                  isBest ? 'text-success-ink' : 'text-ink-3',
                )}
              >
                {value.pct === null ? t('stats.cards.empty') : `${value.pct}%`}
              </span>
              <span
                className={cn(
                  'w-full max-w-11 rounded-pill transition-[height] duration-500',
                  isBest ? 'bg-success' : 'bg-heat-2',
                )}
                style={{ height: Math.max(8, (value.pct ?? 0) * 1.5) }}
              />
              <span className="text-[12px] text-ink-3">{short[value.weekday % 7]}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
