'use client';

import { useTheme } from 'next-themes';
import { useEffect, useMemo } from 'react';
import { logicalDate } from '@/domain';
import { ClockProvider } from '@/lib/clock';
import type { ClockValue } from '@/lib/clock';
import { useNow } from './clock-source';
import { useStore } from './store';
import { registerThemeSetter } from './theme-bridge';

/**
 * Turns the single clock source plus the user's settings into the `ClockValue`
 * every component below reads with `useClock()`. One place decides what "now"
 * and "today" are; nothing under it calls `new Date()`.
 *
 * It also hands next-themes' `setTheme` to the store, so saving a theme in
 * Settings switches the live `.dark` class.
 */
export function ClockBridge({ children }: { children: React.ReactNode }) {
  const now = useNow();
  const settings = useStore((s) => s.settings);
  const { setTheme } = useTheme();

  useEffect(() => {
    registerThemeSetter(setTheme);
    return () => registerThemeSetter(null);
  }, [setTheme]);

  const value = useMemo<ClockValue>(
    () => ({ now, today: logicalDate(now, settings), settings }),
    [now, settings],
  );

  return <ClockProvider value={value}>{children}</ClockProvider>;
}
