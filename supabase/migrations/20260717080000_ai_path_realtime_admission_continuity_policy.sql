-- Database-owned continuity and spend policy cutover for Realtime admission.
-- This migration is deliberately fail-closed: it accepts only an empty legacy
-- ledger/archive and seeds the only policy with admission disabled.

do $$
declare
  legacy_reservation_count bigint;
  legacy_archive_count bigint;
begin
  select count(*) into legacy_reservation_count
  from public.ai_path_realtime_admission_reservations;
  select count(*) into legacy_archive_count
  from public.ai_path_realtime_admission_daily_archive;
  if legacy_reservation_count <> 0 or legacy_archive_count <> 0 then
    raise exception
      'DB-owned continuity cutover requires an empty legacy admission ledger and archive (reservations=%, archive=%).',
      legacy_reservation_count, legacy_archive_count
      using errcode = '55000';
  end if;
end;
$$;

create table public.ai_path_realtime_admission_policy_contracts (
  policy_id text primary key,
  policy_version text not null unique,
  max_global_concurrent integer not null check (max_global_concurrent = 2),
  max_user_concurrent integer not null check (max_user_concurrent = 1),
  max_user_daily_cents integer not null check (max_user_daily_cents = 100),
  max_global_daily_cents integer not null check (max_global_daily_cents = 1000),
  max_reservation_cents integer not null check (max_reservation_cents = 100),
  reservation_ttl_ms integer not null check (reservation_ttl_ms = 120000),
  reconciliation_days integer not null check (reconciliation_days = 7),
  terminal_retention_days integer not null check (terminal_retention_days = 90),
  intent_retention_days integer not null check (intent_retention_days = 7),
  created_at timestamptz not null default clock_timestamp(),
  check (
    policy_id = policy_version
      || '|gc=' || max_global_concurrent
      || '|uc=' || max_user_concurrent
      || '|udc=' || max_user_daily_cents
      || '|gdc=' || max_global_daily_cents
      || '|rc=' || max_reservation_cents
      || '|ttl=' || reservation_ttl_ms
  )
);

