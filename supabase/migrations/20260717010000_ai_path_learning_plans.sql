create type public.ai_path_learning_plan_status as enum ('active', 'completed', 'archived');
create type public.ai_path_plan_snapshot_reason as enum ('initial', 'adaptation', 'reassessment');
create type public.ai_path_plan_task_status as enum ('pending', 'in_progress', 'completed', 'skipped');
create type public.ai_path_plan_adaptation_status as enum ('proposed', 'approved', 'rejected', 'superseded');

create or replace function public.is_valid_ai_path_plan_tasks(p_tasks jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select
    jsonb_typeof(p_tasks) = 'array'
    and jsonb_array_length(p_tasks) = 12
    and (
      select count(distinct (task ->> 'id')) = 12
        and count(distinct ((task ->> 'ordinal')::integer)) = 12
        and count(distinct concat(task ->> 'week', ':', task ->> 'position')) = 12
        and min((task ->> 'ordinal')::integer) = 1
        and max((task ->> 'ordinal')::integer) = 12
        and min((task ->> 'week')::integer) = 1
        and max((task ->> 'week')::integer) = 4
        and min((task ->> 'position')::integer) = 1
        and max((task ->> 'position')::integer) = 3
        and bool_and((task ->> 'id') ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$')
        and bool_and(char_length(btrim(task ->> 'title')) between 3 and 240)
        and bool_and(char_length(btrim(task ->> 'outcome')) between 3 and 500)
      from jsonb_array_elements(p_tasks) as task
    );
$$;

revoke all on function public.is_valid_ai_path_plan_tasks(jsonb) from public, anon, authenticated;

create table public.ai_path_learning_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_assessment_session_id uuid not null references public.ai_path_assessment_sessions(id) on delete cascade,
  plan_version text not null default '2026-07-17.v1' check (plan_version = '2026-07-17.v1'),
  status public.ai_path_learning_plan_status not null default 'active',
  revision integer not null default 1 check (revision >= 1),
  current_snapshot_version integer not null default 1 check (current_snapshot_version >= 1),
  weekly_minutes integer not null check (weekly_minutes between 15 and 1200),
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, source_assessment_session_id),
  check (retention_expires_at > created_at)
);

create table public.ai_path_learning_plan_snapshots (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ai_path_learning_plans(id) on delete cascade,
  version integer not null check (version >= 1),
  reason public.ai_path_plan_snapshot_reason not null,
  source_assessment_session_id uuid not null references public.ai_path_assessment_sessions(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 3 and 500),
  proof text not null check (char_length(btrim(proof)) between 3 and 1200),
  focus_now text not null check (char_length(btrim(focus_now)) between 3 and 1200),
  not_yet text not null check (char_length(btrim(not_yet)) between 3 and 1200),
  tasks jsonb not null check (public.is_valid_ai_path_plan_tasks(tasks)),
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);

create table public.ai_path_learning_plan_task_progress (
  plan_id uuid not null references public.ai_path_learning_plans(id) on delete cascade,
  snapshot_version integer not null,
  task_id text not null check (task_id ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,127}$'),
  status public.ai_path_plan_task_status not null default 'pending',
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (plan_id, snapshot_version, task_id),
  foreign key (plan_id, snapshot_version)
    references public.ai_path_learning_plan_snapshots(plan_id, version) on delete cascade,
  check ((status = 'completed' and completed_at is not null) or (status <> 'completed' and completed_at is null))
);

create table public.ai_path_learning_plan_check_ins (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ai_path_learning_plans(id) on delete cascade,
  week_number integer not null check (week_number between 1 and 52),
  check_in_text text not null check (char_length(btrim(check_in_text)) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (plan_id, week_number)
);

create table public.ai_path_learning_plan_time_budget_changes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ai_path_learning_plans(id) on delete cascade,
  from_minutes integer not null check (from_minutes between 15 and 1200),
  to_minutes integer not null check (to_minutes between 15 and 1200),
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  source text not null check (source in ('user', 'adaptation')),
  created_at timestamptz not null default now()
);

create table public.ai_path_learning_plan_adaptations (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.ai_path_learning_plans(id) on delete cascade,
  proposal_text text not null check (char_length(btrim(proposal_text)) between 3 and 1200),
  operations jsonb not null check (jsonb_typeof(operations) = 'array' and jsonb_array_length(operations) between 1 and 4),
  status public.ai_path_plan_adaptation_status not null default 'proposed',
  base_snapshot_version integer not null check (base_snapshot_version >= 1),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check ((status = 'proposed' and decided_at is null) or (status <> 'proposed' and decided_at is not null))
);

