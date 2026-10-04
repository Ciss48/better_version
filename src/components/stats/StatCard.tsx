import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  /** `null` is "not enough data" — the card shows an em dash and no delta. */
  value: number | null;
  unit?: '%' | 'ratio30';
  /** Points gained or lost against the previous period. */
  delta?: number | null;
  note?: string;
  className?: string;
}

/**
 * One figure on the stats screen. Everything arrives ready: this component
 * never averages, compares or rounds a period.
 *
 * A negative delta is neutral (`line-2`), never red — the tone rule.
 */
export function StatCard({ label, value, unit, delta, note, className }: StatCardProps) {
  const empty = value === null;
  const showDelta = !empty && delta !== undefined && delta !== null;
  const up = (delta ?? 0) >= 0;

  return (
    <div
      className={cn('flex flex-col gap-2 rounded-card bg-surface px-5 py-[18px]', className)}
    >
      <span className="text-caption leading-[1.35] text-ink-2">{label}</span>

      <span className="font-num text-num-md">
        {empty ? t('stats.cards.empty') : unit === 'ratio30' ? `${value}/30` : value}
        {!empty && unit === '%' ? <span className="text-[0.5em] text-ink-3">%</span> : null}
      </span>

      {showDelta ? (
        <span
          className={cn(
            'self-start rounded-pill px-2.5 py-[3px] text-[11.5px] font-semibold',
            up ? 'bg-success-soft text-success-ink' : 'bg-line-2 text-ink-2',
          )}
        >
          {up
            ? t('stats.cards.deltaUp', { n: delta ?? 0 })
            : t('stats.cards.deltaDown', { n: Math.abs(delta ?? 0) })}
        </span>
      ) : null}

      {note === undefined ? null : (
        <span className="text-[12px] leading-[1.4] text-ink-3">{note}</span>
      )}
    </div>
  );
}
