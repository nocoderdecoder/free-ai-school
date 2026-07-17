import assert from 'node:assert/strict'
import test from 'node:test'

import { InMemoryRealtimeAdmissionRepository } from './lib/realtime-admission.memory.ts'
import {
  AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH,
  RealtimeAdmissionService,
  createVerifiedRealtimeAdmissionBinding,
  createVerifiedRealtimeAdmissionIntent,
  resolveRealtimeAdmissionCapability,
} from './lib/realtime-admission.ts'

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
  })
}
const limits = {
  maxGlobalConcurrent: 2,
  maxUserConcurrent: 1,
  maxUserDailyCents: 100,
  maxGlobalDailyCents: 150,
  maxReservationCents: 100,
  reservationTtlMs: 60_000,
}
const policy = {
  version: '2026-07-17.v1',
  policyId: '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=150|rc=100|ttl=60000',
  limits,
}

function harness(overrides = {}) {
  let current = new Date('2026-07-17T12:00:00.000Z')
  let id = 0
  const selected = { ...policy, limits: { ...limits, ...overrides } }
  const repository = new InMemoryRealtimeAdmissionRepository({
    idFactory: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}`,
    now: () => new Date(current),
  })
  const service = new RealtimeAdmissionService(repository, selected, { now: () => new Date(current) })
  return { service, repository, setTime(value) { current = new Date(value) } }
}

async function issued(service, verifiedBinding) {
  const result = await service.issueIntent({ binding: verifiedBinding })
  assert.equal(result.status, 'issued')
  if (result.status !== 'issued') throw new Error('intent was not issued')
  return result.intent
}

test('production admission stays closed despite environment attestations', () => {
  assert.equal(AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH, false)
  assert.equal(resolveRealtimeAdmissionCapability({ nodeEnv: 'production', enableProduction: 'true', durableStoreReady: 'true', atomicLimitsReady: 'true', spendApprovalReady: 'true' }).available, false)
  assert.deepEqual(resolveRealtimeAdmissionCapability({ nodeEnv: 'test', enableLocalTest: 'true' }), {
    mode: 'local-test', available: true, productionReady: false,
    reason: 'deterministic process-local admission is enabled for tests only',
  })
})

test('binding is a private branded ownership assertion without HMAC material', () => {
  const value = binding(users.alice, sessions.a1)
  assert.deepEqual({ ownerId: value.ownerId, assessmentSessionId: value.assessmentSessionId }, {
    ownerId: users.alice, assessmentSessionId: sessions.a1,
  })
  assert.doesNotMatch(JSON.stringify(value), /userKey|sessionKey|secret|hmac/i)
  assert.throws(() => createVerifiedRealtimeAdmissionBinding({ principal: { userId: users.alice, source: 'test-header' }, ownedSession: { id: sessions.a1, ownerId: users.alice, status: 'consented' } }), /production principal/)
  assert.throws(() => createVerifiedRealtimeAdmissionBinding({ principal: { userId: users.alice, source: 'supabase' }, ownedSession: { id: sessions.a1, ownerId: users.bob, status: 'consented' } }), /ownership/)
  assert.throws(() => binding(users.alice, sessions.a1, 'complete'), /not reservable/)
})

test('intent issuance is required and reservation response exposes intent and policy but no raw identity', async () => {
  const { service } = harness()
  const owned = binding(users.alice, sessions.a1)
  assert.deepEqual(await service.reserve({ binding: owned, intent: createVerifiedRealtimeAdmissionIntent({ intentId: 'bad', policyId: policy.policyId, expiresAt: 'bad' }, owned), idempotencyKey: 'reserve-alice-0001', estimatedCents: 40 }), { status: 'denied', reason: 'invalid_request' })
  const intent = await issued(service, owned)
  const result = await service.reserve({ binding: owned, intent, idempotencyKey: 'reserve-alice-0001', estimatedCents: 40 })
  assert.equal(result.status, 'admitted')
  if (result.status !== 'admitted') return
  assert.equal(result.reservation.intentId, intent.intentId)
  assert.equal(result.reservation.policyId, policy.policyId)
  assert.doesNotMatch(JSON.stringify(result.reservation), /ownerId|assessmentSessionId|userKey|sessionKey|bindingVersion/i)
})

test('unknown-commit retry reuses the exact intent and idempotency tuple', async () => {
  const { service, setTime } = harness()
  const owned = binding(users.alice, sessions.a1)
  const intent = await issued(service, owned)
  const request = { binding: owned, intent, idempotencyKey: 'unknown-commit-001', estimatedCents: 40 }
  const first = await service.reserve(request)
  assert.equal(first.status, 'admitted')
  setTime('2026-07-17T12:00:31.000Z')
  const retry = await service.reserve(request)
  assert.equal(retry.status, 'admitted')
  if (first.status === 'admitted' && retry.status === 'admitted') {
    assert.equal(retry.idempotent, true)
    assert.equal(retry.reservation.id, first.reservation.id)
  }
  assert.deepEqual(await service.reserve({ ...request, estimatedCents: 41 }), { status: 'denied', reason: 'idempotency_conflict' })
})

test('an intent cannot be rebound to another verified session', async () => {
  const { service } = harness()
  const first = binding(users.alice, sessions.a1)
  const second = binding(users.alice, sessions.a2)
  const intent = await issued(service, first)
  assert.deepEqual(await service.reserve({
    binding: second,
    intent,
    idempotencyKey: 'intent-confused-001',
    estimatedCents: 10,
  }), { status: 'denied', reason: 'invalid_request' })
})

test('session, user, and global concurrency remain continuous without HMAC keys', async () => {
  const { service } = harness()
  const aliceOne = binding(users.alice, sessions.a1)
  assert.equal((await service.reserve({ binding: aliceOne, intent: await issued(service, aliceOne), idempotencyKey: 'concurrency-a-001', estimatedCents: 10 })).status, 'admitted')
  const aliceTwo = binding(users.alice, sessions.a2)
  assert.deepEqual(await service.reserve({ binding: aliceTwo, intent: await issued(service, aliceTwo), idempotencyKey: 'concurrency-a-002', estimatedCents: 10 }), { status: 'denied', reason: 'user_concurrency_exceeded' })
  const bob = binding(users.bob, sessions.b1)
  assert.equal((await service.reserve({ binding: bob, intent: await issued(service, bob), idempotencyKey: 'concurrency-b-001', estimatedCents: 10 })).status, 'admitted')
  const cara = binding(users.cara, sessions.c1)
  assert.deepEqual(await service.reserve({ binding: cara, intent: await issued(service, cara), idempotencyKey: 'concurrency-c-001', estimatedCents: 10 }), { status: 'denied', reason: 'global_concurrency_exceeded' })
})

test('finalize and cancel remain ownership-bound locally and use durable lifecycle results', async () => {
  const { service } = harness({ maxUserConcurrent: 2 })
  const alice = binding(users.alice, sessions.a1)
  const aliceIntent = await issued(service, alice)
  const admitted = await service.reserve({ binding: alice, intent: aliceIntent, idempotencyKey: 'finalize-alice01', estimatedCents: 90 })
  assert.equal(admitted.status, 'admitted')
  if (admitted.status !== 'admitted') return
  const wrongBinding = binding(users.alice, sessions.a2)
  const wrongIntent = await issued(service, wrongBinding)
  assert.equal((await service.finalize({ reservationId: admitted.reservation.id, binding: wrongBinding, intent: wrongIntent, actualCents: 80 })).status, 'binding_mismatch')
  const replacementIntent = await issued(service, alice)
  assert.equal((await service.finalize({ reservationId: admitted.reservation.id, binding: alice, intent: replacementIntent, actualCents: 80 })).status, 'binding_mismatch')
  const finalized = await service.finalize({ reservationId: admitted.reservation.id, binding: alice, intent: aliceIntent, actualCents: 80 })
  assert.equal(finalized.status, 'finalized')
  if (finalized.status === 'finalized') assert.equal(finalized.budgetExceeded, false)

  const second = binding(users.alice, sessions.a2)
  const secondIntent = await issued(service, second)
  const secondReservation = await service.reserve({ binding: second, intent: secondIntent, idempotencyKey: 'cancel-alice-0001', estimatedCents: 10 })
  assert.equal(secondReservation.status, 'admitted')
  if (secondReservation.status === 'admitted') {
    const replacementIntent = await issued(service, second)
    assert.equal((await service.cancel({ reservationId: secondReservation.reservation.id, binding: second, intent: replacementIntent })).status, 'binding_mismatch')
    const cancelled = await service.cancel({ reservationId: secondReservation.reservation.id, binding: second, intent: secondIntent })
    assert.equal(cancelled.status, 'cancelled')
  }
})

test('daily budgets include active estimates and finalized actuals', async () => {
  const { service } = harness({ maxGlobalConcurrent: 5, maxUserConcurrent: 5 })
  const alice = binding(users.alice, sessions.a1)
  const aliceIntent = await issued(service, alice)
  const first = await service.reserve({ binding: alice, intent: aliceIntent, idempotencyKey: 'budget-alice-001', estimatedCents: 80 })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  assert.equal((await service.finalize({ reservationId: first.reservation.id, binding: alice, intent: aliceIntent, actualCents: 80 })).status, 'finalized')
  const aliceTwo = binding(users.alice, sessions.a2)
  assert.deepEqual(await service.reserve({ binding: aliceTwo, intent: await issued(service, aliceTwo), idempotencyKey: 'budget-alice-002', estimatedCents: 21 }), { status: 'denied', reason: 'user_daily_budget_exceeded' })
  const bob = binding(users.bob, sessions.b1)
  assert.deepEqual(await service.reserve({ binding: bob, intent: await issued(service, bob), idempotencyKey: 'budget-bob-00001', estimatedCents: 71 }), { status: 'denied', reason: 'global_daily_budget_exceeded' })
})

test('expiry releases concurrency while bounded late finalization still reconciles spend', async () => {
  const { service, setTime } = harness()
  const alice = binding(users.alice, sessions.a1)
  const aliceIntent = await issued(service, alice)
  const first = await service.reserve({ binding: alice, intent: aliceIntent, idempotencyKey: 'expiry-alice-001', estimatedCents: 90 })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  setTime('2026-07-17T12:01:01.000Z')
  const second = binding(users.alice, sessions.a2)
  assert.equal((await service.reserve({ binding: second, intent: await issued(service, second), idempotencyKey: 'expiry-alice-002', estimatedCents: 10 })).status, 'admitted')
  assert.equal((await service.finalize({ reservationId: first.reservation.id, binding: alice, intent: aliceIntent, actualCents: 70 })).status, 'finalized')

  const outside = harness()
  const bob = binding(users.bob, sessions.b1)
  const bobIntent = await issued(outside.service, bob)
  const old = await outside.service.reserve({ binding: bob, intent: bobIntent, idempotencyKey: 'expiry-window-001', estimatedCents: 20 })
  assert.equal(old.status, 'admitted')
  if (old.status !== 'admitted') return
  outside.setTime('2026-07-24T12:01:00.001Z')
  assert.equal((await outside.service.finalize({ reservationId: old.reservation.id, binding: bob, intent: bobIntent, actualCents: 20 })).status, 'state_conflict')
})

test('cancel is idempotent and releases concurrency without spend', async () => {
  const { service } = harness()
  const alice = binding(users.alice, sessions.a1)
  const aliceIntent = await issued(service, alice)
  const first = await service.reserve({ binding: alice, intent: aliceIntent, idempotencyKey: 'cancel-alice-001', estimatedCents: 100 })
  assert.equal(first.status, 'admitted')
  if (first.status !== 'admitted') return
  const cancelled = await service.cancel({ reservationId: first.reservation.id, binding: alice, intent: aliceIntent })
  const retry = await service.cancel({ reservationId: first.reservation.id, binding: alice, intent: aliceIntent })
  assert.equal(cancelled.status, 'cancelled')
  assert.equal(retry.status, 'cancelled')
  if (retry.status === 'cancelled') assert.equal(retry.idempotent, true)
  const second = binding(users.alice, sessions.a2)
  assert.equal((await service.reserve({ binding: second, intent: await issued(service, second), idempotencyKey: 'cancel-alice-002', estimatedCents: 100 })).status, 'admitted')
})

test('intent and repository failures fail closed before provider progression', async () => {
  const throwing = {
    async issueIntent() { throw new Error('private database error') },
    async atomicReserve() { throw new Error('private database error') },
    async atomicFinalize() { throw new Error('private database error') },
    async atomicCancel() { throw new Error('private database error') },
  }
  const service = new RealtimeAdmissionService(throwing, policy, {
    now: () => new Date('2026-07-17T12:00:00.000Z'),
  })
  const owned = binding(users.alice, sessions.a1)
  assert.deepEqual(await service.issueIntent({ binding: owned }), { status: 'denied', reason: 'store_unavailable' })
  assert.deepEqual(await service.reserve({ binding: owned, intent: createVerifiedRealtimeAdmissionIntent({ intentId: '00000000-0000-4000-8000-000000000001', policyId: policy.policyId, expiresAt: '2026-07-17T12:01:00.000Z' }, owned), idempotencyKey: 'store-error-00001', estimatedCents: 10 }), { status: 'denied', reason: 'store_unavailable' })
})

test('expired, far-future, or malformed intent issuance responses fail closed', async () => {
  const owned = binding(users.alice, sessions.a1)
  for (const intent of [
    { intentId: 'bad', policyId: policy.policyId, expiresAt: '2026-07-17T12:01:00.000Z' },
    { intentId: '00000000-0000-4000-8000-000000000001', policyId: 'wrong', expiresAt: '2026-07-17T12:01:00.000Z' },
    { intentId: '00000000-0000-4000-8000-000000000001', policyId: policy.policyId, expiresAt: '2026-07-17T11:59:59.000Z' },
    { intentId: '00000000-0000-4000-8000-000000000001', policyId: policy.policyId, expiresAt: '2026-07-17T12:02:30.001Z' },
  ]) {
    const service = new RealtimeAdmissionService({
      async issueIntent() { return intent },
      async atomicReserve() { throw new Error() }, async atomicFinalize() { throw new Error() }, async atomicCancel() { throw new Error() },
    }, policy, { now: () => new Date('2026-07-17T12:00:00.000Z') })
    assert.deepEqual(await service.issueIntent({ binding: owned }), { status: 'denied', reason: 'store_unavailable' })
  }
})

test('far-future intent input is rejected before every lifecycle repository call', async () => {
  let calls = 0
  const repository = {
    async issueIntent() { calls += 1; throw new Error() },
    async atomicReserve() { calls += 1; throw new Error() },
    async atomicFinalize() { calls += 1; throw new Error() },
    async atomicCancel() { calls += 1; throw new Error() },
  }
  const service = new RealtimeAdmissionService(repository, policy, {
    now: () => new Date('2026-07-17T12:00:00.000Z'),
  })
  const owned = binding(users.alice, sessions.a1)
  const farFuture = createVerifiedRealtimeAdmissionIntent({
    intentId: '00000000-0000-4000-8000-000000000001',
    policyId: policy.policyId,
    expiresAt: '2099-01-01T00:00:00.000Z',
  }, owned)
  assert.deepEqual(await service.reserve({ binding: owned, intent: farFuture, idempotencyKey: 'far-future-00001', estimatedCents: 10 }), { status: 'denied', reason: 'invalid_request' })
  assert.equal((await service.finalize({ reservationId: '00000000-0000-4000-8000-000000000002', binding: owned, intent: farFuture, actualCents: 10 })).status, 'invalid_request')
  assert.equal((await service.cancel({ reservationId: '00000000-0000-4000-8000-000000000002', binding: owned, intent: farFuture })).status, 'invalid_request')
  assert.equal(calls, 0)
})
