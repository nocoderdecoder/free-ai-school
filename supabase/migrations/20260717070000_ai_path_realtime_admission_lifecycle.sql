-- Bounded lifecycle controls for the dormant Realtime admission ledger.
-- This migration does not enable Realtime or any application maintenance job.
-- Policy v1 permits late usage reconciliation for seven days and retains
-- terminal reservation/idempotency detail for at least ninety days.

create table public.ai_path_realtime_admission_daily_archive (
  utc_day date not null,
  reservation_status public.ai_path_realtime_reservation_status not null
    check (reservation_status <> 'reserved'),
  reservation_count bigint not null check (reservation_count >= 0),
  estimated_cents bigint not null check (estimated_cents >= 0),
  actual_cents bigint not null check (actual_cents >= 0),
  policy_version text not null default '2026-07-17.v1'
    check (policy_version = '2026-07-17.v1'),
  first_archived_at timestamptz not null,
  last_archived_at timestamptz not null,
  primary key (utc_day, reservation_status)
);

comment on table public.ai_path_realtime_admission_daily_archive is
  'Content-free daily accounting totals retained after old terminal admission detail is purged; contains no user, session, idempotency, reservation, prompt, transcript, or provider identifiers.';

alter table public.ai_path_realtime_admission_daily_archive enable row level security;
alter table public.ai_path_realtime_admission_daily_archive force row level security;
revoke all on public.ai_path_realtime_admission_daily_archive
  from public, anon, authenticated, service_role;

-- Replace reserve so a user request never performs a global expiry write. A
-- stale active row makes admission fail closed until the bounded maintenance
-- RPC drains the backlog. This preserves the existing response vocabulary:
-- the application normalizes the raised store condition to store_unavailable.
create or replace function public.reserve_ai_path_realtime_admission(
  p_user_key text,
  p_session_key text,
  p_idempotency_key text,
  p_utc_day date,
  p_now timestamptz,
  p_expires_at timestamptz,
  p_estimated_cents integer,
  p_max_global_concurrent integer,
  p_max_user_concurrent integer,
  p_max_user_daily_cents integer,
  p_max_global_daily_cents integer,
  p_max_reservation_cents integer,
  p_reservation_ttl_ms integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  idempotency_hash text;
  existing_reservation public.ai_path_realtime_admission_reservations;
  created_reservation public.ai_path_realtime_admission_reservations;
  active_global bigint;
  active_user bigint;
  spent_global bigint;
  spent_user bigint;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission requires the service role.' using errcode = '42501';
  end if;
  if p_user_key is null or p_user_key !~ '^[0-9a-f]{64}$'
    or p_session_key is null or p_session_key !~ '^[0-9a-f]{64}$'
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_utc_day is null or p_now is null or p_expires_at is null
    or p_estimated_cents is null or p_estimated_cents not between 1 and 100000000
    or p_max_global_concurrent is null or p_max_global_concurrent not between 1 and 100000
    or p_max_user_concurrent is null or p_max_user_concurrent not between 1 and p_max_global_concurrent
    or p_max_user_daily_cents is null or p_max_user_daily_cents not between 1 and 100000000
    or p_max_global_daily_cents is null or p_max_global_daily_cents not between p_max_user_daily_cents and 1000000000
    or p_max_reservation_cents is null or p_max_reservation_cents not between 1 and p_max_user_daily_cents
    or p_estimated_cents > p_max_reservation_cents
    or p_reservation_ttl_ms is null or p_reservation_ttl_ms not between 30000 and 14400000 then
    raise exception 'Realtime admission policy or request is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30
    or p_utc_day <> (p_now at time zone 'UTC')::date
    or p_utc_day <> (database_now at time zone 'UTC')::date
    or p_expires_at <> p_now + (p_reservation_ttl_ms * interval '1 millisecond') then
    raise exception 'Realtime admission timestamps are invalid.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.ai_path_realtime_admission_reservations
    where status = 'reserved' and expires_at <= database_now
  ) then
    raise exception 'Realtime admission maintenance is required.' using errcode = '55000';
  end if;

  idempotency_hash := encode(
    extensions.digest(convert_to(p_idempotency_key, 'UTF8'), 'sha256'),
    'hex'
  );
  select * into existing_reservation
  from public.ai_path_realtime_admission_reservations
  where user_key = p_user_key and idempotency_key_hash = idempotency_hash
  for update;

  if found then
    if existing_reservation.session_key <> p_session_key
      or existing_reservation.estimated_cents <> p_estimated_cents then
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_conflict');
    end if;
    if existing_reservation.status <> 'reserved' then
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_terminal');
    end if;
    return jsonb_build_object(
      'kind', 'reserved',
      'reservation', public.ai_path_realtime_reservation_json(existing_reservation, p_idempotency_key),
      'idempotent', true
    );
  end if;

  if exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where session_key = p_session_key and status = 'reserved'
  ) then
    return jsonb_build_object('kind', 'denied', 'reason', 'session_already_reserved');
  end if;

  select count(*) into active_global
  from public.ai_path_realtime_admission_reservations
  where status = 'reserved';
  select count(*) into active_user
  from public.ai_path_realtime_admission_reservations
  where status = 'reserved' and user_key = p_user_key;
  if active_user >= p_max_user_concurrent then
    return jsonb_build_object('kind', 'denied', 'reason', 'user_concurrency_exceeded');
  end if;
  if active_global >= p_max_global_concurrent then
    return jsonb_build_object('kind', 'denied', 'reason', 'global_concurrency_exceeded');
  end if;

  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_global
  from public.ai_path_realtime_admission_reservations
  where utc_day = p_utc_day;
  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_user
  from public.ai_path_realtime_admission_reservations
  where utc_day = p_utc_day and user_key = p_user_key;

  if spent_user + p_estimated_cents > p_max_user_daily_cents then
    return jsonb_build_object('kind', 'denied', 'reason', 'user_daily_budget_exceeded');
  end if;
  if spent_global + p_estimated_cents > p_max_global_daily_cents then
    return jsonb_build_object('kind', 'denied', 'reason', 'global_daily_budget_exceeded');
  end if;

  insert into public.ai_path_realtime_admission_reservations (
    user_key,
    session_key,
    idempotency_key_hash,
    utc_day,
    estimated_cents,
    created_at,
    expires_at
  ) values (
    p_user_key,
    p_session_key,
    idempotency_hash,
    p_utc_day,
    p_estimated_cents,
    p_now,
    p_expires_at
  ) returning * into created_reservation;

  return jsonb_build_object(
    'kind', 'reserved',
    'reservation', public.ai_path_realtime_reservation_json(created_reservation, p_idempotency_key),
    'idempotent', false
  );
