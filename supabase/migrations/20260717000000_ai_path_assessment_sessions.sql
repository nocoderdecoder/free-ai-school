create type public.ai_path_session_status as enum (
  'created',
  'consented',
  'connecting',
  'active',
  'ending',
  'analysis_pending',
  'complete',
  'failed',
  'expired'
);

create table public.ai_path_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status public.ai_path_session_status not null default 'created',
  mode text not null check (mode in ('voice', 'text')),
  locale text not null check (char_length(locale) between 2 and 20),
  goal text not null check (char_length(goal) between 20 and 1200),
  target_role text check (target_role is null or char_length(target_role) between 1 and 160),
  consent_version text not null default '2026-07-16.v1' check (consent_version = '2026-07-16.v1'),
  save_transcript boolean not null default false,
  taxonomy_version text not null default '2026-07-16.v1',
  scoring_version text not null default '2026-07-16.v1',
  report_version text not null default '2026-07-16.v1',
  catalog_version text not null default '2026-07-16.v1',
  report jsonb check (report is null or jsonb_typeof(report) = 'object'),
  report_saved_at timestamptz,
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((report is null and report_saved_at is null) or (report is not null and report_saved_at is not null)),
  check (
    report is null or (
      report ->> 'reportVersion' = report_version
      and report ->> 'taxonomyVersion' = taxonomy_version
      and report ->> 'scoringVersion' = scoring_version
      and report ->> 'catalogVersion' = catalog_version
    )
  ),
  check (retention_expires_at > created_at)
);

comment on table public.ai_path_assessment_sessions is
  'Owner-scoped AI Path assessment sessions. Transcript text is intentionally not stored in this first durable slice.';

create unique index ai_path_one_active_session_per_owner
  on public.ai_path_assessment_sessions (owner_id)
  where status not in ('complete', 'failed', 'expired');

create index ai_path_sessions_owner_created_idx
  on public.ai_path_assessment_sessions (owner_id, created_at desc);

create index ai_path_sessions_retention_idx
  on public.ai_path_assessment_sessions (retention_expires_at);

create or replace function public.set_ai_path_session_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ai_path_sessions_set_updated_at
before update on public.ai_path_assessment_sessions
for each row execute function public.set_ai_path_session_updated_at();

revoke all on function public.set_ai_path_session_updated_at() from public, anon, authenticated;

alter table public.ai_path_assessment_sessions enable row level security;

create policy "ai_path_sessions_select_own"
on public.ai_path_assessment_sessions
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "ai_path_sessions_delete_own"
on public.ai_path_assessment_sessions
for delete
to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.ai_path_assessment_sessions from anon;
revoke all on public.ai_path_assessment_sessions from authenticated;
grant select, delete on public.ai_path_assessment_sessions to authenticated;

create or replace function public.create_owned_ai_path_session(
  p_mode text,
  p_locale text,
  p_goal text,
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

  insert into public.ai_path_assessment_sessions (
    owner_id,
    status,
    mode,
    locale,
    goal,
    target_role,
    consent_version,
    save_transcript
  ) values (
    current_owner,
    'consented',
    p_mode,
    p_locale,
    p_goal,
    p_target_role,
    p_consent_version,
    p_save_transcript
  )
  returning * into created_session;

  return to_jsonb(created_session);
end;
$$;

revoke all on function public.create_owned_ai_path_session(text, text, text, text, text, boolean)
  from public, anon;
grant execute on function public.create_owned_ai_path_session(text, text, text, text, text, boolean)
  to authenticated;

create or replace function public.export_owned_ai_path_session(p_session_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select to_jsonb(session_row)
  from public.ai_path_assessment_sessions as session_row
  where session_row.id = p_session_id
    and session_row.owner_id = (select auth.uid());
$$;

create or replace function public.delete_owned_ai_path_session(p_session_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.ai_path_assessment_sessions
  where id = p_session_id
    and owner_id = (select auth.uid());
  return found;
end;
$$;

revoke all on function public.export_owned_ai_path_session(uuid) from public, anon;
revoke all on function public.delete_owned_ai_path_session(uuid) from public, anon;
grant execute on function public.export_owned_ai_path_session(uuid) to authenticated;
grant execute on function public.delete_owned_ai_path_session(uuid) to authenticated;

create or replace function public.purge_expired_ai_path_sessions()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count bigint;
begin
  delete from public.ai_path_assessment_sessions
  where retention_expires_at <= now();
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_ai_path_sessions() from public, anon, authenticated;
grant execute on function public.purge_expired_ai_path_sessions() to service_role;
