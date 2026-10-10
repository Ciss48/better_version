-- Better Every Day — initial schema.
--
-- Four tables, one row set per authenticated user, isolated by RLS
-- (`user_id = auth.uid()`). The shapes mirror `src/domain/types.ts`:
--   user_settings ↔ Settings   (windowStart is split over two columns)
--   tasks         ↔ Task
--   day_logs      ↔ DayLog     (one per logical day, keyed by plan_date)
--   task_events   ↔ TaskEvent  (append-only; `seq` preserves in-mutation order)
--
-- Logical dates are `date`; instants are `timestamptz` and always come from the
-- domain's injected clock (`ctx.now`), never from `now()`.

-- ---------------------------------------------------------------- user_settings

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  timezone text not null,
  habit text not null check (habit in ('evening', 'morning')),
  window_start_hour smallint not null check (window_start_hour between 0 and 23),
  window_start_offset smallint not null check (window_start_offset in (-1, 0)),
  lock_time text not null check (lock_time ~ '^\d{2}:\d{2}$'),
  day_end text not null check (day_end ~ '^\d{2}:\d{2}$'),
  remind_on boolean not null,
  remind_plan text not null check (remind_plan ~ '^\d{2}:\d{2}$'),
  remind_ritual text not null check (remind_ritual ~ '^\d{2}:\d{2}$'),
  theme text not null check (theme in ('light', 'dark', 'system')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is
  'One row per user — the Settings object. Absence means "never onboarded".';

-- ------------------------------------------------------------------------ tasks

create table public.tasks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_date date not null,
  title text not null check (length(btrim(title)) > 0),
  important boolean not null,
  urgent boolean not null,
  mit boolean not null,
  size text check (size in ('S', 'M', 'L')),
  status text not null check (status in ('todo', 'done', 'moved', 'dropped')),
  postponed_count integer not null check (postponed_count >= 0),
  adhoc boolean not null,
  "position" integer not null,
  -- From the domain (ctx.now), NOT default now(): the clock is injected so that
  -- `?now=` and the tests can place a task on a chosen instant.
  created_at timestamptz not null,
  completed_at timestamptz,
  moved_to date,
  -- A move writes the original and its copy in one mutation, and the copy
  -- points back at the original — so the check has to wait for commit.
  origin_task_id uuid references public.tasks (id) on delete set null
    deferrable initially deferred,
  updated_at timestamptz not null default now()
);

-- loadTasks(range): every task whose plan_date falls inside an inclusive range.
create index tasks_user_date on public.tasks (user_id, plan_date);
-- firstPlanDate(): min(plan_date) where adhoc = false.
create index tasks_user_planned on public.tasks (user_id, adhoc, plan_date);
-- The self-FK, so a delete does not have to scan the table to set_null.
create index tasks_origin on public.tasks (origin_task_id);

-- --------------------------------------------------------------------- day_logs

create table public.day_logs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  plan_date date not null,
  closed_at timestamptz,
  energy smallint not null check (energy between 0 and 5),
  good text not null default '',
  improve text not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, plan_date)
);

-- ------------------------------------------------------------------ task_events

create table public.task_events (
  -- Every event of one mutation carries the same occurred_at (ctx.now), so the
  -- insertion order is the only thing that keeps them causally sorted.
  seq bigint generated always as identity primary key,
  id uuid not null unique,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Deliberately no FK: a task can be deleted (a restored move) while its
  -- events stay. Null only for day_closed.
  task_id uuid,
  plan_date date not null,
  type text not null check (type in ('task_created', 'task_completed', 'task_uncompleted',
    'task_updated', 'task_moved', 'task_dropped', 'task_restored', 'day_closed')),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null
);

create index task_events_user_time on public.task_events (user_id, occurred_at);

-- ----------------------------------------------------------------- updated_at

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();
create trigger day_logs_updated_at before update on public.day_logs
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------- RLS
--
-- `(select auth.uid())` rather than a bare `auth.uid()`: the subselect is
-- evaluated once per statement instead of once per row.

alter table public.user_settings enable row level security;
alter table public.tasks enable row level security;
alter table public.day_logs enable row level security;
alter table public.task_events enable row level security;

create policy user_settings_select on public.user_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy user_settings_insert on public.user_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy user_settings_update on public.user_settings
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy user_settings_delete on public.user_settings
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy tasks_select on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy tasks_insert on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tasks_update on public.tasks
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy tasks_delete on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy day_logs_select on public.day_logs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy day_logs_insert on public.day_logs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy day_logs_update on public.day_logs
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy day_logs_delete on public.day_logs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Append-only: no update, no delete policy. `reset_my_data()` is the one way
-- events ever disappear, and it is SECURITY DEFINER for exactly that reason.
create policy task_events_select on public.task_events
  for select to authenticated using ((select auth.uid()) = user_id);
create policy task_events_insert on public.task_events
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- --------------------------------------------------------------------- grants
--
-- Nothing here is readable without a session. `anon` only ever needs
-- auth.* endpoints (sign-in, the magic-link exchange).

revoke all on public.user_settings from anon;
revoke all on public.tasks from anon;
revoke all on public.day_logs from anon;
revoke all on public.task_events from anon;
