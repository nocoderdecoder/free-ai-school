-- Entering analysis is a privileged lifecycle decision. The browser cannot
-- update session state, and the trusted report writer accepts only rows already
-- in analysis_pending. This boundary connects those invariants without letting
-- a client choose an owner, lifecycle state, or completed report.

alter table public.ai_path_assessment_sessions
  add column analysis_attempt_id uuid,
  add column analysis_started_at timestamptz;

-- A pre-existing completed report already has the only safe idempotency key
-- and completion time available. This makes the migration rollback-safe even
-- if an operator applied earlier slices before this boundary existed.
-- ALTER TABLE holds an exclusive lock for the transaction, so only this exact
-- metadata backfill can run while the named immutability trigger is suspended.
alter table public.ai_path_assessment_sessions
  disable trigger ai_path_sessions_protect_report;

update public.ai_path_assessment_sessions
set analysis_attempt_id = report_write_id,
    analysis_started_at = (report ->> 'generatedAt')::timestamptz
where status = 'complete';

alter table public.ai_path_assessment_sessions
  enable trigger ai_path_sessions_protect_report;

alter table public.ai_path_assessment_sessions
  add constraint ai_path_analysis_attempt_metadata_consistent check (
    (
      status in ('analysis_pending', 'complete')
      and analysis_attempt_id is not null
      and analysis_started_at is not null
    )
    or (
      status not in ('analysis_pending', 'complete')
      and (
        (analysis_attempt_id is null and analysis_started_at is null)
        or (
          status = 'failed'
          and analysis_attempt_id is not null
          and analysis_started_at is not null
        )
      )
    )
  );

comment on column public.ai_path_assessment_sessions.analysis_attempt_id is
  'Persisted service-generated attempt UUID reused for every trusted report retry.';
comment on column public.ai_path_assessment_sessions.analysis_started_at is
  'Database-owned timestamp reused as the deterministic report generatedAt value.';

create or replace function public.protect_ai_path_report_immutability()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or new.owner_id is distinct from old.owner_id then
    raise exception 'AI Path session identity is immutable.' using errcode = '55000';
  end if;

  if new.taxonomy_version is distinct from old.taxonomy_version
    or new.scoring_version is distinct from old.scoring_version
    or new.report_version is distinct from old.report_version
    or new.catalog_version is distinct from old.catalog_version then
    raise exception 'AI Path report versions are immutable.' using errcode = '55000';
  end if;

  -- A completed assessment is append-only. Retention is implemented by DELETE,
  -- not by mutating its derived report or extending its expiry.
  if old.status = 'complete' then
    raise exception 'A completed AI Path session is immutable.' using errcode = '55000';
  end if;

  if new.status = 'analysis_pending' and old.status <> 'analysis_pending' then
    if coalesce(current_setting('ai_path.trusted_analysis_transition', true), '') <> 'on'
      or not (
        (old.mode = 'text' and old.status = 'consented')
        or (old.mode = 'voice' and old.status = 'ending')
      )
      or new.report is not null
      or new.report_write_id is not null
      or new.report_digest is not null
      or new.report_saved_at is not null
      or new.analysis_attempt_id is null
      or new.analysis_started_at is null then
      raise exception 'Analysis may only begin at the trusted lifecycle boundary.'
        using errcode = '42501';
    end if;
  end if;

  if new.analysis_attempt_id is distinct from old.analysis_attempt_id
    or new.analysis_started_at is distinct from old.analysis_started_at then
    if coalesce(current_setting('ai_path.trusted_analysis_transition', true), '') <> 'on'
      or old.analysis_attempt_id is not null
      or old.analysis_started_at is not null
      or new.status <> 'analysis_pending' then
      raise exception 'Analysis attempt metadata is immutable outside its trusted boundary.'
        using errcode = '42501';
    end if;
  end if;

  if new.report is distinct from old.report
    or new.report_write_id is distinct from old.report_write_id
    or new.report_digest is distinct from old.report_digest
    or new.report_saved_at is distinct from old.report_saved_at
    or new.status = 'complete' then
    if coalesce(current_setting('ai_path.trusted_report_write', true), '') <> 'on'
      or old.status <> 'analysis_pending'
      or new.status <> 'complete'
      or old.report is not null
      or old.report_write_id is not null
      or old.report_digest is not null
      or old.report_saved_at is not null
      or old.analysis_attempt_id is null
      or old.analysis_started_at is null
      or new.report_write_id is distinct from old.analysis_attempt_id
      or (new.report ->> 'generatedAt')::timestamptz is distinct from old.analysis_started_at then
      raise exception 'Reports may only be written by the trusted completion boundary.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_ai_path_report_immutability()
  from public, anon, authenticated;

