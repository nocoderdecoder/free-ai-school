import assert from 'node:assert/strict'
import test from 'node:test'

import { InMemoryRealtimeAdmissionRepository } from './lib/realtime-admission.memory.ts'
import {
  AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH,
  RealtimeAdmissionService,
  createVerifiedRealtimeAdmissionBinding,
  resolveRealtimeAdmissionCapability,
} from './lib/realtime-admission.ts'

const secret = 'test-only-realtime-admission-secret-value'
const users = {
  alice: '11111111-1111-4111-8111-111111111111',
  bob: '22222222-2222-4222-8222-222222222222',
  cara: '33333333-3333-4333-8333-333333333333',
}
const sessions = {
  a1: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  a2: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  b1: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  c1: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
}

function binding(userId, sessionId, status = 'consented') {
  return createVerifiedRealtimeAdmissionBinding({
    principal: { userId, source: 'supabase' },
    ownedSession: { id: sessionId, ownerId: userId, status },
    secret,
  })
}

const policy = {
  maxGlobalConcurrent: 2,
  maxUserConcurrent: 1,
  maxUserDailyCents: 100,
  maxGlobalDailyCents: 150,
  maxReservationCents: 100,
  reservationTtlMs: 60_000,
}

function harness(overrides = {}) {
  let current = new Date('2026-07-16T12:00:00.000Z')
  let id = 0
  const repository = new InMemoryRealtimeAdmissionRepository({
    idFactory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
  })
  const service = new RealtimeAdmissionService(repository, { ...policy, ...overrides }, {
    now: () => new Date(current),
  })
  return {
    repository,
    service,
    setTime(value) { current = new Date(value) },
  }
}

test('production admission cannot be enabled by environment attestations', () => {
  assert.equal(AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH, false)
  const production = resolveRealtimeAdmissionCapability({
    nodeEnv: 'production',
    enableProduction: 'true',
    durableStoreReady: 'true',
    atomicLimitsReady: 'true',
    spendApprovalReady: 'true',
  })
  assert.equal(production.available, false)
  assert.equal(production.productionReady, false)
  assert.match(production.reason, /code-level admission latch/)
  assert.deepEqual(resolveRealtimeAdmissionCapability({ nodeEnv: 'test', enableLocalTest: 'true' }), {
    mode: 'local-test',
    available: true,
    productionReady: false,
    reason: 'deterministic process-local admission is enabled for tests only',
  })
  assert.equal(resolveRealtimeAdmissionCapability({ enableLocalTest: 'true' }).available, false)
  assert.equal(resolveRealtimeAdmissionCapability({ nodeEnv: 'staging', enableLocalTest: 'true' }).available, false)
})

test('bindings require Supabase identity, exact ownership, reservable state, and remain opaque', () => {
  const first = binding(users.alice, sessions.a1)
  const again = binding(users.alice, sessions.a1, 'connecting')
  assert.deepEqual(first, again)
  assert.match(first.userKey, /^[0-9a-f]{64}$/)
  assert.match(first.sessionKey, /^[0-9a-f]{64}$/)
  assert.equal(JSON.stringify(first).includes(users.alice), false)
  assert.equal(JSON.stringify(first).includes(sessions.a1), false)
  assert.notEqual(first.sessionKey, binding(users.alice, sessions.a2).sessionKey)
  assert.throws(() => createVerifiedRealtimeAdmissionBinding({
    principal: { userId: users.alice, source: 'test-header' },
    ownedSession: { id: sessions.a1, ownerId: users.alice, status: 'consented' },
    secret,
  }), /production principal/)
  assert.throws(() => createVerifiedRealtimeAdmissionBinding({
    principal: { userId: users.alice, source: 'supabase' },
    ownedSession: { id: sessions.a1, ownerId: users.bob, status: 'consented' },
    secret,
  }), /ownership/)
  assert.throws(() => binding(users.alice, sessions.a1, 'complete'), /not reservable/)
})

