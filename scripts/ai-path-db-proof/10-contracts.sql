\set ON_ERROR_STOP on
begin;

create function public.ai_path_proof_assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is distinct from true then
    raise exception 'AI Path database proof failed: %', p_message;
  end if;
end;
$$;
grant execute on function public.ai_path_proof_assert(boolean, text)
  to anon, authenticated, service_role;

select public.ai_path_proof_assert(
  to_regclass('public.ai_path_assessment_sessions') is not null,
  'assessment sessions table is missing'
);
select public.ai_path_proof_assert(
  to_regclass('public.ai_path_learning_plans') is not null,
  'learning plans table is missing'
);
select public.ai_path_proof_assert(
  to_regclass('public.ai_path_realtime_admission_reservations') is not null,
  'Realtime admission ledger is missing'
);
select public.ai_path_proof_assert(
  to_regclass('public.ai_path_realtime_admission_daily_archive') is not null,
  'Realtime admission daily archive is missing'
);
select public.ai_path_proof_assert(
  to_regclass('public.ai_path_realtime_admission_policy_contracts') is not null
    and to_regclass('public.ai_path_realtime_admission_policy_state') is not null
    and to_regclass('public.ai_path_realtime_owner_continuity') is not null
    and to_regclass('public.ai_path_realtime_session_continuity') is not null
    and to_regclass('public.ai_path_realtime_admission_intents') is not null,
  'DB-owned continuity, intent, or policy table is missing'
);
select public.ai_path_proof_assert(
  to_regprocedure('public.purge_expired_ai_path_sessions(integer)') is not null
    and to_regprocedure('public.purge_expired_ai_path_sessions()') is null,
  'session retention must expose only the bounded final signature'
);
select public.ai_path_proof_assert(
  to_regprocedure('public.purge_expired_ai_path_learning_plans(integer)') is not null
    and to_regprocedure('public.purge_expired_ai_path_learning_plans()') is null,
  'plan retention must expose only the bounded final signature'
);
select public.ai_path_proof_assert(
  to_regprocedure('public.reserve_ai_path_realtime_admission(text,uuid,text,integer)') is not null
    and to_regprocedure('public.finalize_ai_path_realtime_admission(text,uuid,uuid,integer)') is not null
    and to_regprocedure('public.cancel_ai_path_realtime_admission(text,uuid,uuid)') is not null
    and to_regprocedure('public.maintain_ai_path_realtime_admission(text,integer,integer,integer,integer)') is not null
    and to_regprocedure('public.reserve_ai_path_realtime_admission(text,text,text,date,timestamp with time zone,timestamp with time zone,integer,integer,integer,integer,integer,integer,integer)') is null
    and to_regprocedure('public.finalize_ai_path_realtime_admission(uuid,text,text,integer,timestamp with time zone,integer,integer)') is null
    and to_regprocedure('public.cancel_ai_path_realtime_admission(uuid,text,text,timestamp with time zone)') is null
    and to_regprocedure('public.maintain_ai_path_realtime_admission(integer,integer)') is null,
  'only DB-owned continuity admission overloads may remain executable'
);

select public.ai_path_proof_assert(
  (
    select bool_and(relrowsecurity)
    from pg_class
    where oid = any(array[
      'public.ai_path_assessment_sessions'::regclass,
      'public.ai_path_learning_plans'::regclass,
      'public.ai_path_learning_plan_snapshots'::regclass,
      'public.ai_path_learning_plan_task_progress'::regclass,
      'public.ai_path_learning_plan_check_ins'::regclass,
      'public.ai_path_learning_plan_time_budget_changes'::regclass,
      'public.ai_path_learning_plan_adaptations'::regclass,
      'public.ai_path_realtime_admission_reservations'::regclass,
      'public.ai_path_realtime_admission_daily_archive'::regclass,
      'public.ai_path_realtime_admission_policy_contracts'::regclass,
      'public.ai_path_realtime_admission_policy_state'::regclass,
      'public.ai_path_realtime_owner_continuity'::regclass,
      'public.ai_path_realtime_session_continuity'::regclass,
      'public.ai_path_realtime_admission_intents'::regclass
    ])
  ),
  'every owner/private table must have RLS enabled'
);
select public.ai_path_proof_assert(
  (select relforcerowsecurity from pg_class where oid = 'public.ai_path_realtime_admission_reservations'::regclass),
  'Realtime admission ledger must force RLS'
);
select public.ai_path_proof_assert(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_class
    where oid = 'public.ai_path_realtime_admission_daily_archive'::regclass
  ),
  'Realtime admission archive must enable and force RLS'
);

