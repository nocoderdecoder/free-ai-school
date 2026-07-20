import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH,
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_DEADLINE_MS,
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME,
  SupabaseRealtimeAdmissionMaintenanceError,
  maintainSupabaseRealtimeAdmission,
} from './lib/realtime-admission-maintenance-supabase.ts'

const policyId = '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000'
const limits = { expireLimit: 20, purgeLimit: 10, intentCleanupLimit: 5, mappingGcLimit: 4 }

function validPayload(overrides = {}) {
  return {
    policyId,
    retentionCutoff: '2026-04-18T12:00:00.000Z',
    transitionedExpiredCount: 3,
    purgedTotal: 6,
    purgedByStatus: { expired: 1, finalized: 2, cancelled: 3 },
    cleanedIntentCount: 4,
    cleanedSessionMappingCount: 2,
    cleanedOwnerMappingCount: 1,
    hasMoreToExpire: false,
    hasMoreToPurge: true,
    hasMoreIntents: false,
    hasMoreMappings: true,
    hasMore: true,
    ...overrides,
  }
}

function mockClient(handler) {
  const calls = []
  return {
    calls,
    client: {
      async rpc(name, args, signal) {
        calls.push({ name, args, signal })
        return handler(name, args, signal)
      },
    },
  }
}

test('maintenance sends exact policy-scoped bounded RPC args and returns a frozen summary', async () => {
  const mock = mockClient(() => ({ data: validPayload(), error: null, count: null, status: 200, statusText: 'OK' }))
  const result = await maintainSupabaseRealtimeAdmission(mock.client, policyId, limits)

  assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME, 'maintain_ai_path_realtime_admission')
  assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH, 1_000)
  assert.deepEqual(mock.calls.map(({ name, args }) => ({ name, args })), [{
    name: 'maintain_ai_path_realtime_admission',
    args: {
      p_policy_id: policyId,
      p_expire_limit: 20,
      p_purge_limit: 10,
      p_intent_cleanup_limit: 5,
      p_mapping_gc_limit: 4,
    },
  }])
  assert.deepEqual(result, validPayload())
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.purgedByStatus), true)
  assert.doesNotMatch(JSON.stringify(result), /ownerId|sessionId|reservationId|idempotencyKey|userKey|sessionKey/i)
})

test('policy and all four limits fail before transport when invalid', async () => {
  for (const invalidPolicy of ['', 'x'.repeat(257), null]) {
    const mock = mockClient(() => { throw new Error('must not be called') })
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, invalidPolicy, limits),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'invalid_policy',
    )
    assert.deepEqual(mock.calls, [])
  }

  for (const [key, value] of [
    ['expireLimit', 0], ['purgeLimit', 1.5], ['intentCleanupLimit', 1_001],
    ['mappingGcLimit', Number.MAX_SAFE_INTEGER + 1],
  ]) {
    const mock = mockClient(() => { throw new Error('must not be called') })
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, policyId, { ...limits, [key]: value }),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'invalid_limits',
    )
    assert.deepEqual(mock.calls, [])
  }
})

test('response validates exact policy, timestamp, every bounded count, sum, and key', async () => {
  const malformedPayloads = [
    validPayload({ policyId: `${policyId}-other` }),
    validPayload({ retentionCutoff: '2026-04-18 12:00:00Z' }),
    validPayload({ transitionedExpiredCount: 21 }),
    validPayload({ purgedTotal: 11 }),
    validPayload({ purgedTotal: 5 }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2, cancelled: 3, reserved: 0 } }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2 } }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2, cancelled: 2 } }),
    validPayload({ cleanedIntentCount: 6 }),
    validPayload({ cleanedSessionMappingCount: 5 }),
    validPayload({ cleanedOwnerMappingCount: 5 }),
    validPayload({ cleanedSessionMappingCount: 3, cleanedOwnerMappingCount: 2 }),
    validPayload({ cleanedIntentCount: -1 }),
    { ...validPayload(), reservationIds: ['private'] },
  ]
  for (const data of malformedPayloads) {
    const mock = mockClient(() => ({ data, error: null }))
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, policyId, limits),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'malformed_response',
    )
  }
})

