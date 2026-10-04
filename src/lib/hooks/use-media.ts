'use client';

import { useEffect, useState } from 'react';

/** The `app:` breakpoint from tokens.css (--breakpoint-app: 45rem). */
const DESKTOP_QUERY = '(min-width: 45rem)';

/**
 * `true` at or above the 720px app breakpoint, `false` below it, and
 * `undefined` until mounted — the server cannot know the viewport, so callers
 * can hold off on rendering either branch during the first paint.
 */
export function useIsDesktop(): boolean | undefined {
  const [isDesktop, setIsDesktop] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return isDesktop;
}
