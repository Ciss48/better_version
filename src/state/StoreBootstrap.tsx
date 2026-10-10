'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { createBrowserSupabase } from '@/data/supabase/client';
import { DATA_BACKEND } from '@/lib/env';
import { setStorageNamespace } from './storage-namespace';
import { useStore } from './store';

/**
 * Loads the store once, on the client, under every route that reads it.
 *
 * In development it first mounts `src/dev/DevParams` so `?seed=` and `?now=`
 * are applied *before* `init()` reads the repository. The import lives inside a
 * `NODE_ENV !== 'production'` branch: Next inlines that constant, so in a
 * production build the branch — and with it the dev params, the seeds and the
 * sample data they pull in — is dropped from the bundle entirely.
 *
 * In supabase mode it also waits for `getUser()` before `init()`: the ritual
 * draft and UI prefs keys are namespaced by user id (`storage-namespace.ts`),
 * and `init()`'s own repository reads need a resolved session to run under.
 * The proxy has already redirected an unauthenticated request away from every
 * route this component mounts under, so this is a resolve, not a gate.
 */
const IS_DEV = process.env.NODE_ENV !== 'production';
const IS_SUPABASE = DATA_BACKEND === 'supabase';

interface DevParamsProps {
  onReady(): void;
}

export function StoreBootstrap({ children }: { children: React.ReactNode }) {
  const [DevParams, setDevParams] = useState<ComponentType<DevParamsProps> | null>(null);
  // In a production build there is nothing to wait for, so the store may load
  // on the very first effect.
  const [devDone, setDevDone] = useState(!IS_DEV);
  const [authDone, setAuthDone] = useState(!IS_SUPABASE);
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
    if (!IS_SUPABASE) return;
    let cancelled = false;
    void createBrowserSupabase()
      .auth.getUser()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error('[auth] could not resolve the session.', error);
        setStorageNamespace(data.user?.id ?? null);
      })
      .catch((error: unknown) => {
        console.error('[auth] could not resolve the session.', error);
      })
      .finally(() => {
        if (!cancelled) setAuthDone(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (devDone && authDone) void useStore.getState().init();
  }, [devDone, authDone]);

  return (
    <>
      {DevParams === null ? null : <DevParams onReady={onReady} />}
      {children}
    </>
  );
}
