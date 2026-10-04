'use client';

import { Moon, Sun } from 'lucide-react';
import { RadioGroup, RadioItem } from '@/components/ui/radio-group';
import type { Habit } from '@/domain';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface HabitCardGroupProps {
  value: Habit;
  onChange(h: Habit): void;
  className?: string;
}

const CARDS: { habit: Habit; icon: typeof Moon; keys: Record<string, CopyKey> }[] = [
  {
    habit: 'evening',
    icon: Moon,
    keys: {
      title: 'onboarding.step1.evening.title',
      body: 'onboarding.step1.evening.body',
      window: 'onboarding.step1.evening.window',
    },
  },
  {
    habit: 'morning',
    icon: Sun,
    keys: {
      title: 'onboarding.step1.morning.title',
      body: 'onboarding.step1.morning.body',
      window: 'onboarding.step1.morning.window',
    },
  },
];

/** Onboarding step 1: two radio cards. The chosen one fills and gains an accent ring. */
export function HabitCardGroup({ value, onChange, className }: HabitCardGroupProps) {
  return (
    <RadioGroup
      aria-label={t('settings.window.habit')}
      value={value}
      onValueChange={(next) => {
        if (next === 'evening' || next === 'morning') onChange(next);
      }}
      className={cn('flex-col gap-2.5', className)}
    >
      {CARDS.map((card) => {
        const on = card.habit === value;
        const Icon = card.icon;
        return (
          <RadioItem
            key={card.habit}
            value={card.habit}
            className={cn(
              'flex w-full items-start gap-4 rounded-card p-5 text-left transition-all duration-200',
              on
                ? 'bg-surface shadow-[inset_0_0_0_2px_var(--accent)]'
                : 'bg-transparent shadow-[inset_0_0_0_2px_var(--line)]',
            )}
          >
            <span
              className={cn(
                'grid size-12 shrink-0 place-items-center rounded-full',
                on ? 'bg-accent text-on-accent' : 'bg-line-2 text-ink-2',
              )}
            >
              <Icon size={22} strokeWidth={2.75} aria-hidden />
            </span>
            <span className="flex flex-col gap-1">
              <b className="text-[17px] font-semibold">{t(card.keys.title)}</b>
              <span className="text-body-sm leading-[1.45] text-ink-2">{t(card.keys.body)}</span>
              <span className="text-[12.5px] text-ink-3">{t(card.keys.window)}</span>
            </span>
          </RadioItem>
        );
      })}
    </RadioGroup>
  );
}
