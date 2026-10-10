# Phase 07: Supabase persistence & auth

## Before you start (the USER does these in the Supabase dashboard — Claude Code cannot)
1. **Authentication → URL Configuration:** Site URL `http://localhost:3000`; add Redirect URL
   `http://localhost:3000/auth/callback`. (Phase 8 adds the production URL.)
2. **Authentication → Sign In / Providers → Email:** enabled (magic link + password, both
   default on). Password sign-in is used only by the contract test user.
3. Note: the built-in email sender is rate-limited (a few emails per hour). Fine for one user.

If Step 1 is not done, the magic link will redirect to the wrong place — ask the user to
confirm it before testing login (Step 8 below).

## Context Recap
Better Every Day is feature-complete on localStorage (Phases 1–6, see `docs/plan.md`). All
data access goes through the `Repository` interface (`src/data/repository.ts`), swapped in
one line in `src/data/index.ts`; the store applies mutations optimistically and reverts if
`commit()` rejects. `memory/phase_05_report.md` → "Phase 7 — what a Supabase Repository must
honour" lists 10 requirements; read it. Phase 6 verified the Supabase host is reachable.
`.env.local` holds `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
The Supabase MCP is now allowed, under the CLAUDE.md rules.

## Goal
With `NEXT_PUBLIC_DATA_BACKEND=supabase` (the default), the app requires a magic-link login,
stores every user's data in Postgres under RLS, and commits each `Mutation` atomically via one
RPC. With `NEXT_PUBLIC_DATA_BACKEND=local`, everything behaves exactly as in Phase 6 (seeds,
`?now=`, all 14 e2e specs). The repository contract suite passes against Supabase.

## Non-goals
- No changes to `src/domain/`, `src/stats/` or the `Repository` interface.
- No migration of existing browser (localStorage) data into the account.
- No OAuth (Google etc.), no password login UI, no account deletion UI, no profile page.
- No Vercel/GitHub/PWA work (Phase 8). No SQL analytics views (Phase 9).
- No realtime subscriptions, no offline queue. A failed commit reverts, as today.
- Never use the service-role key in `src/` (only in Node test/scripts code).

## Interface Contract

### 1. Environment
- Rename keys in `.env.local` without printing values (e.g. with `sed` on the key names):
  `SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_ANON_KEY` →
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`; keep `SUPABASE_SERVICE_ROLE_KEY` (server/test only).
  Add `NEXT_PUBLIC_DATA_BACKEND=supabase`.
- Create `.env.example` with the four key names and empty values (committed).
- `playwright.config.ts` webServer env sets `NEXT_PUBLIC_DATA_BACKEND=local`.
- `src/lib/env.ts`: `export const DATA_BACKEND: 'supabase' | 'local'` (default `'supabase'`),
  throws at import in supabase mode if URL/anon key are missing.
- Dev seeds / `?seed=` work only when `DATA_BACKEND === 'local'` (no-op + `console.warn` otherwise).
  `?now=` keeps working in both modes in development.

