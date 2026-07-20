import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION,
  AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION,
  ConsumerDiagnosticPersistenceError,
  SupabaseConsumerDiagnosticPersistence,
  createSupabaseConsumerDiagnosticPersistence,
} from './lib/diagnostic-persistence-supabase.ts'
import {
  INITIAL_USE_CASE_INTAKE,
  composeDiagnosticResult,
} from './lib/diagnostic.ts'

const ownerId = '10000000-0000-4000-8000-000000000001'
const idempotencyKey = '20000000-0000-4000-8000-000000000001'
const sessionId = '30000000-0000-4000-8000-000000000001'
const intake = {
  ...structuredClone(INITIAL_USE_CASE_INTAKE),
  outcome: { desiredOutcome: 'Prepare accurate account briefs before customer calls for our sales team.' },
  workflow: { currentProcess: 'A manager searches several approved systems and manually drafts each brief before review.' },
  specification: {
    inputs: 'Approved CRM fields and public account notes',
    output: 'A reviewable one-page account brief',
    success: 'At least 9 of 10 facts link to an approved source.',
  },
  experience: { level: 'guided', evidence: '', artifactUrl: '' },
  risk: {
    dataSensitivity: 'internal', existingSystems: 'CRM export', consequence: 'moderate', humanApproval: 'yes',
  },
  constraints: {
    role: 'Sales manager', codingComfort: 'modify-examples', weeklyHours: 3,
    approach: 'either', teamMode: 'team', budget: 'free-only',
  },
}
const result = composeDiagnosticResult(intake)
assert.ok(result)

test('Supabase diagnostic adapter invokes only the trusted immutable RPC', async () => {
  let call
  const persistence = new SupabaseConsumerDiagnosticPersistence({
    rpc(name, args) {
      call = { name, args }
      return Promise.resolve({
        data: {
          sessionId,
          intakeDigest: 'a'.repeat(64),
          resultDigest: 'b'.repeat(64),
          retentionExpiresAt: '2026-10-16T12:00:00.000Z',
          replayed: false,
        },
        error: null,
      })
    },
  })
  assert.deepEqual(await persistence.persist({
    ownerId,
    idempotencyKey,
    intake,
    result,
    privacyNoticeVersion: AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION,
    storageConsent: true,
  }), {
    sessionId,
    intakeDigest: 'a'.repeat(64),
    resultDigest: 'b'.repeat(64),
    retentionExpiresAt: '2026-10-16T12:00:00.000Z',
    replayed: false,
  })
  assert.deepEqual(call, {
    name: 'persist_ai_path_consumer_diagnostic_trusted',
    args: {
      p_owner_id: ownerId,
      p_idempotency_key: idempotencyKey,
      p_intake: intake,
      p_result: result,
      p_privacy_notice_version: AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION,
      p_storage_consent: true,
    },
  })
})

test('diagnostic persistence fails closed on provider and response errors', async () => {
  for (const client of [
    { rpc: () => Promise.reject(new Error('private provider error')) },
    { rpc: () => Promise.resolve({ data: null, error: { message: 'private provider error' } }) },
    { rpc: () => Promise.resolve({ data: { sessionId, replayed: false }, error: null }) },
    { rpc: () => Promise.resolve({
      data: {
        sessionId, intakeDigest: 'A'.repeat(64), resultDigest: 'b'.repeat(64),
        retentionExpiresAt: 'invalid', replayed: false,
      },
      error: null,
    }) },
  ]) {
    const persistence = new SupabaseConsumerDiagnosticPersistence(client)
    await assert.rejects(
      persistence.persist({
        ownerId, idempotencyKey, intake, result,
        privacyNoticeVersion: AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION,
        storageConsent: true,
      }),
      error => error instanceof ConsumerDiagnosticPersistenceError
        && (error.code === 'rpc_failed' || error.code === 'malformed_response'),
    )
  }
})

test('hosted persistence activation remains impossible while the reviewed latch is closed', () => {
  assert.throws(
    () => createSupabaseConsumerDiagnosticPersistence({ rpc: () => Promise.resolve({ data: null, error: null }) }, {
      enabled: 'true',
      schemaVersion: AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION,
      credentialScope: 'verified-owner+service-role',
      hostedProof: 'passed',
      retentionReady: 'true',
      rollbackReady: 'true',
    }),
    error => error instanceof ConsumerDiagnosticPersistenceError && error.code === 'disabled',
  )
})

test('consumer diagnostic SQL is immutable, owner-scoped, bounded and server-owned', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/20260718010000_ai_path_consumer_diagnostic_sessions.sql', import.meta.url),
    'utf8',
  )
  const table = sql.match(
    /create table public\.ai_path_consumer_diagnostic_sessions \(([\s\S]*?)\n\);/i,
  )?.[1] ?? ''

  assert.match(sql, /enable row level security/i)
  assert.match(sql, /force row level security/i)
  assert.match(sql, /auth\.uid\(\)[\s\S]+owner_id/i)
  assert.match(sql, /revoke all on public\.ai_path_consumer_diagnostic_sessions[\s\S]+from public, anon, authenticated, service_role/i)
  assert.match(sql, /persist_ai_path_consumer_diagnostic_trusted[\s\S]+caller_role <> 'service_role'/i)
  assert.match(sql, /grant execute on function public\.persist_ai_path_consumer_diagnostic_trusted[\s\S]+to service_role/i)
  assert.match(sql, /prevent_ai_path_consumer_diagnostic_update[\s\S]+immutable/i)
  assert.match(sql, /validate_ai_path_consumer_diagnostic_insert[\s\S]+content digest does not match/i)
  assert.match(table, /intake_snapshot jsonb not null/i)
  assert.match(table, /intake_digest text not null/i)
  assert.match(table, /result_snapshot jsonb not null/i)
  assert.match(table, /result_digest text not null/i)
  assert.match(table, /unique \(owner_id, idempotency_key_hash\)/i)
  assert.match(table, /privacy_notice_version text not null/i)
  assert.match(table, /storage_consent boolean not null[\s\S]+check \(storage_consent\)/i)
  assert.match(table, /retention_expires_at <= created_at \+ interval '90 days'/i)
  assert.doesNotMatch(table, /\b(?:audio|transcript|prompt|secret|raw_idempotency_key)\b/i)
  assert.match(sql, /pg_advisory_xact_lock/i)
  assert.match(sql, /idempotency_conflict/i)
  assert.match(sql, /for update skip locked/i)
  assert.match(sql, /p_limit not between 1 and 10000/i)
  assert.match(sql, /2026-07-18\.v1/)
  assert.match(sql, /2026-07-18\.v2/)
  assert.match(sql, /2026-07-18\.consumer\.v1/)
})

test('consumer diagnostic gateway source keeps a literal closed activation latch', async () => {
  const source = await readFile(new URL('./lib/diagnostic-persistence-supabase.ts', import.meta.url), 'utf8')
  assert.match(source, /AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH = false as const/)
  const latchCheck = source.indexOf('if (!AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH')
  const constructor = source.indexOf('return new SupabaseConsumerDiagnosticPersistence(client)', latchCheck)
  assert.ok(latchCheck >= 0 && constructor > latchCheck)
  assert.doesNotMatch(source, /process\.env|createClient|SUPABASE_SERVICE_ROLE_KEY/)
})
