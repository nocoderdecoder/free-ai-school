import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH,
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_POLICY_VERSION,
  AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME,
  SupabaseRealtimeAdmissionMaintenanceError,
  maintainSupabaseRealtimeAdmission,
} from './lib/realtime-admission-maintenance-supabase.ts'

function validPayload(overrides = {}) {
  return {
    policyVersion: '2026-07-17.v1',
    retentionCutoff: '2026-04-18T12:00:00.000Z',
    transitionedExpiredCount: 3,
    purgedTotal: 6,
    purgedByStatus: { expired: 1, finalized: 2, cancelled: 3 },
    hasMoreToExpire: false,
    hasMoreToPurge: true,
    hasMore: true,
    ...overrides,
  }
}

function mockClient(handler) {
  const calls = []
  return {
    calls,
    client: {
      async rpc(name, args) {
        calls.push({ name, args })
        return handler(name, args)
      },
    },
  }
}

test('maintenance calls the one reviewed RPC and returns a frozen content-free summary', async () => {
  const mock = mockClient(() => ({
    data: validPayload(),
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  }))
  const result = await maintainSupabaseRealtimeAdmission(mock.client, {
    expireLimit: 20,
    purgeLimit: 10,
  })

  assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_RPC_NAME, 'maintain_ai_path_realtime_admission')
  assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_POLICY_VERSION, '2026-07-17.v1')
  assert.equal(AI_PATH_REALTIME_ADMISSION_MAINTENANCE_MAXIMUM_BATCH, 1_000)
  assert.deepEqual(mock.calls, [{
    name: 'maintain_ai_path_realtime_admission',
    args: { p_expire_limit: 20, p_purge_limit: 10 },
  }])
  assert.deepEqual(result, validPayload())
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.purgedByStatus), true)
  assert.doesNotMatch(JSON.stringify(result), /(?:user|session|reservation|idempotency)(?:Id|Key)?/i)
})

test('limits must be integers from one through one thousand before transport access', async () => {
  for (const [expireLimit, purgeLimit] of [
    [0, 1],
    [1, 0],
    [1.5, 1],
    [1, 1.5],
    [1_001, 1],
    [1, 1_001],
    [Number.MAX_SAFE_INTEGER + 1, 1],
  ]) {
    const mock = mockClient(() => {
      throw new Error('must not be called')
    })
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, { expireLimit, purgeLimit }),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'invalid_limits',
    )
    assert.deepEqual(mock.calls, [])
  }
})

test('response requires exact policy, timestamp, counts, keys, and count sum', async () => {
  const malformedPayloads = [
    validPayload({ policyVersion: '2026-07-17.v2' }),
    validPayload({ retentionCutoff: '2026-04-18 12:00:00Z' }),
    validPayload({ transitionedExpiredCount: 21 }),
    validPayload({ purgedTotal: 11 }),
    validPayload({ transitionedExpiredCount: -1 }),
    validPayload({ purgedTotal: 5 }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2, cancelled: 3, reserved: 0 } }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2 } }),
    validPayload({ purgedByStatus: { expired: 1, finalized: 2, cancelled: 2 } }),
    validPayload({ hasMore: 'true' }),
    validPayload({ hasMoreToExpire: 'false' }),
    validPayload({ hasMoreToPurge: 'true' }),
    validPayload({ hasMoreToExpire: false, hasMoreToPurge: false, hasMore: true }),
    validPayload({ hasMoreToExpire: true, hasMoreToPurge: false, hasMore: false }),
    { ...validPayload(), reservationIds: ['private'] },
  ]

  for (const data of malformedPayloads) {
    const mock = mockClient(() => ({ data, error: null }))
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, { expireLimit: 20, purgeLimit: 10 }),
      error => error instanceof SupabaseRealtimeAdmissionMaintenanceError && error.code === 'malformed_response',
    )
  }
})

test('provider errors, thrown details, and unknown wrapper fields fail closed without leakage', async () => {
  const privateDetail = 'private reservation id and database credential'
  for (const handler of [
    () => ({ data: null, error: { code: 'XX000', message: privateDetail } }),
    () => { throw new Error(privateDetail) },
    () => ({ data: validPayload(), error: null, privateDetail }),
    () => ({ data: validPayload(), error: null, status: 500 }),
  ]) {
    const mock = mockClient(handler)
    await assert.rejects(
      maintainSupabaseRealtimeAdmission(mock.client, { expireLimit: 20, purgeLimit: 10 }),
      error => (
        error instanceof SupabaseRealtimeAdmissionMaintenanceError
        && error.code === 'rpc_failed'
        && !String(error).includes(privateDetail)
      ),
    )
  }
})

test('maintenance factory is independently latched, server-only, and unwired', async () => {
  const serverSource = await readFile(
    new URL('./lib/realtime-admission-maintenance-supabase.server.ts', import.meta.url),
    'utf8',
  )
  const domainSource = await readFile(
    new URL('./lib/realtime-admission-maintenance-supabase.ts', import.meta.url),
    'utf8',
  )
  const realtimeRoute = await readFile(
    new URL('../api/ai-path/realtime/session/route.ts', import.meta.url),
    'utf8',
  )
  const retentionRoute = await readFile(
    new URL('../api/cron/ai-path-retention/route.ts', import.meta.url),
    'utf8',
  )

  assert.match(serverSource, /import 'server-only'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /activation\.credentialScope !== 'service-role'/)
  assert.match(serverSource, /activation\.lifecycleSqlProof !== 'passed'/)
  assert.match(serverSource, /activation\.retentionOperationsReady !== 'true'/)
  assert.doesNotMatch(serverSource, /process\.env|fetch\s*\(|console\./)
  assert.doesNotMatch(domainSource, /process\.env|fetch\s*\(|console\.|userKey|sessionKey|reservationId|idempotency/i)
  assert.doesNotMatch(realtimeRoute, /realtime-admission-maintenance-supabase\.server/)
  assert.doesNotMatch(retentionRoute, /realtime-admission-maintenance-supabase\.server/)
})
