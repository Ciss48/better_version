import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface InsightCardProps {
  items: { text: string; tone: 'success' | 'accent' }[];
  className?: string;
}

/**
 * Sentences the data layer has already written (`stats.insights.*`). Nothing
 * is derived here — an empty list is the "come back in two weeks" line.
 */
export function InsightCard({ items, className }: InsightCardProps) {
  const rows =
    items.length === 0
      ? [{ text: t('stats.insights.empty'), tone: null }]
      : items.map((item) => ({ text: item.text, tone: item.tone }));

  return (
    <section
      className={cn('flex flex-col gap-3.5 rounded-panel bg-surface p-[22px]', className)}
    >
      <h2 className="font-display text-display-sm">{t('stats.insights.title')}</h2>
      {rows.map((row) => (
        <div key={row.text} className="flex items-start gap-3">
          <span
            aria-hidden
            className={cn(
              'mt-[7px] size-2.5 shrink-0 rounded-full',
              row.tone === 'success'
                ? 'bg-success'
                : row.tone === 'accent'
                  ? 'bg-accent'
                  : 'bg-ink-3',
            )}
          />
          <p className="text-pretty text-[15px] leading-[1.5]">{row.text}</p>
        </div>
      ))}
    </section>
  );
}
