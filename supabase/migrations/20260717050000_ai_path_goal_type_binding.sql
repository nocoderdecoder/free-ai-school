alter table public.ai_path_assessment_sessions
  add column goal_type text not null default 'unsure',
  add constraint ai_path_assessment_goal_type_valid check (
    goal_type in ('workflows', 'builder', 'career', 'leader', 'foundations', 'unsure')
  );

-- Adding a constant default backfills existing rows as schema work and does not
-- fire the completed-report UPDATE guard installed by migration 20000. New
-- sessions must always provide an explicit binding through the reviewed RPC.
alter table public.ai_path_assessment_sessions
  alter column goal_type drop default;

comment on column public.ai_path_assessment_sessions.goal_type is
  'Bounded learner-selected planning preference captured at session creation. It is not assessment evidence.';

alter table public.ai_path_learning_plans
  add column goal_type text;

update public.ai_path_learning_plans as plan
set goal_type = session.goal_type
from public.ai_path_assessment_sessions as session
where session.id = plan.source_assessment_session_id
  and plan.goal_type is null;

alter table public.ai_path_learning_plans
  alter column goal_type set not null,
  add constraint ai_path_learning_plan_goal_type_valid check (
    goal_type in ('workflows', 'builder', 'career', 'leader', 'foundations', 'unsure')
  );

comment on column public.ai_path_learning_plans.goal_type is
  'Immutable copy of the source assessment goal_type used for idempotent server-owned blueprint selection.';

create or replace function public.protect_ai_path_goal_type_binding()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.goal_type is distinct from old.goal_type then
    raise exception 'AI Path goal type binding is immutable.' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger ai_path_sessions_protect_goal_type
before update on public.ai_path_assessment_sessions
for each row execute function public.protect_ai_path_goal_type_binding();

create trigger ai_path_plans_protect_goal_type
before update on public.ai_path_learning_plans
for each row execute function public.protect_ai_path_goal_type_binding();

revoke all on function public.protect_ai_path_goal_type_binding()
  from public, anon, authenticated;

drop function public.create_owned_ai_path_session(text, text, text, text, text, boolean);

create or replace function public.create_owned_ai_path_session(
  p_mode text,
  p_locale text,
  p_goal text,
  p_goal_type text,
  p_target_role text,
  p_consent_version text,
  p_save_transcript boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid := auth.uid();
  created_session public.ai_path_assessment_sessions;
begin
  if current_owner is null then
    raise exception 'A verified user is required.' using errcode = '42501';
  end if;
  if p_consent_version <> '2026-07-16.v1' then
    raise exception 'The consent notice version is not current.' using errcode = '22023';
  end if;
  if p_goal_type not in ('workflows', 'builder', 'career', 'leader', 'foundations', 'unsure') then
    raise exception 'The learning goal type is invalid.' using errcode = '22023';
  end if;

  insert into public.ai_path_assessment_sessions (
    owner_id,
    status,
    mode,
    locale,
    goal,
    goal_type,
    target_role,
    consent_version,
    save_transcript
  ) values (
    current_owner,
    'consented',
    p_mode,
    p_locale,
    p_goal,
    p_goal_type,
    p_target_role,
    p_consent_version,
    p_save_transcript
  )
  returning * into created_session;

  return to_jsonb(created_session);
end;
$$;

revoke all on function public.create_owned_ai_path_session(text, text, text, text, text, text, boolean)
  from public, anon;
grant execute on function public.create_owned_ai_path_session(text, text, text, text, text, text, boolean)
  to authenticated;

drop function public.create_ai_path_learning_plan(uuid, uuid, integer, text, text, text, text, jsonb);

create or replace function public.create_ai_path_learning_plan(
  p_owner_id uuid,
  p_source_assessment_session_id uuid,
  p_goal_type text,
  p_weekly_minutes integer,
  p_title text,
  p_proof text,
  p_focus_now text,
  p_not_yet text,
  p_tasks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  created_plan_id uuid;
begin
  if caller_role <> 'service_role' then
    raise exception 'Learning-plan creation requires the service role.' using errcode = '42501';
  end if;
  if p_goal_type not in ('workflows', 'builder', 'career', 'leader', 'foundations', 'unsure')
    or p_weekly_minutes not between 15 and 1200
    or not public.is_valid_ai_path_plan_tasks(p_tasks) then
    raise exception 'Invalid learning-plan input.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.ai_path_assessment_sessions
    where id = p_source_assessment_session_id
      and owner_id = p_owner_id
      and goal_type = p_goal_type
      and status = 'complete'
      and report is not null
  ) then
    raise exception 'A completed owned assessment with the matching goal type is required.' using errcode = '42501';
  end if;

  insert into public.ai_path_learning_plans (
    owner_id, source_assessment_session_id, goal_type, weekly_minutes
  ) values (
    p_owner_id, p_source_assessment_session_id, p_goal_type, p_weekly_minutes
  ) returning id into created_plan_id;

  insert into public.ai_path_learning_plan_snapshots (
    plan_id, version, reason, source_assessment_session_id,
    title, proof, focus_now, not_yet, tasks
  ) values (
    created_plan_id, 1, 'initial', p_source_assessment_session_id,
    btrim(p_title), btrim(p_proof), btrim(p_focus_now), btrim(p_not_yet), p_tasks
  );

  insert into public.ai_path_learning_plan_task_progress (plan_id, snapshot_version, task_id)
  select created_plan_id, 1, task ->> 'id'
  from jsonb_array_elements(p_tasks) as task;

  return created_plan_id;
end;
$$;

revoke all on function public.create_ai_path_learning_plan(uuid, uuid, text, integer, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_ai_path_learning_plan(uuid, uuid, text, integer, text, text, text, text, jsonb)
  to service_role;
