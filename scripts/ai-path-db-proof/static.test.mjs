import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../../", import.meta.url);
const harness = await readFile(new URL("../ai-path-db-proof.sh", import.meta.url), "utf8");
const contracts = await readFile(new URL("./10-contracts.sql", import.meta.url), "utf8");
const concurrency = await readFile(new URL("./20-concurrency-reserve.sql", import.meta.url), "utf8");
const bootstrap = await readFile(new URL("./ci-bootstrap.sql", import.meta.url), "utf8");
const workflow = await readFile(new URL("../../.github/workflows/ai-path-db-proof.yml", import.meta.url), "utf8");
const preflightPath = fileURLToPath(new URL("../ai-path-db-proof-preflight.mjs", import.meta.url));
const migrationNames = await readdir(new URL("supabase/migrations/", root));
const continuityMigrationNames = migrationNames.filter(name =>
  /^20260717080000_ai_path_realtime_admission_.*\.sql$/.test(name)
);

const migrations = [
  "20260717000000_ai_path_assessment_sessions.sql",
  "20260717010000_ai_path_learning_plans.sql",
  "20260717020000_ai_path_trusted_report_writer.sql",
  "20260717040000_ai_path_realtime_admission.sql",
  "20260717050000_ai_path_goal_type_binding.sql",
  "20260717060000_ai_path_bounded_retention.sql",
  "20260717070000_ai_path_realtime_admission_lifecycle.sql",
];

test("harness requires the migration baseline and discovers later migrations", () => {
  let previousIndex = -1;
  for (const migration of migrations) {
    const index = harness.indexOf(migration);
    assert.ok(index > previousIndex, `${migration} must be pinned in order`);
    previousIndex = index;
  }
  assert.match(harness, /MIGRATION_PATHS=\("\$\{REPO_ROOT\}"\/supabase\/migrations\/\*_ai_path_\*\.sql\)/);
  assert.match(harness, /for migration_path in "\$\{MIGRATION_PATHS\[@\]\}"/);
  assert.equal(continuityMigrationNames.length, 1, "one 80000 Realtime continuity migration is required");
  assert.match(harness, /CONTINUITY_MIGRATIONS/);
  assert.match(harness, /20260717080000_ai_path_realtime_admission_/);
  assert.match(harness, /refuses a non-empty legacy admission ledger/);
  assert.match(harness, /88000000-0000-4000-8000-000000000001/);
  assert.match(harness, /accepted a non-empty legacy admission ledger/);
  assert.match(harness, /delete from public\.ai_path_realtime_admission_reservations/);
});

test("harness refuses unsafe targets before migration apply", () => {
  const applyIndex = harness.indexOf("applying ${migration}");
  for (const guard of [
    "I_UNDERSTAND_THIS_DATABASE_WILL_BE_MUTATED",
    "localhost",
    "127.0.0.1",
    "::1",
    "ai_path_proof_",
    "parsed.search || parsed.hash",
    "parsed.password",
    "PGPASSWORD is not accepted",
    "the PostgreSQL server is not on an isolated loopback or private service network",
    "the target is not empty",
    "psql is not installed",
  ]) {
    const index = harness.indexOf(guard);
    assert.ok(index >= 0 && index < applyIndex, `${guard} must guard migration apply`);
  }
  assert.doesNotMatch(harness, /\b(docker|supabase start|createdb|dropdb)\b/);
  assert.doesNotMatch(harness, /psql\s+[^\n]*\$\{[^}]*PASSWORD/);
  for (const network of ["127.0.0.0/8", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]) {
    assert.ok(harness.includes(network), `harness is missing isolated network guard ${network}`);
  }
});