select public.ai_path_proof_assert(
  not has_table_privilege('anon', 'public.ai_path_assessment_sessions', 'SELECT')
    and not has_table_privilege('authenticated', 'public.ai_path_realtime_admission_reservations', 'SELECT')
    and not has_table_privilege('service_role', 'public.ai_path_realtime_admission_reservations', 'SELECT')
    and not has_table_privilege('service_role', 'public.ai_path_realtime_admission_daily_archive', 'SELECT')
    and not has_table_privilege('authenticated', 'public.ai_path_realtime_owner_continuity', 'SELECT')
    and not has_table_privilege('service_role', 'public.ai_path_realtime_owner_continuity', 'SELECT')
    and not has_table_privilege('authenticated', 'public.ai_path_realtime_session_continuity', 'SELECT')
    and not has_table_privilege('service_role', 'public.ai_path_realtime_session_continuity', 'SELECT')
    and not has_table_privilege('authenticated', 'public.ai_path_realtime_admission_intents', 'SELECT')
    and not has_table_privilege('service_role', 'public.ai_path_realtime_admission_intents', 'SELECT'),
  'direct private-table grants are broader than intended'
);
select public.ai_path_proof_assert(
  has_function_privilege('service_role', 'public.purge_expired_ai_path_sessions(integer)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.purge_expired_ai_path_sessions(integer)', 'EXECUTE')
    and has_function_privilege(
      'service_role',
      'public.reserve_ai_path_realtime_admission(text,uuid,text,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.reserve_ai_path_realtime_admission(text,uuid,text,integer)',
      'EXECUTE'
    )
    and has_function_privilege(
      'authenticated',
      'public.issue_ai_path_realtime_admission_intent(text,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'service_role',
      'public.issue_ai_path_realtime_admission_intent(text,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.finalize_ai_path_realtime_admission(text,uuid,uuid,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.finalize_ai_path_realtime_admission(text,uuid,uuid,integer)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.cancel_ai_path_realtime_admission(text,uuid,uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.cancel_ai_path_realtime_admission(text,uuid,uuid)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.maintain_ai_path_realtime_admission(text,integer,integer,integer,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.maintain_ai_path_realtime_admission(text,integer,integer,integer,integer)',
      'EXECUTE'
    ),
  'service-only RPC grants are incorrect'
);

insert into auth.users (id) values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000005'),
  ('00000000-0000-0000-0000-000000000006');

insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'complete', 'text', 'en-US',
    'Build reliable AI workflows for a small operations team.', 'workflows',
    clock_timestamp() + interval '1 day', clock_timestamp()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'complete', 'text', 'en-US',
    'Learn the foundations needed to evaluate AI systems safely.', 'foundations',
    clock_timestamp() + interval '1 day', clock_timestamp()
  );

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.ai_path_proof_assert(
  (select count(*) = 1 from public.ai_path_assessment_sessions),
  'owner one did not see exactly its own session'
);
select public.ai_path_proof_assert(
  public.delete_owned_ai_path_session('10000000-0000-0000-0000-000000000002') = false,
  'owner one was able to delete owner two session'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.ai_path_proof_assert(
  (public.export_owned_ai_path_session('10000000-0000-0000-0000-000000000001')) is null,
  'owner two was able to export owner one session'
);
reset role;

do $$
begin
  begin
    update public.ai_path_assessment_sessions
    set goal_type = 'career'
    where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'goal type mutation unexpectedly succeeded';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;

insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    'expired', 'text', 'en-US',
    'Use AI to improve a bounded and measurable team workflow.', 'workflows',
    clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    'expired', 'text', 'en-US',
    'Use AI to improve a bounded and measurable team workflow.', 'workflows',
    clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000005',
    'expired', 'text', 'en-US',
    'Use AI to improve a bounded and measurable team workflow.', 'workflows',
    clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
  );

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.ai_path_proof_assert(
  public.purge_expired_ai_path_sessions(2) = 2,
  'session retention did not honor the requested batch size'
);
reset role;
select public.ai_path_proof_assert(
  (select count(*) = 1 from public.ai_path_assessment_sessions where id::text like '20000000-%'),
  'session retention deleted outside its bound'
);

