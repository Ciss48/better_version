/**
 * The per-user prefix for browser-only keys — the ritual draft and the two
 * Today UI prefs. Neither belongs in Postgres (`memory/phase_05_report.md`
 * §10), but in supabase mode two accounts signed into the same browser must
 * not share one.
 *
 * `null` (the default, and the only value local mode ever sets) keeps the
 * Phase 5 keys unchanged — `bed:v1:ui`, `bed:v1:ritual:<date>` — so the
 * existing e2e specs need no change.
 */
let namespace: string | null = null;

export function setStorageNamespace(id: string | null): void {
  namespace = id;
}

export function storageKey(suffix: string): string {
  return namespace === null ? `bed:v1:${suffix}` : `bed:v1:${namespace}:${suffix}`;
}