test('hasMore is exactly the OR of all four continuation booleans', async () => {
  const keys = ['hasMoreToExpire', 'hasMoreToPurge', 'hasMoreIntents', 'hasMoreMappings']
  for (let mask = 0; mask < 16; mask += 1) {
    const flags = Object.fromEntries(keys.map((key, index) => [key, Boolean(mask & (1 << index))]))
    const expected = Object.values(flags).some(Boolean)
    const valid = mockClient(() => ({ data: validPayload({ ...flags, hasMore: expected }), error: null }))
    assert.equal((await maintainSupabaseRealtimeAdmission(valid.client, policyId, limits)).hasMore, expected)

    const invalid = mockClient(() => ({ data: validPayload({ ...flags, hasMore: !expected }), error: null }))
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(invalid.client, policyId, limits),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'malformed_response',
    )
  }
})

test('provider errors, thrown details, and unknown wrappers fail closed without leakage', async () => {
  const privateDetail = 'private reservation id and database credential'
  for (const handler of [
    () => ({ data: null, error: { code: 'XX000', message: privateDetail } }),
    () => { throw new Error(privateDetail) },
    () => ({ data: validPayload(), error: null, privateDetail }),
    () => ({ data: validPayload(), error: null, status: 500 }),
  ]) {
    const mock = mockClient(handler)
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, policyId, limits),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError
        && error.code === 'rpc_failed' && !String(error).includes(privateDetail),
    )
  }
})

test('fixed maintenance deadline aborts a stalled RPC with a content-free error', { concurrency: false }, async () => {
  const originalTimeout = AbortSignal.timeout
  let receivedSignal
  AbortSignal.timeout = milliseconds => {
    assert.equal(milliseconds, 15_000)
    const controller = new AbortController()
    queueMicrotask(() => controller.abort())
    return controller.signal
  }
  try {
    await assert.rejects(
      maintainSupabaseRealtimeAdmission({
        rpc(_name, _args, signal) { receivedSignal = signal; return new Promise(() => {}) },
      }, policyId, limits),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError
        && error.code === 'rpc_timeout'
        && error.message === 'The durable Realtime admission maintenance operation failed closed.',
    )
    assert.equal(receivedSignal.aborted, true)
    assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_DEADLINE_MS, 15_000)
  } finally {
    AbortSignal.timeout = originalTimeout
  }
})

test('factory closes over the pinned policy and final schema while staying latched and unwired', async () => {
  const serverSource = await readFile(new URL('./lib/realtime-admission-maintenance-supabase.server.ts', import.meta.url), 'utf8')
  const domainSource = await readFile(new URL('./lib/realtime-admission-maintenance-supabase.ts', import.meta.url), 'utf8')
  const realtimeRoute = await readFile(new URL('../api/ai-path/realtime/session/route.ts', import.meta.url), 'utf8')
  const retentionRoute = await readFile(new URL('../api/cron/ai-path-retention/route.ts', import.meta.url), 'utf8')

  assert.match(serverSource, /import 'server-only'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_SCHEMA_VERSION =\s*'20260717080000'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /activation\.credentialScope !== 'service-role'/)
  assert.match(serverSource, /activation\.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY\.policyId/)
  assert.match(serverSource, /maintainSupabaseRealtimeAdmission\(client, AI_PATH_REALTIME_ADMISSION_POLICY\.policyId, input\)/)
  assert.match(serverSource, /\.abortSignal\(signal\)/)
  assert.doesNotMatch(serverSource, /process\.env|fetch\s*\(|console\./)
  assert.match(domainSource, /AbortSignal\.timeout\(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_DEADLINE_MS\)/)
  assert.doesNotMatch(domainSource, /deadlineMs\??:|process\.env|fetch\s*\(|console\.|userKey|sessionKey|reservationId|idempotency/i)
  assert.doesNotMatch(realtimeRoute, /realtime-admission-maintenance-supabase\.server/)
  assert.doesNotMatch(retentionRoute, /realtime-admission-maintenance-supabase\.server/)
})