do $$
begin
  begin
    perform set_config('request.jwt.claim.role', 'service_role', true);
    perform public.purge_expired_ai_path_sessions(0);
    raise exception 'zero session retention limit unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

insert into public.ai_path_learning_plans (
  id, owner_id, source_assessment_session_id, goal_type, weekly_minutes,
  status, retention_expires_at, created_at
) values
  (
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'workflows', 120, 'archived',
    clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'foundations', 120, 'archived',
    clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
  );

-- A third source session is kept non-expired so session retention cannot mask
-- the independent plan-retention bound.
insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values (
  '10000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000006',
  'complete', 'text', 'en-US',
  'Build practical AI systems with reliable evaluation practices.', 'builder',
  clock_timestamp() + interval '1 day', clock_timestamp()
);
insert into public.ai_path_learning_plans (
  id, owner_id, source_assessment_session_id, goal_type, weekly_minutes,
  status, retention_expires_at, created_at
) values (
  '30000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000006',
  'builder', 120, 'archived',
  clock_timestamp() - interval '1 day', clock_timestamp() - interval '2 days'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.ai_path_proof_assert(
  public.purge_expired_ai_path_learning_plans(2) = 2,
  'plan retention did not honor the requested batch size'
);
reset role;
select public.ai_path_proof_assert(
  (select count(*) = 1 from public.ai_path_learning_plans where id::text like '30000000-%'),
  'plan retention deleted outside its bound'
);

-- DB-owned continuity and two-credential admission proof.
\set proof_policy_id '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000'

insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values
  (
    '60000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'consented', 'voice', 'en-US',
    'Prove database-owned continuity for a bounded Realtime reservation.',
    'workflows', clock_timestamp() + interval '1 day', clock_timestamp()
  ),
  (
    '60000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    'connecting', 'voice', 'en-US',
    'Prove database-owned continuity for a second bounded reservation.',
    'foundations', clock_timestamp() + interval '1 day', clock_timestamp()
  ),
  (
    '60000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000003',
    'consented', 'voice', 'en-US',
    'Prove unused continuity state cascades with its source session.',
    'workflows', clock_timestamp() + interval '1 day', clock_timestamp()
  );

-- The checked-in policy is disabled. A superuser enables it only inside this
-- rolled-back disposable proof transaction; no deployment flag is authority.
select public.ai_path_proof_assert(
  (select admission_enabled = false from public.ai_path_realtime_admission_policy_state),
  'the migrated database policy must start disabled'
);
update public.ai_path_realtime_admission_policy_state
set admission_enabled = true;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '60000000-0000-4000-8000-000000000001'
) as owner_one_intent \gset
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '60000000-0000-4000-8000-000000000001'
) as owner_one_intent_replay \gset
reset role;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '60000000-0000-4000-8000-000000000003'
) as owner_one_second_session_intent \gset
reset role;

