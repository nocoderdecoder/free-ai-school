-- Durable storage for the current two-path consumer diagnostic contract.
--
-- This migration only installs a dormant persistence boundary. The application
-- gateway remains protected by a separate literal-false code latch. No provider,
-- scheduler, retention job, or paid service is activated by applying this schema.

create extension if not exists pgcrypto with schema extensions;

create table public.ai_path_consumer_diagnostic_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  diagnostic_path text not null
    check (diagnostic_path in ('use-case', 'capability-growth')),
  intake_version text not null
    check (intake_version = '2026-07-18.v1'),
  validation_contract_version text not null
    check (validation_contract_version = '2026-07-18.v1'),
  intake_snapshot jsonb not null,
  intake_digest text not null
    check (intake_digest ~ '^[0-9a-f]{64}$'),
  result_kind text not null
    check (result_kind in ('use-case-blueprint', 'capability-prescription')),
  result_policy_version text not null
    check (result_policy_version = '2026-07-18.v2'),
  result_snapshot jsonb not null,
  result_digest text not null
    check (result_digest ~ '^[0-9a-f]{64}$'),
  generated_by text not null
    check (generated_by = 'deterministic-server-policy'),
  idempotency_key_hash text not null
    check (idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  privacy_notice_version text not null
    check (privacy_notice_version = '2026-07-18.consumer.v1'),
  storage_consent boolean not null
    check (storage_consent),
  consented_at timestamptz not null,
  created_at timestamptz not null,
  retention_expires_at timestamptz not null,
  constraint ai_path_consumer_diagnostic_path_result_binding check (
    (diagnostic_path = 'use-case' and result_kind = 'use-case-blueprint')
    or
    (diagnostic_path = 'capability-growth' and result_kind = 'capability-prescription')
  ),
  constraint ai_path_consumer_diagnostic_intake_shape check (
    jsonb_typeof(intake_snapshot) = 'object'
    and octet_length(intake_snapshot::text) between 2 and 32768
    and intake_snapshot ?& array['version', 'path']
    and intake_snapshot ->> 'version' = intake_version
    and intake_snapshot ->> 'path' = diagnostic_path
  ),
  constraint ai_path_consumer_diagnostic_result_shape check (
    jsonb_typeof(result_snapshot) = 'object'
    and octet_length(result_snapshot::text) between 2 and 524288
    and result_snapshot ?& array['version', 'policyVersion', 'kind']
    and result_snapshot ->> 'version' = intake_version
    and result_snapshot ->> 'policyVersion' = result_policy_version
    and result_snapshot ->> 'kind' = result_kind
  ),
  constraint ai_path_consumer_diagnostic_retention_bound check (
    consented_at = created_at
    and retention_expires_at > created_at
    and retention_expires_at <= created_at + interval '90 days'
  ),
  unique (owner_id, idempotency_key_hash)
);

comment on table public.ai_path_consumer_diagnostic_sessions is
  'Immutable owner-scoped snapshots for the current two-path consumer diagnostic. Stores no audio, realtime transcript, provider prompt, secret, or raw idempotency key.';
comment on column public.ai_path_consumer_diagnostic_sessions.intake_snapshot is
  'Strictly application-validated 2026-07-18.v1 intake snapshot; immutable after insertion.';
comment on column public.ai_path_consumer_diagnostic_sessions.result_snapshot is
  'Server-composed deterministic result pinned to its policy version; immutable after insertion.';
comment on column public.ai_path_consumer_diagnostic_sessions.idempotency_key_hash is
  'SHA-256 of a server-generated UUID. The raw completion key is not retained.';

create index ai_path_consumer_diagnostic_owner_created_idx
  on public.ai_path_consumer_diagnostic_sessions (owner_id, created_at desc);
create index ai_path_consumer_diagnostic_retention_idx
  on public.ai_path_consumer_diagnostic_sessions (retention_expires_at, id);

create or replace function public.validate_ai_path_consumer_diagnostic_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.intake_digest <> encode(
      extensions.digest(convert_to(new.intake_snapshot::text, 'UTF8'), 'sha256'),
      'hex'
    )
    or new.result_digest <> encode(
      extensions.digest(convert_to(new.result_snapshot::text, 'UTF8'), 'sha256'),
      'hex'
    ) then
    raise exception 'Consumer diagnostic content digest does not match its snapshot.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger ai_path_consumer_diagnostic_validate_insert
before insert on public.ai_path_consumer_diagnostic_sessions
for each row execute function public.validate_ai_path_consumer_diagnostic_insert();

create or replace function public.prevent_ai_path_consumer_diagnostic_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Completed consumer diagnostic snapshots are immutable.' using errcode = '55000';
end;
$$;

create trigger ai_path_consumer_diagnostic_immutable
before update on public.ai_path_consumer_diagnostic_sessions
for each row execute function public.prevent_ai_path_consumer_diagnostic_update();

