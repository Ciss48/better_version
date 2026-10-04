'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  done: number;
  total: number;
  size?: 'md' | 'sm';
  className?: string;
}

/**
 * The weighted completion of the day. The fill width transitions over 600ms
 * (motion.md §5); the number changes instantly.
 */
export function ProgressBar({ value, done, total, size = 'md', className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('today.progress.count', { done, total })}
            className={cn('flex flex-col gap-2.5 text-left', className)}
          />
        }
      >
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              'font-num leading-[0.9]',
              size === 'md' ? 'text-num-lg' : 'text-num-sm',
            )}
          >
            {pct}
            <span className={size === 'md' ? 'text-[22px] text-ink-3' : 'text-base text-ink-3'}>
              %
            </span>
          </span>
          <span className="text-right text-[12.5px] leading-[1.35] text-ink-3">
            {t('today.progress.count', { done, total })}
            <br />
            {t('today.progress.weighted')}
          </span>
        </div>
        <div
          className={cn(
            'overflow-hidden rounded-pill bg-line-2',
            size === 'md' ? 'h-2.5' : 'h-1.5',
          )}
        >
          <div
            className="h-full rounded-pill bg-success transition-[width] duration-[600ms] [transition-timing-function:var(--ease-out-soft)]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>{t('today.progress.tooltip')}</TooltipContent>
    </Tooltip>
  );
}
