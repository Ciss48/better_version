'use client';

import { RadioGroup, RadioItem } from '@/components/ui/radio-group';
import type { Reflection } from '@/domain';
import { t, tRaw } from '@/lib/copy';
import { cn } from '@/lib/utils';

export interface ReflectionFormProps {
  value: Reflection;
  onChange(v: Reflection): void;
  className?: string;
}

type Energy = Reflection['energy'];

const LEVELS: Exclude<Energy, 0>[] = [1, 2, 3, 4, 5];

const FIELD =
  'h-[50px] rounded-pill border-2 border-line bg-bg px-5 text-body-lg text-ink outline-none ' +
  'transition-colors duration-200 placeholder:text-ink-3 focus:border-accent';

/**
 * Ritual step 2: the five-circle energy scale plus two optional one-liners.
 * Base UI's radio group never reports a click on the already-selected item, so
 * the "click 4 again to clear it" rule is handled by an explicit onClick.
 */
export function ReflectionForm({ value, onChange, className }: ReflectionFormProps) {
  const labels = tRaw<string[]>('ritual.step2.energyLevels');

  function setEnergy(energy: Energy) {
    onChange({ ...value, energy });
  }

  return (
    <div className={cn('flex flex-col gap-[22px]', className)}>
      <div className="flex flex-col gap-3">
        <span className="text-body-sm font-semibold">{t('ritual.step2.energy')}</span>
        <RadioGroup
          aria-label={t('ritual.step2.energy')}
          value={String(value.energy)}
          onValueChange={(next) => setEnergy(Number(next) as Energy)}
          className="gap-2"
        >
          {LEVELS.map((level) => {
            const on = value.energy === level;
            return (
              <RadioItem
                key={level}
                value={String(level)}
                aria-label={labels[level - 1]}
                onClick={() => {
                  if (on) setEnergy(0);
                }}
                className="flex w-[72px] cursor-pointer flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    'grid size-[52px] place-items-center rounded-full font-num text-[20px]',
                    'transition-all duration-[220ms] [transition-timing-function:var(--ease-spring-soft)]',
                    on
                      ? 'scale-[1.08] bg-success text-on-accent shadow-[inset_0_0_0_2px_var(--success)]'
                      : 'scale-100 bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--line)]',
                  )}
                >
                  {level}
                </span>
                <span className={cn('text-[12px]', on ? 'text-ink' : 'text-ink-3')}>
                  {labels[level - 1]}
                </span>
              </RadioItem>
            );
          })}
        </RadioGroup>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-body-sm font-semibold">{t('ritual.step2.good.label')}</span>
        <input
          value={value.good}
          onChange={(event) => onChange({ ...value, good: event.target.value })}
          placeholder={t('ritual.step2.good.placeholder')}
          className={FIELD}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-body-sm font-semibold">{t('ritual.step2.improve.label')}</span>
        <input
          value={value.improve}
          onChange={(event) => onChange({ ...value, improve: event.target.value })}
          placeholder={t('ritual.step2.improve.placeholder')}
          className={FIELD}
        />
      </label>
    </div>
  );
}
