'use client';

import { CornerDownLeft, Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseQuickAdd } from '@/domain';
import type { ParsedTask } from '@/domain';
import { t } from '@/lib/copy';
import { useShortcut } from '@/lib/hooks/use-shortcut';
import { cn } from '@/lib/utils';

export interface TaskInputProps {
  locked: boolean;
  onAdd(p: ParsedTask): void;
  placeholder?: string;
  /** Registers `N` and `/` to focus the field. */
  enableShortcut?: boolean;
  /** `tomorrow` hides the locked hint and uses the ritual placeholder. */
  scope?: 'today' | 'tomorrow';
  /** Starting text — the gallery uses it to show the preview chips. */
  defaultValue?: string;
  /** The quick-add legend under the field. Ritual step 3 hides it. */
  showSyntax?: boolean;
  className?: string;
}

const SYNTAX = [
  { token: '*', labelKey: 'today.input.syntax.mit' },
  { token: '!', labelKey: 'today.input.syntax.important' },
  { token: '^', labelKey: 'today.input.syntax.urgent' },
  { token: '~S ~M ~L', labelKey: 'today.input.syntax.size' },
] as const;

/** The chips shown inside the field while the quick-add syntax is in play. */
function previewChips(parsed: ParsedTask | null): string[] {
  if (parsed === null) return [];
  const chips: string[] = [];
  if (parsed.mit) chips.push(t('today.input.syntax.mit'));
  if (parsed.important) chips.push(t('today.input.syntax.important'));
  if (parsed.urgent) chips.push(t('today.input.syntax.urgent'));
  if (parsed.size !== null) chips.push(t('today.input.previewSize', { size: parsed.size }));
  return chips;
}

/** Quick add. Parsing is the domain's job; this only reports the intent. */
export function TaskInput({
  locked,
  onAdd,
  placeholder,
  enableShortcut = false,
  scope = 'today',
  defaultValue = '',
  showSyntax = true,
  className,
}: TaskInputProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useShortcut(
    ['n', '/'],
    (event) => {
      event.preventDefault();
      inputRef.current?.focus();
    },
    { enabled: enableShortcut },
  );

  const parsed = parseQuickAdd(value);
  const chips = previewChips(parsed);

  function submit() {
    if (parsed === null) return;
    onAdd(parsed);
    setValue('');
  }

  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <div
        className={cn(
          'flex min-h-[54px] items-center gap-2.5 rounded-pill border-2 border-line bg-bg',
          'py-1.5 pl-[18px] pr-[7px] transition-colors duration-200',
          'focus-within:border-accent',
        )}
      >
        <Plus size={18} strokeWidth={2.75} className="shrink-0 text-ink-3" aria-hidden />
        {/* The field and its preview chips share one clipping box, so a long
            chip row can never push the Enter button off a narrow screen. */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden">
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
              if (event.key === 'Escape') event.currentTarget.blur();
            }}
            placeholder={
              placeholder ??
              (scope === 'tomorrow' ? t('ritual.step3.placeholder') : t('today.input.placeholder'))
            }
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-body-lg text-ink outline-none placeholder:text-ink-3"
          />
          {chips.map((chip) => (
            <span
              key={chip}
              className="shrink-0 rounded-pill bg-accent-soft px-2.5 py-1 text-[11.5px] font-semibold text-accent-ink"
            >
              {chip}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          aria-label={t('today.input.addAria')}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-bg"
        >
          <CornerDownLeft size={17} strokeWidth={2.75} aria-hidden />
        </button>
      </div>

      {showSyntax ? (
        <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 pl-[18px] text-caption text-ink-3">
          {SYNTAX.map((item) => (
            <span key={item.token}>
              <b className="font-mono text-ink-2">{item.token}</b> {t(item.labelKey)}
            </span>
          ))}
          {locked && scope === 'today' ? (
            <span className="text-accent-ink">{t('today.input.lockedHint')}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
