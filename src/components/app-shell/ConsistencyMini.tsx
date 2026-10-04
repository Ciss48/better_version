import { t } from '@/lib/copy';

export interface ConsistencyDay {
  date: string;
  hasPlan: boolean;
  pct: number;
  isToday: boolean;
}

export interface ConsistencyMiniProps {
  /** Up to 30 days, oldest first. Phase 1 passes none — real data arrives in Phase 4. */
  days?: ConsistencyDay[];
}

const WINDOW = 30;

function heatClass(pct: number): string {
  if (pct < 40) return 'bg-heat-1';
  if (pct < 60) return 'bg-heat-2';
  if (pct < 80) return 'bg-heat-3';
  return 'bg-heat-4';
}

/** Sidebar card: the n-of-30 planned-days count plus a 10x3 grid of day dots. */
export function ConsistencyMini({ days = [] }: ConsistencyMiniProps) {
  const recent = days.slice(-WINDOW);
  const cells: (ConsistencyDay | null)[] = [
    ...Array<null>(WINDOW - recent.length).fill(null),
    ...recent,
  ];
  const planned = recent.filter((d) => d.hasPlan).length;

  return (
    <div className="flex flex-col gap-3 rounded-[24px] bg-surface p-[18px]">
      <div className="text-label font-semibold uppercase text-ink-3">
        {t('nav.consistency.kicker')}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="font-num text-[28px] leading-none">
          {planned}/{WINDOW}
        </span>
        <span className="text-caption text-ink-2">{t('nav.consistency.unit')}</span>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {cells.map((day, i) => (
          <span
            key={day ? day.date : `empty-${i}`}
            title={
              day
                ? day.hasPlan
                  ? t('nav.consistency.dayPlanned', { date: day.date, pct: day.pct })
                  : t('nav.consistency.dayNoPlan', { date: day.date })
                : undefined
            }
            className={[
              'aspect-square rounded-full',
              day?.hasPlan ? heatClass(day.pct) : 'bg-transparent',
              day?.isToday
                ? 'ring-[1.5px] ring-inset ring-accent'
                : day?.hasPlan
                  ? ''
                  : 'ring-[1.5px] ring-inset ring-line',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}