select public.ai_path_proof_assert(
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid
    = (:'owner_one_intent_replay'::jsonb ->> 'intentId')::uuid,
  'authenticated intent retry did not resolve to one durable intent'
);
select public.ai_path_proof_assert(
  (select array_agg(key order by key)
   from jsonb_object_keys(:'owner_one_intent'::jsonb) as intent_key(key))
      = array['expiresAt', 'intentId', 'policyId']
    and not (:'owner_one_intent'::jsonb ?| array[
      'ownerId', 'subjectId', 'sessionContinuityId', 'userKey', 'sessionKey'
    ]),
  'intent response leaked identity or omitted its bounded contract'
);
select public.ai_path_proof_assert(
  (select count(*) = 2 from public.ai_path_realtime_owner_continuity)
    and (select count(*) = 2 from public.ai_path_realtime_session_continuity),
  'intent issuance did not create one stable mapping per authenticated owner/session'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
select public.ai_path_proof_assert(
  public.delete_owned_ai_path_session('60000000-0000-4000-8000-000000000003') = true,
  'owner could not delete the unused second continuity session'
);
reset role;
select public.ai_path_proof_assert(
  (select count(*) = 2 from public.ai_path_realtime_owner_continuity)
    and (select count(*) = 1 from public.ai_path_realtime_session_continuity)
    and (select count(*) = 1 from public.ai_path_realtime_admission_intents),
  'source-session deletion did not cascade its unused intent/session mapping'
);

update public.ai_path_realtime_admission_policy_state
set admission_enabled = false;
select set_config(
  'ai_path_proof.intent_id',
  :'owner_one_intent'::jsonb ->> 'intentId',
  true
);
do $$
declare
  denied boolean := false;
  disabled_result jsonb;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  begin
    disabled_result := public.reserve_ai_path_realtime_admission(
      '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
      current_setting('ai_path_proof.intent_id')::uuid,
      'proof-disabled-policy',
      5
    );
    denied := disabled_result ->> 'kind' = 'denied';
  exception
    when others then denied := true;
  end;
  perform public.ai_path_proof_assert(
    denied and not exists (select 1 from public.ai_path_realtime_admission_reservations),
    'database-disabled policy permitted a reservation'
  );
end;
$$;
update public.ai_path_realtime_admission_policy_state
set admission_enabled = true;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
do $$
begin
  begin
    perform public.issue_ai_path_realtime_admission_intent(
      '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
      '60000000-0000-4000-8000-000000000001'
    );
    raise exception 'cross-owner intent issuance unexpectedly succeeded';
  exception
    when insufficient_privilege or no_data_found then null;
  end;
end;
$$;
reset role;

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.reserve_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid,
  'proof-continuity-idempotency-1',
  5
) as continuity_first_reserve \gset
select public.reserve_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid,
  'proof-continuity-idempotency-1',
  5
) as continuity_replay_reserve \gset
select public.reserve_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid,
  'proof-continuity-idempotency-1',
  6
) as continuity_conflict_reserve \gset
reset role;

select public.ai_path_proof_assert(
  :'continuity_first_reserve'::jsonb ->> 'kind' = 'reserved'
    and (:'continuity_first_reserve'::jsonb ->> 'idempotent')::boolean = false
    and :'continuity_replay_reserve'::jsonb #>> '{reservation,id}'
      = :'continuity_first_reserve'::jsonb #>> '{reservation,id}'
    and (:'continuity_replay_reserve'::jsonb ->> 'idempotent')::boolean = true,
  'consumed intent and idempotency key did not resolve to one reservation'
);
select public.ai_path_proof_assert(
  :'continuity_conflict_reserve'::jsonb ->> 'kind' = 'denied'
    and :'continuity_conflict_reserve'::jsonb ->> 'reason' = 'idempotency_conflict',
  'consumed intent accepted a conflicting replay'
);
select public.ai_path_proof_assert(
  not ((:'continuity_first_reserve'::jsonb -> 'reservation') ?| array[
    'assessmentSessionId', 'ownerContinuityId', 'sessionContinuityId',
    'userKey', 'sessionKey'
  ])
    and :'continuity_first_reserve'::jsonb #>> '{reservation,intentId}'
      = :'owner_one_intent'::jsonb ->> 'intentId',
  'reservation response leaked private continuity identifiers'
);

