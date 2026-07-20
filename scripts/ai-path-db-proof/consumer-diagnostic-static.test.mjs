import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const migration = await readFile(
  new URL('../../supabase/migrations/20260718010000_ai_path_consumer_diagnostic_sessions.sql', import.meta.url),
  'utf8',
)
const proof = await readFile(new URL('./40-consumer-diagnostic-contracts.sql', import.meta.url), 'utf8')

test('consumer diagnostic migration pins the current product contract', () => {
  for (const invariant of [
    "diagnostic_path in ('use-case', 'capability-growth')",
    "intake_version = '2026-07-18.v1'",
    "result_policy_version = '2026-07-18.v2'",
    "privacy_notice_version = '2026-07-18.consumer.v1'",
    "result_kind = 'use-case-blueprint'",
    "result_kind = 'capability-prescription'",
    'intake_snapshot',
    'intake_digest',
    'result_snapshot',
    'result_digest',
    'idempotency_key_hash',
    'deterministic-server-policy',
  ]) assert.ok(migration.includes(invariant), `migration is missing ${invariant}`)

  assert.match(migration, /persist_ai_path_consumer_diagnostic_trusted\([\s\S]+security definer/i)
  assert.match(migration, /caller_role <> 'service_role'/)
  assert.match(migration, /force row level security/i)
  assert.match(migration, /prevent_ai_path_consumer_diagnostic_update/i)
  assert.match(migration, /pg_advisory_xact_lock/i)
  assert.match(migration, /for update skip locked/i)
})

test('consumer diagnostic database proof covers idempotency, ownership, immutability and retention', () => {
  for (const evidence of [
    'consumer diagnostic trusted completion was not atomic and idempotent',
    'consumer diagnostic idempotency conflict was accepted',
    'completed consumer diagnostic snapshots were mutable',
    'a consumer diagnostic crossed its owner boundary',
    'consumer diagnostic grants are broader or narrower than intended',
    'bounded consumer diagnostic retention did not delete the exact expired row',
    'full account export omitted the current owner diagnostic',
    'persist_ai_path_consumer_diagnostic_trusted',
    'export_owned_ai_path_consumer_diagnostic',
    'delete_owned_ai_path_consumer_diagnostic',
    'purge_expired_ai_path_consumer_diagnostics(1)',
  ]) assert.ok(proof.includes(evidence), `database proof is missing ${evidence}`)

  assert.match(proof, /^begin;/m)
  assert.match(proof, /^rollback;/m)
  assert.doesNotMatch(proof, /supabase\.co|openai|SUPABASE_SERVICE_ROLE_KEY|fetch\(/i)
})
