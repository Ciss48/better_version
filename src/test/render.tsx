import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { DEFAULT_SETTINGS } from '@/domain';
import { ClockProvider } from '@/lib/clock';
import type { ClockValue } from '@/lib/clock';

/** 14:10 Saturday 2026-10-03 in Asia/Ho_Chi_Minh — the gallery's fixed clock. */
export const TEST_CLOCK: ClockValue = {
  now: new Date('2026-10-03T07:10:00Z'),
  today: '2026-10-03',
  settings: DEFAULT_SETTINGS,
};

/**
 * `render` with a ClockProvider around the tree. Every component that reads
 * `useClock()` — directly or through a child — must be rendered with this.
 *
 * The provider is passed as RTL's `wrapper`, so `rerender()` keeps it.
 */
export function renderWithClock(
  ui: React.ReactNode,
  value: Partial<ClockValue> = {},
  options?: Omit<RenderOptions, 'wrapper'>,
): RenderResult {
  const clock: ClockValue = { ...TEST_CLOCK, ...value };
  return render(ui, {
    ...options,
    wrapper: ({ children }) => <ClockProvider value={clock}>{children}</ClockProvider>,
  });
}