create table public.ai_path_realtime_admission_policy_state (
  singleton boolean primary key default true check (singleton),
  policy_id text not null references public.ai_path_realtime_admission_policy_contracts(policy_id),
  admission_enabled boolean not null default false,
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.ai_path_realtime_admission_policy_contracts (
  policy_id, policy_version, max_global_concurrent, max_user_concurrent,
  max_user_daily_cents, max_global_daily_cents, max_reservation_cents,
  reservation_ttl_ms, reconciliation_days, terminal_retention_days,
  intent_retention_days
) values (
  '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
  '2026-07-17.v1', 2, 1, 100, 1000, 100, 120000, 7, 90, 7
);
insert into public.ai_path_realtime_admission_policy_state (
  singleton, policy_id, admission_enabled
) values (
  true, '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000', false
);

create table public.ai_path_realtime_owner_continuity (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  owner_continuity_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  unique (owner_id, owner_continuity_id)
);

create table public.ai_path_realtime_session_continuity (
  assessment_session_id uuid primary key
    references public.ai_path_assessment_sessions(id) on delete cascade,
  owner_id uuid not null references public.ai_path_realtime_owner_continuity(owner_id) on delete cascade,
  owner_continuity_id uuid not null,
  session_continuity_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default clock_timestamp(),
  foreign key (owner_id, owner_continuity_id)
    references public.ai_path_realtime_owner_continuity(owner_id, owner_continuity_id)
    on delete cascade
);

create table public.ai_path_realtime_admission_intents (
  id uuid primary key default gen_random_uuid(),
  policy_id text not null references public.ai_path_realtime_admission_policy_contracts(policy_id),
  assessment_session_id uuid not null
    references public.ai_path_realtime_session_continuity(assessment_session_id) on delete cascade,
  owner_continuity_id uuid not null,
  session_continuity_id uuid not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  reservation_id uuid,
  idempotency_key_hash text check (
    idempotency_key_hash is null or idempotency_key_hash ~ '^[0-9a-f]{64}$'
  ),
  estimated_cents integer check (estimated_cents is null or estimated_cents between 1 and 100000000),
  unique (policy_id, assessment_session_id),
  check (expires_at > issued_at),
  check (
    (consumed_at is null and reservation_id is null and idempotency_key_hash is null and estimated_cents is null)
    or
    (consumed_at is not null and reservation_id is not null and idempotency_key_hash is not null and estimated_cents is not null)
  )
);

-- The ledger now stores database-generated continuity identifiers. Raw auth
-- user ids are confined to the private mapping table and never enter accounting.
drop index if exists public.ai_path_realtime_one_reserved_session_idx;
drop index if exists public.ai_path_realtime_user_day_budget_idx;
alter table public.ai_path_realtime_admission_reservations
  drop column user_key cascade,
  drop column session_key cascade,
  add column policy_id text not null
    references public.ai_path_realtime_admission_policy_contracts(policy_id),
  add column admission_intent_id uuid not null unique,
  add column owner_continuity_id uuid not null,
  add column session_continuity_id uuid not null;

alter table public.ai_path_realtime_admission_intents
  add constraint ai_path_realtime_intent_reservation_fk
  foreign key (reservation_id)
  references public.ai_path_realtime_admission_reservations(id)
  on delete cascade;

create unique index ai_path_realtime_owner_idempotency_idx
  on public.ai_path_realtime_admission_reservations (
    owner_continuity_id, idempotency_key_hash
  );
create unique index ai_path_realtime_one_reserved_session_continuity_idx
  on public.ai_path_realtime_admission_reservations (session_continuity_id)
  where status = 'reserved';
create index ai_path_realtime_owner_day_budget_v2_idx
  on public.ai_path_realtime_admission_reservations (
    owner_continuity_id, utc_day, status, policy_id
  );
create index ai_path_realtime_global_day_budget_v2_idx
  on public.ai_path_realtime_admission_reservations (utc_day, status, policy_id);
create index ai_path_realtime_intent_expiry_idx
  on public.ai_path_realtime_admission_intents (expires_at, id)
  where consumed_at is null;

comment on table public.ai_path_realtime_admission_reservations is
  'Paid Realtime accounting ledger containing only database-generated continuity ids, policy ids, hashes, integer cents, and lifecycle timestamps; never auth user ids, assessment session ids, IP, SDP, audio, transcript, prompt, or provider content.';

drop table public.ai_path_realtime_admission_daily_archive cascade;
create table public.ai_path_realtime_admission_daily_archive (
  policy_id text not null references public.ai_path_realtime_admission_policy_contracts(policy_id),
  utc_day date not null,
  reservation_status public.ai_path_realtime_reservation_status not null
    check (reservation_status <> 'reserved'),
  reservation_count bigint not null check (reservation_count >= 0),
  estimated_cents bigint not null check (estimated_cents >= 0),
  actual_cents bigint not null check (actual_cents >= 0),
  first_archived_at timestamptz not null,
  last_archived_at timestamptz not null,
  primary key (policy_id, utc_day, reservation_status)
);

comment on table public.ai_path_realtime_admission_daily_archive is
  'Content-free per-policy UTC-day accounting totals; no identity, session, intent, reservation, idempotency, provider, prompt, audio, or transcript data.';

-- These tables are reachable only inside audited security-definer functions.
alter table public.ai_path_realtime_admission_policy_contracts enable row level security;
alter table public.ai_path_realtime_admission_policy_contracts force row level security;
alter table public.ai_path_realtime_admission_policy_state enable row level security;
alter table public.ai_path_realtime_admission_policy_state force row level security;
alter table public.ai_path_realtime_owner_continuity enable row level security;
alter table public.ai_path_realtime_owner_continuity force row level security;
alter table public.ai_path_realtime_session_continuity enable row level security;
alter table public.ai_path_realtime_session_continuity force row level security;
alter table public.ai_path_realtime_admission_intents enable row level security;
alter table public.ai_path_realtime_admission_intents force row level security;
alter table public.ai_path_realtime_admission_daily_archive enable row level security;
alter table public.ai_path_realtime_admission_daily_archive force row level security;

revoke all on public.ai_path_realtime_admission_policy_contracts
  from public, anon, authenticated, service_role;
revoke all on public.ai_path_realtime_admission_policy_state
  from public, anon, authenticated, service_role;
revoke all on public.ai_path_realtime_owner_continuity
  from public, anon, authenticated, service_role;
revoke all on public.ai_path_realtime_session_continuity
  from public, anon, authenticated, service_role;
revoke all on public.ai_path_realtime_admission_intents
  from public, anon, authenticated, service_role;
revoke all on public.ai_path_realtime_admission_daily_archive
  from public, anon, authenticated, service_role;

create or replace function public.reject_ai_path_realtime_policy_contract_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Realtime admission policy contracts are immutable; publish a new migration.'
    using errcode = '55000';
end;
$$;
create trigger ai_path_realtime_policy_contracts_immutable
before update or delete on public.ai_path_realtime_admission_policy_contracts
for each statement execute function public.reject_ai_path_realtime_policy_contract_mutation();
revoke all on function public.reject_ai_path_realtime_policy_contract_mutation()
  from public, anon, authenticated, service_role;

-- A policy generation may roll only after its private intents and detailed
-- reservation ledger are fully drained. Disabling the current generation is
-- always allowed and is the first step of that operator-controlled drain.
create or replace function public.guard_ai_path_realtime_policy_state_rollover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.policy_id is distinct from old.policy_id then
    perform pg_catalog.set_config('lock_timeout', '3s', true);
    perform pg_catalog.set_config('statement_timeout', '3500ms', true);
    perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
    if exists (select 1 from public.ai_path_realtime_admission_intents)
      or exists (select 1 from public.ai_path_realtime_admission_reservations) then
      raise exception 'Realtime policy rollover requires all intents and reservation detail to be drained.'
        using errcode = '55000';
    end if;
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger ai_path_realtime_policy_state_rollover_guard
before update on public.ai_path_realtime_admission_policy_state
for each row execute function public.guard_ai_path_realtime_policy_state_rollover();
revoke all on function public.guard_ai_path_realtime_policy_state_rollover()
  from public, anon, authenticated, service_role;

create or replace function public.guard_ai_path_realtime_ledger_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.admission_version is distinct from old.admission_version
    or new.policy_id is distinct from old.policy_id
    or new.admission_intent_id is distinct from old.admission_intent_id
    or new.owner_continuity_id is distinct from old.owner_continuity_id
    or new.session_continuity_id is distinct from old.session_continuity_id
    or new.idempotency_key_hash is distinct from old.idempotency_key_hash
    or new.utc_day is distinct from old.utc_day
    or new.estimated_cents is distinct from old.estimated_cents
    or new.created_at is distinct from old.created_at
    or new.expires_at is distinct from old.expires_at then
    raise exception 'Realtime admission ledger identity, policy, request, day, and lease fields are immutable.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;
create trigger ai_path_realtime_ledger_immutability
before update on public.ai_path_realtime_admission_reservations
for each row execute function public.guard_ai_path_realtime_ledger_immutability();
revoke all on function public.guard_ai_path_realtime_ledger_immutability()
  from public, anon, authenticated, service_role;

-- Session/account deletion cannot destroy the private continuity link while a
-- paid lease is live. Elapsed leases are reconciled to expired under the same
-- admission lock, after which the source and its mappings may be deleted.
create or replace function public.guard_ai_path_realtime_session_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  database_now timestamptz;
  mapped_session_continuity_id uuid;
begin
  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  select session_continuity_id into mapped_session_continuity_id
  from public.ai_path_realtime_session_continuity
  where assessment_session_id = old.id;
  if mapped_session_continuity_id is null then
    return old;
  end if;

  update public.ai_path_realtime_admission_reservations
  set status = 'expired'
  where session_continuity_id = mapped_session_continuity_id
    and status = 'reserved'
    and expires_at <= database_now;

  if exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where session_continuity_id = mapped_session_continuity_id
      and status = 'reserved'
      and expires_at > database_now
  ) then
    raise exception 'An assessment session with an active Realtime lease cannot be deleted.'
      using errcode = '55000';
  end if;
  return old;
