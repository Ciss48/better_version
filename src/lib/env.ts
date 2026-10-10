/**
 * The two environment facts the app reads at runtime.
 *
 * `NEXT_PUBLIC_*` names are inlined by Next at build time, so every read here
 * is a literal member access on `process.env` — destructuring or dynamic keys
 * would not survive the bundle.
 */

export type DataBackend = 'supabase' | 'local';

/**
 * Which `Repository` the app runs on. **Supabase is the default**: `local` has
 * to be asked for explicitly (`.env.local`, the Playwright web server, the
 * screenshot scripts), which is what keeps a forgotten env var from silently
 * putting a production build back on localStorage.
 */
export const DATA_BACKEND: DataBackend =
  process.env.NEXT_PUBLIC_DATA_BACKEND === 'local' ? 'local' : 'supabase';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Fail at import, not at the first query. A missing URL or key in supabase
 * mode is a deployment mistake, and a client built on `''` fails much later
 * with an opaque network error instead.
 */
if (DATA_BACKEND === 'supabase' && (SUPABASE_URL === '' || SUPABASE_ANON_KEY === '')) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required when ' +
      'NEXT_PUBLIC_DATA_BACKEND is "supabase". Copy .env.example to .env.local, or set ' +
      'NEXT_PUBLIC_DATA_BACKEND=local to run on localStorage.',
  );
}

export const IS_SUPABASE = DATA_BACKEND === 'supabase';