-- A wrong intent capability cannot mutate or even identify another
-- reservation. The live source is also protected by the delete guard.
set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.finalize_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_second_session_intent'::jsonb ->> 'intentId')::uuid,
  (:'continuity_first_reserve'::jsonb #>> '{reservation,id}')::uuid,
  7
) as wrong_intent_finalize \gset
reset role;
select public.ai_path_proof_assert(
  :'wrong_intent_finalize'::jsonb ->> 'kind' = 'not_found'
    and (
      select status = 'reserved' and actual_cents is null
      from public.ai_path_realtime_admission_reservations
      where id = (:'continuity_first_reserve'::jsonb #>> '{reservation,id}')::uuid
    ),
  'wrong intent capability mutated a reservation'
);

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
do $$
begin
  begin
    perform public.delete_owned_ai_path_session(
      '60000000-0000-4000-8000-000000000001'
    );
    raise exception 'active source-session deletion unexpectedly succeeded';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;
reset role;
select public.ai_path_proof_assert(
  exists (
    select 1 from public.ai_path_assessment_sessions
    where id = '60000000-0000-4000-8000-000000000001'
  ),
  'active source delete guard did not preserve the source session'
);

do $$
begin
  begin
    delete from auth.users
    where id = '00000000-0000-0000-0000-000000000001';
    raise exception 'active direct account deletion unexpectedly succeeded';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;
select public.ai_path_proof_assert(
  exists (
    select 1 from auth.users
    where id = '00000000-0000-0000-0000-000000000001'
  )
    and exists (
      select 1 from public.ai_path_realtime_owner_continuity
      where owner_id = '00000000-0000-0000-0000-000000000001'
    )
    and (
      select status = 'reserved'
      from public.ai_path_realtime_admission_reservations
      where admission_intent_id = (:'owner_one_intent'::jsonb ->> 'intentId')::uuid
    ),
  'active direct account delete guard did not preserve account, mapping, and lease'
);

do $$
begin
  begin
    update public.ai_path_realtime_admission_reservations
    set estimated_cents = 6
    where id = (
      select id from public.ai_path_realtime_admission_reservations
      where admission_intent_id = current_setting('ai_path_proof.intent_id')::uuid
    );
    raise exception 'immutable ledger estimate unexpectedly changed';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;
select public.ai_path_proof_assert(
  (
    select estimated_cents = 5
    from public.ai_path_realtime_admission_reservations
    where admission_intent_id = (:'owner_one_intent'::jsonb ->> 'intentId')::uuid
  ),
  'ledger immutability guard did not preserve the estimated cents'
);

insert into public.ai_path_realtime_admission_policy_contracts (
  policy_id, policy_version, max_global_concurrent, max_user_concurrent,
  max_user_daily_cents, max_global_daily_cents, max_reservation_cents,
  reservation_ttl_ms, reconciliation_days, terminal_retention_days,
  intent_retention_days
) values (
  '2026-07-18.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
  '2026-07-18.v1', 2, 1, 100, 1000, 100, 120000, 7, 90, 7
);
do $$
begin
  begin
    update public.ai_path_realtime_admission_policy_state
    set policy_id = '2026-07-18.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000';
    raise exception 'policy rollover with live detail unexpectedly succeeded';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;
select public.ai_path_proof_assert(
  (select policy_id = :'proof_policy_id'
   from public.ai_path_realtime_admission_policy_state),
  'policy rollover guard stranded live intent or reservation detail'
);

-- A retained ledger row is the durable unknown-commit receipt even after its
-- intent/mapping rows are absent. An elapsed lease is atomically made terminal
-- and must never replay as reserved.
with proof_clock as (
  select clock_timestamp() - interval '1 hour' as created_at
)
insert into public.ai_path_realtime_admission_reservations (
  id, admission_version, policy_id, admission_intent_id,
  owner_continuity_id, session_continuity_id, idempotency_key_hash,
  utc_day, estimated_cents, status, created_at, expires_at
)
select
  '61000000-0000-4000-8000-000000000001', '2026-07-16.v1',
  :'proof_policy_id', '61000000-0000-4000-8000-000000000002',
  '61000000-0000-4000-8000-000000000003',
  '61000000-0000-4000-8000-000000000004',
  encode(extensions.digest(convert_to('proof-expired-replay', 'UTF8'), 'sha256'), 'hex'),
  (created_at at time zone 'UTC')::date, 5, 'reserved', created_at,
  created_at + interval '120 seconds'
from proof_clock;

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.reserve_ai_path_realtime_admission(
  :'proof_policy_id',
  '61000000-0000-4000-8000-000000000002',
  'proof-expired-replay',
  5
) as expired_replay_result \gset
reset role;
select public.ai_path_proof_assert(
  :'expired_replay_result'::jsonb ->> 'kind' = 'denied'
    and :'expired_replay_result'::jsonb ->> 'reason' = 'idempotency_terminal'
    and (
      select status = 'expired'
      from public.ai_path_realtime_admission_reservations
      where id = '61000000-0000-4000-8000-000000000001'
    ),
  'consumed replay returned reserved after its database lease elapsed'
);

-- An elapsed source may be deleted: its guard first transitions the lease to
-- expired, source cascades deidentify it, and the retained intent capability
-- still permits reconciliation inside the seven-day reconciliation window.
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '60000000-0000-4000-8000-000000000002'
) as owner_two_intent \gset
reset role;

with proof_clock as (
  select clock_timestamp() - interval '1 hour' as created_at
)
insert into public.ai_path_realtime_admission_reservations (
  id, admission_version, policy_id, admission_intent_id,
  owner_continuity_id, session_continuity_id, idempotency_key_hash,
  utc_day, estimated_cents, status, created_at, expires_at
)
select
  '62000000-0000-4000-8000-000000000001', '2026-07-16.v1',
  intent.policy_id, intent.id, intent.owner_continuity_id,
  intent.session_continuity_id,
  encode(extensions.digest(convert_to('proof-source-reconcile', 'UTF8'), 'sha256'), 'hex'),
  (proof_clock.created_at at time zone 'UTC')::date,
  5, 'reserved', proof_clock.created_at,
  proof_clock.created_at + interval '120 seconds'
