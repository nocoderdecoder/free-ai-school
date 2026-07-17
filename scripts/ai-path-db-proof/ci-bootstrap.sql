\set ON_ERROR_STOP on

-- CI-only bootstrap for the isolated PostgreSQL service declared in
-- .github/workflows/ai-path-db-proof.yml. The behavioral harness itself never
-- creates cluster-global roles or databases.
\if :{?ci_disposable_confirmation}
\else
  \echo 'CI proof bootstrap refused: ci_disposable_confirmation is required'
  \quit 2
\endif

select :'ci_disposable_confirmation' = 'I_UNDERSTAND_THIS_CI_CLUSTER_IS_DISPOSABLE' as ci_confirmation_ok \gset
\if :ci_confirmation_ok
\else
  \echo 'CI proof bootstrap refused: disposable confirmation did not match'
  \quit 2
\endif

do $proof_bootstrap$
begin
  if current_database() <> 'postgres' then
    raise exception 'CI proof bootstrap requires the postgres maintenance database';
  end if;
  if current_user <> 'postgres' then
    raise exception 'CI proof bootstrap requires the ephemeral postgres superuser';
  end if;
  if inet_server_addr() is null
    or not (
      inet_server_addr() <<= inet '127.0.0.0/8'
      or inet_server_addr() <<= inet '::1/128'
    ) then
    raise exception 'CI proof bootstrap requires a loopback TCP server';
  end if;
  if exists (select 1 from pg_database where datname = 'ai_path_proof_ci') then
    raise exception 'CI proof database already exists; the service is not fresh';
  end if;
  if exists (select 1 from pg_roles where rolname in ('anon', 'authenticated', 'service_role')) then
    raise exception 'Supabase compatibility roles already exist; the service is not fresh';
  end if;

  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
end
$proof_bootstrap$;

create database ai_path_proof_ci owner postgres;
