\set ON_ERROR_STOP on

-- The hard-coded Supabase roles must already exist in the dedicated local
-- cluster. This file creates database-local compatibility objects only.
create schema auth;
create schema extensions;

create table auth.users (
  id uuid primary key
);

create or replace function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.jwt()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    jsonb_strip_nulls(jsonb_build_object(
      'role', nullif(current_setting('request.jwt.claim.role', true), ''),
      'sub', nullif(current_setting('request.jwt.claim.sub', true), '')
    ))
  );
$$;

grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
revoke all on auth.users from anon, authenticated, service_role;
