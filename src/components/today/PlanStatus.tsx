import { Lock, Moon } from 'lucide-react';
import type { HHMM } from '@/domain';
import { t } from '@/lib/copy';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PlanStatusProps {
  locked: boolean;
  lockAt: HHMM;
  /** Minutes until the lock, or `null` once locked. */
  minutesLeft: number | null;
  /** Shown between local midnight and `dayEnd`: the previous day is still open. */
  lateNight?: { dayEnd: HHMM };
  className?: string;
}

const PILL = 'inline-flex h-7 items-center gap-2 rounded-pill px-3 text-caption';

/** The plan-window state under the Today heading. */
export function PlanStatus({ locked, lockAt, minutesLeft, lateNight, className }: PlanStatusProps) {
  return (
    <div className={cn('flex flex-col items-start gap-2', className)}>
      {lateNight === undefined ? null : (
        <span className={cn(PILL, 'bg-accent-soft font-semibold text-accent-ink')}>
          <Moon size={13} strokeWidth={2.75} aria-hidden />
          {t('today.lateNightPill', { dayEnd: lateNight.dayEnd })}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-caption">
        {locked ? (
          <>
            <span className={cn(PILL, 'bg-line-2 font-medium text-ink-2')}>
              <Lock size={13} strokeWidth={2.75} aria-hidden />
              {t('today.planStatus.locked', { lockAt })}
            </span>
            <span className="text-ink-3">{t('today.planStatus.lockedHint')}</span>
          </>
        ) : (
          <>
            <span className={cn(PILL, 'bg-success-soft font-semibold text-success-ink')}>
              <span className="size-2 rounded-full bg-success" aria-hidden />
              {t('today.planStatus.open', { lockAt })}
            </span>
            {minutesLeft === null ? null : (
              <span className="text-ink-3">
                {t('today.planStatus.openHint', { timeLeft: formatDuration(minutesLeft) })}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