comment on table public.ai_path_learning_plan_check_ins is
  'Private owner text. Never copy check_in_text into analytics or operational telemetry; emit only content-free lifecycle events.';
comment on column public.ai_path_learning_plans.retention_expires_at is
  'Plan-loop records match the 90-day source assessment retention. Account/session deletion cascades immediately.';

create or replace function public.delete_ai_path_plans_for_assessment_session()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ai_path_learning_plans as plan
  where plan.source_assessment_session_id = old.id
    or exists (
      select 1 from public.ai_path_learning_plan_snapshots as snapshot
      where snapshot.plan_id = plan.id
        and snapshot.source_assessment_session_id = old.id
    );
  return old;
end;
$$;

create trigger ai_path_assessment_session_delete_derived_plans
before delete on public.ai_path_assessment_sessions
for each row execute function public.delete_ai_path_plans_for_assessment_session();

revoke all on function public.delete_ai_path_plans_for_assessment_session()
  from public, anon, authenticated;

create index ai_path_learning_plans_owner_updated_idx
  on public.ai_path_learning_plans (owner_id, updated_at desc);
create index ai_path_learning_plans_retention_idx
  on public.ai_path_learning_plans (retention_expires_at);
create index ai_path_plan_check_ins_plan_created_idx
  on public.ai_path_learning_plan_check_ins (plan_id, created_at desc);

alter table public.ai_path_learning_plans enable row level security;
alter table public.ai_path_learning_plan_snapshots enable row level security;
alter table public.ai_path_learning_plan_task_progress enable row level security;
alter table public.ai_path_learning_plan_check_ins enable row level security;
alter table public.ai_path_learning_plan_time_budget_changes enable row level security;
alter table public.ai_path_learning_plan_adaptations enable row level security;

create policy "ai_path_learning_plans_select_own"
on public.ai_path_learning_plans for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "ai_path_learning_plan_snapshots_select_own"
on public.ai_path_learning_plan_snapshots for select to authenticated
using (exists (
  select 1 from public.ai_path_learning_plans as plan
  where plan.id = plan_id and plan.owner_id = (select auth.uid())
));

create policy "ai_path_learning_plan_progress_select_own"
on public.ai_path_learning_plan_task_progress for select to authenticated
using (exists (
  select 1 from public.ai_path_learning_plans as plan
  where plan.id = plan_id and plan.owner_id = (select auth.uid())
));

create policy "ai_path_learning_plan_check_ins_select_own"
on public.ai_path_learning_plan_check_ins for select to authenticated
using (exists (
  select 1 from public.ai_path_learning_plans as plan
  where plan.id = plan_id and plan.owner_id = (select auth.uid())
));

create policy "ai_path_learning_plan_budget_changes_select_own"
on public.ai_path_learning_plan_time_budget_changes for select to authenticated
using (exists (
  select 1 from public.ai_path_learning_plans as plan
  where plan.id = plan_id and plan.owner_id = (select auth.uid())
));

create policy "ai_path_learning_plan_adaptations_select_own"
on public.ai_path_learning_plan_adaptations for select to authenticated
using (exists (
  select 1 from public.ai_path_learning_plans as plan
  where plan.id = plan_id and plan.owner_id = (select auth.uid())
));

revoke all on public.ai_path_learning_plans from anon, authenticated;
revoke all on public.ai_path_learning_plan_snapshots from anon, authenticated;
revoke all on public.ai_path_learning_plan_task_progress from anon, authenticated;
revoke all on public.ai_path_learning_plan_check_ins from anon, authenticated;
revoke all on public.ai_path_learning_plan_time_budget_changes from anon, authenticated;
revoke all on public.ai_path_learning_plan_adaptations from anon, authenticated;

grant select on public.ai_path_learning_plans to authenticated;
grant select on public.ai_path_learning_plan_snapshots to authenticated;
grant select on public.ai_path_learning_plan_task_progress to authenticated;
grant select on public.ai_path_learning_plan_check_ins to authenticated;
grant select on public.ai_path_learning_plan_time_budget_changes to authenticated;
grant select on public.ai_path_learning_plan_adaptations to authenticated;