end;
$$;

revoke all on function public.reserve_ai_path_realtime_admission(
  text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.reserve_ai_path_realtime_admission(
  text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer
) to service_role;

-- Replace the original finalizer so an expired lease can be reconciled only
-- during the fixed policy window. Replays of an already-finalized row remain
-- idempotent while the retained row exists.
create or replace function public.finalize_ai_path_realtime_admission(
  p_reservation_id uuid,
  p_user_key text,
  p_session_key text,
  p_actual_cents integer,
  p_now timestamptz,
  p_max_user_daily_cents integer,
  p_max_global_daily_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  target_reservation public.ai_path_realtime_admission_reservations;
  spent_global bigint;
  spent_user bigint;
  replayed boolean := false;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission requires the service role.' using errcode = '42501';
  end if;
  if p_reservation_id is null
    or p_user_key is null or p_user_key !~ '^[0-9a-f]{64}$'
    or p_session_key is null or p_session_key !~ '^[0-9a-f]{64}$'
    or p_actual_cents is null or p_actual_cents not between 0 and 100000000
    or p_now is null
    or p_max_user_daily_cents is null or p_max_user_daily_cents not between 1 and 100000000
    or p_max_global_daily_cents is null or p_max_global_daily_cents not between p_max_user_daily_cents and 1000000000 then
    raise exception 'Realtime finalization input is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30 then
    raise exception 'Realtime finalization timestamp is invalid.' using errcode = '22023';
  end if;

  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if target_reservation.user_key <> p_user_key or target_reservation.session_key <> p_session_key then
    return jsonb_build_object('kind', 'binding_mismatch');
  end if;
  if target_reservation.status = 'reserved' and target_reservation.expires_at <= database_now then
    update public.ai_path_realtime_admission_reservations
    set status = 'expired'
    where id = p_reservation_id
    returning * into target_reservation;
  end if;
  if target_reservation.status = 'finalized' then
    if target_reservation.actual_cents <> p_actual_cents then
      return jsonb_build_object('kind', 'state_conflict');
    end if;
    replayed := true;
  elsif target_reservation.status = 'reserved'
    or (
      target_reservation.status = 'expired'
      and database_now <= target_reservation.expires_at + interval '7 days'
    ) then
    update public.ai_path_realtime_admission_reservations
    set status = 'finalized', actual_cents = p_actual_cents, finalized_at = p_now
    where id = p_reservation_id
    returning * into target_reservation;
  else
    return jsonb_build_object('kind', 'state_conflict');
  end if;

  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_global
  from public.ai_path_realtime_admission_reservations
  where utc_day = target_reservation.utc_day;
  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_user
  from public.ai_path_realtime_admission_reservations
  where utc_day = target_reservation.utc_day and user_key = p_user_key;

  return jsonb_build_object(
    'kind', 'finalized',
    'reservation', public.ai_path_realtime_reservation_json(
      target_reservation,
      target_reservation.idempotency_key_hash
    ),
    'idempotent', replayed,
    'userBudgetExceeded', spent_user > p_max_user_daily_cents,
    'globalBudgetExceeded', spent_global > p_max_global_daily_cents
  );
end;
$$;

revoke all on function public.finalize_ai_path_realtime_admission(
  uuid, text, text, integer, timestamptz, integer, integer
) from public, anon, authenticated;
grant execute on function public.finalize_ai_path_realtime_admission(
  uuid, text, text, integer, timestamptz, integer, integer
) to service_role;

-- Replace cancel so it locks and transitions only the requested reservation.
-- A lease that has expired by database time is marked expired and rejected;
-- the caller cannot cancel it to erase usage that may need reconciliation.
create or replace function public.cancel_ai_path_realtime_admission(
  p_reservation_id uuid,
  p_user_key text,
  p_session_key text,
  p_now timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  target_reservation public.ai_path_realtime_admission_reservations;
  replayed boolean := false;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission requires the service role.' using errcode = '42501';
  end if;
  if p_reservation_id is null
    or p_user_key is null or p_user_key !~ '^[0-9a-f]{64}$'
    or p_session_key is null or p_session_key !~ '^[0-9a-f]{64}$'
    or p_now is null then
    raise exception 'Realtime cancellation input is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30 then
    raise exception 'Realtime cancellation timestamp is invalid.' using errcode = '22023';
  end if;

  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if target_reservation.user_key <> p_user_key or target_reservation.session_key <> p_session_key then
    return jsonb_build_object('kind', 'binding_mismatch');
  end if;
  if target_reservation.status = 'reserved' and target_reservation.expires_at <= database_now then
    update public.ai_path_realtime_admission_reservations
    set status = 'expired'
    where id = p_reservation_id;
    return jsonb_build_object('kind', 'state_conflict');
  end if;
  if target_reservation.status = 'cancelled' then
    replayed := true;
  elsif target_reservation.status = 'reserved' then
    update public.ai_path_realtime_admission_reservations
    set status = 'cancelled', cancelled_at = p_now
    where id = p_reservation_id
    returning * into target_reservation;
  else
    return jsonb_build_object('kind', 'state_conflict');
  end if;

  return jsonb_build_object(
    'kind', 'cancelled',
    'reservation', public.ai_path_realtime_reservation_json(
      target_reservation,
      target_reservation.idempotency_key_hash
    ),
    'idempotent', replayed
  );
end;
$$;

revoke all on function public.cancel_ai_path_realtime_admission(
  uuid, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.cancel_ai_path_realtime_admission(
  uuid, text, text, timestamptz
) to service_role;

create or replace function public.maintain_ai_path_realtime_admission(
  p_expire_limit integer,
  p_purge_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  retention_cutoff timestamptz;
  transitioned_expired_count integer := 0;
  purged_expired_count integer := 0;
  purged_finalized_count integer := 0;
  purged_cancelled_count integer := 0;
  purged_total integer := 0;
  more_to_expire boolean := false;
  more_to_purge boolean := false;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission maintenance requires the service role.' using errcode = '42501';
  end if;
  if p_expire_limit is null or p_expire_limit not between 1 and 1000
    or p_purge_limit is null or p_purge_limit not between 1 and 1000 then
    raise exception 'Realtime admission maintenance limits are invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '5s', true);
  perform pg_catalog.set_config('statement_timeout', '15s', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  retention_cutoff := database_now - interval '90 days';

  with expiry_batch as materialized (
    select id
    from public.ai_path_realtime_admission_reservations
    where status = 'reserved' and expires_at <= database_now
    order by expires_at, id
    for update skip locked
    limit p_expire_limit
  )
  update public.ai_path_realtime_admission_reservations as reservation
  set status = 'expired'
  from expiry_batch
  where reservation.id = expiry_batch.id;
  get diagnostics transitioned_expired_count = row_count;

  with purge_batch as materialized (
    select
      id,
      case
        when status = 'expired' then expires_at
        when status = 'finalized' then finalized_at
        when status = 'cancelled' then cancelled_at
      end as terminal_at
    from public.ai_path_realtime_admission_reservations
    where utc_day < (database_now at time zone 'UTC')::date
      and (
        (status = 'expired' and expires_at <= retention_cutoff)
        or (status = 'finalized' and finalized_at <= retention_cutoff)
        or (status = 'cancelled' and cancelled_at <= retention_cutoff)
      )
    order by terminal_at, id
    for update skip locked
    limit p_purge_limit
  ), deleted as (
    delete from public.ai_path_realtime_admission_reservations as reservation
    using purge_batch
    where reservation.id = purge_batch.id
    returning reservation.utc_day, reservation.status,
      reservation.estimated_cents, reservation.actual_cents
  ), aggregated as (
    select
      utc_day,
      status,
      count(*)::bigint as reservation_count,
      sum(estimated_cents)::bigint as estimated_cents,
      coalesce(sum(actual_cents), 0)::bigint as actual_cents
    from deleted
    group by utc_day, status
  ), archived as (
    insert into public.ai_path_realtime_admission_daily_archive (
      utc_day,
      reservation_status,
      reservation_count,
      estimated_cents,
      actual_cents,
      first_archived_at,
      last_archived_at
    )
    select
      utc_day,
      status,
      reservation_count,
      estimated_cents,
      actual_cents,
      database_now,
      database_now
    from aggregated
    on conflict (utc_day, reservation_status) do update set
      reservation_count = public.ai_path_realtime_admission_daily_archive.reservation_count + excluded.reservation_count,
      estimated_cents = public.ai_path_realtime_admission_daily_archive.estimated_cents + excluded.estimated_cents,
      actual_cents = public.ai_path_realtime_admission_daily_archive.actual_cents + excluded.actual_cents,
      last_archived_at = excluded.last_archived_at
    returning 1
  )
  select
    count(*) filter (where status = 'expired')::integer,
    count(*) filter (where status = 'finalized')::integer,
    count(*) filter (where status = 'cancelled')::integer,
    count(*)::integer
  into purged_expired_count, purged_finalized_count,
    purged_cancelled_count, purged_total
  from deleted;

  select exists (
    select 1
    from public.ai_path_realtime_admission_reservations
    where status = 'reserved' and expires_at <= database_now
  ) into more_to_expire;

  select exists (
    select 1
    from public.ai_path_realtime_admission_reservations
    where utc_day < (database_now at time zone 'UTC')::date
      and (
        (status = 'expired' and expires_at <= retention_cutoff)
        or (status = 'finalized' and finalized_at <= retention_cutoff)
        or (status = 'cancelled' and cancelled_at <= retention_cutoff)
      )
  ) into more_to_purge;

  return jsonb_build_object(
    'policyVersion', '2026-07-17.v1',
    'retentionCutoff', to_char(retention_cutoff at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'transitionedExpiredCount', transitioned_expired_count,
    'purgedTotal', purged_total,
    'purgedByStatus', jsonb_build_object(
      'expired', purged_expired_count,
      'finalized', purged_finalized_count,
      'cancelled', purged_cancelled_count
    ),
    'hasMoreToExpire', more_to_expire,
    'hasMoreToPurge', more_to_purge,
    'hasMore', more_to_expire or more_to_purge
  );
end;
$$;

revoke all on function public.maintain_ai_path_realtime_admission(integer, integer)
  from public, anon, authenticated;
grant execute on function public.maintain_ai_path_realtime_admission(integer, integer)
  to service_role;
