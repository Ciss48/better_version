# Phase 07 report — Supabase persistence & auth

## What was done
- Renamed env keys to `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`, kept
  `SUPABASE_SERVICE_ROLE_KEY` server/test-only. Added `NEXT_PUBLIC_DATA_BACKEND` (`supabase`
  default, `local` for dev/e2e/screenshots). `.env.example` committed with empty values.
- `src/lib/env.ts` centralizes the two env facts and throws at import if Supabase mode is
  missing its URL/key.
- Schema in `supabase/migrations/`: `20261006041743_init.sql` (tables), `20261006041812_commit_mutation.sql`
  (atomic commit RPC), `20261006041943_reset_security_invoker.sql` (security-definer fix).
  Applied via MCP; all three show up in `list_migrations`.
- `src/data/supabase/` clients + mappers, `src/data/supabase-repository.ts` implementing
  `Repository` against Postgres/RPC, switched in `src/data/index.ts` by `DATA_BACKEND`.
- Auth: `src/proxy.ts` (Next middleware) redirects unauthenticated `/today` etc. to
  `/login?next=...`; `src/app/login/`, `src/app/auth/callback/` (magic link), `src/features/auth/`,
  sign-out, `src/components/settings/AccountSection.tsx`. `src/lib/safe-next.ts` sanitizes the
  `next` redirect target (rejects absolute URLs / `//host` — tested in `safe-next.test.ts`).
- Dev seeds/`?seed=` are no-ops (with a console warning) outside `DATA_BACKEND === 'local'`.
- `vitest.supabase.config.ts` / `pnpm test:supabase`: global setup creates a throwaway user with
  the service-role key, runs `repository.contract.ts` against `SupabaseRepository` plus atomicity,
  pagination (1,050 tasks), RLS cross-user isolation, and event-order cases. Teardown deletes the
  throwaway users.
- `e2e/supabase.spec.ts`: a second Playwright project on port 3001 with
  `NEXT_PUBLIC_DATA_BACKEND=supabase` asserts the `/today` → `/login` redirect and that `/login`
  renders the email form. No real email sent.

## Results (this session, re-verified against the current working tree)
- `pnpm lint`, `pnpm typecheck` — clean.
- `pnpm test` — 446/446 passed (43 files).
- `pnpm build` — succeeds; `grep -rn "SERVICE_ROLE" src` and `.next/static` both empty.
- `pnpm e2e` — **16/16 passed** (14 local-backend specs + 2 supabase-backend specs).
  First run showed 14 failures: a stray `next-server` (pid from an earlier manual `pnpm dev`)
  was already bound to port 3000, so Playwright's `reuseExistingServer` attached to it instead
  of starting its own with `NEXT_PUBLIC_DATA_BACKEND=local` — every page redirected to `/login`
  and `[data-ready]` never appeared. Killed the stray process, re-ran, all green. Not an app bug;
  noted here so a future run isn't alarmed by the same symptom.
- `pnpm test:supabase` — 23/23 passed against the live project (contract suite + atomicity +
  pagination + RLS + event-order).
- Supabase advisors (security): one WARN — "Leaked Password Protection Disabled" (HaveIBeenPwned
  check for password sign-in). Not an RLS/data-exposure issue; password sign-in is only used by
  the contract-test user. Left for the user to toggle in the dashboard if desired.
- `select rowsecurity from pg_tables where schemaname='public'` — `true` on all four tables
  (`user_settings`, `tasks`, `day_logs`, `task_events`).
- `git diff --stat HEAD -- src/domain src/stats src/data/repository.ts` — empty.
- Manual login check (Step 8, done by the user before this report was written): dashboard
  redirect URLs configured, magic link flow completed end-to-end in the browser
  (`/today` → `/login` → email → link → signed in → add task → reload → persists), confirmed
  working by the user directly.

## New findings
- **Moderate:** Playwright's `reuseExistingServer: true` (non-CI) silently reuses *any* process
  already bound to port 3000/3001 regardless of its env vars. A leftover manual `pnpm dev` makes
  every local-backend e2e spec fail with a misleading "`[data-ready]` not found" error that looks
  like an app bug. No code change made (this is intended Playwright behaviour for fast local
  iteration); logging it in `memory/discoveries.md` so it's recognized immediately next time.

## Decisions made
- Kept `reuseExistingServer` as-is rather than forcing `CI`-style fresh servers locally — the
  speed benefit during normal dev outweighs the occasional stale-port confusion, now documented.

## Open issues
- Leaked-password-protection advisor warning — cosmetic/optional, dashboard-only toggle, no code
  impact either way.

## Input for the next phase (Phase 08 — ship)
- Env vars Vercel needs: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (server-only scope — do not expose to the browser build),
  `NEXT_PUBLIC_DATA_BACKEND=supabase` (the default; only set if Vercel needs it explicit).
- Supabase dashboard → Authentication → URL Configuration needs the production URL added as a
  Redirect URL (`https://<domain>/auth/callback`) once the Vercel domain is known; Site URL
  likewise. Today it's `http://localhost:3000` only.
- `NEXT_DIST_DIR=.next-e2e-supabase` is a local e2e-only artifact (gitignored) — irrelevant to
  the Vercel build.
- No changes assume anything else about localhost; the proxy/middleware logic is host-agnostic.
