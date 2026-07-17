#!/usr/bin/env bash
set -euo pipefail

readonly REQUIRED_CONFIRMATION="I_UNDERSTAND_THIS_DATABASE_WILL_BE_MUTATED"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROOF_DIR="${SCRIPT_DIR}/ai-path-db-proof"
readonly REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

fail() {
  printf 'AI Path database proof refused: %s\n' "$1" >&2
  exit 2
}

log() {
  printf '[ai-path-db-proof] %s\n' "$1"
}

if [[ "${AI_PATH_DB_PROOF_DISPOSABLE:-}" != "${REQUIRED_CONFIRMATION}" ]]; then
  fail "set AI_PATH_DB_PROOF_DISPOSABLE=${REQUIRED_CONFIRMATION} only for an empty disposable local database"
fi

readonly DB_URL="${AI_PATH_DB_PROOF_URL:-}"
[[ -n "${DB_URL}" ]] || fail "AI_PATH_DB_PROOF_URL is required"

command -v node >/dev/null 2>&1 || fail "node is required for fail-closed URL validation"

url_metadata="$({
  node - "${DB_URL}" <<'NODE'
const rawUrl = process.argv[2];
let parsed;
try {
  parsed = new URL(rawUrl);
} catch {
  process.exit(10);
}

if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
  process.exit(11);
}
if (parsed.search || parsed.hash) {
  // libpq URI query parameters can override connection coordinates. Reject
  // all of them so the validated host/database are the connected target.
  process.exit(14);
}
if (parsed.password) {
  // URI passwords would be repeated in psql process arguments. A protected
  // PGPASSFILE or passwordless dedicated local proof role is required.
  process.exit(15);
}

const hostname = parsed.hostname.toLowerCase();
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(hostname)) {
  process.exit(12);
}

const database = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
if (!/^ai_path_proof_[a-z0-9_]+$/.test(database)) {
  process.exit(13);
}

process.stdout.write(`${hostname}|${database}`);
NODE
} 2>/dev/null)" || fail "the URL must use postgresql:// with a loopback host and an ai_path_proof_* database name"

IFS='|' read -r requested_host requested_database <<<"${url_metadata}"
[[ -n "${requested_host}" && -n "${requested_database}" ]] || fail "URL validation returned incomplete metadata"
[[ -z "${PGPASSWORD:-}" ]] || fail "PGPASSWORD is not accepted; use a protected PGPASSFILE or passwordless local proof role"

command -v psql >/dev/null 2>&1 || fail "psql is not installed; the harness will not install or start PostgreSQL"

export PGAPPNAME="ai-path-disposable-proof"
export PGCONNECT_TIMEOUT="${PGCONNECT_TIMEOUT:-3}"

log "running read-only target preflight"
preflight="$({
  psql "${DB_URL}" -X -A -t -v ON_ERROR_STOP=1 <<'SQL'
select concat_ws('|',
  current_database(),
  case
    when inet_server_addr() is null then 'local_socket'
    else inet_server_addr()::text
  end,
  case
    when inet_server_addr() is null
      or inet_server_addr() <<= inet '127.0.0.0/8'
      or inet_server_addr() <<= inet '::1/128'
    then 'loopback'
    else 'remote'
  end,
  current_setting('server_version_num')::integer,
  (select rolsuper from pg_roles where rolname = current_user),
  (select count(*) from pg_roles where rolname in ('anon', 'authenticated', 'service_role')),
  (
    select count(*)
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
      and namespace.nspname !~ '^pg_temp_'
      and relation.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  ),
  (
    select count(*)
    from pg_type as type_row
    join pg_namespace as namespace on namespace.oid = type_row.typnamespace
    where namespace.nspname = 'public'
      and type_row.typtype in ('c', 'd', 'e')
  ),
  (
    select count(*)
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname not in ('pg_catalog', 'information_schema')
      and namespace.nspname !~ '^pg_temp_'
  ),
  (
    select count(*)
    from pg_namespace
    where nspname not in ('pg_catalog', 'information_schema', 'public')
      and nspname !~ '^pg_(toast|temp|toasta_temp)'
  ),
  (select count(*) from pg_extension where extname <> 'plpgsql')
);
SQL
} 2>/dev/null)" || fail "could not connect to the explicitly named local proof database"

IFS='|' read -r actual_database server_address locality server_version is_superuser required_role_count relation_count public_type_count procedure_count custom_schema_count extension_count <<<"${preflight}"

[[ "${actual_database}" == "${requested_database}" ]] || fail "the connected database does not match the validated URL"
[[ "${locality}" == "loopback" ]] || fail "the PostgreSQL server is not loopback-local"
[[ "${server_version}" =~ ^[0-9]+$ && "${server_version}" -ge 150000 ]] || fail "PostgreSQL 15 or newer is required"
[[ "${is_superuser}" == "t" ]] || fail "a superuser in a dedicated disposable local cluster is required for deterministic role/RLS proof"
[[ "${required_role_count}" == "3" ]] || fail "the local cluster must already provide anon, authenticated, and service_role roles"
[[ "${relation_count}" == "0" \
  && "${public_type_count}" == "0" \
  && "${procedure_count}" == "0" \
  && "${custom_schema_count}" == "0" \
  && "${extension_count}" == "0" ]] || fail "the target is not empty; create a fresh ai_path_proof_* database"