test("preflight is source-verifiable and fails closed without a PostgreSQL runtime", () => {
  const sourceOnly = spawnSync(process.execPath, [preflightPath, "--source-only", "--json"], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
    env: { ...process.env, PATH: "/ai-path-proof-no-runtime" },
  });
  assert.equal(sourceOnly.status, 0, sourceOnly.stderr);
  const sourceReport = JSON.parse(sourceOnly.stdout);
  assert.equal(sourceReport.ok, true);
  assert.equal(sourceReport.mode, "source-only");
  assert.equal(sourceReport.connectsToDatabase, false);
  assert.equal(sourceReport.mutatesDatabase, false);

  const runtimeRequired = spawnSync(process.execPath, [preflightPath, "--json"], {
    cwd: fileURLToPath(root),
    encoding: "utf8",
    env: { ...process.env, PATH: "/ai-path-proof-no-runtime" },
  });
  assert.equal(runtimeRequired.status, 2, runtimeRequired.stderr);
  const runtimeReport = JSON.parse(runtimeRequired.stdout);
  assert.equal(runtimeReport.ok, false);
  assert.equal(runtimeReport.runtime.reason, "psql_not_found");
});

test("CI proof is isolated to a fresh loopback PostgreSQL service", () => {
  for (const invariant of [
    "postgres:16-alpine",
    "POSTGRES_HOST_AUTH_METHOD: trust",
    "127.0.0.1:5432",
    "ai_path_proof_ci",
    "I_UNDERSTAND_THIS_CI_CLUSTER_IS_DISPOSABLE",
    "I_UNDERSTAND_THIS_DATABASE_WILL_BE_MUTATED",
    "timeout-minutes: 12",
    "permissions:",
    "contents: read",
    "scripts/ai-path-db-proof.sh",
    "actions/checkout@v6",
    "actions/setup-node@v6",
    "package-manager-cache: false",
    "actions/upload-artifact@v6",
  ]) assert.ok(workflow.includes(invariant), `workflow is missing ${invariant}`);
  assert.doesNotMatch(workflow, /secrets\.|supabase\.co|openai|AI_PATH_.*LATCH/iu);

  assert.match(bootstrap, /current_database\(\) <> 'postgres'/);
  assert.match(bootstrap, /inet_server_addr\(\)/);
  for (const network of ["127.0.0.0/8", "::1/128", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"]) {
    assert.ok(bootstrap.includes(network), `bootstrap is missing isolated network guard ${network}`);
  }
  assert.match(bootstrap, /isolated loopback or private service network/);
  assert.match(bootstrap, /ai_path_proof_ci/);
  assert.match(bootstrap, /ci_disposable_confirmation/);
  for (const role of ["anon", "authenticated", "service_role"]) {
    assert.match(bootstrap, new RegExp(`create role ${role} nologin`));
  }
  assert.doesNotMatch(bootstrap, /drop\s+(?:database|role)/i);
});

test("contracts cover RLS, denial, ownership, bounded retention, and idempotency", () => {
  for (const evidence of [
    "relrowsecurity",
    "relforcerowsecurity",
    "has_table_privilege",
    "has_function_privilege",
    "owner one did not see exactly its own session",
    "owner one was able to delete owner two session",
    "purge_expired_ai_path_sessions(2)",
    "purge_expired_ai_path_sessions(0)",
    "purge_expired_ai_path_learning_plans(2)",
    "proof-continuity-idempotency-1",
    "idempotency_conflict",
    "ai_path_realtime_admission_daily_archive",
    "maintain_ai_path_realtime_admission",
    "seven-day reconciliation window",
    "purgedTotal",
    "current-UTC-day row",
    "archive did not preserve content-free accounting totals",
    "wrong intent capability mutated a reservation",
    "consumed replay returned reserved after its database lease elapsed",
    "active source delete guard did not preserve the source session",
    "active direct account delete guard did not preserve account, mapping, and lease",
    "deidentified ledger could not reconcile after source deletion",
    "elapsed direct account deletion did not cascade raw state and retain its ledger",
    "pseudonymous ledger could not reconcile after direct account deletion",
    "policy rollover guard stranded live intent or reservation detail",
    "ledger immutability guard did not preserve the estimated cents",
    "intent cleanup and mapping GC did not remove the exact stale capability",
  ]) {
    assert.match(contracts, new RegExp(evidence.replace(/[()]/g, "\\$&")));
  }

  assert.match(contracts, /set status = 'failed'[\s\S]*63000000-0000-4000-8000-000000000001/);
  assert.doesNotMatch(contracts, /set status = 'complete'[\s\S]*63000000-0000-4000-8000-000000000001/);

  assert.match(harness, /two-connection DB-owned-continuity Realtime admission race/);
  assert.match(
    harness,
    /truncate public\.ai_path_realtime_admission_intents, public\.ai_path_realtime_admission_reservations/,
  );
  assert.match(harness, /issue_ai_path_realtime_admission_intent/);
  assert.match(harness, /DB-owned-continuity Realtime admission race/);
  assert.match(concurrency, /:'policy_id'/);
  assert.match(concurrency, /:'intent_id'::uuid/);
  assert.doesNotMatch(concurrency, /user_key|session_key|p_max_|p_reservation_ttl|p_now|p_expires_at/);
  assert.match(harness, /global_concurrency_exceeded/);
  assert.doesNotMatch(contracts, /\\if false/);
  assert.match(contracts, /finalize_ai_path_realtime_admission\(text,uuid,uuid,integer\)/);
  assert.match(contracts, /cancel_ai_path_realtime_admission\(text,uuid,uuid\)/);
  assert.match(contracts, /delete from auth\.users/);
});

test("80000 cutover makes continuity, intent, and spend policy database-owned", async () => {
  assert.equal(continuityMigrationNames.length, 1, "continuity migration is absent or ambiguous");
  const sql = await readFile(new URL(`supabase/migrations/${continuityMigrationNames[0]}`, root), "utf8");

  for (const table of [
    "ai_path_realtime_admission_policy_contracts",
    "ai_path_realtime_admission_policy_state",
    "ai_path_realtime_owner_continuity",
    "ai_path_realtime_session_continuity",
    "ai_path_realtime_admission_intents",
  ]) {
    assert.match(sql, new RegExp(`create table public\\.${table}`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security`));
    assert.match(sql, new RegExp(`revoke all on public\\.${table}[\\s\\S]*from public, anon, authenticated, service_role`));
  }

  assert.match(sql, /issue_ai_path_realtime_admission_intent\([\s\S]*p_policy_id text[\s\S]*p_assessment_session_id uuid/);
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /caller_role\s*<>\s*'authenticated'/);
  assert.match(sql, /owner_id\s*=\s*(?:auth\.uid\(\)|caller_id)/);
  assert.match(sql, /status\s+in\s*\('consented',\s*'connecting'\)/i);
  assert.match(sql, /grant execute on function public\.issue_ai_path_realtime_admission_intent\([\s\S]*to authenticated/);
  assert.match(sql, /revoke all on function public\.issue_ai_path_realtime_admission_intent\([\s\S]*from public, anon, service_role/);

  assert.match(sql, /reserve_ai_path_realtime_admission\([\s\S]*p_policy_id text[\s\S]*p_intent_id uuid[\s\S]*p_idempotency_key text[\s\S]*p_estimated_cents integer/);
  assert.match(sql, /finalize_ai_path_realtime_admission\([\s\S]*p_policy_id text[\s\S]*p_intent_id uuid[\s\S]*p_reservation_id uuid[\s\S]*p_actual_cents integer/);
  assert.match(sql, /cancel_ai_path_realtime_admission\([\s\S]*p_policy_id text[\s\S]*p_intent_id uuid[\s\S]*p_reservation_id uuid/);
  assert.match(sql, /maintain_ai_path_realtime_admission\([\s\S]*p_policy_id text[\s\S]*integer[\s\S]*integer[\s\S]*integer[\s\S]*integer/);

  for (const rpc of [
    "reserve_ai_path_realtime_admission",
    "finalize_ai_path_realtime_admission",
    "cancel_ai_path_realtime_admission",
    "maintain_ai_path_realtime_admission",
  ]) {
    assert.match(sql, new RegExp(`grant execute on function public\\.${rpc}\\([\\s\\S]*?\\)\\s+to service_role`));
    assert.doesNotMatch(sql, new RegExp(`grant execute on function public\\.${rpc}\\([\\s\\S]*?\\)\\s+to (?:anon|authenticated)`));
  }

  assert.match(sql, /max_global_concurrent[\s\S]*2/);
  assert.match(sql, /max_user_concurrent[\s\S]*1/);
  assert.match(sql, /max_user_daily_cents[\s\S]*100/);
  assert.match(sql, /max_global_daily_cents[\s\S]*1000/);
  assert.match(sql, /max_reservation_cents[\s\S]*100/);
  assert.match(sql, /reservation_ttl_ms[\s\S]*120000/);
  assert.match(sql, /enabled\s+boolean|disabled\s+boolean/);
  assert.match(sql, /statement_timeout[^\n]*(?:3500ms|3\.5s)/i);
  assert.ok(
    (sql.match(/pg_advisory_xact_lock\(17291,\s*20260717\)/g) ?? []).length >= 5,
    "intent, reserve, finalize, cancel, and maintenance must share the admission lock",
  );
  assert.ok(
    (sql.match(/caller_role\s*<>\s*'service_role'/g) ?? []).length >= 4,
    "every privileged lifecycle RPC must independently verify service role",
  );

  assert.match(sql, /ai_path_realtime_admission_reservations[\s\S]*count\(\*\)[\s\S]*(?:raise exception|assert)/i);
  assert.match(sql, /add column admission_intent_id uuid not null unique/);
  assert.match(sql, /'intentId',\s*\(p_reservation\)\.admission_intent_id/);
  assert.match(sql, /guard_ai_path_realtime_session_delete/);
  assert.match(sql, /guard_ai_path_realtime_owner_delete/);
  assert.match(sql, /before delete on auth\.users/);
  assert.match(sql, /revoke all on function public\.guard_ai_path_realtime_owner_delete\(\)[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(sql, /guard_ai_path_realtime_policy_state_rollover/);
  assert.match(sql, /guard_ai_path_realtime_ledger_immutability/);
  assert.match(sql, /drop function[\s\S]*reserve_ai_path_realtime_admission\(text,\s*text,\s*text,\s*date/i);
  assert.match(sql, /drop function[\s\S]*finalize_ai_path_realtime_admission\(uuid,\s*text,\s*text/i);
  assert.match(sql, /drop function[\s\S]*cancel_ai_path_realtime_admission\(uuid,\s*text,\s*text/i);

  const finalSignatures = sql.slice(sql.lastIndexOf("create or replace function public.reserve_ai_path_realtime_admission"));
  assert.doesNotMatch(finalSignatures, /user_key|session_key|p_max_|p_reservation_ttl_ms|p_now|p_expires_at|binding_key_version|hmac/i);
});

test("lifecycle migration fixes late-finalization and bounded archival policy", async () => {
  const lifecycle = await readFile(
    new URL("supabase/migrations/20260717070000_ai_path_realtime_admission_lifecycle.sql", root),
    "utf8",
  );
  assert.match(lifecycle, /expires_at \+ interval '7 days'/);
  assert.match(lifecycle, /database_now - interval '90 days'/);
  assert.match(lifecycle, /p_expire_limit not between 1 and 1000/);
  assert.match(lifecycle, /p_purge_limit not between 1 and 1000/);
  assert.match(lifecycle, /pg_advisory_xact_lock\(17291, 20260717\)/);
  assert.match(lifecycle, /ai_path_realtime_admission_daily_archive/);
  assert.match(lifecycle, /grant execute on function public\.maintain_ai_path_realtime_admission/);
});

test("every pinned migration exists", async () => {
  for (const migration of migrations) {
    const contents = await readFile(new URL(`supabase/migrations/${migration}`, root), "utf8");
    assert.ok(contents.length > 100, `${migration} is unexpectedly empty`);
  }
});
