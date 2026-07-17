-- Durable Realtime admission primitives. This migration does not activate live
-- Realtime or open any application latch. Only server-derived opaque HMAC keys
-- may be stored; raw user/session identifiers, SDP, audio, and transcripts are
-- deliberately absent from this schema.

create extension if not exists pgcrypto with schema extensions;

create type public.ai_path_realtime_reservation_status as enum (
  'reserved',
  'finalized',
  'cancelled',
  'expired'
);

create table public.ai_path_realtime_admission_reservations (
  id uuid primary key default gen_random_uuid(),
  admission_version text not null default '2026-07-16.v1'
    check (admission_version = '2026-07-16.v1'),
  user_key text not null check (user_key ~ '^[0-9a-f]{64}$'),
  session_key text not null check (session_key ~ '^[0-9a-f]{64}$'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  utc_day date not null,
  estimated_cents integer not null check (estimated_cents between 1 and 100000000),
  actual_cents integer check (actual_cents between 0 and 100000000),
  status public.ai_path_realtime_reservation_status not null default 'reserved',
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  unique (user_key, idempotency_key_hash),
  check (utc_day = (created_at at time zone 'UTC')::date),
  check (expires_at > created_at),
  check (expires_at >= created_at + interval '30 seconds'),
  check (expires_at <= created_at + interval '4 hours'),
  check (
    (status = 'reserved' and actual_cents is null and finalized_at is null and cancelled_at is null)
    or (status = 'expired' and actual_cents is null and finalized_at is null and cancelled_at is null)
    or (status = 'finalized' and actual_cents is not null and finalized_at is not null and finalized_at >= created_at and cancelled_at is null)
    or (status = 'cancelled' and actual_cents is null and finalized_at is null and cancelled_at is not null and cancelled_at >= created_at)
  )
);

comment on table public.ai_path_realtime_admission_reservations is
  'Paid Realtime admission ledger. Contains opaque HMAC keys and integer cents only; never raw identity, IP, SDP, audio, transcript, or prompt content.';

create unique index ai_path_realtime_one_reserved_session_idx
  on public.ai_path_realtime_admission_reservations (session_key)
  where status = 'reserved';
create index ai_path_realtime_active_expiry_idx
  on public.ai_path_realtime_admission_reservations (expires_at)
  where status = 'reserved';
create index ai_path_realtime_user_day_budget_idx
  on public.ai_path_realtime_admission_reservations (user_key, utc_day, status);
create index ai_path_realtime_global_day_budget_idx
  on public.ai_path_realtime_admission_reservations (utc_day, status);

alter table public.ai_path_realtime_admission_reservations enable row level security;
alter table public.ai_path_realtime_admission_reservations force row level security;

-- No table policy is created. The service role can use only the reviewed RPCs,
-- while the security-definer owner performs the internal ledger operations.
revoke all on public.ai_path_realtime_admission_reservations
  from public, anon, authenticated, service_role;

create or replace function public.ai_path_realtime_reservation_json(
  p_reservation public.ai_path_realtime_admission_reservations,
  p_idempotency_key text
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', (p_reservation).id,
    'version', (p_reservation).admission_version,
    'idempotencyKey', p_idempotency_key,
    'userKey', (p_reservation).user_key,
    'sessionKey', (p_reservation).session_key,
    'utcDay', to_char((p_reservation).utc_day, 'YYYY-MM-DD'),
    'estimatedCents', (p_reservation).estimated_cents,
    'actualCents', (p_reservation).actual_cents,
    'status', (p_reservation).status,
    'createdAt', to_char((p_reservation).created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'expiresAt', to_char((p_reservation).expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'finalizedAt', case when (p_reservation).finalized_at is null then null else
      to_char((p_reservation).finalized_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end,
    'cancelledAt', case when (p_reservation).cancelled_at is null then null else
      to_char((p_reservation).cancelled_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') end
  );
$$;

revoke all on function public.ai_path_realtime_reservation_json(
  public.ai_path_realtime_admission_reservations, text
) from public, anon, authenticated, service_role;

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

  -- This transaction-scoped lock serializes every global/user budget and
  -- concurrency decision, including the no-row-yet case. It is intentionally
  -- conservative and must be load-tested before activation.
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30
    or p_utc_day <> (p_now at time zone 'UTC')::date
    or p_utc_day <> (database_now at time zone 'UTC')::date
    or p_expires_at <> p_now + (p_reservation_ttl_ms * interval '1 millisecond') then
    raise exception 'Realtime admission timestamps are invalid.' using errcode = '22023';
  end if;
  idempotency_hash := encode(
    extensions.digest(convert_to(p_idempotency_key, 'UTF8'), 'sha256'),
    'hex'
  );
  update public.ai_path_realtime_admission_reservations
  set status = 'expired'
  where status = 'reserved' and expires_at <= database_now;

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

  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30 then
    raise exception 'Realtime finalization timestamp is invalid.' using errcode = '22023';
  end if;
  update public.ai_path_realtime_admission_reservations
  set status = 'expired'
  where status = 'reserved' and expires_at <= database_now;

  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if target_reservation.user_key <> p_user_key or target_reservation.session_key <> p_session_key then
    return jsonb_build_object('kind', 'binding_mismatch');
  end if;
  if target_reservation.status = 'finalized' then
    if target_reservation.actual_cents <> p_actual_cents then
      return jsonb_build_object('kind', 'state_conflict');
    end if;
    replayed := true;
  elsif target_reservation.status in ('reserved', 'expired') then
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

  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  if abs(extract(epoch from (database_now - p_now))) > 30 then
    raise exception 'Realtime cancellation timestamp is invalid.' using errcode = '22023';
  end if;
  update public.ai_path_realtime_admission_reservations
  set status = 'expired'
  where status = 'reserved' and expires_at <= database_now;

  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;
  if target_reservation.user_key <> p_user_key or target_reservation.session_key <> p_session_key then
    return jsonb_build_object('kind', 'binding_mismatch');
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

revoke all on function public.reserve_ai_path_realtime_admission(
  text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer
) from public, anon, authenticated;
revoke all on function public.finalize_ai_path_realtime_admission(
  uuid, text, text, integer, timestamptz, integer, integer
) from public, anon, authenticated;
revoke all on function public.cancel_ai_path_realtime_admission(
  uuid, text, text, timestamptz
) from public, anon, authenticated;

grant execute on function public.reserve_ai_path_realtime_admission(
  text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer
) to service_role;
grant execute on function public.finalize_ai_path_realtime_admission(
  uuid, text, text, integer, timestamptz, integer, integer
) to service_role;
grant execute on function public.cancel_ai_path_realtime_admission(
  uuid, text, text, timestamptz
) to service_role;
