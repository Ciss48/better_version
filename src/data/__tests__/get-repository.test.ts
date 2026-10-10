// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `DATA_BACKEND` is read once at import time (`src/lib/env.ts`), so each case
 * stubs the env, resets the module cache, and re-imports fresh — the only way
 * to observe both branches of `getRepository()`'s selection.
 */
describe('getRepository() — backend selection', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('returns a LocalRepository when NEXT_PUBLIC_DATA_BACKEND=local', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'local');
    const { getRepository, LocalRepository } = await import('../index');
    expect(getRepository()).toBeInstanceOf(LocalRepository);
  });

  it('returns a SupabaseRepository by default (supabase mode)', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://stub.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'stub-anon-key');
    const { getRepository, SupabaseRepository } = await import('../index');
    expect(getRepository()).toBeInstanceOf(SupabaseRepository);
  });

  it('throws at import when supabase mode has no credentials', async () => {
    vi.stubEnv('NEXT_PUBLIC_DATA_BACKEND', 'supabase');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    await expect(import('../../lib/env')).rejects.toThrow(/NEXT_PUBLIC_SUPABASE/);
  });
});
