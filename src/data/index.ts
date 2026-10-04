import { LocalRepository } from './local-repository';
import type { Repository } from './repository';

export type { DateRange, Repository, SeedableRepository, SeedData } from './repository';
export { applyMutation, earliestPlanDate, isSeedable } from './repository';
export { LocalRepository, KEYS } from './local-repository';
export { MemoryRepository } from './memory-repository';

let instance: Repository | null = null;

/**
 * The repository the app runs on. **Phase 7 swaps this one line** for the
 * Supabase implementation; nothing above `src/data` knows the difference.
 */
export function getRepository(): Repository {
  instance ??= new LocalRepository();
  return instance;
}

/**
 * Replaces the singleton. Tests use it to run the store against a
 * `MemoryRepository`; `null` restores the default.
 */
export function setRepository(r: Repository | null): void {
  instance = r;
}
