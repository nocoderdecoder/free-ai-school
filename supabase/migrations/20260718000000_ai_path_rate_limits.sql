-- Atomic, content-free production rate limits for AI Path.
-- Raw IP addresses and auth user ids must be hashed by the application before
-- reaching this table. Direct table access is denied to browser roles.

create table public.ai_path_rate_limit_buckets (
  policy_id text not null,
  identity_hash text not null check (identity_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count between 1 and 1000000),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (policy_id, identity_hash),
  constraint ai_path_rate_limit_policy_check check (policy_id in (
    'ai-path-analysis', 'ai-path-auth-callback', 'ai-path-auth-email',
    'ai-path-auth-sign-in', 'ai-path-diagnostic', 'ai-path-plan-adaptation',
    'ai-path-plan-check-in', 'ai-path-plan-create', 'ai-path-plan-delete',
    'ai-path-plan-export', 'ai-path-plan-read', 'ai-path-plan-task',
    'ai-path-plan-time-budget', 'ai-path-question-adaptation',
    'ai-path-realtime-session', 'ai-path-session', 'ai-path-session-delete',
    'ai-path-session-export', 'ai-path-session-read'
  ))
);

create index ai_path_rate_limit_updated_idx
  on public.ai_path_rate_limit_buckets (updated_at, policy_id, identity_hash);

comment on table public.ai_path_rate_limit_buckets is
  'Content-free abuse counters keyed only by application policy id and salted SHA-256 identity hash; never raw IP, auth user id, prompt, answer, transcript, or provider content.';

alter table public.ai_path_rate_limit_buckets enable row level security;
alter table public.ai_path_rate_limit_buckets force row level security;
revoke all on public.ai_path_rate_limit_buckets from public, anon, authenticated, service_role;

create or replace function public.consume_ai_path_rate_limit(
  p_policy_id text,
  p_identity_hashes text[],
  p_limit integer,
  p_window_ms integer,
  p_now timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_hash text;
  v_hashes text[];
  v_window interval;
  v_denied boolean;
  v_remaining integer;
  v_reset_at timestamptz;
begin
  if p_policy_id is null or p_policy_id not in (
    'ai-path-analysis', 'ai-path-auth-callback', 'ai-path-auth-email',
    'ai-path-auth-sign-in', 'ai-path-diagnostic', 'ai-path-plan-adaptation',
    'ai-path-plan-check-in', 'ai-path-plan-create', 'ai-path-plan-delete',
    'ai-path-plan-export', 'ai-path-plan-read', 'ai-path-plan-task',
    'ai-path-plan-time-budget', 'ai-path-question-adaptation',
    'ai-path-realtime-session', 'ai-path-session', 'ai-path-session-delete',
    'ai-path-session-export', 'ai-path-session-read'
  ) then raise exception 'invalid rate-limit policy'; end if;
  if p_limit not between 1 and 1000 or p_window_ms not between 1000 and 86400000 then
    raise exception 'invalid rate-limit bounds';
  end if;

  select array_agg(value order by value) into v_hashes
  from (select distinct value from unnest(p_identity_hashes) value) hashes
  where value ~ '^[0-9a-f]{64}$';
  if coalesce(array_length(v_hashes, 1), 0) not between 1 and 2
    or array_length(v_hashes, 1) <> array_length(p_identity_hashes, 1) then
    raise exception 'invalid rate-limit identities';
  end if;
  v_window := make_interval(secs => p_window_ms::double precision / 1000.0);

  -- Sorted transaction advisory locks make missing-row creation and multi-key
  -- consumption atomic across all application instances.
  foreach v_hash in array v_hashes loop
    perform pg_advisory_xact_lock(hashtextextended(p_policy_id || ':' || v_hash, 0));
  end loop;

  select coalesce(bool_or(
    window_started_at > p_now - v_window and request_count >= p_limit
  ), false),
  min(case when window_started_at > p_now - v_window then window_started_at + v_window end)
  into v_denied, v_reset_at
  from public.ai_path_rate_limit_buckets
  where policy_id = p_policy_id and identity_hash = any(v_hashes);

  if v_denied then
    return jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'resetAt', floor(extract(epoch from coalesce(v_reset_at, p_now + v_window)) * 1000)::bigint,
      'reason', 'exceeded'
    );
  end if;

  foreach v_hash in array v_hashes loop
    insert into public.ai_path_rate_limit_buckets (
      policy_id, identity_hash, window_started_at, request_count, updated_at
    ) values (p_policy_id, v_hash, p_now, 1, p_now)
    on conflict (policy_id, identity_hash) do update set
      window_started_at = case
        when ai_path_rate_limit_buckets.window_started_at <= p_now - v_window then p_now
        else ai_path_rate_limit_buckets.window_started_at
      end,
      request_count = case
        when ai_path_rate_limit_buckets.window_started_at <= p_now - v_window then 1
        else ai_path_rate_limit_buckets.request_count + 1
      end,
      updated_at = p_now;
  end loop;

  select least(
    min(p_limit - request_count),
    p_limit - 1
  ), min(window_started_at + v_window)
  into v_remaining, v_reset_at
  from public.ai_path_rate_limit_buckets
  where policy_id = p_policy_id and identity_hash = any(v_hashes);

  return jsonb_build_object(
    'allowed', true,
    'remaining', greatest(v_remaining, 0),
    'resetAt', floor(extract(epoch from v_reset_at) * 1000)::bigint,
    'reason', 'allowed'
  );
end;
$$;

revoke all on function public.consume_ai_path_rate_limit(text, text[], integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.consume_ai_path_rate_limit(text, text[], integer, integer, timestamptz)
  to service_role;

create or replace function public.purge_expired_ai_path_rate_limit_buckets(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare v_deleted integer;
begin
  if p_limit not between 1 and 10000 then raise exception 'invalid purge limit'; end if;
  with candidates as (
    select policy_id, identity_hash from public.ai_path_rate_limit_buckets
    where updated_at < clock_timestamp() - interval '2 days'
    order by updated_at limit p_limit for update skip locked
  ), deleted as (
    delete from public.ai_path_rate_limit_buckets buckets using candidates
    where buckets.policy_id = candidates.policy_id
      and buckets.identity_hash = candidates.identity_hash
    returning 1
  ) select count(*)::integer into v_deleted from deleted;
  return v_deleted;
end;
$$;

revoke all on function public.purge_expired_ai_path_rate_limit_buckets(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_ai_path_rate_limit_buckets(integer)
  to service_role;
