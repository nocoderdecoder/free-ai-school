import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_SUPABASE_MIGRATION_VERSION,
  isSafeSupabasePublicKey,
  parseCookieHeader,
  resolveSupabasePersistenceCapability,
  supabaseAuthCookieOptions,
  verifySupabasePrincipal,
} from './lib/supabase-persistence.ts'
import {
  SupabaseSessionRepositoryError,
  SupabaseTrustedReportWriter,
} from './lib/supabase-session-repository.ts'

const migrationUrl = new URL('../../supabase/migrations/20260717000000_ai_path_assessment_sessions.sql', import.meta.url)
const sql = await readFile(migrationUrl, 'utf8')
const trustedWriterMigrationUrl = new URL('../../supabase/migrations/20260717020000_ai_path_trusted_report_writer.sql', import.meta.url)
const trustedWriterSql = await readFile(trustedWriterMigrationUrl, 'utf8')
const trustedWriterServerUrl = new URL('./lib/supabase-session-repository.server.ts', import.meta.url)
const trustedWriterServerSource = await readFile(trustedWriterServerUrl, 'utf8')

test('production capability remains closed even with every deployment flag present', () => {
  const capability = resolveSupabasePersistenceCapability({
    nodeEnv: 'production',
    enablePersistence: 'true',
    schemaVersion: AI_PATH_SUPABASE_MIGRATION_VERSION,
    authReady: 'true',
    rateLimitReady: 'true',
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test-key',
    serviceRoleKey: 'different-service-role-key',
  })
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.match(capability.reason, /code-level production latch/)
})

test('capability rejects a service-role key in the user-route client slot', () => {
  const capability = resolveSupabasePersistenceCapability({
    nodeEnv: 'production',
    enablePersistence: 'true',
    schemaVersion: AI_PATH_SUPABASE_MIGRATION_VERSION,
    authReady: 'true',
    rateLimitReady: 'true',
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_same-key',
    serviceRoleKey: 'sb_publishable_same-key',
  })
  assert.equal(capability.available, false)
  assert.match(capability.reason, /must not use.*service-role/i)
})

test('public key validation rejects secret and service-role JWT credentials independently', () => {
  const jwt = role => {
    const payload = Buffer.from(JSON.stringify({ role })).toString('base64url')
    return `header.${payload}.signature`
  }
  assert.equal(isSafeSupabasePublicKey('sb_publishable_example'), true)
  assert.equal(isSafeSupabasePublicKey('sb_secret_example'), false)
  assert.equal(isSafeSupabasePublicKey(jwt('anon')), true)
  assert.equal(isSafeSupabasePublicKey(jwt('service_role')), false)

  const capability = resolveSupabasePersistenceCapability({
    nodeEnv: 'production',
    enablePersistence: 'true',
    schemaVersion: AI_PATH_SUPABASE_MIGRATION_VERSION,
    authReady: 'true',
    rateLimitReady: 'true',
    supabaseUrl: 'https://example.supabase.co',
    publishableKey: 'sb_secret_accidentally_public',
  })
  assert.equal(capability.available, false)
  assert.match(capability.reason, /not a publishable or anon key/i)
})

test('verified principal provider calls getUser and rejects unverified identities', async () => {
  let calls = 0
  const valid = await verifySupabasePrincipal({
    auth: {
      async getUser() {
        calls += 1
        return {
          data: { user: { id: '018f47a2-4e8d-7a32-9d10-f4b68a4ee6de' } },
          error: null,
        }
      },
    },
  })
  assert.equal(calls, 1)
  assert.equal(valid?.source, 'supabase')

  const invalid = await verifySupabasePrincipal({
    auth: {
      async getUser() {
        return { data: { user: null }, error: { message: 'invalid token' } }
      },
    },
  })
  assert.equal(invalid, null)
})

test('cookie parser preserves token values containing equals signs', () => {
  assert.deepEqual(parseCookieHeader('alpha=one; sb-token=abc%3Ddef%3D; malformed'), [
    { name: 'alpha', value: 'one' },
    { name: 'sb-token', value: 'abc=def=' },
  ])
})

test('server auth cookies are HttpOnly, same-site, scoped, and secure in production', () => {
  assert.deepEqual(supabaseAuthCookieOptions('production'), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: true,
  })
  assert.equal(supabaseAuthCookieOptions('development').secure, false)
})

test('migration enforces owner identity and authenticated-only RLS for every write/read action', () => {
  assert.match(sql, /owner_id uuid not null references auth\.users\(id\) on delete cascade/i)
  assert.match(sql, /enable row level security/i)
  for (const action of ['select', 'delete']) {
    assert.match(sql, new RegExp(`for ${action}\\s+to authenticated`, 'i'))
  }
  assert.ok((sql.match(/auth\.uid\(\)/gi) ?? []).length >= 4)
  assert.doesNotMatch(sql, /create policy[\s\S]*?to anon/i)
  assert.match(sql, /revoke all on public\.ai_path_assessment_sessions from anon/i)
  assert.doesNotMatch(sql, /grant insert[\s\S]*?on public\.ai_path_assessment_sessions to authenticated/i)
  assert.doesNotMatch(sql, /grant update[\s\S]*?on public\.ai_path_assessment_sessions to authenticated/i)
})

