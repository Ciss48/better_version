import { t, tRaw } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { Phase2Page } from './Phase2Page';
import { GOALS, TONE_FILL, WEEKLY } from './samples';

/**
 * Weekly review — design/handoff/screens.md §9. A **Phase 2 preview**: the
 * three figures and the seven bars are sample data, and the "next week" fields
 * are rendered disabled. Nothing here touches the store.
 */
export function WeeklyScreen() {
  const short = tRaw<string[]>('date.weekdayShort');
  const stats: { value: string; label: string }[] = [
    { value: WEEKLY.avg, label: t('phase2.weekly.stats.avg') },
    { value: WEEKLY.planned, label: t('phase2.weekly.stats.planned') },
    { value: WEEKLY.mit, label: t('phase2.weekly.stats.mit') },
  ];

  return (
    <Phase2Page
      kicker={t('phase2.weekly.kicker')}
      title={t('phase2.weekly.title', { from: WEEKLY.from, to: WEEKLY.to })}
    >
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-card bg-surface px-5 py-[18px]"
          >
            <span className="font-num text-[30px] leading-none">{stat.value}</span>
            <span className="text-caption text-ink-2">{stat.label}</span>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3.5 rounded-panel bg-surface p-[22px]">
        <span className="font-semibold">{t('phase2.weekly.chart')}</span>
        <div className="grid h-[140px] grid-cols-7 items-end gap-2">
          {WEEKLY.days.map((entry, index) => (
            <div
              key={entry.weekday}
              className="flex h-full flex-col items-center justify-end gap-1.5"
            >
              <span
                className={cn(
                  'w-full max-w-10 rounded-pill',
                  entry.pct === null
                    ? 'border-[1.5px] border-dashed border-heat-none bg-transparent'
                    : index === WEEKLY.days.length - 1
                      ? 'bg-accent'
                      : 'bg-success',
                )}
                style={{ height: entry.pct === null ? 12 : Math.max(8, entry.pct * 1.1) }}
              />
              <span className="text-[12px] text-ink-3">{short[entry.weekday % 7]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3.5 rounded-panel border-2 border-line p-[22px]">
        <h2 className="font-display text-[20px]">{t('phase2.weekly.nextFocus')}</h2>
        {GOALS.map((goal) => (
          <label key={goal.title} className="flex flex-col gap-1.5">
            <span className="flex items-center gap-2 text-[13.5px] font-semibold">
              <span className={cn('size-2.5 rounded-full', TONE_FILL[goal.tone])} aria-hidden />
              {goal.title}
            </span>
            <input
              type="text"
              disabled
              aria-disabled="true"
              defaultValue=""
              placeholder={goal.next}
              className="h-[46px] rounded-pill border-2 border-line bg-paper px-[18px] text-[14.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </label>
        ))}
      </section>
    </Phase2Page>
  );
}
