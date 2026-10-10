import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerSupabase } from '@/data/supabase/server';
import { DATA_BACKEND } from '@/lib/env';
import { safeNext } from '@/lib/safe-next';

/**
 * The PKCE landing page for a magic link: `signInWithOtp` points
 * `emailRedirectTo` here with the original `?next=`, and this handler
 * exchanges the `?code=` for a session cookie before sending the browser on.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get('next'));

  if (DATA_BACKEND !== 'supabase') {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const code = url.searchParams.get('code');
  if (code === null) {
    return NextResponse.redirect(new URL('/login?error=link', request.url));
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL('/login?error=link', request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
