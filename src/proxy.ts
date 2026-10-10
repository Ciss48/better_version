import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DATA_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

/**
 * Route protection for supabase mode — Next 16 renamed `middleware.ts` to
 * `proxy.ts` (same mechanism, same single-file-per-project rule); see
 * `node_modules/next/dist/lib/constants.js` (`PROXY_FILENAME`).
 *
 * `getUser()`, not `getSession()`: it revalidates the token with the auth
 * server, which is what makes it safe to gate a route on. The call also
 * refreshes an expiring session — the `setAll` plumbing below exists so that
 * refreshed cookies reach the browser on the response this proxy returns.
 */
const PROTECTED = [
  '/today',
  '/ritual',
  '/stats',
  '/history',
  '/settings',
  '/goals',
  '/weekly',
  '/more',
  '/onboarding',
];

function isProtected(pathname: string): boolean {
  return PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  // Local mode (dev, the e2e suite) runs on localStorage; there is no session
  // to check.
  if (DATA_BACKEND !== 'supabase') return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      // Must match the browser and route-handler clients' encoding — see
      // src/data/supabase/client.ts.
      encode: 'tokens-only',
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (user === null && isProtected(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  if (user !== null && pathname === '/login') {
    const todayUrl = request.nextUrl.clone();
    todayUrl.pathname = '/today';
    todayUrl.search = '';
    return NextResponse.redirect(todayUrl);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets, Next internals, /auth/* (the PKCE
    // callback, which must run unauthenticated) and /dev/* (never shipped to
    // production, see next.config.ts's pageExtensions).
    '/((?!_next/static|_next/image|favicon\\.ico|auth/|dev/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)',
  ],
};
