'use client';

import { useMemo } from 'react';
import { AppShell } from '@/components/app-shell/AppShell';
import { useClock } from '@/lib/clock';
import { consistencyView } from '@/state/selectors';
import { useStore } from '@/state/store';

/**
 * `AppShell` stays prop-only; this is the one client component that feeds it
 * from the store, so the sidebar's consistency card shows the real 30 days.
 */
export function AppShellLive({ children }: { children: React.ReactNode }) {
  const { today } = useClock();
  const state = useStore();
  const days = useMemo(
    () => (state.status === 'ready' ? consistencyView(state, today).days : undefined),
    [state, today],
  );

  return <AppShell consistencyDays={days}>{children}</AppShell>;
}
