'use client';

import { createContext, useContext } from 'react';
import type { ISODate, Settings } from '@/domain';

/**
 * The injected clock. Components never call `new Date()`: the screen that owns
 * the state decides what "now", "today" and the user's settings are, and every
 * component below reads them from here. Tests and the /dev playgrounds pin the
 * value so renders are deterministic.
 */
export interface ClockValue {
  now: Date;
  today: ISODate;
  settings: Settings;
}

const ClockContext = createContext<ClockValue | null>(null);

export function ClockProvider({
  value,
  children,
}: {
  value: ClockValue;
  children: React.ReactNode;
}) {
  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useClock(): ClockValue {
  const value = useContext(ClockContext);
  if (value === null) {
    throw new Error(
      'useClock() was called outside a <ClockProvider>. Wrap the tree in one — see src/lib/clock.tsx.',
    );
  }
  return value;
}