from public.ai_path_realtime_admission_intents as intent
cross join proof_clock
where intent.id = (:'owner_two_intent'::jsonb ->> 'intentId')::uuid;
update public.ai_path_realtime_admission_intents
set consumed_at = clock_timestamp() - interval '58 minutes',
    reservation_id = '62000000-0000-4000-8000-000000000001',
    idempotency_key_hash = encode(
      extensions.digest(convert_to('proof-source-reconcile', 'UTF8'), 'sha256'), 'hex'
    ),
    estimated_cents = 5
where id = (:'owner_two_intent'::jsonb ->> 'intentId')::uuid;

set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
select public.ai_path_proof_assert(
  public.delete_owned_ai_path_session('60000000-0000-4000-8000-000000000002') = true,
  'elapsed source session was not deletable after lease transition'
);
reset role;
select public.ai_path_proof_assert(
  not exists (
    select 1 from public.ai_path_realtime_session_continuity
    where assessment_session_id = '60000000-0000-4000-8000-000000000002'
  )
    and not exists (
      select 1 from public.ai_path_realtime_admission_intents
      where id = (:'owner_two_intent'::jsonb ->> 'intentId')::uuid
    )
    and (
      select status = 'expired'
      from public.ai_path_realtime_admission_reservations
      where id = '62000000-0000-4000-8000-000000000001'
    ),
  'elapsed source deletion did not deidentify and retain its ledger capability'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.finalize_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_two_intent'::jsonb ->> 'intentId')::uuid,
  '62000000-0000-4000-8000-000000000001',
  9
) as post_delete_finalize \gset
reset role;
select public.ai_path_proof_assert(
  :'post_delete_finalize'::jsonb ->> 'kind' = 'finalized'
    and :'post_delete_finalize'::jsonb #>> '{reservation,intentId}'
      = :'owner_two_intent'::jsonb ->> 'intentId',
  'deidentified ledger could not reconcile after source deletion'
);

-- Direct account deletion is independently guarded because auth-user and
-- assessment/mapping cascades have no guaranteed relative order. With only an
-- elapsed lease, the owner guard transitions it, allows every raw linkage to
-- cascade, and preserves the pseudonymous ledger for late reconciliation.
insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values (
  '64000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000005',
  'consented', 'voice', 'en-US',
  'Prove direct account deletion preserves deidentified reconciliation.',
  'workflows', clock_timestamp() + interval '1 day', clock_timestamp()
);
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000005';
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '64000000-0000-4000-8000-000000000001'
) as account_delete_intent \gset
reset role;

with proof_clock as (
  select clock_timestamp() - interval '1 hour' as created_at
)
insert into public.ai_path_realtime_admission_reservations (
  id, admission_version, policy_id, admission_intent_id,
  owner_continuity_id, session_continuity_id, idempotency_key_hash,
  utc_day, estimated_cents, status, created_at, expires_at
)
select
  '64000000-0000-4000-8000-000000000002', '2026-07-16.v1',
  intent.policy_id, intent.id, intent.owner_continuity_id,
  intent.session_continuity_id,
  encode(extensions.digest(convert_to('proof-account-reconcile', 'UTF8'), 'sha256'), 'hex'),
  (proof_clock.created_at at time zone 'UTC')::date,
  5, 'reserved', proof_clock.created_at,
  proof_clock.created_at + interval '120 seconds'
from public.ai_path_realtime_admission_intents as intent
cross join proof_clock
where intent.id = (:'account_delete_intent'::jsonb ->> 'intentId')::uuid;
update public.ai_path_realtime_admission_intents
set consumed_at = clock_timestamp() - interval '58 minutes',
    reservation_id = '64000000-0000-4000-8000-000000000002',
    idempotency_key_hash = encode(
      extensions.digest(convert_to('proof-account-reconcile', 'UTF8'), 'sha256'), 'hex'
    ),
    estimated_cents = 5
where id = (:'account_delete_intent'::jsonb ->> 'intentId')::uuid;

