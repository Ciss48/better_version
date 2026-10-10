-- Fixes the one security advisor finding from 20261006041812_commit_mutation.sql:
--
--   authenticated_security_definer_function_executable (WARN)
--   "public.reset_my_data() can be executed by the `authenticated` role as a
--    SECURITY DEFINER function via /rest/v1/rpc/reset_my_data."
--
-- `reset_my_data()` was SECURITY DEFINER for exactly one reason: `task_events`
-- had no delete policy, so an invoker-rights function could not clear it. The
-- advisor's own remediation is "switch the function to SECURITY INVOKER", and
-- doing so is a real drop in privilege — nothing in the API schema runs with
-- definer rights any more, and every statement in the function goes through
-- RLS like any other client write.
--
-- The price is a `delete` policy on `task_events`, which `tasks/phase_07` had
-- specified as select+insert only. The log stays append-only where it matters:
-- the repository never deletes an event outside `reset()`, there is still no
-- `update` policy (history cannot be rewritten), and RLS confines a delete to
-- the caller's own rows. See `memory/discoveries.md`.

create policy task_events_delete on public.task_events
  for delete to authenticated using ((select auth.uid()) = user_id);

comment on policy task_events_delete on public.task_events is
  'Exists so reset_my_data() can run with invoker rights. The log has no update policy: entries can be dropped wholesale, never rewritten.';

create or replace function public.reset_my_data()
returns void
language plpgsql
security invoker
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