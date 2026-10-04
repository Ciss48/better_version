'use client';

import { Bell } from 'lucide-react';
import { Kbd } from '@/components/common/Kbd';
import { cn } from '@/lib/utils';

export type BannerVariant = 'ritual' | 'planReminder' | 'missedDay' | 'complete' | 'welcome';

export interface BannerProps {
  variant: BannerVariant;
  title: string;
  body?: string;
  primary?: { label: string; onClick(): void; kbd?: string };
  secondary?: { label: string; onClick(): void };
  /** Quiet line beside the primary action — `welcome` uses it for its CTA hint. */
  hint?: string;
  /** `welcome` passes its three step cards here. */
  children?: React.ReactNode;
  className?: string;
}

const SURFACE: Record<BannerVariant, string> = {
  ritual: 'bg-surface',
  planReminder: 'bg-accent-soft',
  missedDay: 'bg-accent-soft',
  complete: 'bg-success-soft',
  welcome: 'bg-surface',
};

/** `ritual` and `planReminder` put their action beside the text; the rest stack. */
const INLINE_ACTIONS: BannerVariant[] = ['ritual', 'planReminder'];

/**
 * The contextual messages at the top of Today. Never pulls focus: `role=status`
 * with a polite live region (design/handoff/components.md).
 */
export function Banner({
  variant,
  title,
  body,
  primary,
  secondary,
  hint,
  children,
  className,
}: BannerProps) {
  const inline = INLINE_ACTIONS.includes(variant);

  const actions =
    primary === undefined && secondary === undefined ? null : (
      <div className="flex flex-wrap items-center gap-1.5">
        {secondary === undefined ? null : (
          <button
            type="button"
            onClick={secondary.onClick}
            className="h-11 rounded-pill px-3.5 text-body-sm text-ink-2 transition-colors duration-[150ms] hover:bg-hover"
          >
            {secondary.label}
          </button>
        )}
        {primary === undefined ? null : (
          <button
            type="button"
            onClick={primary.onClick}
            className={cn(
              'inline-flex items-center gap-2.5 rounded-pill bg-accent font-semibold text-on-accent',
              'transition-colors duration-[150ms] hover:bg-accent-hover',
              variant === 'welcome' ? 'h-[46px] px-[22px] text-[14.5px]' : 'h-11 text-[14.5px]',
              primary.kbd === undefined ? 'px-5' : 'pl-5 pr-2.5',
            )}
          >
            {primary.label}
            {primary.kbd === undefined ? null : (
              <Kbd className="rounded-pill bg-[color-mix(in_srgb,var(--on-accent)_22%,transparent)] px-[7px] py-[3px] text-[11px] text-on-accent">
                {primary.kbd}
              </Kbd>
            )}
          </button>
        )}
        {hint === undefined ? null : <span className="text-caption text-ink-3">{hint}</span>}
      </div>
    );

  return (
    <section
      role="status"
      data-variant={variant}
      className={cn(
        'relative overflow-hidden rounded-card',
        SURFACE[variant],
        inline
          ? 'flex flex-wrap items-center justify-between gap-x-5 gap-y-3.5 py-[18px] pl-6 pr-[18px]'
          : 'flex flex-col gap-[18px] px-6 py-[22px]',
        className,
      )}
    >
      {variant === 'complete' ? (
        <>
          <span
            className="pointer-events-none absolute -top-10 -right-[30px] size-[140px] rounded-full bg-success opacity-25"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute -bottom-[26px] right-[70px] size-[60px] rounded-full bg-accent opacity-25"
            aria-hidden
          />
        </>
      ) : null}

      <div
        className={cn(
          'flex min-w-0 gap-3.5',
          inline ? 'flex-1 basis-[240px] items-start' : 'flex-col gap-1.5',
        )}
      >
        {variant === 'planReminder' ? (
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
            aria-hidden
          >
            <Bell size={18} strokeWidth={2.75} />
          </span>
        ) : null}

        <div className="flex min-w-0 flex-col gap-1.5">
          <p
            className={cn(
              inline
                ? 'font-semibold text-ink'
                : cn(
                    'font-display text-display-sm',
                    variant === 'complete' ? 'text-success-ink' : 'text-ink',
                  ),
            )}
          >
            {title}
          </p>
          {body === undefined ? null : (
            <p
              className={cn(
                'text-pretty text-ink-2',
                inline ? 'text-body-sm' : 'max-w-[460px]',
              )}
            >
              {body}
            </p>
          )}
        </div>
      </div>

      {children}

      {inline ? actions : actions === null ? null : <div>{actions}</div>}
    </section>
  );
}
