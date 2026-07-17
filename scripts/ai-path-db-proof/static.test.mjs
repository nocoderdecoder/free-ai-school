import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const harness = await readFile(new URL("../ai-path-db-proof.sh", import.meta.url), "utf8");
const contracts = await readFile(new URL("./10-contracts.sql", import.meta.url), "utf8");
const concurrency = await readFile(new URL("./20-concurrency-reserve.sql", import.meta.url), "utf8");

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
    "the PostgreSQL server is not loopback-local",
    "the target is not empty",
    "psql is not installed",
  ]) {
    const index = harness.indexOf(guard);
    assert.ok(index >= 0 && index < applyIndex, `${guard} must guard migration apply`);
  }
  assert.doesNotMatch(harness, /\b(docker|supabase start|createdb|dropdb)\b/);
  assert.doesNotMatch(harness, /psql\s+[^\n]*\$\{[^}]*PASSWORD/);
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
    "proof-idempotency-1",
    "idempotency_conflict",
    "ai_path_realtime_admission_daily_archive",
    "maintain_ai_path_realtime_admission",
    "seven-day reconciliation window",
    "purgedTotal",
    "current-UTC-day row",
    "archive did not preserve content-free accounting totals",
  ]) {
    assert.match(contracts, new RegExp(evidence.replace(/[()]/g, "\\$&")));
  }

  assert.match(harness, /two-connection Realtime admission race/);
  assert.match(concurrency, /p_max_global_concurrent|\n\s*1,/s);
  assert.match(harness, /global_concurrency_exceeded/);
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