### 2. Schema — `supabase/migrations/<timestamp>_init.sql` (committed, then applied via MCP)
```sql
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  timezone text not null,
  habit text not null check (habit in ('evening','morning')),
  window_start_hour smallint not null check (window_start_hour between 0 and 23),
  window_start_offset smallint not null check (window_start_offset in (-1, 0)),
  lock_time text not null check (lock_time ~ '^\d{2}:\d{2}$'),
  day_end text not null check (day_end ~ '^\d{2}:\d{2}$'),
  remind_on boolean not null,
  remind_plan text not null check (remind_plan ~ '^\d{2}:\d{2}$'),
  remind_ritual text not null check (remind_ritual ~ '^\d{2}:\d{2}$'),
  theme text not null check (theme in ('light','dark','system')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date date not null,
  title text not null check (length(btrim(title)) > 0),
  important boolean not null, urgent boolean not null, mit boolean not null,
  size text check (size in ('S','M','L')),
  status text not null check (status in ('todo','done','moved','dropped')),
  postponed_count integer not null check (postponed_count >= 0),
  adhoc boolean not null,
  position integer not null,
  created_at timestamptz not null,           -- from the domain (ctx.now), NOT default now()
  completed_at timestamptz,
  moved_to date,
  origin_task_id uuid references public.tasks(id) on delete set null deferrable initially deferred,
  updated_at timestamptz not null default now()
);
create index tasks_user_date on public.tasks (user_id, plan_date);
create index tasks_user_planned on public.tasks (user_id, adhoc, plan_date);

create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_date date not null,
  closed_at timestamptz,
  energy smallint not null check (energy between 0 and 5),
  good text not null default '', improve text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

create table public.task_events (
  seq bigint generated always as identity primary key,  -- preserves in-mutation order
  id uuid not null unique,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id uuid,                                           -- no FK: tasks can be deleted
  plan_date date not null,
  type text not null check (type in ('task_created','task_completed','task_uncompleted',
    'task_updated','task_moved','task_dropped','task_restored','day_closed')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);
create index task_events_user_time on public.task_events (user_id, occurred_at);
```
RLS (same migration): enable on all four tables. Policies use
`(select auth.uid()) = user_id` for `select`, `insert` (with check), `update` (using + with
check) and `delete` on `user_settings`, `tasks`, `day_logs`; on `task_events` **only**
`select` and `insert` (append-only). `revoke all` from `anon` on all four tables.
An `updated_at` trigger on `user_settings`, `tasks`, `day_logs`.

RPCs (same or a second migration), both `language plpgsql`, `set search_path = ''`:
```sql
-- Atomic commit of one domain Mutation. SECURITY INVOKER → RLS applies.
create function public.commit_mutation(p_upserts jsonb, p_deletes uuid[], p_events jsonb, p_day_log jsonb)
returns void
-- 1. if auth.uid() is null → raise exception 'not authenticated'
-- 2. insert into public.tasks (…) select … from jsonb_to_recordset(p_upserts) as t(…)
--      user_id := auth.uid(); on conflict (id) do update set every mutable column
-- 3. delete from public.tasks where id = any(p_deletes)            -- unknown ids: no-op
-- 4. insert into public.task_events (…) select … from jsonb_array_elements(p_events)
--      with ordinality e(v, ord) order by ord                      -- seq follows array order
-- 5. if p_day_log is not null → upsert public.day_logs on (user_id, plan_date)
-- Any error aborts the whole call (one transaction).

-- Dev/test only, scoped to the caller. SECURITY DEFINER because events are not deletable via RLS.
create function public.reset_my_data() returns void
-- delete from task_events, tasks, day_logs, user_settings where user_id = auth.uid()
```
`revoke execute … from public, anon; grant execute … to authenticated` for both.
JSON keys sent to the RPC are snake_case column names.

After applying: run the MCP security/performance advisors and fix every **security** finding;
list performance findings in the report. Generate TypeScript types via the MCP into
`src/data/supabase/database.types.ts`.

### 3. Supabase clients (`@supabase/supabase-js`, `@supabase/ssr`)
```
src/data/supabase/client.ts    createBrowserSupabase()  — singleton browser client
src/data/supabase/server.ts    createServerSupabase()   — for route handlers / proxy (cookies)
src/data/supabase/mappers.ts   rowToTask, taskToRow, rowToSettings, settingsToRow, rowToDayLog, dayLogToRow, eventToRow
src/data/supabase-repository.ts  SupabaseRepository implements Repository
```
- Mappers are pure and unit-tested (round-trip every field incl. nulls; `Settings.windowStart`
  ↔ two columns; timestamps returned by Postgres normalised to ISO `Z` strings so domain
  string comparisons keep working).
- **Reads must paginate**: PostgREST returns at most 1000 rows per request. `loadTasks` and
  `loadDayLogs` loop with `.range(from, from + 999)` ordered by `(plan_date, position, id)`
  until a short page. Test with >1000 rows in the contract run (see §6).