end;
$$;
create trigger ai_path_realtime_session_delete_guard
before delete on public.ai_path_assessment_sessions
for each row execute function public.guard_ai_path_realtime_session_delete();
revoke all on function public.guard_ai_path_realtime_session_delete()
  from public, anon, authenticated, service_role;

-- Auth-user cascades can visit owner continuity and assessment sessions in an
-- implementation-dependent order, so account deletion needs its own guard
-- before either private mapping can disappear.
create or replace function public.guard_ai_path_realtime_owner_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  database_now timestamptz;
  mapped_owner_continuity_id uuid;
begin
  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  select owner_continuity_id into mapped_owner_continuity_id
  from public.ai_path_realtime_owner_continuity
  where owner_id = old.id;
  if mapped_owner_continuity_id is null then
    return old;
  end if;

  update public.ai_path_realtime_admission_reservations
  set status = 'expired'
  where owner_continuity_id = mapped_owner_continuity_id
    and status = 'reserved'
    and expires_at <= database_now;

  if exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where owner_continuity_id = mapped_owner_continuity_id
      and status = 'reserved'
      and expires_at > database_now
  ) then
    raise exception 'An account with an active Realtime lease cannot be deleted.'
      using errcode = '55000';
  end if;
  return old;
end;
$$;
create trigger ai_path_realtime_owner_delete_guard
before delete on auth.users
for each row execute function public.guard_ai_path_realtime_owner_delete();
revoke all on function public.guard_ai_path_realtime_owner_delete()
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
    'policyId', (p_reservation).policy_id,
    'intentId', (p_reservation).admission_intent_id,
    'idempotencyKey', p_idempotency_key,
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

