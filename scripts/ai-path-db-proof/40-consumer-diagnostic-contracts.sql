\set ON_ERROR_STOP on
begin;

insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002');

do $proof$
declare
  completion_key uuid := 'b0000000-0000-4000-8000-000000000001';
  intake jsonb := jsonb_build_object(
    'version', '2026-07-18.v1',
    'path', 'use-case',
    'outcome', jsonb_build_object('desiredOutcome', 'Prepare accurate customer briefs.'),
    'workflow', jsonb_build_object('currentProcess', 'A manager searches approved systems.'),
    'specification', jsonb_build_object('inputs', 'CRM', 'output', 'Brief', 'success', 'Cited facts'),
    'experience', jsonb_build_object('level', 'guided', 'evidence', '', 'artifactUrl', ''),
    'risk', jsonb_build_object(
      'dataSensitivity', 'internal', 'existingSystems', 'CRM',
      'consequence', 'moderate', 'humanApproval', 'yes'
    ),
    'constraints', jsonb_build_object(
      'role', 'Sales manager', 'codingComfort', 'modify-examples', 'weeklyHours', 3,
      'approach', 'either', 'teamMode', 'team', 'budget', 'free-only'
    )
  );
  result jsonb := jsonb_build_object(
    'version', '2026-07-18.v1',
    'policyVersion', '2026-07-18.v2',
    'kind', 'use-case-blueprint',
    'title', 'A bounded customer brief prototype'
  );
  first_write jsonb;
  replay_write jsonb;
  owned_export jsonb;
  full_account_export jsonb;
  conflicting_write_rejected boolean := false;
  immutable_update_rejected boolean := false;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('request.jwt.claim.sub', '', true);

  first_write := public.persist_ai_path_consumer_diagnostic_trusted(
    'a0000000-0000-4000-8000-000000000001',
    completion_key,
    intake,
    result,
    '2026-07-18.consumer.v1',
    true
  );
  replay_write := public.persist_ai_path_consumer_diagnostic_trusted(
    'a0000000-0000-4000-8000-000000000001',
    completion_key,
    intake,
    result,
    '2026-07-18.consumer.v1',
    true
  );

  if first_write ->> 'replayed' <> 'false'
    or replay_write ->> 'replayed' <> 'true'
    or first_write ->> 'sessionId' <> replay_write ->> 'sessionId'
    or first_write ->> 'intakeDigest' <> replay_write ->> 'intakeDigest'
    or first_write ->> 'resultDigest' <> replay_write ->> 'resultDigest'
    or (select count(*) from public.ai_path_consumer_diagnostic_sessions) <> 1 then
    raise exception 'consumer diagnostic trusted completion was not atomic and idempotent';
  end if;

  begin
    perform public.persist_ai_path_consumer_diagnostic_trusted(
      'a0000000-0000-4000-8000-000000000001',
      completion_key,
      intake,
      jsonb_set(result, '{title}', '"Different content"'::jsonb),
      '2026-07-18.consumer.v1',
      true
    );
  exception
    when unique_violation then conflicting_write_rejected := true;
  end;
  if not conflicting_write_rejected then
    raise exception 'consumer diagnostic idempotency conflict was accepted';
  end if;

  begin
    update public.ai_path_consumer_diagnostic_sessions
    set result_digest = repeat('f', 64)
    where id = (first_write ->> 'sessionId')::uuid;
  exception
    when sqlstate '55000' then immutable_update_rejected := true;
  end;
  if not immutable_update_rejected then
    raise exception 'completed consumer diagnostic snapshots were mutable';
  end if;

  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000001', true);
  owned_export := public.export_owned_ai_path_consumer_diagnostic(
    (first_write ->> 'sessionId')::uuid
  );
  if owned_export is null
    or owned_export ->> 'intakeDigest' <> first_write ->> 'intakeDigest'
    or owned_export ? 'owner_id'
    or owned_export ? 'idempotency_key_hash' then
    raise exception 'owner export was missing or exposed internal ownership metadata';
  end if;

  full_account_export := public.export_owned_ai_path_account();
  if jsonb_array_length(full_account_export -> 'consumerDiagnostics') <> 1
    or full_account_export #>> '{consumerDiagnostics,0,sessionId}' <> first_write ->> 'sessionId' then
    raise exception 'full account export omitted the current owner diagnostic';
  end if;

  perform set_config('request.jwt.claim.sub', 'a0000000-0000-4000-8000-000000000002', true);
  full_account_export := public.export_owned_ai_path_account();
  if public.export_owned_ai_path_consumer_diagnostic(
      (first_write ->> 'sessionId')::uuid
    ) is not null
    or public.delete_owned_ai_path_consumer_diagnostic(
      (first_write ->> 'sessionId')::uuid
    )
    or jsonb_array_length(full_account_export -> 'consumerDiagnostics') <> 0 then
    raise exception 'a consumer diagnostic crossed its owner boundary';
  end if;