revoke all on function public.prevent_ai_path_consumer_diagnostic_update()
  from public, anon, authenticated, service_role;
revoke all on function public.validate_ai_path_consumer_diagnostic_insert()
  from public, anon, authenticated, service_role;

alter table public.ai_path_consumer_diagnostic_sessions enable row level security;
alter table public.ai_path_consumer_diagnostic_sessions force row level security;

create policy "ai_path_consumer_diagnostic_select_own"
on public.ai_path_consumer_diagnostic_sessions
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "ai_path_consumer_diagnostic_delete_own"
on public.ai_path_consumer_diagnostic_sessions
for delete
to authenticated
using ((select auth.uid()) = owner_id);

-- Direct table access remains closed. Owner export/delete and trusted completion
-- each cross a purpose-specific RPC that rechecks the caller and owner.
revoke all on public.ai_path_consumer_diagnostic_sessions
  from public, anon, authenticated, service_role;

create or replace function public.persist_ai_path_consumer_diagnostic_trusted(
  p_owner_id uuid,
  p_idempotency_key uuid,
  p_intake jsonb,
  p_result jsonb,
  p_privacy_notice_version text,
  p_storage_consent boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  write_time timestamptz := clock_timestamp();
  path_value text;
  result_kind_value text;
  idempotency_hash text;
  intake_hash text;
  result_hash text;
  existing_session public.ai_path_consumer_diagnostic_sessions;
  created_session public.ai_path_consumer_diagnostic_sessions;
  expected_intake_keys text[];
begin
  if caller_role <> 'service_role' then
    raise exception 'Trusted consumer diagnostic persistence requires the service role.' using errcode = '42501';
  end if;
  if p_owner_id is null or p_idempotency_key is null then
    raise exception 'Owner and completion key are required.' using errcode = '22023';
  end if;
  if p_storage_consent is distinct from true
    or p_privacy_notice_version <> '2026-07-18.consumer.v1' then
    raise exception 'Current storage consent is required.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_intake) <> 'object'
    or octet_length(p_intake::text) not between 2 and 32768
    or p_intake ->> 'version' <> '2026-07-18.v1' then
    raise exception 'Validated diagnostic intake is invalid.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_result) <> 'object'
    or octet_length(p_result::text) not between 2 and 524288
    or p_result ->> 'version' <> '2026-07-18.v1'
    or p_result ->> 'policyVersion' <> '2026-07-18.v2' then
    raise exception 'Generated diagnostic result is invalid.' using errcode = '22023';
  end if;

  path_value := p_intake ->> 'path';
  result_kind_value := p_result ->> 'kind';
  if path_value = 'use-case' then
    expected_intake_keys := array[
      'version', 'path', 'outcome', 'workflow', 'specification',
      'experience', 'risk', 'constraints'
    ];
    if result_kind_value <> 'use-case-blueprint' then
      raise exception 'Diagnostic path and result kind do not match.' using errcode = '22023';
    end if;
  elsif path_value = 'capability-growth' then
    expected_intake_keys := array[
      'version', 'path', 'direction', 'experience', 'evidence',
      'reasoning', 'foundations', 'constraints'
    ];
    if result_kind_value <> 'capability-prescription' then
      raise exception 'Diagnostic path and result kind do not match.' using errcode = '22023';
    end if;
  else
    raise exception 'Unsupported diagnostic path.' using errcode = '22023';
  end if;

  if not (p_intake ?& expected_intake_keys)
    or (select count(*) from jsonb_object_keys(p_intake)) <> cardinality(expected_intake_keys)
    or exists (
      select 1
      from unnest(expected_intake_keys[3:cardinality(expected_intake_keys)]) as sections(section_name)
      where jsonb_typeof(p_intake -> section_name) <> 'object'
    ) then
    raise exception 'Validated diagnostic intake has an unexpected top-level shape.' using errcode = '22023';
  end if;

  if not exists (select 1 from auth.users where id = p_owner_id) then
    raise exception 'Verified diagnostic owner was not found.' using errcode = 'P0002';
  end if;

  idempotency_hash := encode(
    extensions.digest(convert_to(p_idempotency_key::text, 'UTF8'), 'sha256'),
    'hex'
  );
  intake_hash := encode(
    extensions.digest(convert_to(p_intake::text, 'UTF8'), 'sha256'),
    'hex'
  );
  result_hash := encode(
    extensions.digest(convert_to(p_result::text, 'UTF8'), 'sha256'),
    'hex'
  );

  -- Serialize retries for one owner/key pair before checking the unique record.
  perform pg_advisory_xact_lock(
    hashtextextended(p_owner_id::text || ':' || idempotency_hash, 0)
  );

  select * into existing_session
  from public.ai_path_consumer_diagnostic_sessions
  where owner_id = p_owner_id
    and idempotency_key_hash = idempotency_hash;

  if found then
    if existing_session.intake_digest = intake_hash
      and existing_session.result_digest = result_hash
      and existing_session.intake_snapshot = p_intake
      and existing_session.result_snapshot = p_result
      and existing_session.privacy_notice_version = p_privacy_notice_version
      and existing_session.storage_consent then
      return jsonb_build_object(
        'sessionId', existing_session.id,
        'intakeDigest', existing_session.intake_digest,
        'resultDigest', existing_session.result_digest,
        'retentionExpiresAt', existing_session.retention_expires_at,
        'replayed', true
      );
    end if;
    raise exception 'The completion key was already used with different content.'
      using errcode = '23505', detail = 'idempotency_conflict';
  end if;

  insert into public.ai_path_consumer_diagnostic_sessions (
    owner_id,
    diagnostic_path,
    intake_version,
    validation_contract_version,
    intake_snapshot,
    intake_digest,
    result_kind,
    result_policy_version,
    result_snapshot,
    result_digest,
    generated_by,
    idempotency_key_hash,
    privacy_notice_version,
    storage_consent,
    consented_at,
    created_at,
    retention_expires_at
  ) values (
    p_owner_id,
    path_value,
    '2026-07-18.v1',
    '2026-07-18.v1',
    p_intake,
    intake_hash,
    result_kind_value,
    '2026-07-18.v2',
    p_result,
    result_hash,
    'deterministic-server-policy',
    idempotency_hash,
    p_privacy_notice_version,
    true,
    write_time,
    write_time,
    write_time + interval '90 days'
  )
  returning * into created_session;

  return jsonb_build_object(
    'sessionId', created_session.id,
    'intakeDigest', created_session.intake_digest,
    'resultDigest', created_session.result_digest,
    'retentionExpiresAt', created_session.retention_expires_at,
    'replayed', false
  );
end;
$$;

revoke all on function public.persist_ai_path_consumer_diagnostic_trusted(
  uuid, uuid, jsonb, jsonb, text, boolean
) from public, anon, authenticated;
grant execute on function public.persist_ai_path_consumer_diagnostic_trusted(
  uuid, uuid, jsonb, jsonb, text, boolean
) to service_role;

create or replace function public.export_owned_ai_path_consumer_diagnostic(
  p_session_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  caller_id uuid := auth.uid();
  exported jsonb;
begin
  if caller_role <> 'authenticated' or caller_id is null then
    raise exception 'A verified user is required.' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'sessionId', session_row.id,
    'path', session_row.diagnostic_path,
    'intakeVersion', session_row.intake_version,
    'intake', session_row.intake_snapshot,
    'intakeDigest', session_row.intake_digest,
    'resultPolicyVersion', session_row.result_policy_version,
    'result', session_row.result_snapshot,
    'resultDigest', session_row.result_digest,
    'privacyNoticeVersion', session_row.privacy_notice_version,
    'consentedAt', session_row.consented_at,
    'createdAt', session_row.created_at,
    'retentionExpiresAt', session_row.retention_expires_at
  ) into exported
  from public.ai_path_consumer_diagnostic_sessions as session_row
  where session_row.id = p_session_id
    and session_row.owner_id = caller_id;
  return exported;
end;
$$;

create or replace function public.delete_owned_ai_path_consumer_diagnostic(
  p_session_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  caller_id uuid := auth.uid();
begin
  if caller_role <> 'authenticated' or caller_id is null then
    raise exception 'A verified user is required.' using errcode = '42501';
  end if;
  delete from public.ai_path_consumer_diagnostic_sessions
  where id = p_session_id
    and owner_id = caller_id;
  return found;
end;
$$;

revoke all on function public.export_owned_ai_path_consumer_diagnostic(uuid)
  from public, anon, service_role;
revoke all on function public.delete_owned_ai_path_consumer_diagnostic(uuid)
  from public, anon, service_role;
grant execute on function public.export_owned_ai_path_consumer_diagnostic(uuid)
  to authenticated;
grant execute on function public.delete_owned_ai_path_consumer_diagnostic(uuid)
  to authenticated;

create or replace function public.purge_expired_ai_path_consumer_diagnostics(
  p_limit integer
)
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
    raise exception 'Consumer diagnostic retention requires the service role.' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 10000 then
    raise exception 'Consumer diagnostic retention batch limit is invalid.' using errcode = '22023';
  end if;

  with expired_batch as (
    select id
    from public.ai_path_consumer_diagnostic_sessions
    where retention_expires_at <= clock_timestamp()
    order by retention_expires_at, id
    limit p_limit
    for update skip locked
  ), deleted as (
    delete from public.ai_path_consumer_diagnostic_sessions as session_row
    using expired_batch
    where session_row.id = expired_batch.id
    returning session_row.id
  )
  select count(*)::bigint into deleted_count from deleted;

  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_ai_path_consumer_diagnostics(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_ai_path_consumer_diagnostics(integer)
  to service_role;