delete from auth.users
where id = '00000000-0000-0000-0000-000000000005';
select public.ai_path_proof_assert(
  not exists (
    select 1 from auth.users
    where id = '00000000-0000-0000-0000-000000000005'
  )
    and not exists (
      select 1 from public.ai_path_realtime_owner_continuity
      where owner_id = '00000000-0000-0000-0000-000000000005'
    )
    and not exists (
      select 1 from public.ai_path_realtime_session_continuity
      where assessment_session_id = '64000000-0000-4000-8000-000000000001'
    )
    and not exists (
      select 1 from public.ai_path_realtime_admission_intents
      where id = (:'account_delete_intent'::jsonb ->> 'intentId')::uuid
    )
    and (
      select status = 'expired'
      from public.ai_path_realtime_admission_reservations
      where id = '64000000-0000-4000-8000-000000000002'
    ),
  'elapsed direct account deletion did not cascade raw state and retain its ledger'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.finalize_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'account_delete_intent'::jsonb ->> 'intentId')::uuid,
  '64000000-0000-4000-8000-000000000002',
  8
) as post_account_delete_finalize \gset
reset role;
select public.ai_path_proof_assert(
  :'post_account_delete_finalize'::jsonb ->> 'kind' = 'finalized'
    and :'post_account_delete_finalize'::jsonb #>> '{reservation,intentId}'
      = :'account_delete_intent'::jsonb ->> 'intentId',
  'pseudonymous ledger could not reconcile after direct account deletion'
);

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.finalize_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid,
  (:'continuity_first_reserve'::jsonb #>> '{reservation,id}')::uuid,
  7
) as continuity_finalize \gset
select public.cancel_ai_path_realtime_admission(
  :'proof_policy_id',
  (:'owner_one_intent'::jsonb ->> 'intentId')::uuid,
  (:'continuity_first_reserve'::jsonb #>> '{reservation,id}')::uuid
) as continuity_cancel_after_finalize \gset
reset role;

select public.ai_path_proof_assert(
  :'continuity_finalize'::jsonb ->> 'kind' = 'finalized'
    and :'continuity_cancel_after_finalize'::jsonb ->> 'kind' = 'state_conflict',
  'service-only finalization/cancellation did not preserve terminal state'
);

-- Create one stale unconsumed intent on a completed source. Maintenance must
-- clean the intent, then its session mapping, then both newly orphaned owners
-- (this owner and the earlier unused owner) within the explicit bounds.
insert into public.ai_path_assessment_sessions (
  id, owner_id, status, mode, locale, goal, goal_type,
  retention_expires_at, created_at
) values (
  '63000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000004',
  'consented', 'voice', 'en-US',
  'Prove bounded cleanup of stale intent and continuity mappings.',
  'workflows', clock_timestamp() + interval '1 day', clock_timestamp()
);
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000004';
select public.issue_ai_path_realtime_admission_intent(
  :'proof_policy_id',
  '63000000-0000-4000-8000-000000000001'
) as cleanup_intent \gset
reset role;
update public.ai_path_assessment_sessions
set status = 'complete'
where id = '63000000-0000-4000-8000-000000000001';
update public.ai_path_realtime_admission_intents
set issued_at = clock_timestamp() - interval '10 days',
    expires_at = clock_timestamp() - interval '9 days'
where id = (:'cleanup_intent'::jsonb ->> 'intentId')::uuid;

-- Three old terminal rows must be purged into exact content-free policy/day
-- totals. A terminal current-UTC-day row is the safety fence and must remain.
with proof_clock as (
  select clock_timestamp() - interval '100 days' as created_at
)
insert into public.ai_path_realtime_admission_reservations (
  id, admission_version, policy_id, admission_intent_id,
  owner_continuity_id, session_continuity_id, idempotency_key_hash,
  utc_day, estimated_cents, actual_cents, status, created_at, expires_at,
  finalized_at, cancelled_at
)
select
  fixture.id, '2026-07-16.v1', :'proof_policy_id', fixture.intent_id,
  fixture.owner_id, fixture.session_id, fixture.idempotency_hash,
  (proof_clock.created_at at time zone 'UTC')::date,
  fixture.estimated_cents, fixture.actual_cents,
  fixture.status::public.ai_path_realtime_reservation_status,
  proof_clock.created_at, proof_clock.created_at + interval '120 seconds',
  case when fixture.status = 'finalized'
    then proof_clock.created_at + interval '180 seconds' else null end,
  case when fixture.status = 'cancelled'
    then proof_clock.created_at + interval '180 seconds' else null end
from proof_clock
cross join (values
  (
    '70000000-0000-4000-8000-000000000001'::uuid,
    '70000000-0000-4000-8000-000000000011'::uuid,
    '70000000-0000-4000-8000-000000000021'::uuid,
    '70000000-0000-4000-8000-000000000031'::uuid,
    repeat('2', 64), 5, null::integer, 'expired'
  ),
  (
    '70000000-0000-4000-8000-000000000002'::uuid,
    '70000000-0000-4000-8000-000000000012'::uuid,
    '70000000-0000-4000-8000-000000000022'::uuid,
    '70000000-0000-4000-8000-000000000032'::uuid,
    repeat('3', 64), 6, 7, 'finalized'
  ),
  (
    '70000000-0000-4000-8000-000000000003'::uuid,
    '70000000-0000-4000-8000-000000000013'::uuid,
    '70000000-0000-4000-8000-000000000023'::uuid,
    '70000000-0000-4000-8000-000000000033'::uuid,
    repeat('4', 64), 8, null::integer, 'cancelled'
  )
) as fixture(
  id, intent_id, owner_id, session_id, idempotency_hash,
  estimated_cents, actual_cents, status
);

with proof_clock as (
  select date_trunc('day', clock_timestamp() at time zone 'UTC')
    at time zone 'UTC' as created_at
)
insert into public.ai_path_realtime_admission_reservations (
  id, admission_version, policy_id, admission_intent_id,
  owner_continuity_id, session_continuity_id, idempotency_key_hash,
  utc_day, estimated_cents, status, created_at, expires_at, cancelled_at
)
select
  '70000000-0000-4000-8000-000000000004', '2026-07-16.v1',
  :'proof_policy_id', '70000000-0000-4000-8000-000000000014',
  '70000000-0000-4000-8000-000000000024',
  '70000000-0000-4000-8000-000000000034',
  repeat('5', 64), (created_at at time zone 'UTC')::date,
  9, 'cancelled', created_at, created_at + interval '120 seconds',
  created_at + interval '180 seconds'
from proof_clock;

set local role service_role;
set local request.jwt.claim.role = 'service_role';
select public.maintain_ai_path_realtime_admission(
  :'proof_policy_id', 10, 10, 10, 10
) as continuity_maintenance \gset
reset role;

select public.ai_path_proof_assert(
  :'continuity_maintenance'::jsonb ->> 'policyId' = :'proof_policy_id'
    and (:'continuity_maintenance'::jsonb ->> 'purgedTotal')::integer = 3
    and (:'continuity_maintenance'::jsonb ->> 'cleanedIntentCount')::integer = 1
    and (:'continuity_maintenance'::jsonb ->> 'cleanedSessionMappingCount')::integer = 1
    and (:'continuity_maintenance'::jsonb ->> 'cleanedOwnerMappingCount')::integer = 2,
  'maintenance did not preserve exact purge, intent-cleanup, and mapping-GC bounds'
);
select public.ai_path_proof_assert(
  (
    select coalesce(sum(reservation_count), 0) = 3
      and coalesce(sum(estimated_cents), 0) = 19
      and coalesce(sum(actual_cents), 0) = 7
    from public.ai_path_realtime_admission_daily_archive
    where policy_id = :'proof_policy_id'
  ),
  'archive did not preserve content-free accounting totals'
);
select public.ai_path_proof_assert(
  exists (
    select 1 from public.ai_path_realtime_admission_reservations
    where id = '70000000-0000-4000-8000-000000000004'
      and status = 'cancelled'
  ),
  'maintenance purged a terminal current-UTC-day row'
);
select public.ai_path_proof_assert(
  not exists (
    select 1 from public.ai_path_realtime_admission_intents
    where id = (:'cleanup_intent'::jsonb ->> 'intentId')::uuid
  )
    and not exists (
      select 1 from public.ai_path_realtime_session_continuity
      where assessment_session_id = '63000000-0000-4000-8000-000000000001'
    ),
  'intent cleanup and mapping GC did not remove the exact stale capability'
);

do $$
begin
  begin
    perform set_config('request.jwt.claim.role', 'service_role', true);
    perform public.maintain_ai_path_realtime_admission(
      '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
      0, 1, 1, 1
    );
    raise exception 'zero admission expiry limit unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

rollback;
