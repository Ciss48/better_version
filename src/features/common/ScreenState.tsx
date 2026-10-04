'use client';

import { EmptyState } from '@/components/common/EmptyState';
import { t } from '@/lib/copy';
import { cn } from '@/lib/utils';
import { useStore } from '@/state/store';

/**
 * The frame every screen sits in. While the store loads it shows a quiet paper
 * skeleton — no spinner, no "Đang tải…": the first paint should feel like a
 * blank page of the notebook, not like software working.
 *
 * `data-ready="true"` lands on the screen root the moment real content is on
 * screen; the screenshot script and the e2e specs wait for it instead of
 * guessing with timeouts.
 */
export interface ScreenStateProps {
  /** Rough shape of the skeleton, so it does not jump when content arrives. */
  skeleton?: 'today' | 'ritual' | 'settings' | 'onboarding';
  children: React.ReactNode;
  className?: string;
}

const BLOCK = 'rounded-card bg-line-2';

const SHAPES: Record<NonNullable<ScreenStateProps['skeleton']>, string[]> = {
  today: ['h-4 w-32 rounded-pill', 'h-10 w-64', 'h-[54px] w-full rounded-pill', 'h-48 w-full'],
  ritual: ['h-4 w-40 rounded-pill', 'h-1.5 w-full rounded-pill', 'h-9 w-72', 'h-56 w-full'],
  settings: ['h-4 w-24 rounded-pill', 'h-10 w-56', 'h-44 w-full', 'h-28 w-full'],
  onboarding: ['h-2.5 w-20 rounded-pill', 'h-10 w-72', 'h-24 w-full', 'h-24 w-full'],
};

export function ScreenState({ skeleton = 'today', children, className }: ScreenStateProps) {
  const status = useStore((s) => s.status);

  if (status === 'ready') {
    return (
      <div data-ready="true" className={className}>
        {children}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div data-ready="false" className={className}>
        <EmptyState title={t('common.loadError')} variant="soft" />
      </div>
    );
  }

  return (
    <div
      data-ready="false"
      aria-busy="true"
      className={cn('flex animate-pulse flex-col gap-5 opacity-60', className)}
    >
      {SHAPES[skeleton].map((shape, index) => (
        <div key={index} className={cn(BLOCK, shape)} />
      ))}
    </div>
  );
}