readonly -a REQUIRED_BASELINE_MIGRATIONS=(
  "20260717000000_ai_path_assessment_sessions.sql"
  "20260717010000_ai_path_learning_plans.sql"
  "20260717020000_ai_path_trusted_report_writer.sql"
  "20260717040000_ai_path_realtime_admission.sql"
  "20260717050000_ai_path_goal_type_binding.sql"
  "20260717060000_ai_path_bounded_retention.sql"
  "20260717070000_ai_path_realtime_admission_lifecycle.sql"
)

shopt -s nullglob
MIGRATION_PATHS=("${REPO_ROOT}"/supabase/migrations/*_ai_path_*.sql)
shopt -u nullglob
[[ "${#MIGRATION_PATHS[@]}" -ge "${#REQUIRED_BASELINE_MIGRATIONS[@]}" ]] || fail "fewer AI Path migrations were discovered than the required baseline"

for required_migration in "${REQUIRED_BASELINE_MIGRATIONS[@]}"; do
  required_path="${REPO_ROOT}/supabase/migrations/${required_migration}"
  [[ -f "${required_path}" ]] || fail "required baseline migration is missing: ${required_migration}"
done

log "installing a minimal local Supabase compatibility schema"
psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -1 -f "${PROOF_DIR}/00-local-supabase-compat.sql"

for migration_path in "${MIGRATION_PATHS[@]}"; do
  migration="${migration_path##*/}"
  log "applying ${migration}"
  psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -1 -f "${migration_path}"
done

log "running schema, role, ownership, retention, and idempotency contracts"
psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -f "${PROOF_DIR}/10-contracts.sql"

expect_denied() {
  local label="$1"
  local sql="$2"
  local denial_output
  if denial_output="$(psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -c "${sql}" 2>&1)"; then
    fail "${label} unexpectedly succeeded"
  fi
  if [[ "${denial_output}" != *"42501"* ]]; then
    printf '%s\n' "${denial_output}" >&2
    fail "${label} failed for a reason other than an insufficient-privilege denial"
  fi
  log "confirmed denial: ${label}"
}

expect_denied \
  "anon session table read" \
  "set role anon; select count(*) from public.ai_path_assessment_sessions"
expect_denied \
  "authenticated direct Realtime ledger read" \
  "set role authenticated; select count(*) from public.ai_path_realtime_admission_reservations"
expect_denied \
  "service-role direct Realtime ledger read" \
  "set role service_role; select count(*) from public.ai_path_realtime_admission_reservations"
expect_denied \
  "service-role direct Realtime archive read" \
  "set role service_role; select count(*) from public.ai_path_realtime_admission_daily_archive"
expect_denied \
  "authenticated retention RPC" \
  "set role authenticated; select public.purge_expired_ai_path_sessions(1)"

log "running two-connection Realtime admission race"
psql "${DB_URL}" -X -q -v ON_ERROR_STOP=1 -c "truncate public.ai_path_realtime_admission_reservations" >/dev/null

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/ai-path-db-proof.XXXXXX")"
out_a="${tmp_dir}/a.out"
out_b="${tmp_dir}/b.out"
err_a="${tmp_dir}/a.err"
err_b="${tmp_dir}/b.err"

cleanup() {
  rm -f -- "${out_a}" "${out_b}" "${err_a}" "${err_b}"
  rmdir -- "${tmp_dir}" 2>/dev/null || true
}
trap cleanup EXIT

psql "${DB_URL}" -X -A -t -q -v ON_ERROR_STOP=1 \
  -v user_key="$(printf '1%.0s' {1..64})" \
  -v session_key="$(printf '2%.0s' {1..64})" \
  -v idempotency_key="proof-concurrent-a" \
  -f "${PROOF_DIR}/20-concurrency-reserve.sql" >"${out_a}" 2>"${err_a}" &
pid_a=$!

psql "${DB_URL}" -X -A -t -q -v ON_ERROR_STOP=1 \
  -v user_key="$(printf '3%.0s' {1..64})" \
  -v session_key="$(printf '4%.0s' {1..64})" \
  -v idempotency_key="proof-concurrent-b" \
  -f "${PROOF_DIR}/20-concurrency-reserve.sql" >"${out_b}" 2>"${err_b}" &
pid_b=$!

status_a=0
status_b=0
wait "${pid_a}" || status_a=$?
wait "${pid_b}" || status_b=$?
[[ "${status_a}" == "0" && "${status_b}" == "0" ]] || {
  sed -n '1,80p' "${err_a}" >&2
  sed -n '1,80p' "${err_b}" >&2
  fail "a concurrent admission connection failed"
}

race_results="$(sed '/^[[:space:]]*$/d' "${out_a}"; sed '/^[[:space:]]*$/d' "${out_b}")"
reserved_count="$(printf '%s\n' "${race_results}" | grep -c '^reserved|$' || true)"
denied_count="$(printf '%s\n' "${race_results}" | grep -c '^denied|global_concurrency_exceeded$' || true)"
[[ "${reserved_count}" == "1" && "${denied_count}" == "1" ]] || {
  printf '%s\n' "${race_results}" >&2
  fail "the concurrent admission race did not produce exactly one reservation and one global-concurrency denial"
}

ledger_count="$(psql "${DB_URL}" -X -A -t -q -v ON_ERROR_STOP=1 -c \
  "select count(*) from public.ai_path_realtime_admission_reservations where status = 'reserved'")"
[[ "${ledger_count}" == "1" ]] || fail "the concurrent admission race persisted an unexpected reservation count"

log "PASS: ${#MIGRATION_PATHS[@]} migrations and all disposable database contracts succeeded"
log "the disposable database was intentionally left intact for operator inspection"
