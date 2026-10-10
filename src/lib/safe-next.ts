/**
 * Narrows a `?next=` query value to a same-origin relative path, or `/today`.
 *
 * Shared by `LoginScreen` (building the magic-link redirect URL) and
 * `/auth/callback` (reading it back) — both must agree on what counts as
 * safe, or a crafted link could carry a signed-in user off-site.
 */
export function safeNext(next: string | null | undefined): string {
  const fallback = '/today';
  if (typeof next !== 'string' || next.length === 0) return fallback;
  // A single leading slash, not followed by another slash or a backslash —
  // that excludes absolute URLs (`https://…`), protocol-relative ones
  // (`//evil.com`), and the backslash variant some browsers still normalise
  // to `//` (`/\evil.com`).
  if (!/^\/(?!\/|\\)/.test(next)) return fallback;
  return next;
}
