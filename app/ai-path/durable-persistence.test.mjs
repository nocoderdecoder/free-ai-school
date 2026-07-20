import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_SUPABASE_MIGRATION_VERSION,
  isSafeSupabasePublicKey,
  isSafeSupabaseProjectUrl,
  parseCookieHeader,
  resolveSupabasePersistenceCapability,
  supabaseAuthCookieOptions,
  verifySupabasePrincipal,
} from './lib/supabase-persistence.ts'
import {
  SupabaseSessionRepositoryError,
  SupabaseTrustedAnalysisTransition,
  SupabaseTrustedReportWriter,
} from './lib/supabase-session-repository.ts'
import { TrustedAnalysisCoordinator } from './lib/trusted-analysis.ts'

const migrationUrl = new URL('../../supabase/migrations/20260717000000_ai_path_assessment_sessions.sql', import.meta.url)
const sql = await readFile(migrationUrl, 'utf8')
const trustedWriterMigrationUrl = new URL('../../supabase/migrations/20260717020000_ai_path_trusted_report_writer.sql', import.meta.url)
const trustedWriterSql = await readFile(trustedWriterMigrationUrl, 'utf8')
const trustedAnalysisMigrationUrl = new URL('../../supabase/migrations/20260717090000_ai_path_analysis_transition.sql', import.meta.url)
const trustedAnalysisSql = await readFile(trustedAnalysisMigrationUrl, 'utf8')
const trustedWriterServerUrl = new URL('./lib/supabase-session-repository.server.ts', import.meta.url)
const trustedWriterServerSource = await readFile(trustedWriterServerUrl, 'utf8')
const trustedAnalysisRuntimeUrl = new URL('./lib/durable-trusted-analysis-runtime.server.ts', import.meta.url)
const trustedAnalysisRuntimeSource = await readFile(trustedAnalysisRuntimeUrl, 'utf8')
const publicAnalysisSources = await Promise.all([
  './lib/analysis-http.ts',
  './lib/durable-session-runtime.server.ts',
  './lib/session-persistence.server.ts',
].map(async path => readFile(new URL(path, import.meta.url), 'utf8')))

test('production capability remains closed even with every deployment flag present', () => {
  const capability = resolveSupabasePersistenceCapability({
    nodeEnv: 'production',
    enablePersistence: 'true',
    schemaVersion: AI_PATH_SUPABASE_MIGRATION_VERSION,
    authReady: 'true',
    rateLimitReady: 'true',
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
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
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
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
    supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
    publishableKey: 'sb_secret_accidentally_public',
  })
  assert.equal(capability.available, false)
  assert.match(capability.reason, /not a publishable or anon key/i)
})

