'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { getRepository, isSeedable } from '@/data';
import { setNowOverride, restoreNowOverride } from '@/state/clock-source';
import { buildSeed, isSeedName } from './seeds';

/**
 * Dev-only URL parameters, applied **before** the store loads:
 *
 * - `?seed=<name>` wipes the repository and writes that dataset (see `seeds.ts`)
 * - `?now=<ISO instant>` freezes the clock for the session; `?now=off` clears it
 *
 * Both params are then removed from the URL, so a reload neither re-seeds nor
 * loses the frozen clock — that is what makes "change something, reload, it is
 * still there" testable.
 *
 * `StoreBootstrap` reaches this module through a dynamic `import()` behind a
 * `NODE_ENV !== 'production'` check, so neither this component nor the sample
 * data it pulls in exists in a production bundle.
 */
export interface DevParamsProps {
  /** Called once the params have been applied — the store may load now. */
  onReady(): void;
}

export function DevParams({ onReady }: DevParamsProps) {
  const router = useRouter();
  const pathname = usePathname();
  // The params are applied exactly once per page load; `router.replace` below
  // changes the URL, which must not start the work again.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        restoreNowOverride();

        // Read straight from the location: `useSearchParams` would force every
        // page mounting this into a Suspense boundary for no benefit here.
        const params = new URLSearchParams(window.location.search);
        const nowParam = params.get('now');
        const seedParam = params.get('seed');

        if (nowParam !== null) {
          if (nowParam === 'off') {
            setNowOverride(null);
          } else {
            const instant = new Date(nowParam);
            if (Number.isNaN(instant.getTime())) {
              console.warn(`[dev] ?now=${nowParam} is not an instant — ignoring it.`);
            } else {
              setNowOverride(instant);
            }
          }
        }

        if (seedParam !== null) {
          if (!isSeedName(seedParam)) {
            console.warn(`[dev] unknown ?seed=${seedParam} — ignoring it.`);
          } else {
            const repo = getRepository();
            await repo.reset();
            if (isSeedable(repo)) await repo.seed(buildSeed(seedParam));
            else console.warn('[dev] this repository cannot be seeded.');
            // A seed is a new world: any half-finished ritual belongs to the
            // old one. `bed:v1:ui` is deliberately left alone — the screenshot
            // script presets it to open Today in matrix view.
            for (const key of Object.keys(window.localStorage)) {
              if (key.startsWith('bed:v1:ritual:')) window.localStorage.removeItem(key);
            }
          }
        }

        if (nowParam !== null || seedParam !== null) {
          params.delete('now');
          params.delete('seed');
          const query = params.toString();
          router.replace(query === '' ? pathname : `${pathname}?${query}`, { scroll: false });
        }
      } catch (error) {
        console.error('[dev] applying URL params failed.', error);
      } finally {
        onReady();
      }
    })();
  }, [onReady, pathname, router]);

  return null;
}
