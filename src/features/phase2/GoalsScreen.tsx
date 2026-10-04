import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { Phase2Page } from './Phase2Page';
import { GOALS, TONE_FILL } from './samples';

/**
 * Goals — design/handoff/screens.md §8. A **Phase 2 preview**: the cards are
 * drawn from `src/content/phase2-samples.vi.json`, the "+ Thêm mục tiêu" tile
 * is inert, and nothing on this screen reads or writes the store. The
 * `@tên-mục-tiêu` syntax is described, not implemented.
 */
export function GoalsScreen() {
  return (
    <Phase2Page
      kicker={t('phase2.goals.kicker')}
      title={t('phase2.goals.title')}
      body={t('phase2.goals.body')}
    >
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
        {GOALS.map((goal) => (
          <article
            key={goal.title}
            className="flex flex-col gap-3.5 rounded-panel bg-surface p-[22px]"
          >
            <div className="flex items-center gap-2.5">
              <span className={cn('size-3.5 rounded-full', TONE_FILL[goal.tone])} aria-hidden />
              <span className="text-[12.5px] text-ink-3">{goal.horizon}</span>
            </div>

            <h2 className="font-display text-[20px] leading-[1.2]">{goal.title}</h2>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[12.5px] text-ink-3">
                <span>{goal.metric}</span>
                <span>{goal.pct}%</span>
              </div>
              <div
                role="progressbar"
                aria-valuenow={goal.pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={goal.metric}
                className="h-2 overflow-hidden rounded-pill bg-line-2"
              >
                <div
                  className={cn('h-full rounded-pill', TONE_FILL[goal.tone])}
                  style={{ width: `${goal.pct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1 rounded-item bg-paper px-3.5 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                {t('phase2.goals.focus')}
              </span>
              <span className="text-[14.5px]">{goal.focus}</span>
            </div>

            <span className="text-[12.5px] text-ink-3">
              {t('phase2.goals.linked', { n: goal.linked, done: goal.linkedDone })}
            </span>
          </article>
        ))}

        <button
          type="button"
          aria-disabled="true"
          className="flex min-h-[200px] cursor-default items-center justify-center rounded-panel border-2 border-dashed border-line bg-transparent text-body-sm text-ink-3"
        >
          {t('phase2.goals.add')}
        </button>
      </div>
    </Phase2Page>
  );
}