create or replace function public.begin_ai_path_analysis_trusted(
  p_session_id uuid,
  p_owner_id uuid,
  p_proposed_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  target_session public.ai_path_assessment_sessions;
begin
  if caller_role <> 'service_role' then
    raise exception 'The trusted analysis boundary requires the service role.' using errcode = '42501';
  end if;
  if p_session_id is null or p_owner_id is null or p_proposed_attempt_id is null then
    raise exception 'Session, owner, and attempt identifiers are required.' using errcode = '22023';
  end if;

  select * into target_session
  from public.ai_path_assessment_sessions
  where id = p_session_id and owner_id = p_owner_id
  for update;

  if not found then
    -- The same error covers an absent row and a row owned by someone else.
    raise exception 'The owned assessment session was not found.' using errcode = 'P0002';
  end if;

  if target_session.status in ('analysis_pending', 'complete') then
    if target_session.retention_expires_at <= now()
      or target_session.analysis_attempt_id is null
      or target_session.analysis_started_at is null
      or (
        target_session.status = 'analysis_pending'
        and (
          target_session.report is not null
          or target_session.report_write_id is not null
          or target_session.report_digest is not null
          or target_session.report_saved_at is not null
        )
      )
      or (
        target_session.status = 'complete'
        and (
          target_session.report is null
          or target_session.report_write_id is distinct from target_session.analysis_attempt_id
          or target_session.report_digest is null
          or target_session.report_saved_at is null
          or (target_session.report ->> 'generatedAt')::timestamptz
            is distinct from target_session.analysis_started_at
        )
      ) then
      raise exception 'The session is not eligible to begin analysis.' using errcode = '55000';
    end if;
    return jsonb_build_object(
      'session', to_jsonb(target_session),
      'replayed', true,
      'analysisAttemptId', target_session.analysis_attempt_id,
      'analysisStartedAt', target_session.analysis_started_at,
      'completed', target_session.status = 'complete'
    );
  end if;

  if target_session.retention_expires_at <= now()
    or target_session.report is not null
    or target_session.report_write_id is not null
    or target_session.report_digest is not null
    or target_session.report_saved_at is not null
    or not (
      (target_session.mode = 'text' and target_session.status = 'consented')
      or (target_session.mode = 'voice' and target_session.status = 'ending')
    ) then
    raise exception 'The session is not eligible to begin analysis.' using errcode = '55000';
  end if;

  perform set_config('ai_path.trusted_analysis_transition', 'on', true);

  update public.ai_path_assessment_sessions
  set status = 'analysis_pending',
      analysis_attempt_id = p_proposed_attempt_id,
      analysis_started_at = clock_timestamp()
  where id = p_session_id and owner_id = p_owner_id
  returning * into target_session;

  perform set_config('ai_path.trusted_analysis_transition', 'off', true);

  return jsonb_build_object(
    'session', to_jsonb(target_session),
    'replayed', false,
    'analysisAttemptId', target_session.analysis_attempt_id,
    'analysisStartedAt', target_session.analysis_started_at,
    'completed', false
  );
end;
$$;

revoke all on function public.begin_ai_path_analysis_trusted(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.begin_ai_path_analysis_trusted(uuid, uuid, uuid)
  to service_role;
