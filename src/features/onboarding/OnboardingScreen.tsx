'use client';

import { ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { HabitCardGroup } from '@/components/onboarding/HabitCardGroup';
import { OnboardingDots } from '@/components/onboarding/OnboardingDots';
import { OnboardingSummary } from '@/components/onboarding/OnboardingSummary';
import { TimeChips } from '@/components/onboarding/TimeChips';
import { DayEndChips } from '@/components/settings/DayEndChips';
import { DEFAULT_SETTINGS, settingsForHabit } from '@/domain';
import type { Habit, HHMM, Settings } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { showToast } from '@/lib/toast';
import { ScreenState } from '@/features/common/ScreenState';
import { useStore } from '@/state/store';

/**
 * Onboarding — design/handoff/screens.md §6. Three questions and a summary,
 * skippable at every step. Nothing is saved until the last button: the store's
 * `completeOnboarding` stamps `onboardedAt` and writes the settings in one go.
 */

/** Reminder times per habit, from design/handoff/prototype/Onboarding.dc.html. */
const PLAN_TIMES: Record<Habit, HHMM[]> = {
  evening: ['20:30', '21:00', '21:30', '22:00'],
  morning: ['06:30', '07:00', '07:30', '08:00'],
};
const RITUAL_TIMES: HHMM[] = ['20:30', '21:00', '21:30', '22:00'];

/** One sentence per day-end hour; 05:00 was added with the chip range. */
const DAY_END_EXAMPLE = {
  '00:00': 'onboarding.step3.example.00:00',
  '01:00': 'onboarding.step3.example.01:00',
  '02:00': 'onboarding.step3.example.02:00',
  '03:00': 'onboarding.step3.example.03:00',
  '04:00': 'onboarding.step3.example.04:00',
  '05:00': 'onboarding.step3.example.05:00',
} satisfies Record<string, CopyKey>;

type Step = 0 | 1 | 2 | 3;

function OnboardingBody() {
  const router = useRouter();
  const completeOnboarding = useStore((s) => s.completeOnboarding);

  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);

  async function finish(settings: Settings): Promise<void> {
    await completeOnboarding(settings);
    router.push('/today?focus=input');
    showToast('today.toast.onboarded');
  }

  const dotStep = (step === 3 ? 2 : step) as 0 | 1 | 2;

  return (
    // `isolate` keeps the two decorative circles behind the content: an
    // absolutely positioned sibling would otherwise paint over static text.
    <div className="relative isolate flex min-h-[640px] flex-col gap-7">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-[30px] -right-10 -z-10 size-[170px] rounded-full bg-success opacity-[.18]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute right-[110px] top-[90px] -z-10 size-14 rounded-full bg-accent opacity-[.22]"
      />

      <div className="flex items-center justify-between gap-3">
        <OnboardingDots step={dotStep} />
        {step === 3 ? null : (
          <button
            type="button"
            onClick={() => void finish(DEFAULT_SETTINGS)}
            className="h-10 rounded-pill px-3.5 text-[13.5px] text-ink-3 transition-colors duration-[150ms] hover:bg-hover"
          >
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      {step === 0 ? (
        <section className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t('onboarding.stepLabel', { n: 1 })}
            </p>
            <h1 className="font-display text-display-md app:text-display-lg">
              {t('onboarding.step1.title')}
            </h1>
            <p className="text-ink-2">{t('onboarding.step1.body')}</p>
          </div>
          <HabitCardGroup
            value={draft.habit}
            onChange={(habit) => setDraft(settingsForHabit(draft, habit))}
          />
        </section>
      ) : null}

      {step === 1 ? (
        <section className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t('onboarding.stepLabel', { n: 2 })}
            </p>
            <h1 className="font-display text-display-md app:text-display-lg">
              {t('onboarding.step2.title')}
            </h1>
            <p className="text-ink-2">{t('onboarding.step2.body')}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-body-sm font-semibold">{t('onboarding.step2.plan')}</span>
            <TimeChips
              options={PLAN_TIMES[draft.habit]}
              value={draft.remindPlan}
              ariaLabel={t('onboarding.step2.plan')}
              onChange={(remindPlan) => setDraft({ ...draft, remindPlan })}
            />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-body-sm font-semibold">{t('onboarding.step2.ritual')}</span>
            <TimeChips
              options={RITUAL_TIMES}
              value={draft.remindRitual}
              ariaLabel={t('onboarding.step2.ritual')}
              onChange={(remindRitual) => setDraft({ ...draft, remindRitual })}
            />
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="flex flex-col gap-[22px]">
          <div className="flex flex-col gap-2">
            <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
              {t('onboarding.stepLabel', { n: 3 })}
            </p>
            <h1 className="font-display text-display-md app:text-display-lg">
              {t('onboarding.step3.title')}
            </h1>
            <p className="text-ink-2">{t('onboarding.step3.body')}</p>
          </div>
          <DayEndChips
            value={draft.dayEnd}
            onChange={(dayEnd) => setDraft({ ...draft, dayEnd })}
          />
          <p className="rounded-tile bg-success-soft px-[18px] py-4 text-pretty text-[14.5px] leading-[1.5] text-success-ink">
            {t(DAY_END_EXAMPLE[draft.dayEnd as keyof typeof DAY_END_EXAMPLE])}
          </p>
        </section>
      ) : null}

      {step === 3 ? (
        <OnboardingSummary settings={draft} onFinish={() => void finish(draft)} />
      ) : null}

      <div className="flex-1" />

      <div className="flex items-center justify-between gap-3">
        {step === 0 ? (
          <span />
        ) : (
          <button
            type="button"
            onClick={() => setStep((step - 1) as Step)}
            className="h-12 rounded-pill px-[18px] text-[14.5px] text-ink-2 transition-colors duration-[150ms] hover:bg-hover"
          >
            {t('common.back')}
          </button>
        )}
        {/* The summary carries its own "Viết plan đầu tiên" button. */}
        {step === 3 ? null : (
          <button
            type="button"
            onClick={() => setStep((step + 1) as Step)}
            className="inline-flex h-[50px] items-center gap-2 rounded-pill bg-accent px-6 text-[15px] font-semibold text-on-accent transition-colors duration-[150ms] hover:bg-accent-hover"
          >
            {t('common.continue')}
            <ArrowRight size={16} strokeWidth={2.75} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function OnboardingScreen() {
  // The same paper sheet the AppShell renders, without the sidebar or tabs.
  return (
    <div className="flex min-h-dvh bg-bg text-ink">
      <main className="min-w-0 flex-1 bg-paper app:m-3 app:rounded-panel">
        <PageContainer width="onboarding">
          <ScreenState skeleton="onboarding">
            <OnboardingBody />
          </ScreenState>
        </PageContainer>
      </main>
    </div>
  );
}
