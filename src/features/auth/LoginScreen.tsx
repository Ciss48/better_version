'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/data/supabase/client';
import { t } from '@/lib/copy';
import type { CopyKey } from '@/lib/copy';
import { safeNext } from '@/lib/safe-next';

/** How long "Gửi lại" stays disabled after a link is sent. */
const RESEND_WAIT_SECONDS = 60;

type Status = 'idle' | 'sending' | 'sent' | 'error';
type ErrorKind = 'invalidEmail' | 'rateLimit' | 'link' | 'generic';

const ERROR_COPY: Record<ErrorKind, CopyKey> = {
  invalidEmail: 'auth.error.invalidEmail',
  rateLimit: 'auth.error.rateLimit',
  link: 'auth.error.link',
  generic: 'auth.error.generic',
};

/** A loose but deliberately permissive check — Supabase is the real validator. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function errorKindOf(error: { status?: number; code?: string } | null): ErrorKind {
  if (error === null) return 'generic';
  if (error.status === 429 || error.code === 'over_email_send_rate_limit') return 'rateLimit';
  if (error.status === 400 || error.code === 'validation_failed') return 'invalidEmail';
  return 'generic';
}

function LoginBody() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const linkError = searchParams.get('error') === 'link';

  const [email, setEmail] = useState('');
  // The link error is a fact about this render's URL, not an external event —
  // derived directly rather than synced in an effect.
  const [status, setStatus] = useState<Status>(linkError ? 'error' : 'idle');
  const [errorKind, setErrorKind] = useState<ErrorKind>('link');
  const [resendInSeconds, setResendInSeconds] = useState(0);
  const [sentEmail, setSentEmail] = useState('');

  useEffect(() => {
    if (resendInSeconds <= 0) return;
    const id = window.setInterval(() => {
      setResendInSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendInSeconds]);

  async function send(address: string): Promise<void> {
    if (!looksLikeEmail(address)) {
      setErrorKind('invalidEmail');
      setStatus('error');
      return;
    }

    setStatus('sending');
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await createBrowserSupabase().auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setErrorKind(errorKindOf(error));
      setStatus('error');
      return;
    }

    setSentEmail(address);
    setResendInSeconds(RESEND_WAIT_SECONDS);
    setStatus('sent');
  }

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <p className="text-label font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t('auth.kicker')}
        </p>
        <h1 className="font-display text-display-md app:text-display-lg">
          {status === 'sent' ? t('auth.sentTitle') : t('auth.title')}
        </h1>
        {status === 'sent' ? null : <p className="text-ink-2">{t('auth.body')}</p>}
      </div>

      {status === 'sent' ? (
        <div className="flex flex-col gap-3">
          <p className="text-ink">{t('auth.sentBody', { email: sentEmail })}</p>
          <button
            type="button"
            disabled={resendInSeconds > 0}
            onClick={() => void send(sentEmail)}
            className="self-start rounded-pill px-1 text-body-sm font-semibold text-accent-ink transition-colors duration-150 enabled:hover:underline disabled:text-ink-3"
          >
            {resendInSeconds > 0
              ? t('auth.resendWait', { seconds: resendInSeconds })
              : t('auth.resend')}
          </button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send(email);
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-body-sm font-semibold">{t('auth.emailLabel')}</span>
            <input
              // `type="text"`, not `email`: the browser's own format error
              // would otherwise block submission silently, before `looksLikeEmail`
              // ever runs — and bypass the house copy in `auth.error.invalidEmail`.
              type="text"
              inputMode="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="h-[50px] rounded-pill border-2 border-line bg-bg px-[18px] text-[15px] transition-colors duration-200 focus:border-accent focus:outline-none"
            />
          </label>

          {status === 'error' ? (
            <p role="alert" className="text-body-sm text-ink-2">
              {t(ERROR_COPY[errorKind])}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="inline-flex h-[50px] items-center justify-center rounded-pill bg-accent px-6 text-[15px] font-semibold text-on-accent transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
          >
            {status === 'sending' ? t('auth.sending') : t('auth.submit')}
          </button>
        </form>
      )}
    </div>
  );
}

export function LoginScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-ink">
      <main className="w-full max-w-[480px] rounded-panel bg-paper p-8">
        <div className="mb-6 flex items-center gap-2">
          <span className="font-num text-[19px] leading-tight">{t('app.name')}</span>
        </div>
        <LoginBody />
      </main>
    </div>
  );
}