-- Step one: an authenticated owner asks the database for an opaque, short-lived
-- intent. Repeating the request for the same policy/session returns the same
-- durable intent until it expires; the response always has exactly three keys.
create or replace function public.issue_ai_path_realtime_admission_intent(
  p_policy_id text,
  p_assessment_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  caller_id uuid := auth.uid();
  database_now timestamptz;
  target_owner_id uuid;
  policy_record public.ai_path_realtime_admission_policy_contracts;
  policy_enabled boolean;
  owner_mapping public.ai_path_realtime_owner_continuity;
  session_mapping public.ai_path_realtime_session_continuity;
  intent_record public.ai_path_realtime_admission_intents;
begin
  if caller_role <> 'authenticated' or caller_id is null then
    raise exception 'Realtime admission intent requires an authenticated owner.' using errcode = '42501';
  end if;
  if p_policy_id is null or char_length(p_policy_id) not between 1 and 256
    or p_assessment_session_id is null then
    raise exception 'Realtime admission intent input is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  select * into policy_record
  from public.ai_path_realtime_admission_policy_contracts
  where policy_id = p_policy_id;
  if not found then
    raise exception 'Realtime admission policy is unknown.' using errcode = '22023';
  end if;

  select admission_enabled into policy_enabled
  from public.ai_path_realtime_admission_policy_state
  where singleton and policy_id = p_policy_id;
  if not found or policy_enabled is not true then
    raise exception 'Realtime admission policy is disabled.' using errcode = '55000';
  end if;

  select owner_id into target_owner_id
  from public.ai_path_assessment_sessions
  where id = p_assessment_session_id
    and owner_id = caller_id
    and status in ('consented', 'connecting')
    and mode = 'voice'
    and retention_expires_at > database_now;
  if not found then
    raise exception 'Owned voice assessment session is not eligible.' using errcode = 'P0002';
  end if;

  insert into public.ai_path_realtime_owner_continuity (owner_id)
  values (caller_id)
  on conflict (owner_id) do nothing;
  select * into owner_mapping
  from public.ai_path_realtime_owner_continuity
  where owner_id = caller_id;

  insert into public.ai_path_realtime_session_continuity (
    assessment_session_id, owner_id, owner_continuity_id
  ) values (
    p_assessment_session_id, caller_id, owner_mapping.owner_continuity_id
  )
  on conflict (assessment_session_id) do nothing;
  select * into session_mapping
  from public.ai_path_realtime_session_continuity
  where assessment_session_id = p_assessment_session_id;
  if session_mapping.owner_id <> caller_id
    or session_mapping.owner_continuity_id <> owner_mapping.owner_continuity_id then
    raise exception 'Realtime session continuity ownership mismatch.' using errcode = '42501';
  end if;

  select * into intent_record
  from public.ai_path_realtime_admission_intents
  where policy_id = p_policy_id
    and assessment_session_id = p_assessment_session_id
  for update;
  if found and intent_record.expires_at <= database_now and intent_record.consumed_at is null then
    delete from public.ai_path_realtime_admission_intents where id = intent_record.id;
    intent_record := null;
  end if;

  if intent_record.id is null then
    insert into public.ai_path_realtime_admission_intents (
      policy_id, assessment_session_id, owner_continuity_id,
      session_continuity_id, issued_at, expires_at
    ) values (
      p_policy_id, p_assessment_session_id, owner_mapping.owner_continuity_id,
      session_mapping.session_continuity_id, database_now,
      database_now + (policy_record.reservation_ttl_ms * interval '1 millisecond')
    ) returning * into intent_record;
  end if;

  return jsonb_build_object(
    'intentId', intent_record.id,
    'policyId', intent_record.policy_id,
    'expiresAt', to_char(intent_record.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );
end;
$$;

revoke all on function public.issue_ai_path_realtime_admission_intent(text, uuid)
  from public, anon, service_role;
grant execute on function public.issue_ai_path_realtime_admission_intent(text, uuid)
  to authenticated;

-- Remove every caller-key/caller-clock/caller-cap lifecycle overload before
-- publishing the DB-authoritative signatures.
drop function if exists public.reserve_ai_path_realtime_admission(text, text, text, date, timestamptz, timestamptz, integer, integer, integer, integer, integer, integer, integer);
drop function if exists public.finalize_ai_path_realtime_admission(uuid, text, text, integer, timestamptz, integer, integer);
drop function if exists public.cancel_ai_path_realtime_admission(uuid, text, text, timestamptz);
drop function if exists public.maintain_ai_path_realtime_admission(integer, integer);

-- Step two: the service exchanges an opaque intent for an atomic reservation.
-- A consumed intent is the durable unknown-commit receipt: an exact retry
-- returns its prior reservation and a conflicting retry is denied.
create or replace function public.reserve_ai_path_realtime_admission(
  p_policy_id text,
  p_intent_id uuid,
  p_idempotency_key text,
  p_estimated_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  policy_record public.ai_path_realtime_admission_policy_contracts;
  policy_enabled boolean;
  intent_record public.ai_path_realtime_admission_intents;
  existing_reservation public.ai_path_realtime_admission_reservations;
  existing_reservation_found boolean := false;
  created_reservation public.ai_path_realtime_admission_reservations;
  idempotency_hash text;
  active_global bigint;
  active_user bigint;
  spent_global bigint;
  spent_user bigint;
  utc_day_value date;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission requires the service role.' using errcode = '42501';
  end if;
  if p_policy_id is null or char_length(p_policy_id) not between 1 and 256
    or p_intent_id is null
    or p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9_-]{16,128}$'
    or p_estimated_cents is null then
    raise exception 'Realtime admission request is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();
  utc_day_value := (database_now at time zone 'UTC')::date;

  select * into policy_record
  from public.ai_path_realtime_admission_policy_contracts
  where policy_id = p_policy_id;
  if not found then
    raise exception 'Realtime admission policy is unknown.' using errcode = '22023';
  end if;
  if p_estimated_cents not between 1 and policy_record.max_reservation_cents then
    raise exception 'Realtime estimated cents exceed database policy.' using errcode = '22023';
  end if;

  idempotency_hash := encode(
    extensions.digest(convert_to(p_idempotency_key, 'UTF8'), 'sha256'), 'hex'
  );

  -- Resolve the durable receipt before consulting the short-lived intent or
  -- mutable kill switch. This is the unknown-commit path after source/account
  -- deletion and does not admit new spend.
  select * into existing_reservation
  from public.ai_path_realtime_admission_reservations
  where admission_intent_id = p_intent_id
  for update;
  existing_reservation_found := found;

  -- The emergency kill switch gates both new admission and successful replay:
  -- no provider may be started from a reserved response while it is disabled.
  select admission_enabled into policy_enabled
  from public.ai_path_realtime_admission_policy_state
  where singleton and policy_id = p_policy_id;
  if not found then
    raise exception 'Realtime admission policy state is unavailable.' using errcode = '55000';
  end if;
  if policy_enabled is not true then
    raise exception 'Realtime admission policy is disabled.' using errcode = '55000';
  end if;

  if existing_reservation_found then
    if existing_reservation.policy_id <> p_policy_id
      or existing_reservation.idempotency_key_hash <> idempotency_hash
      or existing_reservation.estimated_cents <> p_estimated_cents then
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_conflict');
    end if;
    if existing_reservation.status = 'reserved'
      and existing_reservation.expires_at <= database_now then
      update public.ai_path_realtime_admission_reservations
      set status = 'expired'
      where id = existing_reservation.id;
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_terminal');
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

  select * into intent_record
  from public.ai_path_realtime_admission_intents
  where id = p_intent_id and policy_id = p_policy_id
  for update;
  if not found then
    raise exception 'Realtime admission intent is unknown.' using errcode = '22023';
  end if;

  if intent_record.consumed_at is not null then
    return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_terminal');
  end if;
  if intent_record.expires_at <= database_now then
    raise exception 'Realtime admission intent is expired.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where status = 'reserved' and expires_at <= database_now
  ) then
    raise exception 'Realtime admission maintenance is required.' using errcode = '55000';
  end if;

  select * into existing_reservation
  from public.ai_path_realtime_admission_reservations
  where owner_continuity_id = intent_record.owner_continuity_id
    and idempotency_key_hash = idempotency_hash
  for update;
  if found then
    if existing_reservation.admission_intent_id <> p_intent_id
      or existing_reservation.session_continuity_id <> intent_record.session_continuity_id
      or existing_reservation.estimated_cents <> p_estimated_cents
      or existing_reservation.policy_id <> p_policy_id then
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_conflict');
    end if;
    if existing_reservation.status <> 'reserved' then
      return jsonb_build_object('kind', 'denied', 'reason', 'idempotency_terminal');
    end if;
    update public.ai_path_realtime_admission_intents
    set consumed_at = database_now,
        reservation_id = existing_reservation.id,
        idempotency_key_hash = idempotency_hash,
        estimated_cents = p_estimated_cents
    where id = intent_record.id;
    return jsonb_build_object(
      'kind', 'reserved',
      'reservation', public.ai_path_realtime_reservation_json(existing_reservation, p_idempotency_key),
      'idempotent', true
    );
  end if;

  if exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where session_continuity_id = intent_record.session_continuity_id
      and status = 'reserved'
  ) then
    return jsonb_build_object('kind', 'denied', 'reason', 'session_already_reserved');
  end if;

  select count(*) into active_global
  from public.ai_path_realtime_admission_reservations
  where status = 'reserved';
  select count(*) into active_user
  from public.ai_path_realtime_admission_reservations
  where status = 'reserved'
    and owner_continuity_id = intent_record.owner_continuity_id;
  if active_user >= policy_record.max_user_concurrent then
    return jsonb_build_object('kind', 'denied', 'reason', 'user_concurrency_exceeded');
  end if;
  if active_global >= policy_record.max_global_concurrent then
    return jsonb_build_object('kind', 'denied', 'reason', 'global_concurrency_exceeded');
  end if;

  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_global
  from public.ai_path_realtime_admission_reservations
  where utc_day = utc_day_value;
  select coalesce(sum(case
    when status = 'reserved' then estimated_cents
    when status = 'finalized' then actual_cents
    else 0 end), 0)::bigint
  into spent_user
  from public.ai_path_realtime_admission_reservations
  where utc_day = utc_day_value
    and owner_continuity_id = intent_record.owner_continuity_id;
  if spent_user + p_estimated_cents > policy_record.max_user_daily_cents then
    return jsonb_build_object('kind', 'denied', 'reason', 'user_daily_budget_exceeded');
  end if;
  if spent_global + p_estimated_cents > policy_record.max_global_daily_cents then
    return jsonb_build_object('kind', 'denied', 'reason', 'global_daily_budget_exceeded');
  end if;

  insert into public.ai_path_realtime_admission_reservations (
    admission_version, policy_id, admission_intent_id,
    owner_continuity_id, session_continuity_id, idempotency_key_hash,
    utc_day, estimated_cents, status, created_at, expires_at
  ) values (
    '2026-07-16.v1', p_policy_id, p_intent_id,
    intent_record.owner_continuity_id, intent_record.session_continuity_id,
    idempotency_hash, utc_day_value, p_estimated_cents, 'reserved',
    database_now,
    database_now + (policy_record.reservation_ttl_ms * interval '1 millisecond')
  ) returning * into created_reservation;

  update public.ai_path_realtime_admission_intents
  set consumed_at = database_now,
      reservation_id = created_reservation.id,
      idempotency_key_hash = idempotency_hash,
      estimated_cents = p_estimated_cents
  where id = intent_record.id;

  return jsonb_build_object(
    'kind', 'reserved',
    'reservation', public.ai_path_realtime_reservation_json(created_reservation, p_idempotency_key),
    'idempotent', false
  );
