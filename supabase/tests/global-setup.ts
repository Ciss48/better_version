import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates the two throwaway auth users the contract run signs in as, and
 * deletes them again when the run finishes (cascades remove their rows).
 *
 * The **service-role key is read only here** — this file is the one place in
 * the repository allowed to import it. Every test imports the generated user
 * credentials through `inject('supabaseContractUsers')`, never the key itself.
 */

declare module 'vitest' {
  export interface ProvidedContext {
    supabaseContractUsers: {
      primary: ContractUser;
      secondary: ContractUser;
    };
  }
}

interface ContractUser {
  id: string;
  email: string;
  password: string;
}

/**
 * `.env.local` is git-ignored and is not loaded automatically outside the
 * Next.js CLI, so this standalone Node run parses it itself. CI is expected to
 * supply the three Supabase vars directly, which is why existing `process.env`
 * values always win.
 */
function loadEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"));
    if (quoted) value = value.slice(1, -1);
    process.env[key] ??= value;
  }
}

function randomContractUser(): Omit<ContractUser, 'id'> {
  return {
    email: `bed-contract-${crypto.randomUUID()}@example.com`,
    password: crypto.randomUUID(),
  };
}

export default async function setup({
  provide,
}: {
  provide: <T extends string>(key: T, value: unknown) => void;
}): Promise<() => Promise<void>> {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || serviceKey === undefined) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for pnpm test:supabase.',
    );
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  async function createContractUser(): Promise<ContractUser> {
    const { email, password } = randomContractUser();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || data.user === null) {
      throw error ?? new Error('createUser returned no user');
    }
    return { id: data.user.id, email, password };
  }

  const [primary, secondary] = await Promise.all([createContractUser(), createContractUser()]);

  provide('supabaseContractUsers', { primary, secondary });

  return async () => {
    await admin.auth.admin.deleteUser(primary.id);
    await admin.auth.admin.deleteUser(secondary.id);
  };
}
