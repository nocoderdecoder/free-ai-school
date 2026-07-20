-- Replace unbounded retention deletes with service-only, transaction-bounded
-- batches. Applying this migration does not schedule or activate retention.

drop function public.purge_expired_ai_path_sessions();
drop function public.purge_expired_ai_path_learning_plans();

create or replace function public.purge_expired_ai_path_sessions(p_limit integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  deleted_count bigint;
begin
  if caller_role <> 'service_role' then
    raise exception 'Session retention requires the service role.' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100000 then
    raise exception 'Session retention batch limit is invalid.' using errcode = '22023';
  end if;

  with expired_batch as (
    select id
    from public.ai_path_assessment_sessions
    where retention_expires_at <= clock_timestamp()
    order by retention_expires_at, id
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.ai_path_assessment_sessions as session
    using expired_batch
    where session.id = expired_batch.id
    returning session.id
  )
  select count(*)::bigint into deleted_count from deleted;

  return deleted_count;
end;
$$;

create or replace function public.purge_expired_ai_path_learning_plans(p_limit integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  deleted_count bigint;
begin
  if caller_role <> 'service_role' then
    raise exception 'Plan retention requires the service role.' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100000 then
    raise exception 'Plan retention batch limit is invalid.' using errcode = '22023';
  end if;

  with expired_batch as (
    select id
    from public.ai_path_learning_plans
    where retention_expires_at <= clock_timestamp()
    order by retention_expires_at, id
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.ai_path_learning_plans as plan
    using expired_batch
    where plan.id = expired_batch.id
    returning plan.id
  )
  select count(*)::bigint into deleted_count from deleted;

  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_ai_path_sessions(integer)
  from public, anon, authenticated;
revoke all on function public.purge_expired_ai_path_learning_plans(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_ai_path_sessions(integer)
  to service_role;
grant execute on function public.purge_expired_ai_path_learning_plans(integer)
  to service_role;
