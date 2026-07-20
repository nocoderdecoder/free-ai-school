import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS,
  AI_PATH_REALTIME_ADMISSION_RPC_NAMES,
  SupabaseRealtimeAdmissionGatewayError,
  SupabaseRealtimeAdmissionRepository,
} from './lib/realtime-admission-supabase.ts'
import { RealtimeAdmissionService, createVerifiedRealtimeAdmissionBinding, createVerifiedRealtimeAdmissionIntent } from './lib/realtime-admission.ts'

const userId = '11111111-1111-4111-8111-111111111111'
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const binding = createVerifiedRealtimeAdmissionBinding({
  principal: { userId, source: 'supabase' },
  ownedSession: { id: sessionId, ownerId: userId, status: 'consented' },
})
const policy = {
  version: '2026-07-17.v1',
  policyId: '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
  limits: { maxGlobalConcurrent: 2, maxUserConcurrent: 1, maxUserDailyCents: 100, maxGlobalDailyCents: 1_000, maxReservationCents: 100, reservationTtlMs: 120_000 },
}
const intentResponse = { intentId: '10000000-0000-4000-8000-000000000001', policyId: policy.policyId, expiresAt: '2026-07-17T12:01:00.000Z' }
const intent = createVerifiedRealtimeAdmissionIntent(intentResponse, binding)
const reservationId = '20000000-0000-4000-8000-000000000001'
const reserveCommand = { binding, intent, idempotencyKey: 'supabase-reserve-0001', estimatedCents: 40, policy }

function reservation(overrides = {}) {
  return {
    id: reservationId,
    version: '2026-07-16.v1',
    policyId: policy.policyId,
    intentId: intent.intentId,
    idempotencyKey: reserveCommand.idempotencyKey,
    utcDay: '2026-07-17', estimatedCents: 40, actualCents: null, status: 'reserved',
    createdAt: '2026-07-17T12:00:00.000Z', expiresAt: '2026-07-17T12:02:00.000Z',
    finalizedAt: null, cancelledAt: null, ...overrides,
  }
}

function mockClient(handler) {
  const calls = []
  return {
    calls,
    client: { async rpc(name, args, signal) { calls.push({ name, args, signal }); return handler(name, args, signal) } },
  }
}
function repository(authenticated, service) {
  return new SupabaseRealtimeAdmissionRepository({ authenticatedClient: authenticated.client, serviceRoleClient: service.client })
}

test('authenticated issuance sends only pinned policy and assessment session and parses exact intent', async () => {
  assert.deepEqual(AI_PATH_REALTIME_ADMISSION_RPC_NAMES, {
    issueIntent: 'issue_ai_path_realtime_admission_intent',
    reserve: 'reserve_ai_path_realtime_admission',
    finalize: 'finalize_ai_path_realtime_admission',
    cancel: 'cancel_ai_path_realtime_admission',
  })
  const auth = mockClient(() => ({ data: intentResponse, error: null, status: 200 }))
  const service = mockClient(() => { throw new Error('service role must not be used') })
  const result = await repository(auth, service).issueIntent({ binding, policy })
  assert.deepEqual(result, intent)
  assert.deepEqual(auth.calls.map(({ name, args }) => ({ name, args })), [{
    name: 'issue_ai_path_realtime_admission_intent',
    args: { p_policy_id: policy.policyId, p_assessment_session_id: sessionId },
  }])
  assert.equal(JSON.stringify(auth.calls[0].args).includes(userId), false)
  assert.deepEqual(service.calls, [])
})

test('intent parser rejects unknown fields, wrong policy, invalid id, and invalid expiry', async () => {
  for (const data of [
    { ...intentResponse, privateOwner: userId },
    { ...intentResponse, policyId: 'wrong' },
    { ...intentResponse, intentId: 'not-uuid' },
    { ...intentResponse, expiresAt: 'tomorrow' },
  ]) {
    const auth = mockClient(() => ({ data, error: null }))
    const service = mockClient(() => ({ data: null, error: null }))
    await assert.rejects(repository(auth, service).issueIntent({ binding, policy }), error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'malformed_response')
  }
})

