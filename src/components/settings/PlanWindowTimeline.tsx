import type { HHMM, Settings } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface PlanWindowTimelineProps {
  settings: Settings;
  className?: string;
}

/** Minutes since 12:00 of day D-1, as a fraction of the 24h track. */
function fraction(hour: number, minute: number, dayOffset: -1 | 0): number {
  const hours = dayOffset === -1 ? hour - 12 : hour + 12;
  return (hours + minute / 60) / 24;
}

function parse(hhmm: HHMM): { hour: number; minute: number } {
  return { hour: Number(hhmm.slice(0, 2)), minute: Number(hhmm.slice(3, 5)) };
}

function percent(value: number): string {
  return `${value * 100}%`;
}

/**
 * The 16px track from 12:00 on day D-1 to 12:00 on day D. The `success`
 * segment is the planning window; the accent tick is where the previous day
 * ends. A morning habit opens on day D, which is still inside the track.
 */
export function PlanWindowTimeline({ settings, className }: PlanWindowTimelineProps) {
  const open = fraction(settings.windowStart.hour, 0, settings.windowStart.dayOffset);
  const lock = parse(settings.lockTime);
  const close = fraction(lock.hour, lock.minute, 0);
  const dayEnd = parse(settings.dayEnd);
  const end = fraction(dayEnd.hour, dayEnd.minute, 0);

  const startLabel = t(
    settings.windowStart.dayOffset === -1
      ? 'settings.window.startOptionPrev'
      : 'settings.window.startOptionSame',
    { time: `${String(settings.windowStart.hour).padStart(2, '0')}:00` },
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-tile bg-paper px-4 pb-3 pt-4',
        className,
      )}
    >
      <div className="relative h-4 rounded-pill bg-line-2">
        <span
          data-slot="window"
          className="absolute inset-y-0 rounded-pill bg-success transition-all duration-[300ms]"
          style={{ left: percent(open), width: percent(Math.max(0.02, close - open)) }}
        />
        <span
          data-slot="day-end"
          aria-hidden
          className="absolute -inset-y-[5px] w-[3px] rounded-pill bg-accent"
          style={{ left: percent(end) }}
        />
      </div>

      <div className="relative h-[18px] text-[11.5px] text-ink-3">
        <span className="absolute left-0">{t('settings.window.timelineStart')}</span>
        <span className="absolute left-1/2 -translate-x-1/2">
          {t('settings.window.timelineMid')}
        </span>
        <span className="absolute right-0">{t('settings.window.timelineEnd')}</span>
      </div>

      <span className="text-[13.5px] text-ink-2">
        {t('settings.window.sentence', {
          start: startLabel,
          lock: settings.lockTime,
          dayEnd: settings.dayEnd,
        })}
      </span>
    </div>
  );
}
