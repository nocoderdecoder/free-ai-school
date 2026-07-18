-- Owner-scoped full export and account-deletion preflight. This migration does
-- not delete auth users, activate analytics, or open any application latch.
-- The server must verify the user, require one-time reauthentication bound to
-- the current session, erase governed analytics, and then use the server-only
-- Auth Admin API for the final delete.

create or replace function public.export_owned_ai_path_account()
returns jsonb
language sql
stable
security definer
set search_path = ''
set statement_timeout = '5s'
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'schemaVersion', '2026-07-18.v1',
    'assessments', coalesce((
      select jsonb_agg(to_jsonb(session_row) order by session_row.created_at, session_row.id)
      from public.ai_path_assessment_sessions as session_row
      where session_row.owner_id = auth.uid()
    ), '[]'::jsonb),
    'learningPlans', coalesce((
      select jsonb_agg(
        public.export_owned_ai_path_learning_plan(plan_row.id)
        order by plan_row.created_at, plan_row.id
      )
      from public.ai_path_learning_plans as plan_row
      where plan_row.owner_id = auth.uid()
    ), '[]'::jsonb),
    'consumerDiagnostics', coalesce((
      select jsonb_agg(
        public.export_owned_ai_path_consumer_diagnostic(diagnostic_row.id)
        order by diagnostic_row.created_at, diagnostic_row.id
      )
      from public.ai_path_consumer_diagnostic_sessions as diagnostic_row
      where diagnostic_row.owner_id = auth.uid()
    ), '[]'::jsonb),
    'realtimeAdmissions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'policyId', intent.policy_id,
        'issuedAt', intent.issued_at,
        'expiresAt', intent.expires_at,
        'consumedAt', intent.consumed_at,
        'status', reservation.status,
        'estimatedCents', reservation.estimated_cents,
        'actualCents', reservation.actual_cents,
        'createdAt', reservation.created_at,
        'finalizedAt', reservation.finalized_at,
        'cancelledAt', reservation.cancelled_at
      ) order by intent.issued_at, intent.id)
      from public.ai_path_realtime_admission_intents as intent
      join public.ai_path_realtime_session_continuity as continuity
        on continuity.assessment_session_id = intent.assessment_session_id
      left join public.ai_path_realtime_admission_reservations as reservation
        on reservation.id = intent.reservation_id
      where continuity.owner_id = auth.uid()
    ), '[]'::jsonb)
  ) end;
$$;

comment on function public.export_owned_ai_path_account() is
  'Exports all current owner-linked AI Path assessment, consumer-diagnostic, plan, and Realtime-admission data. Requires auth.uid(); never accepts an owner id argument.';

revoke all on function public.export_owned_ai_path_account()
  from public, anon, service_role;
grant execute on function public.export_owned_ai_path_account()
  to authenticated;

create or replace function public.ai_path_account_deletion_readiness()
returns jsonb
language sql
stable
security definer
set search_path = ''
set statement_timeout = '3500ms'
as $$
  with active_lease as (
    select max(reservation.expires_at) as retry_at
    from public.ai_path_realtime_admission_reservations as reservation
    join public.ai_path_realtime_owner_continuity as continuity
      on continuity.owner_continuity_id = reservation.owner_continuity_id
    where continuity.owner_id = auth.uid()
      and reservation.status = 'reserved'
      and reservation.expires_at > clock_timestamp()
  )
  select case when auth.uid() is null then null else jsonb_build_object(
    'ready', active_lease.retry_at is null,
    'retryAt', active_lease.retry_at
  ) end
  from active_lease;
$$;

comment on function public.ai_path_account_deletion_readiness() is
  'Returns only whether the verified owner has an active paid Realtime lease and its latest expiry. The delete trigger remains the authoritative race-safe guard.';

revoke all on function public.ai_path_account_deletion_readiness()
  from public, anon, service_role;
grant execute on function public.ai_path_account_deletion_readiness()
  to authenticated;