end;
$$;

revoke all on function public.reserve_ai_path_realtime_admission(text, uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_path_realtime_admission(text, uuid, text, integer)
  to service_role;

create or replace function public.finalize_ai_path_realtime_admission(
  p_policy_id text,
  p_intent_id uuid,
  p_reservation_id uuid,
  p_actual_cents integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  policy_record public.ai_path_realtime_admission_policy_contracts;
  target_reservation public.ai_path_realtime_admission_reservations;
  spent_global bigint;
  spent_user bigint;
  replayed boolean := false;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime finalization requires the service role.' using errcode = '42501';
  end if;
  if p_policy_id is null or char_length(p_policy_id) not between 1 and 256
    or p_intent_id is null
    or p_reservation_id is null
    or p_actual_cents is null or p_actual_cents not between 0 and 100000000 then
    raise exception 'Realtime finalization input is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  select * into policy_record
  from public.ai_path_realtime_admission_policy_contracts
  where policy_id = p_policy_id;
  if not found then
    raise exception 'Realtime finalization policy is unknown.' using errcode = '22023';
  end if;

  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
    and admission_intent_id = p_intent_id
    and policy_id = p_policy_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;

  if target_reservation.status = 'reserved'
    and target_reservation.expires_at <= database_now then
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
      and database_now <= target_reservation.expires_at
        + (policy_record.reconciliation_days * interval '1 day')
    ) then
    update public.ai_path_realtime_admission_reservations
    set status = 'finalized', actual_cents = p_actual_cents,
        finalized_at = database_now
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
  where utc_day = target_reservation.utc_day
    and owner_continuity_id = target_reservation.owner_continuity_id;

  return jsonb_build_object(
    'kind', 'finalized',
    'reservation', public.ai_path_realtime_reservation_json(
      target_reservation, target_reservation.idempotency_key_hash
    ),
    'idempotent', replayed,
    'userBudgetExceeded', spent_user > policy_record.max_user_daily_cents,
    'globalBudgetExceeded', spent_global > policy_record.max_global_daily_cents
  );
end;
$$;

revoke all on function public.finalize_ai_path_realtime_admission(text, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.finalize_ai_path_realtime_admission(text, uuid, uuid, integer)
  to service_role;

create or replace function public.cancel_ai_path_realtime_admission(
  p_policy_id text,
  p_intent_id uuid,
  p_reservation_id uuid
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
    raise exception 'Realtime cancellation requires the service role.' using errcode = '42501';
  end if;
  if p_policy_id is null or char_length(p_policy_id) not between 1 and 256
    or p_intent_id is null
    or p_reservation_id is null then
    raise exception 'Realtime cancellation input is invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  if not exists (
    select 1 from public.ai_path_realtime_admission_policy_contracts
    where policy_id = p_policy_id
  ) then
    raise exception 'Realtime cancellation policy is unknown.' using errcode = '22023';
  end if;
  select * into target_reservation
  from public.ai_path_realtime_admission_reservations
  where id = p_reservation_id
    and admission_intent_id = p_intent_id
    and policy_id = p_policy_id
  for update;
  if not found then return jsonb_build_object('kind', 'not_found'); end if;

  if target_reservation.status = 'reserved'
    and target_reservation.expires_at <= database_now then
    update public.ai_path_realtime_admission_reservations
    set status = 'expired'
    where id = p_reservation_id;
    return jsonb_build_object('kind', 'state_conflict');
  end if;
  if target_reservation.status = 'cancelled' then
    replayed := true;
  elsif target_reservation.status = 'reserved' then
    update public.ai_path_realtime_admission_reservations
    set status = 'cancelled', cancelled_at = database_now
    where id = p_reservation_id
    returning * into target_reservation;
  else
    return jsonb_build_object('kind', 'state_conflict');
  end if;

  return jsonb_build_object(
    'kind', 'cancelled',
    'reservation', public.ai_path_realtime_reservation_json(
      target_reservation, target_reservation.idempotency_key_hash
    ),
    'idempotent', replayed
  );
end;
$$;

revoke all on function public.cancel_ai_path_realtime_admission(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_ai_path_realtime_admission(text, uuid, uuid)
  to service_role;

create or replace function public.maintain_ai_path_realtime_admission(
  p_policy_id text,
  p_expire_limit integer,
  p_purge_limit integer,
  p_intent_cleanup_limit integer,
  p_mapping_gc_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  database_now timestamptz;
  policy_record public.ai_path_realtime_admission_policy_contracts;
  retention_cutoff timestamptz;
  intent_cutoff timestamptz;
  transitioned_expired_count integer := 0;
  purged_expired_count integer := 0;
  purged_finalized_count integer := 0;
  purged_cancelled_count integer := 0;
  purged_total integer := 0;
  cleaned_intent_count integer := 0;
  cleaned_session_mapping_count integer := 0;
  cleaned_owner_mapping_count integer := 0;
  remaining_mapping_limit integer;
  more_to_expire boolean := false;
  more_to_purge boolean := false;
  more_intents boolean := false;
  more_mappings boolean := false;
begin
  if caller_role <> 'service_role' then
    raise exception 'Realtime admission maintenance requires the service role.' using errcode = '42501';
  end if;
  if p_policy_id is null or char_length(p_policy_id) not between 1 and 256
    or p_expire_limit is null or p_expire_limit not between 1 and 1000
    or p_purge_limit is null or p_purge_limit not between 1 and 1000
    or p_intent_cleanup_limit is null or p_intent_cleanup_limit not between 1 and 1000
    or p_mapping_gc_limit is null or p_mapping_gc_limit not between 1 and 1000 then
    raise exception 'Realtime admission maintenance policy or limits are invalid.' using errcode = '22023';
  end if;

  perform pg_catalog.set_config('lock_timeout', '3s', true);
  perform pg_catalog.set_config('statement_timeout', '3500ms', true);
  perform pg_catalog.pg_advisory_xact_lock(17291, 20260717);
  database_now := clock_timestamp();

  select * into policy_record
  from public.ai_path_realtime_admission_policy_contracts
  where policy_id = p_policy_id;
  if not found then
    raise exception 'Realtime admission maintenance policy is unknown.' using errcode = '22023';
  end if;
  retention_cutoff := database_now
    - (policy_record.terminal_retention_days * interval '1 day');
  intent_cutoff := database_now
    - (policy_record.intent_retention_days * interval '1 day');

  with expiry_batch as materialized (
    select id
    from public.ai_path_realtime_admission_reservations
    where policy_id = p_policy_id
      and status = 'reserved' and expires_at <= database_now
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
    select id,
      case
        when status = 'expired' then expires_at
        when status = 'finalized' then finalized_at
        when status = 'cancelled' then cancelled_at
      end as terminal_at
    from public.ai_path_realtime_admission_reservations
    where policy_id = p_policy_id
      and utc_day < (database_now at time zone 'UTC')::date
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
    returning reservation.policy_id, reservation.utc_day, reservation.status,
      reservation.estimated_cents, reservation.actual_cents
  ), aggregated as (
    select policy_id, utc_day, status,
      count(*)::bigint as reservation_count,
      sum(estimated_cents)::bigint as estimated_cents,
      coalesce(sum(actual_cents), 0)::bigint as actual_cents
    from deleted
    group by policy_id, utc_day, status
  ), archived as (
    insert into public.ai_path_realtime_admission_daily_archive (
      policy_id, utc_day, reservation_status, reservation_count,
      estimated_cents, actual_cents, first_archived_at, last_archived_at
    )
    select policy_id, utc_day, status, reservation_count,
      estimated_cents, actual_cents, database_now, database_now
    from aggregated
    on conflict (policy_id, utc_day, reservation_status) do update set
      reservation_count = public.ai_path_realtime_admission_daily_archive.reservation_count
        + excluded.reservation_count,
      estimated_cents = public.ai_path_realtime_admission_daily_archive.estimated_cents
        + excluded.estimated_cents,
      actual_cents = public.ai_path_realtime_admission_daily_archive.actual_cents
        + excluded.actual_cents,
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

  with intent_batch as materialized (
    select id
    from public.ai_path_realtime_admission_intents
    where policy_id = p_policy_id
      and (
        (consumed_at is null and expires_at <= database_now)
        or (consumed_at is not null and consumed_at <= intent_cutoff)
      )
    order by coalesce(consumed_at, expires_at), id
    for update skip locked
    limit p_intent_cleanup_limit
  )
  delete from public.ai_path_realtime_admission_intents as intent
  using intent_batch
  where intent.id = intent_batch.id;
  get diagnostics cleaned_intent_count = row_count;

  with session_mapping_batch as materialized (
    select mapping.assessment_session_id
    from public.ai_path_realtime_session_continuity as mapping
    join public.ai_path_assessment_sessions as session
      on session.id = mapping.assessment_session_id
    where session.status in ('complete', 'failed', 'expired')
      and not exists (
        select 1 from public.ai_path_realtime_admission_intents as intent
        where intent.assessment_session_id = mapping.assessment_session_id
      )
      and not exists (
        select 1 from public.ai_path_realtime_admission_reservations as reservation
        where reservation.session_continuity_id = mapping.session_continuity_id
      )
    order by mapping.created_at, mapping.assessment_session_id
    for update of mapping skip locked
    limit p_mapping_gc_limit
  )
  delete from public.ai_path_realtime_session_continuity as mapping
  using session_mapping_batch
  where mapping.assessment_session_id = session_mapping_batch.assessment_session_id;
  get diagnostics cleaned_session_mapping_count = row_count;

  remaining_mapping_limit := p_mapping_gc_limit - cleaned_session_mapping_count;
  if remaining_mapping_limit > 0 then
    with owner_mapping_batch as materialized (
      select mapping.owner_id
      from public.ai_path_realtime_owner_continuity as mapping
      where not exists (
          select 1 from public.ai_path_realtime_session_continuity as session_mapping
          where session_mapping.owner_id = mapping.owner_id
        )
        and not exists (
          select 1 from public.ai_path_realtime_admission_reservations as reservation
          where reservation.owner_continuity_id = mapping.owner_continuity_id
        )
      order by mapping.created_at, mapping.owner_id
      for update of mapping skip locked
      limit remaining_mapping_limit
    )
    delete from public.ai_path_realtime_owner_continuity as mapping
    using owner_mapping_batch
    where mapping.owner_id = owner_mapping_batch.owner_id;
    get diagnostics cleaned_owner_mapping_count = row_count;
  end if;

  select exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where policy_id = p_policy_id
      and status = 'reserved' and expires_at <= database_now
  ) into more_to_expire;
  select exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where policy_id = p_policy_id
      and utc_day < (database_now at time zone 'UTC')::date
      and (
        (status = 'expired' and expires_at <= retention_cutoff)
        or (status = 'finalized' and finalized_at <= retention_cutoff)
        or (status = 'cancelled' and cancelled_at <= retention_cutoff)
      )
  ) into more_to_purge;
  select exists (
    select 1 from public.ai_path_realtime_admission_intents
    where policy_id = p_policy_id
      and (
        (consumed_at is null and expires_at <= database_now)
        or (consumed_at is not null and consumed_at <= intent_cutoff)
      )
  ) into more_intents;
  select exists (
    select 1
    from public.ai_path_realtime_session_continuity as mapping
    join public.ai_path_assessment_sessions as session
      on session.id = mapping.assessment_session_id
    where session.status in ('complete', 'failed', 'expired')
      and not exists (
        select 1 from public.ai_path_realtime_admission_intents as intent
        where intent.assessment_session_id = mapping.assessment_session_id
      )
      and not exists (
        select 1 from public.ai_path_realtime_admission_reservations as reservation
        where reservation.session_continuity_id = mapping.session_continuity_id
      )
  ) or exists (
    select 1 from public.ai_path_realtime_owner_continuity as mapping
    where not exists (
        select 1 from public.ai_path_realtime_session_continuity as session_mapping
        where session_mapping.owner_id = mapping.owner_id
      )
      and not exists (
        select 1 from public.ai_path_realtime_admission_reservations as reservation
        where reservation.owner_continuity_id = mapping.owner_continuity_id
      )
  ) into more_mappings;

  return jsonb_build_object(
    'policyId', policy_record.policy_id,
    'retentionCutoff', to_char(retention_cutoff at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'transitionedExpiredCount', transitioned_expired_count,
    'purgedTotal', purged_total,
    'purgedByStatus', jsonb_build_object(
      'expired', purged_expired_count,
      'finalized', purged_finalized_count,
      'cancelled', purged_cancelled_count
    ),
    'cleanedIntentCount', cleaned_intent_count,
    'cleanedSessionMappingCount', cleaned_session_mapping_count,
    'cleanedOwnerMappingCount', cleaned_owner_mapping_count,
    'hasMoreToExpire', more_to_expire,
    'hasMoreToPurge', more_to_purge,
    'hasMoreIntents', more_intents,
    'hasMoreMappings', more_mappings,
    'hasMore', more_to_expire or more_to_purge or more_intents or more_mappings
  );
end;
$$;

revoke all on function public.maintain_ai_path_realtime_admission(
  text, integer, integer, integer, integer
) from public, anon, authenticated;
grant execute on function public.maintain_ai_path_realtime_admission(
  text, integer, integer, integer, integer
) to service_role;
