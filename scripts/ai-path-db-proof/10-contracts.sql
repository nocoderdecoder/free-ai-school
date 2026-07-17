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
      'public.ai_path_realtime_admission_reservations'::regclass
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
    and not has_table_privilege('service_role', 'public.ai_path_realtime_admission_daily_archive', 'SELECT'),
  'direct private-table grants are broader than intended'
);
select public.ai_path_proof_assert(
  has_function_privilege('service_role', 'public.purge_expired_ai_path_sessions(integer)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.purge_expired_ai_path_sessions(integer)', 'EXECUTE')
    and has_function_privilege(
      'service_role',
      'public.reserve_ai_path_realtime_admission(text,text,text,date,timestamp with time zone,timestamp with time zone,integer,integer,integer,integer,integer,integer,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.reserve_ai_path_realtime_admission(text,text,text,date,timestamp with time zone,timestamp with time zone,integer,integer,integer,integer,integer,integer,integer)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.maintain_ai_path_realtime_admission(integer,integer)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'public.maintain_ai_path_realtime_admission(integer,integer)',
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

do $$
declare
  proof_now timestamptz := clock_timestamp();
  first_result jsonb;
  replay_result jsonb;
  conflict_result jsonb;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  first_result := public.reserve_ai_path_realtime_admission(
    repeat('a', 64), repeat('b', 64), 'proof-idempotency-1',
    (proof_now at time zone 'UTC')::date, proof_now,
    proof_now + interval '5 minutes', 5, 10, 2, 100, 1000, 20, 300000
  );
  replay_result := public.reserve_ai_path_realtime_admission(
    repeat('a', 64), repeat('b', 64), 'proof-idempotency-1',
    (proof_now at time zone 'UTC')::date, proof_now,
    proof_now + interval '5 minutes', 5, 10, 2, 100, 1000, 20, 300000
  );
  conflict_result := public.reserve_ai_path_realtime_admission(
    repeat('a', 64), repeat('b', 64), 'proof-idempotency-1',
    (proof_now at time zone 'UTC')::date, proof_now,
    proof_now + interval '5 minutes', 6, 10, 2, 100, 1000, 20, 300000
  );

  perform public.ai_path_proof_assert(
    first_result ->> 'kind' = 'reserved'
      and (first_result ->> 'idempotent')::boolean = false,
    'first admission was not a new reservation'
  );
  perform public.ai_path_proof_assert(
    replay_result ->> 'kind' = 'reserved'
      and (replay_result ->> 'idempotent')::boolean = true
      and replay_result #>> '{reservation,id}' = first_result #>> '{reservation,id}',
    'same admission idempotency key did not replay the reservation'
  );
  perform public.ai_path_proof_assert(
    conflict_result ->> 'kind' = 'denied'
      and conflict_result ->> 'reason' = 'idempotency_conflict',
    'conflicting admission idempotency key was not denied'
  );
end;
$$;

-- The finalizer permits reconciliation for seven days after lease expiry and
-- rejects the same transition outside that database-time window.
insert into public.ai_path_realtime_admission_reservations (
  id, user_key, session_key, idempotency_key_hash, utc_day,
  estimated_cents, status, created_at, expires_at
) values
  (
    '40000000-0000-0000-0000-000000000001',
    repeat('c', 64), repeat('d', 64), repeat('e', 64),
    ((clock_timestamp() - interval '1 day') at time zone 'UTC')::date,
    5, 'expired', clock_timestamp() - interval '1 day',
    clock_timestamp() - interval '1 day' + interval '5 minutes'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    repeat('f', 64), repeat('0', 64), repeat('1', 64),
    ((clock_timestamp() - interval '8 days') at time zone 'UTC')::date,
    5, 'expired', clock_timestamp() - interval '8 days',
    clock_timestamp() - interval '8 days' + interval '5 minutes'
  );

do $$
declare
  inside_window jsonb;
  outside_window jsonb;
  proof_now timestamptz := clock_timestamp();
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  inside_window := public.finalize_ai_path_realtime_admission(
    '40000000-0000-0000-0000-000000000001',
    repeat('c', 64), repeat('d', 64), 7, proof_now, 100, 1000
  );
  outside_window := public.finalize_ai_path_realtime_admission(
    '40000000-0000-0000-0000-000000000002',
    repeat('f', 64), repeat('0', 64), 7, proof_now, 100, 1000
  );
  perform public.ai_path_proof_assert(
    inside_window ->> 'kind' = 'finalized',
    'finalization inside the seven-day reconciliation window failed'
  );
  perform public.ai_path_proof_assert(
    outside_window ->> 'kind' = 'state_conflict',
    'finalization outside the seven-day reconciliation window succeeded'
  );
end;
$$;

-- Three terminal rows older than 90 days prove bounded purge and aggregate
-- preservation. A current-day terminal row proves the UTC-day safety fence,
-- and an elapsed reserved lease proves bounded expiry transition.
insert into public.ai_path_realtime_admission_reservations (
  id, user_key, session_key, idempotency_key_hash, utc_day,
  estimated_cents, actual_cents, status, created_at, expires_at,
  finalized_at, cancelled_at
) values
  (
    '50000000-0000-0000-0000-000000000001',
    repeat('2', 64), repeat('3', 64), repeat('4', 64),
    ((clock_timestamp() - interval '100 days') at time zone 'UTC')::date,
    5, null, 'expired', clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '100 days' + interval '5 minutes', null, null
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    repeat('5', 64), repeat('6', 64), repeat('7', 64),
    ((clock_timestamp() - interval '100 days') at time zone 'UTC')::date,
    6, 7, 'finalized', clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '100 days' + interval '5 minutes',
    clock_timestamp() - interval '100 days' + interval '10 minutes', null
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    repeat('8', 64), repeat('9', 64), repeat('a', 64),
    ((clock_timestamp() - interval '100 days') at time zone 'UTC')::date,
    8, null, 'cancelled', clock_timestamp() - interval '100 days',
    clock_timestamp() - interval '100 days' + interval '5 minutes', null,
    clock_timestamp() - interval '100 days' + interval '10 minutes'
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    repeat('b', 64), repeat('c', 64), repeat('d', 64),
    (clock_timestamp() at time zone 'UTC')::date,
    9, null, 'cancelled',
    date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC',
    (date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC') + interval '5 minutes',
    null,
    (date_trunc('day', clock_timestamp() at time zone 'UTC') at time zone 'UTC') + interval '10 minutes'
  ),
  (
    '50000000-0000-0000-0000-000000000005',
    repeat('e', 64), repeat('f', 64), repeat('0', 64),
    ((clock_timestamp() - interval '1 hour') at time zone 'UTC')::date,
    10, null, 'reserved', clock_timestamp() - interval '1 hour',
    clock_timestamp() - interval '1 hour' + interval '5 minutes', null, null
  );

do $$
declare
  first_maintenance jsonb;
  second_maintenance jsonb;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);
  first_maintenance := public.maintain_ai_path_realtime_admission(1, 2);
  perform public.ai_path_proof_assert(
    (first_maintenance ->> 'transitionedExpiredCount')::integer = 1
      and (first_maintenance ->> 'purgedTotal')::integer = 2
      and (first_maintenance ->> 'hasMore')::boolean = true,
    'first lifecycle batch did not preserve its expiry/purge bounds'
  );
  second_maintenance := public.maintain_ai_path_realtime_admission(1, 1);
  perform public.ai_path_proof_assert(
    (second_maintenance ->> 'purgedTotal')::integer = 1
      and (second_maintenance ->> 'hasMore')::boolean = false,
    'second lifecycle batch did not drain exactly one remaining eligible row'
  );
end;
$$;

select public.ai_path_proof_assert(
  (
    select count(*) = 1
    from public.ai_path_realtime_admission_reservations
    where id = '50000000-0000-0000-0000-000000000004'
      and status = 'cancelled'
  ),
  'lifecycle maintenance purged a terminal current-UTC-day row'
);
select public.ai_path_proof_assert(
  (
    select count(*) = 1
    from public.ai_path_realtime_admission_reservations
    where id = '50000000-0000-0000-0000-000000000005'
      and status = 'expired'
  ),
  'lifecycle maintenance did not transition the bounded elapsed lease'
);
select public.ai_path_proof_assert(
  (
    select coalesce(sum(reservation_count), 0) = 3
      and coalesce(sum(estimated_cents), 0) = 19
      and coalesce(sum(actual_cents), 0) = 7
    from public.ai_path_realtime_admission_daily_archive
  ),
  'lifecycle archive did not preserve content-free accounting totals'
);

do $$
begin
  begin
    perform set_config('request.jwt.claim.role', 'service_role', true);
    perform public.maintain_ai_path_realtime_admission(0, 1);
    raise exception 'zero admission expiry limit unexpectedly succeeded';
  exception
    when invalid_parameter_value then null;
  end;
end;
$$;

rollback;
