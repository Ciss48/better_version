'use client';

import type { ISODate, Reflection } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { formatWeekdayDayMonth } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface RitualSummaryProps {
  date: ISODate;
  pct: number;
  done: number;
  total: number;
  /** Adhoc tasks finished today — mentioned, never counted in the %. */
  adhocDone: number;
  moved: number;
  dropped: number;
  energy: Reflection['energy'];
  good: string;
  tomorrow: { count: number; mitTitles: string[] };
  consistencyPlanned: number;
  onDone(): void;
  className?: string;
}

function headlineKey(pct: number): CopyKey {
  if (pct >= 100) return 'ritual.summary.headline.p100';
  if (pct >= 75) return 'ritual.summary.headline.p75';
  if (pct >= 50) return 'ritual.summary.headline.p50';
  return 'ritual.summary.headline.low';
}

/** The screen after `closeDay` — numbers only, nothing to decide. */
export function RitualSummary({
  date,
  pct,
  done,
  total,
  adhocDone,
  moved,
  dropped,
  energy,
  good,
  tomorrow,
  consistencyPlanned,
  onDone,
  className,
}: RitualSummaryProps) {
  const body =
    t('ritual.summary.body', {
      done,
      total,
      adhocPart: adhocDone > 0 ? t('ritual.summary.bodyAdhocPart', { n: adhocDone }) : '',
    }) +
    ' ' +
    t(dropped > 0 ? 'ritual.summary.bodyDropped' : 'ritual.summary.bodyNoDrop');

  const tiles: { value: string; label: string }[] = [
    { value: `${done}/${total}`, label: t('ritual.summary.stats.done') },
    { value: String(moved), label: t('ritual.summary.stats.moved') },
    { value: String(dropped), label: t('ritual.summary.stats.dropped') },
    {
      value: energy === 0 ? t('stats.cards.empty') : `${energy}/5`,
      label: t('ritual.summary.stats.energy'),
    },
  ];

  const quote = good.trim();

  return (
    <section className={cn('relative flex flex-col gap-[22px]', className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2.5 right-0 size-[120px] rounded-full bg-success opacity-[.22]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-24 top-[70px] size-11 rounded-full bg-accent opacity-[.28]"
      />

      <span className="text-label font-semibold uppercase tracking-[0.08em] text-success-ink">
        {t('ritual.summary.kicker', { date: formatWeekdayDayMonth(date) })}
      </span>

      <div className="font-num text-[84px] leading-[0.85] app:text-num-xl">
        {Math.round(pct)}
        <span className="text-[0.45em] text-ink-3">%</span>
      </div>

      <div className="flex max-w-[520px] flex-col gap-2">
        <h2 className="font-display text-[26px] leading-[1.2]">{t(headlineKey(pct))}</h2>
        <p className="text-pretty text-ink-2">{body}</p>
      </div>

      <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(130px,1fr))]">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="flex flex-col gap-1 rounded-tile bg-surface px-[18px] py-4"
          >
            <span className="font-num text-num-sm">{tile.value}</span>
            <span className="text-caption text-ink-2">{tile.label}</span>
          </div>
        ))}
      </div>

      {quote === '' ? null : (
        <p className="rounded-tile bg-success-soft px-5 py-4 font-display text-[18px] italic text-success-ink">
          “{quote}”
        </p>
      )}

      <div className="flex flex-col gap-2.5 rounded-card border-2 border-line px-5 py-[18px]">
        <b className="font-semibold">
          {t('ritual.summary.tomorrow', {
            n: tomorrow.count,
            mit: tomorrow.mitTitles.length,
          })}
        </b>
        {tomorrow.mitTitles.map((title) => (
          <span key={title} className="flex items-center gap-2.5 text-[14.5px] text-ink-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-accent" />
            {title}
          </span>
        ))}
      </div>

      <p className="text-body-sm text-ink-3">
        {t('ritual.summary.consistency', { n: consistencyPlanned })}
      </p>

      <div>
        <button
          type="button"
          onClick={onDone}
          className="h-[46px] rounded-pill border-0 bg-ink px-[22px] text-[14.5px] font-semibold text-bg"
        >
          {t('ritual.summary.cta')}
        </button>
      </div>
    </section>
  );
}