test('privileged Supabase clients accept only canonical HTTPS project origins', () => {
  assert.equal(isSafeSupabaseProjectUrl('https://abcdefghijklmnopqrst.supabase.co'), true)
  for (const value of [
    'http://abcdefghijklmnopqrst.supabase.co',
    'https://user:secret@abcdefghijklmnopqrst.supabase.co',
    'https://abcdefghijklmnopqrst.supabase.co.evil.example',
    'https://abcdefghijklmnopqrst.supabase.co/path',
    'https://abcdefghijklmnopqrst.supabase.co?redirect=evil',
    'https://custom.example',
  ]) assert.equal(isSafeSupabaseProjectUrl(value), false, value)
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
  assert.deepEqual(supabaseAuthCookieOptions('production', { remember: true }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
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

test('trusted analysis transition is owner-bound, service-only, and independently latched', () => {
  assert.match(trustedAnalysisSql, /function public\.begin_ai_path_analysis_trusted\(\s*p_session_id uuid,\s*p_owner_id uuid,\s*p_proposed_attempt_id uuid\s*\)/i)
  assert.match(trustedAnalysisSql, /caller_role <> 'service_role'/i)
  assert.match(trustedAnalysisSql, /where id = p_session_id and owner_id = p_owner_id\s+for update/i)
  assert.match(trustedAnalysisSql, /revoke all on function public\.begin_ai_path_analysis_trusted\(uuid, uuid, uuid\)[\s\S]*from public, anon, authenticated/i)
  assert.match(trustedAnalysisSql, /grant execute on function public\.begin_ai_path_analysis_trusted\(uuid, uuid, uuid\)[\s\S]*to service_role/i)
  assert.match(trustedWriterServerSource, /AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH = false as const/)
  assert.match(trustedWriterServerSource, /activation\.credentialScope !== 'verified-owner\+service-role'/)
  assert.match(trustedWriterServerSource, /AI_PATH_TRUSTED_REPORT_WRITER_MIGRATION_VERSION = '20260717090000'/)
})

test('trusted analysis transition preserves mode lifecycle, expiry, and empty-report invariants', () => {
  assert.match(trustedAnalysisSql, /target_session\.mode = 'text' and target_session\.status = 'consented'/i)
  assert.match(trustedAnalysisSql, /target_session\.mode = 'voice' and target_session\.status = 'ending'/i)
  assert.match(trustedAnalysisSql, /target_session\.retention_expires_at <= now\(\)/i)
  for (const field of ['report', 'report_write_id', 'report_digest', 'report_saved_at']) {
    assert.match(trustedAnalysisSql, new RegExp(`target_session\\.${field} is not null`, 'i'))
  }
  assert.match(trustedAnalysisSql, /set status = 'analysis_pending'/i)
  assert.match(trustedAnalysisSql, /target_session\.status = 'analysis_pending'[\s\S]*'replayed', true/i)
  assert.match(trustedAnalysisSql, /current_setting\('ai_path\.trusted_analysis_transition', true\)/i)
  assert.match(trustedAnalysisSql, /analysis_attempt_id = p_proposed_attempt_id/i)
  assert.match(trustedAnalysisSql, /analysis_started_at = clock_timestamp\(\)/i)
  assert.match(
    trustedAnalysisSql,
    /disable trigger ai_path_sessions_protect_report[\s\S]*update public\.ai_path_assessment_sessions[\s\S]*enable trigger ai_path_sessions_protect_report/i,
  )
  assert.match(trustedAnalysisSql, /new\.report_write_id is distinct from old\.analysis_attempt_id/i)
  assert.match(trustedAnalysisSql, /new\.report ->> 'generatedAt'[\s\S]*is distinct from old\.analysis_started_at/i)
})

test('durable trusted analysis assembly is independently closed and absent from public runtimes', () => {
  assert.match(
    trustedAnalysisRuntimeSource,
    /AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH = false as const/,
  )
  const latchIndex = trustedAnalysisRuntimeSource.indexOf('!AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH')
  const capabilityIndex = trustedAnalysisRuntimeSource.indexOf('getSupabasePersistenceCapability()')
  const authIndex = trustedAnalysisRuntimeSource.indexOf('createVerifiedSupabaseContext(request)')
  const credentialIndex = trustedAnalysisRuntimeSource.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY')
  const clientIndex = trustedAnalysisRuntimeSource.indexOf('createClient<Database>')
  assert.ok(latchIndex >= 0)
  assert.ok(capabilityIndex > latchIndex)
  assert.ok(authIndex > capabilityIndex)
  assert.ok(credentialIndex > authIndex)
  assert.ok(clientIndex > credentialIndex)
  assert.match(trustedAnalysisRuntimeSource, /credentialScope: 'verified-owner\+service-role'/)
  assert.doesNotMatch(trustedAnalysisRuntimeSource, /\bfetch\s*\(|openai/i)
  for (const source of publicAnalysisSources) {
    assert.doesNotMatch(source, /durable-trusted-analysis-runtime/)
  }
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
  catalogVersion: '2026-07-17.v2',
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
    catalog_version: '2026-07-17.v2',
    report,
    analysis_attempt_id: reportWriteId,
    analysis_started_at: report.generatedAt,
    report_saved_at: '2026-07-17T02:00:01.000Z',
    report_write_id: reportWriteId,
    report_digest: reportDigest,
    retention_expires_at: '2026-10-15T02:00:00.000Z',
    created_at: '2026-07-17T01:59:00.000Z',
    updated_at: '2026-07-17T02:00:01.000Z',
    ...overrides,
  }
}

function analysisPendingRow(overrides = {}) {
  return completedRow({
    status: 'analysis_pending',
    report: null,
    report_saved_at: null,
    report_write_id: null,
    report_digest: null,
    ...overrides,
  })
}

test('trusted analysis adapter forwards only the verified owner and validates its response', async () => {
  let forwarded
  const transition = new SupabaseTrustedAnalysisTransition({
    async begin(input) {
      forwarded = input
      return {
        data: {
          session: analysisPendingRow(),
          replayed: false,
          analysisAttemptId: reportWriteId,
          analysisStartedAt: report.generatedAt,
          completed: false,
        },
        error: null,
      }
    },
  })

  const result = await transition.beginForVerifiedOwner(
    { userId: ownerId, source: 'supabase' },
    sessionId,
    reportWriteId,
  )
  assert.deepEqual(forwarded, { sessionId, ownerId, proposedAttemptId: reportWriteId })
  assert.equal(result.session.status, 'analysis_pending')
  assert.equal(result.replayed, false)
  assert.equal(result.analysisAttemptId, reportWriteId)
  assert.equal(result.analysisStartedAt, report.generatedAt)
})

test('trusted analysis adapter rejects unverified principals and forged pending rows', async () => {
  let calls = 0
  const transition = new SupabaseTrustedAnalysisTransition({
    async begin() {
      calls += 1
      return {
        data: {
          session: analysisPendingRow({ report_write_id: reportWriteId }),
          replayed: false,
          analysisAttemptId: reportWriteId,
          analysisStartedAt: report.generatedAt,
          completed: false,
        },
        error: null,
      }
    },
  })
  await assert.rejects(
    transition.beginForVerifiedOwner(
      { userId: 'local-test-user', source: 'test-header' },
      sessionId,
      reportWriteId,
    ),
    SupabaseSessionRepositoryError,
  )
  assert.equal(calls, 0)
  await assert.rejects(
    transition.beginForVerifiedOwner(
      { userId: ownerId, source: 'supabase' },
      sessionId,
      reportWriteId,
    ),
    /invalid binding/i,
  )
  assert.equal(calls, 1)
})

function pendingSessionRecord(overrides = {}) {
  return {
    id: sessionId,
    ownerId,
    status: 'analysis_pending',
    mode: 'text',
    locale: 'en-US',
    goal,
    goalType: 'workflows',
    consentVersion: '2026-07-16.v1',
    saveTranscript: false,
    createdAt: '2026-07-17T01:59:00.000Z',
    updatedAt: report.generatedAt,
    report: null,
    ...overrides,
  }
}

test('trusted coordinator completes with the database-bound attempt id and generation time', async () => {
  let transitionArgs
  let recomputeContext
  let writerInput
  const coordinator = new TrustedAnalysisCoordinator(
    {
      async beginForVerifiedOwner(...args) {
        transitionArgs = args
        return {
          session: pendingSessionRecord(),
          replayed: false,
          analysisAttemptId: reportWriteId,
          analysisStartedAt: report.generatedAt,
          completed: false,
        }
      },
    },
    {
      async completeServerRecomputedReport(input) {
        writerInput = input
        return {
          session: pendingSessionRecord({ status: 'complete', report }),
          replayed: false,
          reportDigest,
        }
      },
    },
    () => reportWriteId,
  )

  const result = await coordinator.complete({
    principal: { userId: ownerId, source: 'supabase' },
    sessionId,
    recomputeReport(context) {
      recomputeContext = context
      return report
    },
  })

  assert.equal(result.ok, true)
  assert.deepEqual(transitionArgs, [
    { userId: ownerId, source: 'supabase' },
    sessionId,
    reportWriteId,
  ])
  assert.equal(recomputeContext.generatedAt.toISOString(), report.generatedAt)
  assert.equal(writerInput.reportWriteId, reportWriteId)
  assert.equal(writerInput.report.generatedAt, report.generatedAt)
})

test('trusted coordinator stops content work after an ambiguous transition', async () => {
  let recomputes = 0
  let writes = 0
  const coordinator = new TrustedAnalysisCoordinator(
    { async beginForVerifiedOwner() { throw new Error('timeout') } },
    { async completeServerRecomputedReport() { writes += 1 } },
    () => reportWriteId,
  )
  const result = await coordinator.complete({
    principal: { userId: ownerId, source: 'supabase' },
    sessionId,
    recomputeReport() {
      recomputes += 1
      return report
    },
  })
  assert.deepEqual(result, {
    ok: false,
    reason: 'reconciliation_required',
    retryable: true,
  })
  assert.equal(recomputes, 0)
  assert.equal(writes, 0)
})

test('trusted coordinator recovers the original binding after an unknown completion commit', async () => {
  const nextAttemptId = '118f47a2-4e8d-7a32-9d10-f4b68a4ee6e1'
  const proposed = []
  const writeIds = []
  const generatedAtValues = []
  let transitions = 0
  let writes = 0
  const coordinator = new TrustedAnalysisCoordinator(
    {
      async beginForVerifiedOwner(_principal, _sessionId, proposedAttemptId) {
        proposed.push(proposedAttemptId)
        transitions += 1
        return {
          session: pendingSessionRecord({ status: transitions === 1 ? 'analysis_pending' : 'complete', report: transitions === 1 ? null : report }),
          replayed: transitions > 1,
          analysisAttemptId: reportWriteId,
          analysisStartedAt: report.generatedAt,
          completed: transitions > 1,
        }
      },
    },
    {
      async completeServerRecomputedReport(input) {
        writes += 1
        writeIds.push(input.reportWriteId)
        if (writes === 1) throw new Error('response lost after commit')
        return {
          session: pendingSessionRecord({ status: 'complete', report }),
          replayed: true,
          reportDigest,
        }
      },
    },
    () => proposed.length === 0 ? reportWriteId : nextAttemptId,
  )
  const input = {
    principal: { userId: ownerId, source: 'supabase' },
    sessionId,
    recomputeReport({ generatedAt }) {
      generatedAtValues.push(generatedAt.toISOString())
      return report
    },
  }

  const first = await coordinator.complete(input)
  const second = await coordinator.complete(input)

  assert.equal(first.ok, false)
  assert.equal(first.reason, 'reconciliation_required')
  assert.equal(second.ok, true)
  assert.equal(second.replayed, true)
  assert.deepEqual(proposed, [reportWriteId, nextAttemptId])
  assert.deepEqual(writeIds, [reportWriteId, reportWriteId])
  assert.deepEqual(generatedAtValues, [report.generatedAt, report.generatedAt])
})

test('trusted coordinator rejects a non-deterministic generatedAt before writing', async () => {
  let writes = 0
  const coordinator = new TrustedAnalysisCoordinator(
    {
      async beginForVerifiedOwner() {
        return {
          session: pendingSessionRecord(),
          replayed: false,
          analysisAttemptId: reportWriteId,
          analysisStartedAt: report.generatedAt,
          completed: false,
        }
      },
    },
    { async completeServerRecomputedReport() { writes += 1 } },
    () => reportWriteId,
  )
  const result = await coordinator.complete({
    principal: { userId: ownerId, source: 'supabase' },
    sessionId,
    recomputeReport() {
      return { ...report, generatedAt: '2026-07-17T02:00:00.001Z' }
    },
  })
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'recompute_failed')
  assert.equal(writes, 0)
})

test('trusted coordinator rejects an unverified principal before generating an attempt', async () => {
  let attempts = 0
  let transitions = 0
  const coordinator = new TrustedAnalysisCoordinator(
    { async beginForVerifiedOwner() { transitions += 1 } },
    { async completeServerRecomputedReport() {} },
    () => {
      attempts += 1
      return reportWriteId
    },
  )
  const result = await coordinator.complete({
    principal: { userId: 'local-test-user', source: 'test-header' },
    sessionId,
    recomputeReport() { return report },
  })
  assert.deepEqual(result, { ok: false, reason: 'invalid_request', retryable: false })
  assert.equal(attempts, 0)
  assert.equal(transitions, 0)
})

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
  assert.equal(forwarded.catalogVersion, '2026-07-17.v2')
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