create or replace function public.create_ai_path_learning_plan(
  p_owner_id uuid,
  p_source_assessment_session_id uuid,
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
  created_plan_id uuid;
begin
  if p_weekly_minutes not between 15 and 1200
    or not public.is_valid_ai_path_plan_tasks(p_tasks) then
    raise exception 'Invalid learning-plan input.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.ai_path_assessment_sessions
    where id = p_source_assessment_session_id
      and owner_id = p_owner_id
      and status = 'complete'
      and report is not null
  ) then
    raise exception 'A completed owned assessment is required.' using errcode = '42501';
  end if;

  insert into public.ai_path_learning_plans (
    owner_id, source_assessment_session_id, weekly_minutes
  ) values (
    p_owner_id, p_source_assessment_session_id, p_weekly_minutes
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

revoke all on function public.create_ai_path_learning_plan(uuid, uuid, integer, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_ai_path_learning_plan(uuid, uuid, integer, text, text, text, text, jsonb)
  to service_role;

create or replace function public.set_owned_ai_path_plan_task_progress(
  p_plan_id uuid,
  p_task_id text,
  p_next_status public.ai_path_plan_task_status,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  owned_plan public.ai_path_learning_plans;
  current_status public.ai_path_plan_task_status;
begin
  select * into owned_plan
  from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = auth.uid()
  for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then
    raise exception 'Plan revision conflict.' using errcode = '40001';
  end if;

  select status into current_status
  from public.ai_path_learning_plan_task_progress
  where plan_id = p_plan_id
    and snapshot_version = owned_plan.current_snapshot_version
    and task_id = p_task_id
  for update;
  if not found then raise exception 'Task not found.' using errcode = 'P0002'; end if;
  if not (
    (current_status = 'pending' and p_next_status in ('in_progress', 'completed', 'skipped'))
    or (current_status = 'in_progress' and p_next_status in ('completed', 'skipped'))
    or (current_status = 'skipped' and p_next_status = 'pending')
  ) then
    raise exception 'Invalid task state transition.' using errcode = '22023';
  end if;

  update public.ai_path_learning_plan_task_progress
  set status = p_next_status,
      updated_at = now(),
      completed_at = case when p_next_status = 'completed' then now() else null end
  where plan_id = p_plan_id
    and snapshot_version = owned_plan.current_snapshot_version
    and task_id = p_task_id;
  update public.ai_path_learning_plans
  set revision = revision + 1, updated_at = now()
  where id = p_plan_id;
  return jsonb_build_object('planId', p_plan_id, 'revision', p_expected_revision + 1, 'status', p_next_status);
end;
$$;

revoke all on function public.set_owned_ai_path_plan_task_progress(uuid, text, public.ai_path_plan_task_status, integer)
  from public, anon;
grant execute on function public.set_owned_ai_path_plan_task_progress(uuid, text, public.ai_path_plan_task_status, integer)
  to authenticated;

create or replace function public.adjust_owned_ai_path_plan_time_budget(
  p_plan_id uuid,
  p_weekly_minutes integer,
  p_reason text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare owned_plan public.ai_path_learning_plans;
begin
  if p_weekly_minutes not between 15 and 1200 or char_length(btrim(p_reason)) not between 3 and 500 then
    raise exception 'Invalid time-budget adjustment.' using errcode = '22023';
  end if;
  select * into owned_plan from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then raise exception 'Plan revision conflict.' using errcode = '40001'; end if;

  insert into public.ai_path_learning_plan_time_budget_changes (
    plan_id, from_minutes, to_minutes, reason, source
  ) values (p_plan_id, owned_plan.weekly_minutes, p_weekly_minutes, btrim(p_reason), 'user');
  update public.ai_path_learning_plans
  set weekly_minutes = p_weekly_minutes, revision = revision + 1, updated_at = now()
  where id = p_plan_id;
  return jsonb_build_object('planId', p_plan_id, 'revision', p_expected_revision + 1, 'weeklyMinutes', p_weekly_minutes);
end;
$$;

revoke all on function public.adjust_owned_ai_path_plan_time_budget(uuid, integer, text, integer) from public, anon;
grant execute on function public.adjust_owned_ai_path_plan_time_budget(uuid, integer, text, integer) to authenticated;

create or replace function public.add_owned_ai_path_plan_check_in(
  p_plan_id uuid,
  p_week_number integer,
  p_check_in_text text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare owned_plan public.ai_path_learning_plans;
declare created_check_in_id uuid;
begin
  if p_week_number not between 1 and 52 or char_length(btrim(p_check_in_text)) not between 1 and 2000 then
    raise exception 'Invalid check-in.' using errcode = '22023';
  end if;
  select * into owned_plan from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then raise exception 'Plan revision conflict.' using errcode = '40001'; end if;

  insert into public.ai_path_learning_plan_check_ins (plan_id, week_number, check_in_text)
  values (p_plan_id, p_week_number, btrim(p_check_in_text)) returning id into created_check_in_id;
  update public.ai_path_learning_plans set revision = revision + 1, updated_at = now() where id = p_plan_id;
  return jsonb_build_object('id', created_check_in_id, 'revision', p_expected_revision + 1);
end;
$$;

revoke all on function public.add_owned_ai_path_plan_check_in(uuid, integer, text, integer) from public, anon;
grant execute on function public.add_owned_ai_path_plan_check_in(uuid, integer, text, integer) to authenticated;

create or replace function public.propose_ai_path_plan_adaptation(
  p_owner_id uuid,
  p_plan_id uuid,
  p_proposal_text text,
  p_operations jsonb,
  p_expected_revision integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare owned_plan public.ai_path_learning_plans;
declare operation jsonb;
declare swap_count integer := 0;
declare budget_count integer := 0;
declare created_adaptation_id uuid;
begin
  if jsonb_typeof(p_operations) <> 'array' or jsonb_array_length(p_operations) not between 1 and 4
    or char_length(btrim(p_proposal_text)) not between 3 and 1200 then
    raise exception 'Invalid adaptation proposal.' using errcode = '22023';
  end if;
  select * into owned_plan from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = p_owner_id for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then raise exception 'Plan revision conflict.' using errcode = '40001'; end if;

  for operation in select value from jsonb_array_elements(p_operations) loop
    if operation ->> 'type' = 'swap_task' then
      swap_count := swap_count + 1;
      if not exists (
        select 1 from public.ai_path_learning_plan_task_progress
        where plan_id = p_plan_id
          and snapshot_version = owned_plan.current_snapshot_version
          and task_id = operation ->> 'taskId'
          and status <> 'completed'
      ) or char_length(btrim(operation ->> 'title')) not between 3 and 240
        or char_length(btrim(operation ->> 'outcome')) not between 3 and 500 then
        raise exception 'Invalid task swap.' using errcode = '22023';
      end if;
    elsif operation ->> 'type' = 'adjust_time_budget' then
      budget_count := budget_count + 1;
      if (operation ->> 'weeklyMinutes')::integer not between 15 and 1200
        or char_length(btrim(operation ->> 'reason')) not between 3 and 500 then
        raise exception 'Invalid adaptation time budget.' using errcode = '22023';
      end if;
    else
      raise exception 'Unsupported adaptation operation.' using errcode = '22023';
    end if;
  end loop;
  if swap_count > 3 or budget_count > 1 then
    raise exception 'Adaptation exceeds bounded operations.' using errcode = '22023';
  end if;

  update public.ai_path_learning_plan_adaptations
  set status = 'superseded', decided_at = now()
  where plan_id = p_plan_id and status = 'proposed';
  insert into public.ai_path_learning_plan_adaptations (
    plan_id, proposal_text, operations, base_snapshot_version
  ) values (
    p_plan_id, btrim(p_proposal_text), p_operations, owned_plan.current_snapshot_version
  ) returning id into created_adaptation_id;
  update public.ai_path_learning_plans set revision = revision + 1, updated_at = now() where id = p_plan_id;
  return created_adaptation_id;
end;
$$;

revoke all on function public.propose_ai_path_plan_adaptation(uuid, uuid, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.propose_ai_path_plan_adaptation(uuid, uuid, text, jsonb, integer)
  to service_role;

create or replace function public.respond_to_owned_ai_path_plan_adaptation(
  p_plan_id uuid,
  p_adaptation_id uuid,
  p_decision text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare owned_plan public.ai_path_learning_plans;
declare proposal public.ai_path_learning_plan_adaptations;
declare current_snapshot public.ai_path_learning_plan_snapshots;
declare next_tasks jsonb;
declare operation jsonb;
declare next_version integer;
declare old_minutes integer;
begin
  if p_decision not in ('approve', 'reject') then raise exception 'Invalid decision.' using errcode = '22023'; end if;
  select * into owned_plan from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then raise exception 'Plan revision conflict.' using errcode = '40001'; end if;
  select * into proposal from public.ai_path_learning_plan_adaptations
  where id = p_adaptation_id and plan_id = p_plan_id and status = 'proposed' for update;
  if not found or proposal.base_snapshot_version <> owned_plan.current_snapshot_version then
    raise exception 'Adaptation is stale.' using errcode = '22023';
  end if;

  if p_decision = 'reject' then
    update public.ai_path_learning_plan_adaptations
    set status = 'rejected', decided_at = now() where id = p_adaptation_id;
    update public.ai_path_learning_plans set revision = revision + 1, updated_at = now() where id = p_plan_id;
    return jsonb_build_object('planId', p_plan_id, 'revision', p_expected_revision + 1, 'decision', 'rejected');
  end if;

  select * into current_snapshot from public.ai_path_learning_plan_snapshots
  where plan_id = p_plan_id and version = owned_plan.current_snapshot_version;
  next_tasks := current_snapshot.tasks;
  old_minutes := owned_plan.weekly_minutes;
  for operation in select value from jsonb_array_elements(proposal.operations) loop
    if operation ->> 'type' = 'swap_task' then
      select jsonb_agg(
        case when task ->> 'id' = operation ->> 'taskId'
          then task || jsonb_build_object(
            'id', gen_random_uuid()::text,
            'title', btrim(operation ->> 'title'),
            'outcome', btrim(operation ->> 'outcome')
          )
          else task end
        order by (task ->> 'ordinal')::integer
      ) into next_tasks from jsonb_array_elements(next_tasks) as task;
    elsif operation ->> 'type' = 'adjust_time_budget' then
      insert into public.ai_path_learning_plan_time_budget_changes (
        plan_id, from_minutes, to_minutes, reason, source
      ) values (
        p_plan_id, old_minutes, (operation ->> 'weeklyMinutes')::integer,
        btrim(operation ->> 'reason'), 'adaptation'
      );
      old_minutes := (operation ->> 'weeklyMinutes')::integer;
    end if;
  end loop;

  next_version := owned_plan.current_snapshot_version + 1;
  insert into public.ai_path_learning_plan_snapshots (
    plan_id, version, reason, source_assessment_session_id,
    title, proof, focus_now, not_yet, tasks
  ) values (
    p_plan_id, next_version, 'adaptation', current_snapshot.source_assessment_session_id,
    current_snapshot.title, current_snapshot.proof, current_snapshot.focus_now,
    current_snapshot.not_yet, next_tasks
  );
  insert into public.ai_path_learning_plan_task_progress (
    plan_id, snapshot_version, task_id, status, updated_at, completed_at
  )
  select p_plan_id, next_version, task ->> 'id',
    coalesce(previous.status, 'pending'::public.ai_path_plan_task_status), now(), previous.completed_at
  from jsonb_array_elements(next_tasks) as task
  left join public.ai_path_learning_plan_task_progress as previous
    on previous.plan_id = p_plan_id
    and previous.snapshot_version = owned_plan.current_snapshot_version
    and previous.task_id = task ->> 'id';
  update public.ai_path_learning_plan_adaptations
  set status = 'approved', decided_at = now() where id = p_adaptation_id;
  update public.ai_path_learning_plans
  set current_snapshot_version = next_version,
      weekly_minutes = old_minutes,
      revision = revision + 1,
      updated_at = now()
  where id = p_plan_id;
  return jsonb_build_object('planId', p_plan_id, 'revision', p_expected_revision + 1, 'decision', 'approved', 'snapshotVersion', next_version);
end;
$$;

revoke all on function public.respond_to_owned_ai_path_plan_adaptation(uuid, uuid, text, integer) from public, anon;
grant execute on function public.respond_to_owned_ai_path_plan_adaptation(uuid, uuid, text, integer) to authenticated;

create or replace function public.add_ai_path_plan_reassessment_snapshot(
  p_owner_id uuid,
  p_plan_id uuid,
  p_source_assessment_session_id uuid,
  p_title text,
  p_proof text,
  p_focus_now text,
  p_not_yet text,
  p_tasks jsonb,
  p_expected_revision integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare owned_plan public.ai_path_learning_plans;
declare next_version integer;
begin
  if not public.is_valid_ai_path_plan_tasks(p_tasks) then raise exception 'Invalid reassessment tasks.' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.ai_path_assessment_sessions
    where id = p_source_assessment_session_id and owner_id = p_owner_id and status = 'complete' and report is not null
  ) then raise exception 'A completed owned reassessment is required.' using errcode = '42501'; end if;
  select * into owned_plan from public.ai_path_learning_plans
  where id = p_plan_id and owner_id = p_owner_id for update;
  if not found then raise exception 'Plan not found.' using errcode = 'P0002'; end if;
  if owned_plan.status <> 'active' then raise exception 'Plan is immutable after completion or archival.' using errcode = '22023'; end if;
  if owned_plan.revision <> p_expected_revision then raise exception 'Plan revision conflict.' using errcode = '40001'; end if;
  if owned_plan.source_assessment_session_id = p_source_assessment_session_id then
    raise exception 'Reassessment must use a new assessment session.' using errcode = '22023';
  end if;

  next_version := owned_plan.current_snapshot_version + 1;
  insert into public.ai_path_learning_plan_snapshots (
    plan_id, version, reason, source_assessment_session_id,
    title, proof, focus_now, not_yet, tasks
  ) values (
    p_plan_id, next_version, 'reassessment', p_source_assessment_session_id,
    btrim(p_title), btrim(p_proof), btrim(p_focus_now), btrim(p_not_yet), p_tasks
  );
  insert into public.ai_path_learning_plan_task_progress (plan_id, snapshot_version, task_id)
  select p_plan_id, next_version, task ->> 'id' from jsonb_array_elements(p_tasks) as task;
  update public.ai_path_learning_plan_adaptations
  set status = 'superseded', decided_at = now()
  where plan_id = p_plan_id and status = 'proposed';
  update public.ai_path_learning_plans
  set current_snapshot_version = next_version, revision = revision + 1, updated_at = now()
  where id = p_plan_id;
  return next_version;
end;
$$;

revoke all on function public.add_ai_path_plan_reassessment_snapshot(uuid, uuid, uuid, text, text, text, text, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.add_ai_path_plan_reassessment_snapshot(uuid, uuid, uuid, text, text, text, text, jsonb, integer)
  to service_role;

create or replace function public.export_owned_ai_path_learning_plan(p_plan_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(plan) || jsonb_build_object(
    'snapshots', coalesce((select jsonb_agg(snapshot order by snapshot.version) from public.ai_path_learning_plan_snapshots snapshot where snapshot.plan_id = plan.id), '[]'::jsonb),
    'taskProgress', coalesce((select jsonb_agg(progress order by progress.snapshot_version, progress.task_id) from public.ai_path_learning_plan_task_progress progress where progress.plan_id = plan.id), '[]'::jsonb),
    'checkIns', coalesce((select jsonb_agg(check_in order by check_in.week_number) from public.ai_path_learning_plan_check_ins check_in where check_in.plan_id = plan.id), '[]'::jsonb),
    'adaptations', coalesce((select jsonb_agg(adaptation order by adaptation.created_at) from public.ai_path_learning_plan_adaptations adaptation where adaptation.plan_id = plan.id), '[]'::jsonb),
    'timeBudgetHistory', coalesce((select jsonb_agg(change order by change.created_at) from public.ai_path_learning_plan_time_budget_changes change where change.plan_id = plan.id), '[]'::jsonb)
  )
  from public.ai_path_learning_plans plan
  where plan.id = p_plan_id and plan.owner_id = auth.uid();
$$;

create or replace function public.delete_owned_ai_path_learning_plan(p_plan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.ai_path_learning_plans where id = p_plan_id and owner_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.export_owned_ai_path_learning_plan(uuid) from public, anon;
revoke all on function public.delete_owned_ai_path_learning_plan(uuid) from public, anon;
grant execute on function public.export_owned_ai_path_learning_plan(uuid) to authenticated;
grant execute on function public.delete_owned_ai_path_learning_plan(uuid) to authenticated;

create or replace function public.purge_expired_ai_path_learning_plans()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare deleted_count bigint;
begin
  delete from public.ai_path_learning_plans where retention_expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_ai_path_learning_plans() from public, anon, authenticated;
grant execute on function public.purge_expired_ai_path_learning_plans() to service_role;