test('reserve consumes exactly the opaque intent tuple with no owner/session/timestamps/caps', async () => {
  const auth = mockClient(() => { throw new Error('authenticated client must not reserve') })
  const service = mockClient(() => ({ data: { kind: 'reserved', reservation: reservation(), idempotent: false }, error: null }))
  const result = await repository(auth, service).atomicReserve(reserveCommand)
  assert.equal(result.kind, 'reserved')
  if (result.kind === 'reserved') {
    assert.doesNotMatch(JSON.stringify(result.reservation), /assessmentSessionId|ownerId|userKey|sessionKey/i)
  }
  assert.deepEqual(service.calls.map(({ name, args }) => ({ name, args })), [{
    name: 'reserve_ai_path_realtime_admission',
    args: { p_policy_id: policy.policyId, p_intent_id: intent.intentId, p_idempotency_key: reserveCommand.idempotencyKey, p_estimated_cents: 40 },
  }])
  assert.doesNotMatch(Object.keys(service.calls[0].args).join('|'), /owner|session|userKey|sessionKey|max_|ttl|utc|now|expires/i)
  assert.deepEqual(auth.calls, [])
})

test('reserve accepts only bounded denial vocabulary and exact intent-bound identity-free reservation shape', async () => {
  const reasons = ['idempotency_conflict', 'idempotency_terminal', 'session_already_reserved', 'user_concurrency_exceeded', 'global_concurrency_exceeded', 'user_daily_budget_exceeded', 'global_daily_budget_exceeded']
  for (const reason of reasons) {
    const auth = mockClient(() => ({ data: null, error: null }))
    const service = mockClient(() => ({ data: { kind: 'denied', reason }, error: null }))
    assert.deepEqual(await repository(auth, service).atomicReserve(reserveCommand), { kind: 'denied', reason })
  }
  for (const data of [
    { kind: 'denied', reason: 'provider_said_no' },
    { kind: 'reserved', reservation: reservation({ intentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1' }), idempotent: false },
    { kind: 'reserved', reservation: { ...reservation(), assessmentSessionId: sessionId }, idempotent: false },
    { kind: 'reserved', reservation: { ...reservation(), ownerId: userId }, idempotent: false },
  ]) {
    const auth = mockClient(() => ({ data: null, error: null }))
    const service = mockClient(() => ({ data, error: null }))
    await assert.rejects(repository(auth, service).atomicReserve(reserveCommand), error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'malformed_response')
  }
})

test('finalize and cancel use only policy, reservation, and original intent identifiers on the privileged client', async () => {
  const auth = mockClient(() => { throw new Error('must not be called') })
  const service = mockClient(name => ({
    data: name === 'finalize_ai_path_realtime_admission'
      ? { kind: 'finalized', reservation: reservation({ status: 'finalized', actualCents: 45, finalizedAt: '2026-07-17T12:00:30.000Z' }), idempotent: false, userBudgetExceeded: false, globalBudgetExceeded: false }
      : { kind: 'cancelled', reservation: reservation({ status: 'cancelled', cancelledAt: '2026-07-17T12:00:31.000Z' }), idempotent: false },
    error: null,
  }))
  const repo = repository(auth, service)
  assert.equal((await repo.atomicFinalize({ reservationId, binding, intent, actualCents: 45, policy })).kind, 'finalized')
  assert.equal((await repo.atomicCancel({ reservationId, binding, intent, policy })).kind, 'cancelled')
  assert.deepEqual(service.calls.map(({ name, args }) => ({ name, args })), [
    { name: 'finalize_ai_path_realtime_admission', args: { p_policy_id: policy.policyId, p_reservation_id: reservationId, p_intent_id: intent.intentId, p_actual_cents: 45 } },
    { name: 'cancel_ai_path_realtime_admission', args: { p_policy_id: policy.policyId, p_reservation_id: reservationId, p_intent_id: intent.intentId } },
  ])
  assert.deepEqual(auth.calls, [])
})

test('a different branded intent cannot silently validate lifecycle responses', async () => {
  const wrongIntent = createVerifiedRealtimeAdmissionIntent({
    ...intentResponse,
    intentId: '30000000-0000-4000-8000-000000000001',
  }, binding)
  const auth = mockClient(() => { throw new Error('must not be called') })
  const service = mockClient(() => ({ data: { kind: 'binding_mismatch' }, error: null }))
  const repo = repository(auth, service)
  assert.deepEqual(await repo.atomicFinalize({ reservationId, binding, intent: wrongIntent, actualCents: 45, policy }), { kind: 'binding_mismatch' })
  assert.deepEqual(await repo.atomicCancel({ reservationId, binding, intent: wrongIntent, policy }), { kind: 'binding_mismatch' })
  assert.equal(service.calls[0].args.p_intent_id, wrongIntent.intentId)
  assert.equal(service.calls[1].args.p_intent_id, wrongIntent.intentId)
})

test('invalid commands fail before either credential crosses the transport', async () => {
  const auth = mockClient(() => { throw new Error('must not be called') })
  const service = mockClient(() => { throw new Error('must not be called') })
  const repo = repository(auth, service)
  await assert.rejects(repo.atomicReserve({ ...reserveCommand, intent: createVerifiedRealtimeAdmissionIntent({ ...intentResponse, intentId: 'bad' }, binding) }), error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'invalid_command')
  await assert.rejects(repo.atomicFinalize({ reservationId: 'bad', binding, intent, actualCents: 1, policy }), error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'invalid_command')
  assert.deepEqual(auth.calls, [])
  assert.deepEqual(service.calls, [])
})

test('timeouts fail closed and reserve retry keeps the same intent and idempotency tuple', { concurrency: false }, async () => {
  const originalTimeout = AbortSignal.timeout
  let first = true
  let resolveLate
  let providerProgressed = false
  const auth = mockClient(() => ({ data: intentResponse, error: null }))
  const service = mockClient(() => {
    if (first) {
      first = false
      return new Promise(resolve => { resolveLate = resolve })
    }
    return { data: { kind: 'reserved', reservation: reservation(), idempotent: true }, error: null }
  })
  AbortSignal.timeout = milliseconds => {
    assert.equal(milliseconds, AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS)
    const controller = new AbortController(); queueMicrotask(() => controller.abort()); return controller.signal
  }
  try {
    const repo = repository(auth, service)
    const admission = new RealtimeAdmissionService(repo, policy, { now: () => new Date('2026-07-17T12:00:00.000Z') })
    const firstResult = await admission.reserve({ binding, intent, idempotencyKey: reserveCommand.idempotencyKey, estimatedCents: 40 })
    if (firstResult.status === 'admitted') providerProgressed = true
    assert.deepEqual(firstResult, { status: 'denied', reason: 'store_unavailable' })
    const firstArgs = service.calls[0].args

    AbortSignal.timeout = originalTimeout
    const retry = await admission.reserve({ binding, intent, idempotencyKey: reserveCommand.idempotencyKey, estimatedCents: 40 })
    assert.equal(retry.status, 'admitted')
    assert.deepEqual(service.calls[1].args, firstArgs)
    assert.equal(auth.calls.length, 0)
    assert.equal(providerProgressed, false)
    resolveLate({ data: { kind: 'reserved', reservation: reservation(), idempotent: false }, error: null })
    await Promise.resolve()
    assert.equal(providerProgressed, false)
  } finally {
    AbortSignal.timeout = originalTimeout
  }
})

test('intent issuance timeout is content-free and prevents reserve progression', { concurrency: false }, async () => {
  const originalTimeout = AbortSignal.timeout
  const auth = mockClient(() => new Promise(() => {}))
  const service = mockClient(() => { throw new Error('reserve must not run') })
  AbortSignal.timeout = () => { const controller = new AbortController(); queueMicrotask(() => controller.abort()); return controller.signal }
  try {
    const admission = new RealtimeAdmissionService(repository(auth, service), policy, { now: () => new Date('2026-07-17T12:00:00.000Z') })
    assert.deepEqual(await admission.issueIntent({ binding }), { status: 'denied', reason: 'store_unavailable' })
    assert.equal(service.calls.length, 0)
  } finally { AbortSignal.timeout = originalTimeout }
})

test('server factory is split-credential, independently latched, and route-free', async () => {
  const serverSource = await readFile(new URL('./lib/realtime-admission-supabase.server.ts', import.meta.url), 'utf8')
  const domainSource = await readFile(new URL('./lib/realtime-admission-supabase.ts', import.meta.url), 'utf8')
  assert.match(serverSource, /import 'server-only'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /activation\.credentialScope !== 'authenticated-intent\+service-role'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION = '20260717080000'/)
  assert.match(serverSource, /authenticatedClient: narrowRpcClient\(clients\.authenticatedClient\)/)
  assert.match(serverSource, /serviceRoleClient: narrowRpcClient\(clients\.serviceRoleClient\)/)
  assert.doesNotMatch(serverSource, /process\.env|fetch\s*\(|console\./)
  assert.doesNotMatch(domainSource, /p_user_key|p_session_key|p_now|p_expires_at|p_max_|p_reservation_ttl/)
  assert.doesNotMatch(domainSource, /process\.env|fetch\s*\(|console\.|transcript|audio|sdp/i)
  const routeSource = await readFile(new URL('../api/ai-path/realtime/session/route.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(routeSource, /realtime-admission-supabase\.server/)
})
