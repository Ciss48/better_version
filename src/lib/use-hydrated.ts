'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * `false` while rendering on the server and during hydration, `true` afterwards.
 * Use it to defer client-only values (theme, media queries) so the first paint
 * matches the server HTML without a setState-in-effect round trip.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