test('create RPC derives ownership and lifecycle state without client-controlled status or report', () => {
  const createRpc = sql.match(/create or replace function public\.create_owned_ai_path_session\(([\s\S]*?)revoke all on function public\.create_owned_ai_path_session/i)
  assert.ok(createRpc)
  assert.match(createRpc[1], /security definer/i)
  assert.match(createRpc[1], /current_owner uuid := auth\.uid\(\)/i)
  assert.match(createRpc[1], /current_owner,[\s\S]*?'consented'/i)
  assert.match(createRpc[1], /if p_consent_version <> '2026-07-16\.v1'[\s\S]*?errcode = '22023'/i)
  assert.doesNotMatch(createRpc[1], /p_id|p_owner|p_status|p_report/i)
  assert.match(sql, /grant execute on function public\.create_owned_ai_path_session[\s\S]*?to authenticated/i)
  assert.match(sql, /consent_version text not null default '2026-07-16\.v1' check \(consent_version = '2026-07-16\.v1'\)/i)
})

test('migration makes one active session atomic and versions persisted reports', () => {
  assert.match(sql, /create unique index ai_path_one_active_session_per_owner/i)
  assert.match(sql, /where status not in \('complete', 'failed', 'expired'\)/i)
  for (const column of ['taxonomy_version', 'scoring_version', 'report_version', 'catalog_version']) {
    assert.match(sql, new RegExp(`${column} text not null default '2026-07-16\\.v1'`, 'i'))
  }
  assert.match(sql, /report ->> 'reportVersion' = report_version/i)
  assert.match(sql, /report ->> 'taxonomyVersion' = taxonomy_version/i)
  const tableDefinition = sql.match(/create table public\.ai_path_assessment_sessions \(([\s\S]*?)\n\);/i)
  assert.ok(tableDefinition)
  assert.doesNotMatch(tableDefinition[1], /transcript_(text|turns|content)|transcript\s+(text|jsonb)/i)
})

test('migration supports retention, owner export, hard deletion, and privileged purge', () => {
  assert.match(sql, /retention_expires_at timestamptz not null/i)
  assert.match(sql, /create index ai_path_sessions_retention_idx/i)
  assert.match(sql, /export_owned_ai_path_session/i)
  assert.match(sql, /delete_owned_ai_path_session/i)
  assert.match(sql, /security invoker/g)
  assert.match(sql, /revoke all on function public\.purge_expired_ai_path_sessions\(\) from public, anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.purge_expired_ai_path_sessions\(\) to service_role/i)
})

test('trusted report RPC is service-role-only and rechecks the verified JWT role', () => {
  assert.match(trustedWriterSql, /security definer/i)
  assert.match(trustedWriterSql, /caller_role text := coalesce\(auth\.jwt\(\) ->> 'role'/i)
  assert.match(trustedWriterSql, /if caller_role <> 'service_role'/i)
  assert.match(
    trustedWriterSql,
    /revoke all on function public\.complete_ai_path_session_trusted\([\s\S]*?\) from public, anon, authenticated/i,
  )
  assert.match(
    trustedWriterSql,
    /grant execute on function public\.complete_ai_path_session_trusted\([\s\S]*?\) to service_role/i,
  )
  assert.doesNotMatch(
    trustedWriterSql,
    /grant execute on function public\.complete_ai_path_session_trusted\([\s\S]*?\) to (anon|authenticated)/i,
  )
})

test('trusted report writer activation remains behind a non-configurable code latch', () => {
  assert.match(trustedWriterServerSource, /AI_PATH_TRUSTED_REPORT_WRITER_LATCH = false as const/)
  assert.match(
    trustedWriterServerSource,
    /!AI_PATH_TRUSTED_REPORT_WRITER_LATCH[\s\S]*?activation\.schemaVersion !== AI_PATH_TRUSTED_REPORT_WRITER_MIGRATION_VERSION/,
  )
  assert.doesNotMatch(trustedWriterServerSource, /createClient\([\s\S]*?service[_-]?role/i)
})

test('trusted report RPC atomically binds owner, lifecycle, goal, and pinned versions', () => {
  assert.match(trustedWriterSql, /where id = p_session_id and owner_id = p_owner_id\s+for update/i)
  assert.match(trustedWriterSql, /target_session\.status <> 'analysis_pending'/i)
  assert.match(trustedWriterSql, /set status = 'complete'/i)
  assert.match(trustedWriterSql, /p_report ->> 'goal' is distinct from target_session\.goal/i)
  for (const version of ['taxonomy', 'scoring', 'report', 'catalog']) {
    assert.match(trustedWriterSql, new RegExp(`p_${version}_version <> '2026-07-16\\.v1'`, 'i'))
    assert.match(trustedWriterSql, new RegExp(`p_report ->> '${version}Version' <> p_${version}_version`, 'i'))
  }
  assert.match(trustedWriterSql, /octet_length\(p_report::text\) > 1048576/i)
})

test('trusted report completion is immutable and only exact retries are idempotent', () => {
  assert.match(trustedWriterSql, /extensions\.digest\(convert_to\(p_report::text, 'UTF8'\), 'sha256'\)/i)
  assert.match(trustedWriterSql, /target_session\.report_write_id = p_report_write_id/i)
  assert.match(trustedWriterSql, /target_session\.report_digest = computed_digest/i)
  assert.match(trustedWriterSql, /target_session\.report = p_report/i)
  assert.match(trustedWriterSql, /'replayed', true/i)
  assert.match(trustedWriterSql, /errcode = '23505'/i)
  assert.match(trustedWriterSql, /if old\.status = 'complete'[\s\S]*?completed AI Path session is immutable/i)
  assert.match(trustedWriterSql, /current_setting\('ai_path\.trusted_report_write', true\)/i)
})

const ownerId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6de'
const sessionId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6df'
const reportWriteId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6e0'
const reportDigest = 'a'.repeat(64)
const goal = 'Ship a safe AI workflow for customer support.'
const report = {
  reportVersion: '2026-07-16.v1',
  taxonomyVersion: '2026-07-16.v1',
  scoringVersion: '2026-07-16.v1',
  catalogVersion: '2026-07-16.v1',
  generatedAt: '2026-07-17T02:00:00.000Z',
  goal,
  results: [],
  strengths: [],
  growthAreas: [],
  recommendationStatus: 'no_eligible_resources',
  recommendations: [],
  disclaimer: 'Assessment guidance only.',
}

function completedRow(overrides = {}) {
  return {
    id: sessionId,
    owner_id: ownerId,
    status: 'complete',
    mode: 'text',
    locale: 'en-US',
    goal,
    goal_type: 'workflows',
    target_role: null,
    consent_version: '2026-07-16.v1',
    save_transcript: false,
    taxonomy_version: '2026-07-16.v1',
    scoring_version: '2026-07-16.v1',
    report_version: '2026-07-16.v1',
    catalog_version: '2026-07-16.v1',
    report,
    report_saved_at: '2026-07-17T02:00:01.000Z',
    report_write_id: reportWriteId,
    report_digest: reportDigest,
    retention_expires_at: '2026-10-15T02:00:00.000Z',
    created_at: '2026-07-17T01:59:00.000Z',
    updated_at: '2026-07-17T02:00:01.000Z',
    ...overrides,
  }
}

test('trusted writer forwards only verified owner binding and pinned server versions', async () => {
  let forwarded
  const writer = new SupabaseTrustedReportWriter({
    async complete(input) {
      forwarded = input
      return {
        data: { session: completedRow(), replayed: false, reportDigest },
        error: null,
      }
    },
  })

  const result = await writer.completeServerRecomputedReport({
    sessionId,
    principal: { userId: ownerId, source: 'supabase' },
    report,
    reportWriteId,
  })

  assert.equal(forwarded.ownerId, ownerId)
  assert.equal(forwarded.sessionId, sessionId)
  assert.equal(forwarded.reportWriteId, reportWriteId)
  assert.equal(forwarded.taxonomyVersion, '2026-07-16.v1')
  assert.equal(forwarded.scoringVersion, '2026-07-16.v1')
  assert.equal(forwarded.reportVersion, '2026-07-16.v1')
  assert.equal(forwarded.catalogVersion, '2026-07-16.v1')
  assert.equal(result.session.ownerId, ownerId)
  assert.equal(result.replayed, false)
})

test('trusted writer fails closed for unverified principals and forged response bindings', async () => {
  let calls = 0
  const writer = new SupabaseTrustedReportWriter({
    async complete() {
      calls += 1
      return {
        data: {
          session: completedRow({ owner_id: '118f47a2-4e8d-7a32-9d10-f4b68a4ee6de' }),
          replayed: false,
          reportDigest,
        },
        error: null,
      }
    },
  })

  await assert.rejects(
    writer.completeServerRecomputedReport({
      sessionId,
      principal: { userId: 'local-test-user', source: 'test-header' },
      report,
      reportWriteId,
    }),
    SupabaseSessionRepositoryError,
  )
  assert.equal(calls, 0)

  await assert.rejects(
    writer.completeServerRecomputedReport({
      sessionId,
      principal: { userId: ownerId, source: 'supabase' },
      report,
      reportWriteId,
    }),
    /invalid binding/i,
  )
  assert.equal(calls, 1)
})
