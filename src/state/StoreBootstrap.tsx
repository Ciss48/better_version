'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { useStore } from './store';

/**
 * Loads the store once, on the client, under every route that reads it.
 *
 * In development it first mounts `src/dev/DevParams` so `?seed=` and `?now=`
 * are applied *before* `init()` reads the repository. The import lives inside a
 * `NODE_ENV !== 'production'` branch: Next inlines that constant, so in a
 * production build the branch — and with it the dev params, the seeds and the
 * sample data they pull in — is dropped from the bundle entirely.
 */
const IS_DEV = process.env.NODE_ENV !== 'production';

interface DevParamsProps {
  onReady(): void;
}

export function StoreBootstrap({ children }: { children: React.ReactNode }) {
  const [DevParams, setDevParams] = useState<ComponentType<DevParamsProps> | null>(null);
  // In a production build there is nothing to wait for, so the store may load
  // on the very first effect.
  const [devDone, setDevDone] = useState(!IS_DEV);
  const onReady = useCallback(() => setDevDone(true), []);

  useEffect(() => {
    if (!IS_DEV) return;
    let cancelled = false;
    void import('@/dev/DevParams')
      .then((module) => {
        if (!cancelled) setDevParams(() => module.DevParams);
      })
      .catch((error: unknown) => {
        console.error('[dev] could not load the URL-param handler.', error);
        if (!cancelled) setDevDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (devDone) void useStore.getState().init();
  }, [devDone]);

  return (
    <>
      {DevParams === null ? null : <DevParams onReady={onReady} />}
      {children}
    </>
  );
}