test('reserve is idempotent and rejects key reuse with a changed request', async () => {
  const { service, setTime } = harness()
  const request = {
    binding: binding(users.alice, sessions.a1),
    idempotencyKey: 'reserve-alice-0001',
    estimatedCents: 40,
  }
  const first = await service.reserve(request)
  setTime('2026-07-16T12:00:10.000Z')
  const retry = await service.reserve(request)
  assert.equal(first.status, 'admitted')
  assert.equal(retry.status, 'admitted')
  if (first.status !== 'admitted' || retry.status !== 'admitted') return
  assert.equal(retry.idempotent, true)
  assert.equal(retry.reservation.id, first.reservation.id)

  const conflict = await service.reserve({ ...request, estimatedCents: 41 })
  assert.deepEqual(conflict, { status: 'denied', reason: 'idempotency_conflict' })
})

test('one session cannot be reserved twice under different idempotency keys', async () => {
  const { service } = harness({ maxUserConcurrent: 2 })
  const sessionBinding = binding(users.alice, sessions.a1)
  assert.equal((await service.reserve({
    binding: sessionBinding,
    idempotencyKey: 'reserve-session-01',
    estimatedCents: 20,
  })).status, 'admitted')
  assert.deepEqual(await service.reserve({
    binding: sessionBinding,
    idempotencyKey: 'reserve-session-02',
    estimatedCents: 20,
  }), { status: 'denied', reason: 'session_already_reserved' })
})

