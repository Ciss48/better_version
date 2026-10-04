'use client';

import { ArrowRight } from 'lucide-react';
import type { Settings } from '@/domain';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface OnboardingSummaryProps {
  settings: Settings;
  onFinish(): void;
  className?: string;
}

/** The last onboarding screen: what was chosen, one tip, and the way in. */
export function OnboardingSummary({ settings, onFinish, className }: OnboardingSummaryProps) {
  const rows: { label: string; value: string }[] = [
    {
      label: t('onboarding.done.rows.habit'),
      value: t(
        settings.habit === 'evening'
          ? 'onboarding.done.habitEvening'
          : 'onboarding.done.habitMorning',
      ),
    },
    {
      label: t('onboarding.done.rows.lock'),
      value: t('onboarding.done.lockValue', { time: settings.lockTime }),
    },
    {
      label: t('onboarding.done.rows.reminders'),
      value: `${settings.remindPlan} · ${settings.remindRitual}`,
    },
    {
      label: t('onboarding.done.rows.dayEnd'),
      value:
        settings.dayEnd === '00:00'
          ? t('onboarding.step3.midnight')
          : t('onboarding.done.dayEndValue', { time: settings.dayEnd }),
    },
  ];

  return (
    <section className={cn('flex flex-col gap-5', className)}>
      <h1 className="font-display text-[38px] leading-[1.1] tracking-[-0.02em]">
        {t('onboarding.done.title')}
      </h1>

      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between gap-3 rounded-tile bg-surface px-[18px] py-3.5"
          >
            <span className="text-ink-2">{row.label}</span>
            <b className="text-right font-semibold">{row.value}</b>
          </div>
        ))}
      </div>

      <p className="text-pretty text-ink-2">{t('onboarding.done.tip')}</p>

      <div>
        <button
          type="button"
          onClick={onFinish}
          className="inline-flex h-[50px] items-center gap-2 rounded-pill border-0 bg-accent px-6 text-[15px] font-semibold text-on-accent transition-colors duration-[150ms] hover:bg-accent-hover"
        >
          {t('onboarding.done.cta')}
          <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
        </button>
      </div>
    </section>
  );
}
