'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/data/supabase/client';
import { t } from '@/lib/copy';
import { useStore } from '@/state/store';
import { SettingsSection } from './SettingsSection';

/**
 * Supabase mode only (the caller decides whether to render this). Signing out
 * clears the Supabase session cookie, drops the in-memory store back to its
 * pre-`init()` state (`store.ts`'s `signOut()` — a stale task list must not
 * flash for the next account on this browser), then leaves `/settings`.
 */
export function AccountSection() {
  const router = useRouter();
  const signOutFromStore = useStore((s) => s.signOut);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void createBrowserSupabase()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setEmail(data.user?.email ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut(): Promise<void> {
    await createBrowserSupabase().auth.signOut();
    signOutFromStore();
    router.replace('/login');
  }

  return (
    <SettingsSection title={t('settings.account.title')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-ink-2">
          {email === null ? '' : t('settings.account.signedInAs', { email })}
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex h-[42px] items-center rounded-pill border-2 border-line px-[18px] text-body-sm font-medium transition-colors duration-150 hover:bg-hover"
        >
          {t('settings.account.signOut')}
        </button>
      </div>
    </SettingsSection>
  );
}
