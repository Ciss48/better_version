import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';
import type { Database } from './database.types';

export type ServerSupabase = SupabaseClient<Database>;

/**
 * A request-scoped client for route handlers (`/auth/callback`).
 *
 * Never memoised: one client per request, as `@supabase/ssr` requires — sharing
 * one across requests would hand one visitor's session to the next.
 *
 * Session refreshes are written back through Next's cookie store. A Server
 * Component cannot set cookies, so `setAll` swallows that one failure: when it
 * happens, `src/proxy.ts` has already refreshed the session for this request.
 */
export async function createServerSupabase(): Promise<ServerSupabase> {
  const store = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      // Must match the browser client's encoding (`client.ts`) — otherwise
      // one side writes a full user-and-tokens cookie the other can't read.
      encode: 'tokens-only',
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Read-only cookie store (a Server Component) — the proxy owns the refresh.
        }
      },
    },
  });
}
