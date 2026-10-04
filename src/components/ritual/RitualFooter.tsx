'use client';

import { ArrowRight } from 'lucide-react';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface RitualFooterProps {
  /** Step 1 only — the left-hand line. */
  status?: { remaining: number };
  primaryLabel: string;
  disabled?: boolean;
  onNext(): void;
  /** Called instead of `onNext` while disabled; the screen toasts the reason. */
  onBlockedClick?(): void;
  onBack?(): void;
  className?: string;
}

/**
 * The sticky ritual footer. The gate is `aria-disabled`, not `disabled`: a
 * blocked click still has to reach the screen so it can explain itself
 * (`ritual.step1.blocked`).
 */
export function RitualFooter({
  status,
  primaryLabel,
  disabled = false,
  onNext,
  onBlockedClick,
  onBack,
  className,
}: RitualFooterProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 flex items-center justify-between gap-3 bg-paper pb-1.5 pt-3.5',
        className,
      )}
    >
      {status === undefined ? (
        onBack === undefined ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={onBack}
            className="h-[46px] rounded-pill border-0 bg-transparent px-[18px] text-[14.5px] text-ink-2 transition-colors duration-[150ms] hover:bg-hover"
          >
            {t('common.back')}
          </button>
        )
      ) : (
        <span
          className={cn(
            'text-[13.5px]',
            status.remaining > 0 ? 'text-accent-ink' : 'text-success-ink',
          )}
        >
          {status.remaining > 0
            ? t('ritual.step1.remaining', { n: status.remaining })
            : t('ritual.step1.allHandled')}
        </span>
      )}

      <button
        type="button"
        aria-disabled={disabled}
        onClick={() => (disabled ? onBlockedClick?.() : onNext())}
        className={cn(
          'inline-flex h-[46px] items-center gap-2 rounded-pill border-0 bg-accent px-[22px]',
          'text-[14.5px] font-semibold text-on-accent transition-opacity duration-[150ms]',
          disabled ? 'cursor-not-allowed opacity-45' : 'opacity-100',
        )}
      >
        {primaryLabel}
        <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
      </button>
    </div>
  );
}