- `loadSettings()` returns `null` when no row exists (never defaults).
- `firstPlanDate()` = `select plan_date … where adhoc = false order by plan_date limit 1`.
- `commit(m, dayLog?)` = one `rpc('commit_mutation', …)`; any error → reject (the store reverts).
- `reset()` = `rpc('reset_my_data')`.
- `src/data/index.ts`: `getRepository()` returns `SupabaseRepository` when
  `DATA_BACKEND === 'supabase'`, else `LocalRepository`. Nothing else in `src/` changes its import.

### 4. Auth (magic link, PKCE)
**Next 16 note:** the request interceptor file may be `proxy.ts` (Next 16 rename of
`middleware.ts`). Check `node_modules/next/dist/docs` or the installed version's behaviour and
use whichever it supports; log which one in the report.
- **Route protection** (`src/proxy.ts` or `src/middleware.ts`, only active in supabase mode):
  refreshes the session cookie per `@supabase/ssr` docs; unauthenticated requests to
  `/today /ritual /stats /history /settings /goals /weekly /more /onboarding` → 307 to
  `/login?next=<path>`; authenticated requests to `/login` → 307 to `/today`. Static assets,
  `/auth/*` and `/dev/*` are excluded via the matcher.
- **`/login`** (`src/app/login/page.tsx` + `src/features/auth/LoginScreen.tsx`, no AppShell):
  centred `paper` sheet like onboarding (max-width 480px): logo (`font-num`), kicker + title,
  one-line body, email input (50px pill, same style as onboarding inputs), primary button
  "Gửi link đăng nhập". States: idle, sending (button disabled), sent ("Kiểm tra email …" with
  the address and a "Gửi lại" text button enabled after 60s), error (rate limit / invalid email
  → friendly copy). Calls `signInWithOtp({ email, options: { emailRedirectTo:
  `${location.origin}/auth/callback?next=…` } })`. New copy keys under `auth.*` (write them in
  the house tone; no exclamation-heavy marketing).
- **`/auth/callback`** route handler: `exchangeCodeForSession(code)`; success → redirect to
  `next` (only same-origin relative paths; default `/today`); failure → `/login?error=link`
  (LoginScreen shows `auth.error.link`).
- **Sign out:** Settings gets a last `SettingsSection` "Tài khoản" showing the signed-in email
  and a ghost button "Đăng xuất" → `signOut()`, clear the store, `router.replace('/login')`.
  Only rendered in supabase mode.
- **Per-user browser keys:** in supabase mode the ritual draft and UI prefs keys become
  `bed:v1:<userId>:ritual:<date>` and `bed:v1:<userId>:ui`, so two accounts on one browser
  never share a draft. `ritual-draft.ts` and the store's ui persistence take a namespace;
  local mode keeps the current keys (no e2e change).
- **Store bootstrap** in supabase mode waits for the session (`getUser()`), then `init()`.
  New user (no settings row) → the existing welcome banner / onboarding flow, unchanged.

### 5. Leftovers from Phase 6 (the only component changes allowed)
1. `DayDetail` heading uses `formatWeekdayDayMonth` ("Thứ Sáu, 2/10").
2. `RitualScreen` keeps its top bar (kicker + date/time meta + "Để sau (Esc)") above the
   summary at step 3, as in `ritual_summary`.
Re-shoot `history_default` and `ritual_summary` (local backend) and update their verdicts.

### 6. Tests
- **Unit:** mappers; `getRepository()` selection by env; LoginScreen states (jsdom, with the
  Supabase client mocked): submit calls `signInWithOtp` with the right redirect, sent state
  shows the email, error state shows copy; callback route `next` sanitising (pure helper
  `safeNext(next)` — absolute URLs, `//evil`, missing → `/today`).
