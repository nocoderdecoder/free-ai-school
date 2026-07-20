-- A report is privileged derived data. Authenticated clients may create/read/delete
-- their sessions, but only the backend service role may complete a session with a
-- server-recomputed report. This migration is intentionally inert until applied by
-- an operator and the separate application code latch is reviewed open.

create extension if not exists pgcrypto with schema extensions;

alter table public.ai_path_assessment_sessions
  add column report_write_id uuid,
  add column report_digest text;

alter table public.ai_path_assessment_sessions
  add constraint ai_path_report_write_metadata_consistent check (
    (
      report is null
      and report_write_id is null
      and report_digest is null
    )
    or (
      report is not null
      and report_write_id is not null
      and report_digest ~ '^[0-9a-f]{64}$'
    )
  );

comment on column public.ai_path_assessment_sessions.report_write_id is
  'Server-generated idempotency key for the single trusted report completion.';
comment on column public.ai_path_assessment_sessions.report_digest is
  'Server-side SHA-256 of the canonical jsonb report text; never accepted from a client.';

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
      or old.report_saved_at is not null then
      raise exception 'Reports may only be written by the trusted completion boundary.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger ai_path_sessions_protect_report
before update on public.ai_path_assessment_sessions
for each row execute function public.protect_ai_path_report_immutability();

revoke all on function public.protect_ai_path_report_immutability()
  from public, anon, authenticated;

create or replace function public.complete_ai_path_session_trusted(
  p_session_id uuid,
  p_owner_id uuid,
  p_report jsonb,
  p_report_write_id uuid,
  p_taxonomy_version text,
  p_scoring_version text,
  p_report_version text,
  p_catalog_version text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text := coalesce(auth.jwt() ->> 'role', current_setting('request.jwt.claim.role', true), '');
  target_session public.ai_path_assessment_sessions;
  computed_digest text;
begin
  -- Grants are the primary boundary; the verified JWT role check is defense in depth.
  if caller_role <> 'service_role' then
    raise exception 'The trusted report writer requires the service role.' using errcode = '42501';
  end if;

  if p_session_id is null or p_owner_id is null or p_report_write_id is null then
    raise exception 'Session, owner, and write identifiers are required.' using errcode = '22023';
  end if;
  if p_taxonomy_version <> '2026-07-16.v1'
    or p_scoring_version <> '2026-07-16.v1'
    or p_report_version <> '2026-07-16.v1'
    or p_catalog_version <> '2026-07-16.v1' then
    raise exception 'Unsupported report version set.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_report) <> 'object'
    or octet_length(p_report::text) > 1048576
    or jsonb_typeof(p_report -> 'results') <> 'array'
    or jsonb_typeof(p_report -> 'strengths') <> 'array'
    or jsonb_typeof(p_report -> 'growthAreas') <> 'array'
    or jsonb_typeof(p_report -> 'recommendations') <> 'array' then
    raise exception 'The recomputed report shape is invalid.' using errcode = '22023';
  end if;
  if p_report ->> 'taxonomyVersion' <> p_taxonomy_version
    or p_report ->> 'scoringVersion' <> p_scoring_version
    or p_report ->> 'reportVersion' <> p_report_version
    or p_report ->> 'catalogVersion' <> p_catalog_version then
    raise exception 'The report payload does not match its pinned versions.' using errcode = '22023';
  end if;

  computed_digest := encode(
    extensions.digest(convert_to(p_report::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select * into target_session
  from public.ai_path_assessment_sessions
  where id = p_session_id and owner_id = p_owner_id
  for update;

  if not found then
    -- Deliberately does not reveal whether the session exists for another owner.
    raise exception 'The owned assessment session was not found.' using errcode = 'P0002';
  end if;

  if target_session.status = 'complete' then
    if target_session.report_write_id = p_report_write_id
      and target_session.report_digest = computed_digest
      and target_session.report = p_report then
      return jsonb_build_object(
        'session', to_jsonb(target_session),
        'replayed', true,
        'reportDigest', computed_digest
      );
    end if;
    raise exception 'The report completion key was already used with different content.'
      using errcode = '23505';
  end if;

  if target_session.status <> 'analysis_pending'
    or target_session.report is not null
    or target_session.report_saved_at is not null
    or target_session.report_write_id is not null
    or target_session.report_digest is not null then
    raise exception 'The session is not eligible for trusted completion.' using errcode = '55000';
  end if;
  if p_report ->> 'goal' is distinct from target_session.goal then
    raise exception 'The report is not bound to the assessment session goal.' using errcode = '22023';
  end if;

  perform set_config('ai_path.trusted_report_write', 'on', true);

  update public.ai_path_assessment_sessions
  set status = 'complete',
      report = p_report,
      report_write_id = p_report_write_id,
      report_digest = computed_digest,
      report_saved_at = now()
  where id = p_session_id and owner_id = p_owner_id
  returning * into target_session;

  perform set_config('ai_path.trusted_report_write', 'off', true);

  return jsonb_build_object(
    'session', to_jsonb(target_session),
    'replayed', false,
    'reportDigest', computed_digest
  );
end;
$$;

revoke all on function public.complete_ai_path_session_trusted(
  uuid, uuid, jsonb, uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.complete_ai_path_session_trusted(
  uuid, uuid, jsonb, uuid, text, text, text, text
) to service_role;
