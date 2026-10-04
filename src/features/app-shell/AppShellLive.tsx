'use client';

import { useTheme } from 'next-themes';
import { useEffect, useMemo } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';
import type { Theme } from '@/domain';
import { useClock } from '@/lib/clock';
import { consistencyView } from '@/state/selectors';
import { useStore } from '@/state/store';

const THEMES: Theme[] = ['light', 'dark', 'system'];

/**
 * `AppShell` stays prop-only; this is the one client component that feeds it
 * from the store, so the sidebar's consistency card shows the real 30 days.
 *
 * It also keeps the two sources of theme in step. next-themes owns what is on
 * screen — the `T` shortcut and the sidebar button go straight to it — while
 * `settings.theme` is what a fresh device starts from. Whenever the live choice
 * moves, this writes it back, so the Settings screen can never disagree with
 * the page the user is looking at.
 */
export function AppShellLive({ children }: { children: React.ReactNode }) {
  const { today } = useClock();
  const state = useStore();
  const { theme } = useTheme();
  const { status, settings, updateSettings } = state;

  const days = useMemo(
    () => (status === 'ready' ? consistencyView(state, today).days : undefined),
    [state, status, today],
  );

  useEffect(() => {
    if (status !== 'ready') return;
    if (theme === undefined || !THEMES.includes(theme as Theme)) return;
    if (theme === settings.theme) return;
    void updateSettings({ theme: theme as Theme });
  }, [status, theme, settings.theme, updateSettings]);

  return <AppShell consistencyDays={days}>{children}</AppShell>;
}
