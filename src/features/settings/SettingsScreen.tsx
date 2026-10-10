'use client';

import Link from 'next/link';
import { useTheme } from 'next-themes';
import { PageContainer } from '@/components/app-shell/PageContainer';
import { Segmented } from '@/components/common/Segmented';
import { AccountSection } from '@/components/settings/AccountSection';
import { DayEndChips } from '@/components/settings/DayEndChips';
import { PlanWindowTimeline } from '@/components/settings/PlanWindowTimeline';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Switch } from '@/components/settings/Switch';
import { TimeSelect } from '@/components/settings/TimeSelect';
import type { Habit, HHMM, Theme } from '@/domain';
import { t } from '@/lib/copy';
import { DATA_BACKEND } from '@/lib/env';
import { useHydrated } from '@/lib/use-hydrated';
import { ScreenState } from '@/features/common/ScreenState';
import { useStore } from '@/state/store';

/**
 * Settings — design/handoff/screens.md §5. No Save button: every control calls
 * `updateSettings`, which validates through the domain and persists at once, so
 * a new lock time shows up in Today's PlanStatus immediately.
 *
 * The option lists below only ever offer values `validateSettings` accepts —
 * the store refuses anything else, so the UI must not present it.
 */

/** Window opening hours per habit (validateSettings: evening 17–20, morning 5–6). */
const START_HOURS: Record<Habit, number[]> = {
  evening: [17, 18, 19, 20],
  morning: [5, 6],
};

/** Lock time: whole hours across the accepted 07:00–14:00 range. */
const LOCK_TIMES: HHMM[] = [
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
];

const PLAN_REMINDERS: HHMM[] = ['06:30', '07:00', '07:30', '20:30', '21:00', '21:30', '22:00'];
const RITUAL_REMINDERS: HHMM[] = ['20:00', '20:30', '21:00', '21:30', '22:00'];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function SettingsBody() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const startOptions = START_HOURS[settings.habit].map((hour) => ({
    value: `${pad2(hour)}:00` as HHMM,
    label: t(
      settings.habit === 'evening'
        ? 'settings.window.startOptionPrev'
        : 'settings.window.startOptionSame',
      { time: `${pad2(hour)}:00` },
    ),
  }));

  const startValue: HHMM = `${pad2(settings.windowStart.hour)}:00`;

  // next-themes is the live source of truth for what is on screen (the `T`
  // shortcut changes it without touching settings); the stored value is what a
  // fresh device starts from.
  const themeValue: Theme = hydrated ? ((theme as Theme | undefined) ?? settings.theme) : settings.theme;

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('settings.kicker')}
        </p>
        <h1 className="font-display text-display-md app:text-display-xl">
          {t('settings.title')}
        </h1>
      </header>

      <SettingsSection title={t('settings.window.title')} description={t('settings.window.body')}>
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-semibold">{t('settings.window.habit')}</span>
          <Segmented<Habit>
            value={settings.habit}
            ariaLabel={t('settings.window.habit')}
            onChange={(habit) => void updateSettings({ habit })}
            className="self-start"
            options={[
              { value: 'evening', label: t('settings.window.habitEvening') },
              { value: 'morning', label: t('settings.window.habitMorning') },
            ]}
          />
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-semibold">{t('settings.window.start')}</span>
            <TimeSelect
              value={startValue}
              options={startOptions}
              ariaLabel={t('settings.window.start')}
              onChange={(value) =>
                void updateSettings({
                  windowStart: {
                    hour: Number(value.slice(0, 2)),
                    dayOffset: settings.windowStart.dayOffset,
                  },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-semibold">{t('settings.window.lock')}</span>
            <TimeSelect
              value={settings.lockTime}
              options={LOCK_TIMES.map((time) => ({
                value: time,
                label: t('settings.window.lockOption', { time }),
              }))}
              ariaLabel={t('settings.window.lock')}
              onChange={(lockTime) => void updateSettings({ lockTime })}
            />
          </label>
        </div>

        <PlanWindowTimeline settings={settings} />
      </SettingsSection>

      <SettingsSection title={t('settings.dayEnd.title')} description={t('settings.dayEnd.body')}>
        <DayEndChips
          value={settings.dayEnd}
          midnightLabel="time"
          onChange={(dayEnd) => void updateSettings({ dayEnd })}
        />
      </SettingsSection>

      {/* The switch sits on the title row, so this section is hand-rolled
          rather than a SettingsSection. */}
      <section className="flex flex-col gap-3.5 rounded-panel bg-surface p-[22px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[20px]">{t('settings.reminders.title')}</h2>
          <Switch
            checked={settings.remindOn}
            ariaLabel={t('settings.reminders.toggleAria')}
            onCheckedChange={(remindOn) => void updateSettings({ remindOn })}
          />
        </div>
        {settings.remindOn ? (
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm font-semibold">{t('settings.reminders.plan')}</span>
              <TimeSelect
                value={settings.remindPlan}
                options={PLAN_REMINDERS.map((time) => ({ value: time, label: time }))}
                ariaLabel={t('settings.reminders.plan')}
                onChange={(remindPlan) => void updateSettings({ remindPlan })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-body-sm font-semibold">{t('settings.reminders.ritual')}</span>
              <TimeSelect
                value={settings.remindRitual}
                options={RITUAL_REMINDERS.map((time) => ({ value: time, label: time }))}
                ariaLabel={t('settings.reminders.ritual')}
                onChange={(remindRitual) => void updateSettings({ remindRitual })}
              />
            </label>
          </div>
        ) : null}
      </section>

      <SettingsSection title={t('settings.theme.title')}>
        <Segmented<Theme>
          value={themeValue}
          ariaLabel={t('settings.theme.title')}
          onChange={(next) => {
            setTheme(next);
            void updateSettings({ theme: next });
          }}
          className="self-start"
          options={[
            { value: 'light', label: t('settings.theme.light') },
            { value: 'dark', label: t('settings.theme.dark') },
            { value: 'system', label: t('settings.theme.system') },
          ]}
        />
      </SettingsSection>

      <section className="flex flex-col gap-2.5 rounded-panel border-2 border-line p-[22px]">
        <h2 className="font-display text-[20px]">{t('settings.weights.title')}</h2>
        <p className="text-pretty text-body-sm leading-[1.55] text-ink-2">
          {t('settings.weights.body')}
        </p>
        <div>
          <Link
            href="/onboarding"
            className="inline-flex h-[42px] items-center rounded-pill border-2 border-line px-[18px] text-body-sm font-medium transition-colors duration-[150ms] hover:bg-hover"
          >
            {t('settings.weights.onboarding')}
          </Link>
        </div>
      </section>

      {DATA_BACKEND === 'supabase' ? <AccountSection /> : null}
    </div>
  );
}

export function SettingsScreen() {
  return (
    <PageContainer>
      <ScreenState skeleton="settings">
        <SettingsBody />
      </ScreenState>
    </PageContainer>
  );
}
