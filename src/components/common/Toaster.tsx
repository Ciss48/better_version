'use client';

import { Toaster as Sonner } from 'sonner';

/**
 * Sonner styled as the toast from design/handoff/components.md: a pill on
 * `ink` with `bg` text, centred at the bottom — 92px up on mobile to clear the
 * tab bar, 24px from the `app:` breakpoint — closing itself after 2.6s.
 *
 * The offsets are set as CSS variables rather than through sonner's `offset`
 * props so they switch at *our* 720px breakpoint, not sonner's 600px one.
 * Motion: design/handoff/motion.md §6.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      duration={2600}
      gap={10}
      className="[--mobile-offset-bottom:92px] [--offset-bottom:92px] app:[--offset-bottom:24px]"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'mx-auto flex w-fit max-w-[calc(100vw-32px)] items-center justify-center ' +
            'rounded-pill bg-ink px-5 py-3 text-center text-body-sm text-bg shadow-lg',
          title: 'font-sans',
        },
      }}
    />
  );
}
