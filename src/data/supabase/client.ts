import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from './database.types';

export type BrowserSupabase = SupabaseClient<Database>;

let client: BrowserSupabase | null = null;

/**
 * The browser client, as a singleton.
 *
 * `@supabase/ssr`'s browser client keeps the session in **cookies** rather than
 * localStorage, which is what lets `src/proxy.ts` read it on the server and
 * redirect an unauthenticated request before any screen renders. PKCE is the
 * default flow, so the magic link carries a `?code=` that only this browser can
 * exchange.
 *
 * `encode: 'tokens-only'` keeps the full user object out of the cookie
 * (otherwise the default `'user-and-tokens'` encoding chunks it across several
 * `sb-*-auth-token.N` cookies, large enough to push the browser's combined
 * `Cookie` header past Node's request header size limit — a 431 on every
 * request after sign-in). Must match the server client's setting.
 */
export function createBrowserSupabase(): BrowserSupabase {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: { encode: 'tokens-only' },
  });
  return client;
}

/** Tests only: drops the memoised client so the next call builds a fresh one. */
export function resetBrowserSupabase(): void {
  client = null;
}