- **Supabase contract run** (`vitest.supabase.config.ts`, script `pnpm test:supabase`, NOT part
  of `pnpm test`): a Node global setup uses the service-role key to create a throwaway user
  `bed-contract-<random>@example.com` with a random password and `email_confirm: true`; tests
  sign in with password (anon key) and run the existing `repository.contract.ts` suite against
  `SupabaseRepository` (`reset()` between cases), plus:
  - **atomicity:** a commit whose events array contains an invalid `type` rejects and leaves
    tasks/day_logs unchanged;
  - **pagination:** commit 1,050 tasks in batches, `loadTasks` over their range returns 1,050;
  - **RLS:** a second throwaway user cannot read or update the first user's rows (selects
    return `[]`, an RPC upsert of the first user's task id fails);
  - **event order:** a 3-event mutation is read back (ordered by `seq`) in array order.
  Teardown deletes both users (cascade removes rows). The service-role key appears only in this
  setup file.
- **E2E:** all 14 specs still pass in local mode. Add spec 15 in a separate Playwright project
  (or a vitest using `fetch`) that runs the dev server with `NEXT_PUBLIC_DATA_BACKEND=supabase`
  on port 3001 and asserts: GET `/today` → 307 to `/login?next=%2Ftoday`; `/login` renders the
  email form. (No real email is sent in automated tests.)

## Steps
1. Env rename (§1), `.env.example`, `src/lib/env.ts`, playwright env. `pnpm add @supabase/supabase-js @supabase/ssr`.
2. Write the migration file(s); show the SQL in the report; apply via MCP; run advisors; fix
   security findings (as a new migration file); generate types.
3. Clients, mappers (+ tests), SupabaseRepository, `getRepository()` switch.
4. `pnpm test:supabase` green (contract + the four extra cases).
5. Auth: proxy/middleware, `/login`, `/auth/callback`, sign-out, per-user keys, bootstrap.
6. Phase 6 leftovers (§5) + re-shoots.
7. Unit tests, e2e 1–15. Full check suite.
8. **Manual login check with the user:** ask the user to confirm the dashboard steps, run
   `pnpm dev`, open `/today` → redirected to `/login` → user enters their email → clicks the
   link → lands on `/today` signed in → add one task → reload → still there → check the row via
   the MCP (`select count(*) from tasks`) → sign out → back on `/login`. Record the outcome.
9. Handoff; commit `phase-07: supabase`.

## Definition of Done
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e` (15) exit 0;
  `pnpm test:supabase` exits 0; coverage for `src/domain/**` and `src/stats/**` still ≥90%.
- `git diff --stat HEAD -- src/domain src/stats src/data/repository.ts` is empty.
- Migration files exist in `supabase/migrations/` and match what is applied (MCP
  `list_migrations`); RLS enabled on all four tables (MCP query on `pg_tables.rowsecurity`);
  advisors report **no security warnings**.
- `grep -rn "SERVICE_ROLE" src` returns nothing; `grep -rn "SERVICE_ROLE" .next/static` after
  a build returns nothing.
- `.env.local` is git-ignored and untracked; `.env.example` is committed with empty values.
- With `NEXT_PUBLIC_DATA_BACKEND=supabase pnpm dev`: `curl -sI localhost:3000/today` → 307,
  `Location` starts with `/login`.
- The manual login check (Step 8) succeeded, or the report states exactly where it failed.
- No hard-coded Vietnamese outside `src/content/` and `src/dev/`; `git status design/` clean.

## Handoff Obligations
1. Write `memory/phase_07_report.md` (What was done / Results / New findings / Decisions made /
   Open issues / Input for the next phase), including: the applied SQL (or a pointer to the
   migration files), advisor output, which interceptor file Next 16 used, the manual login
   result, and everything Phase 8 needs (env vars for Vercel, redirect URLs, anything that
   assumes localhost).
2. Overwrite `memory/STATE.md`; next action: "Phase 08 task file to be written by the planning
   session — bring STATE.md, phase_07_report.md and discoveries.md back to it".
3. Log Moderate/Major findings in `memory/discoveries.md`; stop early on Major (e.g. the RPC
   cannot be made atomic, RLS blocks a required path, the interceptor cannot read cookies).
4. Commit.