test('per-user and global concurrency are enforced without IP identity', async () => {
  const { service } = harness()
  assert.equal((await service.reserve({
    binding: binding(users.alice, sessions.a1),
    idempotencyKey: 'concurrency-a-01',
    estimatedCents: 10,
  })).status, 'admitted')
  assert.deepEqual(await service.reserve({
    binding: binding(users.alice, sessions.a2),
    idempotencyKey: 'concurrency-a-02',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'user_concurrency_exceeded' })
  assert.equal((await service.reserve({
    binding: binding(users.bob, sessions.b1),
    idempotencyKey: 'concurrency-b-01',
    estimatedCents: 10,
  })).status, 'admitted')
  assert.deepEqual(await service.reserve({
    binding: binding(users.cara, sessions.c1),
    idempotencyKey: 'concurrency-c-01',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'global_concurrency_exceeded' })
})

test('cancel is owner-bound, idempotent, and releases concurrency and estimates', async () => {
  const { service } = harness()
  const aliceBinding = binding(users.alice, sessions.a1)
  const admitted = await service.reserve({
    binding: aliceBinding,
    idempotencyKey: 'cancel-alice-001',
    estimatedCents: 100,
  })
  assert.equal(admitted.status, 'admitted')
  if (admitted.status !== 'admitted') return
  assert.equal((await service.cancel({
    reservationId: admitted.reservation.id,
    binding: binding(users.bob, sessions.b1),
  })).status, 'binding_mismatch')
  const cancelled = await service.cancel({ reservationId: admitted.reservation.id, binding: aliceBinding })
  const retry = await service.cancel({ reservationId: admitted.reservation.id, binding: aliceBinding })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(retry.status, 'cancelled')
  if (retry.status === 'cancelled') assert.equal(retry.idempotent, true)
  assert.equal((await service.reserve({
    binding: binding(users.alice, sessions.a2),
    idempotencyKey: 'cancel-alice-002',
    estimatedCents: 100,
  })).status, 'admitted')
})

test('finalize records actual cents exactly once and reports budget overruns', async () => {
  const { service, setTime } = harness()
  const aliceBinding = binding(users.alice, sessions.a1)
  const admitted = await service.reserve({
    binding: aliceBinding,
    idempotencyKey: 'finalize-alice01',
    estimatedCents: 90,
  })
  assert.equal(admitted.status, 'admitted')
  if (admitted.status !== 'admitted') return
  const finalized = await service.finalize({
    reservationId: admitted.reservation.id,
    binding: aliceBinding,
    actualCents: 120,
  })
  assert.equal(finalized.status, 'finalized')
  if (finalized.status !== 'finalized') return
  assert.equal(finalized.budgetExceeded, true)
  assert.equal(finalized.reservation.actualCents, 120)
  setTime('2026-07-16T12:00:30.000Z')
  const retry = await service.finalize({
    reservationId: admitted.reservation.id,
    binding: aliceBinding,
    actualCents: 120,
  })
  assert.equal(retry.status, 'finalized')
  if (retry.status === 'finalized') assert.equal(retry.idempotent, true)
  assert.equal((await service.finalize({
    reservationId: admitted.reservation.id,
    binding: aliceBinding,
    actualCents: 119,
  })).status, 'state_conflict')
})

test('user and global daily budgets include active estimates and finalized actuals', async () => {
  const { service } = harness({ maxGlobalConcurrent: 5, maxUserConcurrent: 5 })
  const alice = binding(users.alice, sessions.a1)
  const first = await service.reserve({
    binding: alice,
    idempotencyKey: 'budget-alice-001',
    estimatedCents: 80,
  })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  assert.equal((await service.finalize({ reservationId: first.reservation.id, binding: alice, actualCents: 80 })).status, 'finalized')
  assert.deepEqual(await service.reserve({
    binding: binding(users.alice, sessions.a2),
    idempotencyKey: 'budget-alice-002',
    estimatedCents: 21,
  }), { status: 'denied', reason: 'user_daily_budget_exceeded' })
  assert.deepEqual(await service.reserve({
    binding: binding(users.bob, sessions.b1),
    idempotencyKey: 'budget-bob-00001',
    estimatedCents: 71,
  }), { status: 'denied', reason: 'global_daily_budget_exceeded' })
  assert.equal((await service.reserve({
    binding: binding(users.bob, sessions.b1),
    idempotencyKey: 'budget-bob-00002',
    estimatedCents: 70,
  })).status, 'admitted')
})

test('UTC day rollover resets spend budgets but not active concurrency', async () => {
  const { service, setTime } = harness()
  const alice = binding(users.alice, sessions.a1)
  const first = await service.reserve({
    binding: alice,
    idempotencyKey: 'rollover-alice01',
    estimatedCents: 100,
  })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  assert.equal((await service.finalize({ reservationId: first.reservation.id, binding: alice, actualCents: 100 })).status, 'finalized')
  setTime('2026-07-17T00:00:01.000Z')
  assert.equal((await service.reserve({
    binding: binding(users.alice, sessions.a2),
    idempotencyKey: 'rollover-alice02',
    estimatedCents: 100,
  })).status, 'admitted')

  const activeHarness = harness({ maxGlobalConcurrent: 2, maxUserConcurrent: 1, reservationTtlMs: 120_000 })
  activeHarness.setTime('2026-07-16T23:59:30.000Z')
  assert.equal((await activeHarness.service.reserve({
    binding: binding(users.bob, sessions.b1),
    idempotencyKey: 'rollover-active01',
    estimatedCents: 10,
  })).status, 'admitted')
  activeHarness.setTime('2026-07-17T00:00:01.000Z')
  assert.deepEqual(await activeHarness.service.reserve({
    binding: binding(users.bob, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
    idempotencyKey: 'rollover-active02',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'user_concurrency_exceeded' })
})

test('expired reservations release admission and can still record late actual spend', async () => {
  const { service, setTime } = harness()
  const alice = binding(users.alice, sessions.a1)
  const first = await service.reserve({
    binding: alice,
    idempotencyKey: 'expiry-alice-001',
    estimatedCents: 90,
  })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  setTime('2026-07-16T12:01:01.000Z')
  assert.equal((await service.reserve({
    binding: binding(users.alice, sessions.a2),
    idempotencyKey: 'expiry-alice-002',
    estimatedCents: 50,
  })).status, 'admitted')
  const late = await service.finalize({ reservationId: first.reservation.id, binding: alice, actualCents: 70 })
  assert.equal(late.status, 'finalized')
  if (late.status === 'finalized') assert.equal(late.budgetExceeded, true)
})

test('repository failures fail closed', async () => {
  const throwing = {
    async atomicReserve() { throw new Error('store down') },
    async atomicFinalize() { throw new Error('store down') },
    async atomicCancel() { throw new Error('store down') },
  }
  const service = new RealtimeAdmissionService(throwing, policy)
  const alice = binding(users.alice, sessions.a1)
  assert.deepEqual(await service.reserve({
    binding: alice,
    idempotencyKey: 'store-error-00001',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'store_unavailable' })
  assert.equal((await service.finalize({
    reservationId: '00000000-0000-4000-8000-000000000001',
    binding: alice,
    actualCents: 10,
  })).status, 'store_unavailable')
  assert.equal((await service.cancel({
    reservationId: '00000000-0000-4000-8000-000000000001',
    binding: alice,
  })).status, 'store_unavailable')
})

test('malformed success records fail closed for every lifecycle operation', async () => {
  const alice = binding(users.alice, sessions.a1)
  const base = {
    id: '00000000-0000-4000-8000-000000000099',
    version: '2026-07-16.v1',
    idempotencyKey: 'malformed-store01',
    userKey: alice.userKey,
    sessionKey: alice.sessionKey,
    utcDay: '2026-07-16',
    estimatedCents: 10,
    actualCents: null,
    status: 'reserved',
    createdAt: '2026-07-16T12:00:00.000Z',
    expiresAt: '2026-07-16T12:01:00.000Z',
    finalizedAt: null,
    cancelledAt: null,
  }
  const reserveService = new RealtimeAdmissionService({
    async atomicReserve() {
      return { kind: 'reserved', reservation: { ...base, status: 'cancelled', cancelledAt: base.createdAt }, idempotent: false }
    },
    async atomicFinalize() { return { kind: 'not_found' } },
    async atomicCancel() { return { kind: 'not_found' } },
  }, policy, { now: () => new Date(base.createdAt) })
  assert.deepEqual(await reserveService.reserve({
    binding: alice,
    idempotencyKey: base.idempotencyKey,
    estimatedCents: 10,
  }), { status: 'denied', reason: 'store_unavailable' })

  const finalizeService = new RealtimeAdmissionService({
    async atomicReserve() { return { kind: 'denied', reason: 'global_concurrency_exceeded' } },
    async atomicFinalize() {
      return {
        kind: 'finalized',
        reservation: { ...base, status: 'finalized', actualCents: 11, finalizedAt: base.createdAt },
        idempotent: false,
        userBudgetExceeded: false,
        globalBudgetExceeded: false,
      }
    },
    async atomicCancel() { return { kind: 'not_found' } },
  }, policy, { now: () => new Date(base.createdAt) })
  assert.equal((await finalizeService.finalize({
    reservationId: base.id,
    binding: alice,
    actualCents: 10,
  })).status, 'store_unavailable')

  const cancelService = new RealtimeAdmissionService({
    async atomicReserve() { return { kind: 'denied', reason: 'global_concurrency_exceeded' } },
    async atomicFinalize() { return { kind: 'not_found' } },
    async atomicCancel() {
      return {
        kind: 'cancelled',
        reservation: { ...base, status: 'cancelled', actualCents: 1, cancelledAt: base.createdAt },
        idempotent: false,
      }
    },
  }, policy, { now: () => new Date(base.createdAt) })
  assert.equal((await cancelService.cancel({ reservationId: base.id, binding: alice })).status, 'store_unavailable')
})

test('invalid policy and admission inputs are rejected before store access', async () => {
  assert.throws(() => harness({ maxUserConcurrent: 3, maxGlobalConcurrent: 2 }), /maxUserConcurrent/)
  const { service } = harness()
  assert.deepEqual(await service.reserve({
    binding: binding(users.alice, sessions.a1),
    idempotencyKey: 'short',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'invalid_request' })
  assert.deepEqual(await service.reserve({
    binding: binding(users.alice, sessions.a1),
    idempotencyKey: 'invalid-cents-001',
    estimatedCents: 101,
  }), { status: 'denied', reason: 'invalid_request' })
})
