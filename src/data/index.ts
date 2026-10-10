import { DATA_BACKEND } from '@/lib/env';
import { LocalRepository } from './local-repository';
import type { Repository } from './repository';
import { SupabaseRepository } from './supabase-repository';

export type { DateRange, Repository, SeedableRepository, SeedData } from './repository';
export { applyMutation, earliestPlanDate, isSeedable } from './repository';
export { LocalRepository, KEYS } from './local-repository';
export { MemoryRepository } from './memory-repository';
export { SupabaseRepository } from './supabase-repository';

let instance: Repository | null = null;

/**
 * The repository the app runs on, chosen by `NEXT_PUBLIC_DATA_BACKEND`.
 * Nothing above `src/data` knows the difference.
 */
export function getRepository(): Repository {
  instance ??= DATA_BACKEND === 'local' ? new LocalRepository() : new SupabaseRepository();
  return instance;
}

/**
 * Replaces the singleton. Tests use it to run the store against a
 * `MemoryRepository`; `null` restores the default.
 */
export function setRepository(r: Repository | null): void {
  instance = r;
}
