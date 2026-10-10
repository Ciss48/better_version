-- The two RPCs the `SupabaseRepository` calls.
--
-- `commit_mutation` is the whole point of this phase: the store applies a
-- `Mutation` optimistically and reverts on a rejected promise, so a *partial*
-- write is the one failure it cannot recover from. A single plpgsql function is
-- a single statement to Postgres, hence a single transaction — upserts,
-- deletes, events and the day log either all land or none do.
--
-- Both functions keep `search_path = ''` (every reference is schema-qualified)
-- so a table shadowed in another schema can never be reached from here.

-- -------------------------------------------------------- commit_mutation

create function public.commit_mutation(
  p_upserts jsonb default '[]'::jsonb,
  p_deletes uuid[] default '{}'::uuid[],
  p_events jsonb default '[]'::jsonb,
  p_day_log jsonb default null
)
returns void
language plpgsql
-- SECURITY INVOKER (the default): RLS applies, so the function can only ever
-- touch the caller's own rows. `user_id` is taken from the JWT, never from the
-- payload — a client cannot write into someone else's account by lying.
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- 1. Upserts, keyed by the domain's task id. Idempotent by contract: the
  --    store re-sends whole Task rows, never patches.
  if p_upserts is not null and jsonb_typeof(p_upserts) = 'array' then
    insert into public.tasks (
      id, user_id, plan_date, title, important, urgent, mit, size, status,
      postponed_count, adhoc, "position", created_at, completed_at, moved_to, origin_task_id
    )
    select
      t.id, v_user, t.plan_date, t.title, t.important, t.urgent, t.mit, t.size, t.status,
      t.postponed_count, t.adhoc, t."position", t.created_at, t.completed_at, t.moved_to,
      t.origin_task_id
    from jsonb_to_recordset(p_upserts) as t (
      id uuid, plan_date date, title text, important boolean, urgent boolean, mit boolean,
      size text, status text, postponed_count integer, adhoc boolean, "position" integer,
      created_at timestamptz, completed_at timestamptz, moved_to date, origin_task_id uuid
    )
    on conflict (id) do update set
      plan_date = excluded.plan_date,
      title = excluded.title,
      important = excluded.important,
      urgent = excluded.urgent,
      mit = excluded.mit,
      size = excluded.size,
      status = excluded.status,
      postponed_count = excluded.postponed_count,
      adhoc = excluded.adhoc,
      "position" = excluded."position",
      created_at = excluded.created_at,
      completed_at = excluded.completed_at,
      moved_to = excluded.moved_to,
      origin_task_id = excluded.origin_task_id;
  end if;

  -- 2. Deletes, after the upserts: restoring a move upserts the original and
  --    deletes the copy in one mutation. Unknown ids are a no-op by contract.
  if p_deletes is not null and array_length(p_deletes, 1) is not null then
    delete from public.tasks where user_id = v_user and id = any (p_deletes);
  end if;

  -- 3. Events, in array order. `occurred_at` is identical across one mutation,
  --    so `seq` (identity) is what keeps them readable in causal order.
  if p_events is not null and jsonb_typeof(p_events) = 'array' then
    insert into public.task_events (id, user_id, task_id, plan_date, type, payload, occurred_at)
    select
      (e.v ->> 'id')::uuid,
      v_user,
      (e.v ->> 'task_id')::uuid,
      (e.v ->> 'plan_date')::date,
      e.v ->> 'type',
      coalesce(e.v -> 'payload', '{}'::jsonb),
      (e.v ->> 'occurred_at')::timestamptz
    from jsonb_array_elements(p_events) with ordinality as e (v, ord)
    order by e.ord;
  end if;

  -- 4. The day log of a close, upserted on its logical day.
  if p_day_log is not null and jsonb_typeof(p_day_log) = 'object' then
    insert into public.day_logs (user_id, plan_date, closed_at, energy, good, improve)
    values (
      v_user,
      (p_day_log ->> 'plan_date')::date,
      (p_day_log ->> 'closed_at')::timestamptz,
      (p_day_log ->> 'energy')::smallint,
      coalesce(p_day_log ->> 'good', ''),
      coalesce(p_day_log ->> 'improve', '')
    )
    on conflict (user_id, plan_date) do update set
      closed_at = excluded.closed_at,
      energy = excluded.energy,
      good = excluded.good,
      improve = excluded.improve;
  end if;
end;
$$;

comment on function public.commit_mutation (jsonb, uuid[], jsonb, jsonb) is
  'Atomically persists one domain Mutation (+ the DayLog of a close). JSON keys are snake_case column names.';

-- --------------------------------------------------------- reset_my_data

-- Dev and tests only, and scoped to the caller. SECURITY DEFINER because
-- `task_events` has no delete policy — it is append-only to the client.
create function public.reset_my_data()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  delete from public.task_events where user_id = v_user;
  delete from public.tasks where user_id = v_user;
  delete from public.day_logs where user_id = v_user;
  delete from public.user_settings where user_id = v_user;
end;
$$;

comment on function public.reset_my_data () is
  'Wipes everything belonging to the calling user. Dev/test only.';

-- ------------------------------------------------------------------ grants

revoke execute on function public.commit_mutation (jsonb, uuid[], jsonb, jsonb)
  from public, anon;
revoke execute on function public.reset_my_data () from public, anon;

grant execute on function public.commit_mutation (jsonb, uuid[], jsonb, jsonb) to authenticated;
grant execute on function public.reset_my_data () to authenticated;