end;
$proof$;

do $proof$
begin
  if has_table_privilege('anon', 'public.ai_path_consumer_diagnostic_sessions', 'SELECT')
    or has_table_privilege('authenticated', 'public.ai_path_consumer_diagnostic_sessions', 'SELECT')
    or has_table_privilege('service_role', 'public.ai_path_consumer_diagnostic_sessions', 'SELECT')
    or has_function_privilege(
      'authenticated',
      'public.persist_ai_path_consumer_diagnostic_trusted(uuid,uuid,jsonb,jsonb,text,boolean)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.persist_ai_path_consumer_diagnostic_trusted(uuid,uuid,jsonb,jsonb,text,boolean)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.export_owned_ai_path_consumer_diagnostic(uuid)',
      'EXECUTE'
    ) then
    raise exception 'consumer diagnostic grants are broader or narrower than intended';
  end if;
end;
$proof$;

-- Prove bounded retention with a second, already-expired row. The trigger only
-- blocks UPDATE; the proof superuser may seed this valid historical fixture.
insert into public.ai_path_consumer_diagnostic_sessions (
  id, owner_id, diagnostic_path, intake_version, validation_contract_version,
  intake_snapshot, intake_digest, result_kind, result_policy_version,
  result_snapshot, result_digest, generated_by, idempotency_key_hash,
  privacy_notice_version, storage_consent, consented_at, created_at,
  retention_expires_at
) values (
  'c0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000002',
  'capability-growth',
  '2026-07-18.v1',
  '2026-07-18.v1',
  '{"version":"2026-07-18.v1","path":"capability-growth"}'::jsonb,
  encode(extensions.digest(convert_to(
    '{"version":"2026-07-18.v1","path":"capability-growth"}'::jsonb::text,
    'UTF8'
  ), 'sha256'), 'hex'),
  'capability-prescription',
  '2026-07-18.v2',
  '{"version":"2026-07-18.v1","policyVersion":"2026-07-18.v2","kind":"capability-prescription"}'::jsonb,
  encode(extensions.digest(convert_to(
    '{"version":"2026-07-18.v1","policyVersion":"2026-07-18.v2","kind":"capability-prescription"}'::jsonb::text,
    'UTF8'
  ), 'sha256'), 'hex'),
  'deterministic-server-policy',
  repeat('e', 64),
  '2026-07-18.consumer.v1',
  true,
  transaction_timestamp() - interval '91 days',
  transaction_timestamp() - interval '91 days',
  transaction_timestamp() - interval '1 day'
);

set local request.jwt.claim.role = 'service_role';
select public.purge_expired_ai_path_consumer_diagnostics(1) as purged_count \gset
reset role;

select 1 / case when :'purged_count'::bigint = 1 then 1 else 0 end;

do $proof$
begin
  if exists (
      select 1 from public.ai_path_consumer_diagnostic_sessions
      where id = 'c0000000-0000-4000-8000-000000000001'
    ) then
    raise exception 'bounded consumer diagnostic retention did not delete the exact expired row';
  end if;
end;
$proof$;

rollback;
