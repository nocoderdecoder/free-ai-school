import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS,
  AI_PATH_REALTIME_ADMISSION_RPC_NAMES,
  SupabaseRealtimeAdmissionGatewayError,
  SupabaseRealtimeAdmissionRepository,
} from './lib/realtime-admission-supabase.ts'
import {
  RealtimeAdmissionService,
  createVerifiedRealtimeAdmissionBinding,
} from './lib/realtime-admission.ts'

const userId = '11111111-1111-4111-8111-111111111111'
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const binding = createVerifiedRealtimeAdmissionBinding({
  principal: { userId, source: 'supabase' },
  ownedSession: { id: sessionId, ownerId: userId, status: 'consented' },
  secret: 'test-only-realtime-admission-secret-value',
})
const policy = {
  maxGlobalConcurrent: 8,
  maxUserConcurrent: 1,
  maxUserDailyCents: 200,
  maxGlobalDailyCents: 1_000,
  maxReservationCents: 100,
  reservationTtlMs: 60_000,
}
const reserveCommand = {
  binding,
  idempotencyKey: 'supabase-reserve-0001',
  utcDay: '2026-07-17',
  estimatedCents: 40,
  now: '2026-07-17T12:00:00.000Z',
  expiresAt: '2026-07-17T12:01:00.000Z',
  policy,
}
const reservationId = '00000000-0000-4000-8000-000000000001'

function reservation(overrides = {}) {
  return {
    id: reservationId,
    version: '2026-07-16.v1',
    idempotencyKey: reserveCommand.idempotencyKey,
    userKey: binding.userKey,
    sessionKey: binding.sessionKey,
    utcDay: reserveCommand.utcDay,
    estimatedCents: reserveCommand.estimatedCents,
    actualCents: null,
    status: 'reserved',
    createdAt: reserveCommand.now,
    expiresAt: reserveCommand.expiresAt,
    finalizedAt: null,
    cancelledAt: null,
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

test('reserve invokes exactly one atomic RPC with every authoritative limit', async () => {
  const mock = mockClient(() => ({
    data: { kind: 'reserved', reservation: reservation(), idempotent: false },
    error: null,
    count: null,
    status: 200,
    statusText: 'OK',
  }))
  const repository = new SupabaseRealtimeAdmissionRepository(mock.client)
  const result = await repository.atomicReserve(reserveCommand)

  assert.deepEqual(AI_PATH_REALTIME_ADMISSION_RPC_NAMES, {
    reserve: 'reserve_ai_path_realtime_admission',
    finalize: 'finalize_ai_path_realtime_admission',
    cancel: 'cancel_ai_path_realtime_admission',
  })
  assert.deepEqual(mock.calls, [{
    name: 'reserve_ai_path_realtime_admission',
    args: {
      p_user_key: binding.userKey,
      p_session_key: binding.sessionKey,
      p_idempotency_key: reserveCommand.idempotencyKey,
      p_utc_day: reserveCommand.utcDay,
      p_now: reserveCommand.now,
      p_expires_at: reserveCommand.expiresAt,
      p_estimated_cents: reserveCommand.estimatedCents,
      p_max_global_concurrent: policy.maxGlobalConcurrent,
      p_max_user_concurrent: policy.maxUserConcurrent,
      p_max_user_daily_cents: policy.maxUserDailyCents,
      p_max_global_daily_cents: policy.maxGlobalDailyCents,
      p_max_reservation_cents: policy.maxReservationCents,
      p_reservation_ttl_ms: policy.reservationTtlMs,
    },
  }])
  assert.equal(result.kind, 'reserved')
  if (result.kind === 'reserved') assert.equal(Object.isFrozen(result.reservation), true)
})

test('reserve accepts only the bounded denial vocabulary and exact response shape', async () => {
  const reasons = [
    'idempotency_conflict',
    'idempotency_terminal',
    'session_already_reserved',
    'user_concurrency_exceeded',
    'global_concurrency_exceeded',
    'user_daily_budget_exceeded',
    'global_daily_budget_exceeded',
  ]
  for (const reason of reasons) {
    const valid = mockClient(() => ({ data: { kind: 'denied', reason }, error: null }))
    assert.deepEqual(
      await new SupabaseRealtimeAdmissionRepository(valid.client).atomicReserve(reserveCommand),
      { kind: 'denied', reason },
    )
  }

  for (const data of [
    { kind: 'denied', reason: 'provider_said_no' },
    { kind: 'denied', reason: 'global_concurrency_exceeded', detail: 'private row' },
    { kind: 'reserved', reservation: reservation({ userKey: 'f'.repeat(64) }), idempotent: false },
  ]) {
    const malformed = mockClient(() => ({ data, error: null }))
    await assert.rejects(
      new SupabaseRealtimeAdmissionRepository(malformed.client).atomicReserve(reserveCommand),
      error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'malformed_response',
    )
  }
})

test('finalize and cancel accept only exact known terminal results', async () => {
  for (const kind of ['not_found', 'binding_mismatch', 'state_conflict']) {
    const mock = mockClient(() => ({ data: { kind }, error: null }))
    const repository = new SupabaseRealtimeAdmissionRepository(mock.client)
    assert.deepEqual(await repository.atomicFinalize({
      reservationId,
      binding,
      actualCents: 1,
      now: reserveCommand.now,
      policy,
    }), { kind })
    assert.deepEqual(await repository.atomicCancel({
      reservationId,
      binding,
      now: reserveCommand.now,
    }), { kind })
  }

  for (const data of [{ kind: 'unknown' }, { kind: 'not_found', leaked: true }]) {
    const mock = mockClient(() => ({ data, error: null }))
    const repository = new SupabaseRealtimeAdmissionRepository(mock.client)
    await assert.rejects(
      repository.atomicCancel({ reservationId, binding, now: reserveCommand.now }),
      error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'malformed_response',
    )
  }
})

test('finalize and cancel map to one RPC each and validate binding-bound tickets', async () => {
  const finalizedReservation = reservation({
    idempotencyKey: 'a'.repeat(64),
    status: 'finalized',
    actualCents: 45,
    finalizedAt: '2026-07-17T12:00:30.000Z',
  })
  const finalized = mockClient(name => ({
    data: name === 'finalize_ai_path_realtime_admission'
      ? {
          kind: 'finalized',
          reservation: finalizedReservation,
          idempotent: false,
          userBudgetExceeded: false,
          globalBudgetExceeded: false,
        }
      : { kind: 'not_found' },
    error: null,
  }))
  const repository = new SupabaseRealtimeAdmissionRepository(finalized.client)
  const finalizeCommand = {
    reservationId,
    binding,
    actualCents: 45,
    now: '2026-07-17T12:00:30.000Z',
    policy,
  }
  assert.equal((await repository.atomicFinalize(finalizeCommand)).kind, 'finalized')
  assert.deepEqual(finalized.calls[0], {
    name: 'finalize_ai_path_realtime_admission',
    args: {
      p_reservation_id: reservationId,
      p_user_key: binding.userKey,
      p_session_key: binding.sessionKey,
      p_actual_cents: 45,
      p_now: finalizeCommand.now,
      p_max_user_daily_cents: policy.maxUserDailyCents,
      p_max_global_daily_cents: policy.maxGlobalDailyCents,
    },
  })

  const cancelledReservation = reservation({
    idempotencyKey: 'b'.repeat(64),
    status: 'cancelled',
    cancelledAt: '2026-07-17T12:00:31.000Z',
  })
  const cancelled = mockClient(() => ({
    data: { kind: 'cancelled', reservation: cancelledReservation, idempotent: true },
    error: null,
  }))
  const cancelCommand = { reservationId, binding, now: '2026-07-17T12:00:31.000Z' }
  assert.equal((await new SupabaseRealtimeAdmissionRepository(cancelled.client).atomicCancel(cancelCommand)).kind, 'cancelled')
  assert.deepEqual(cancelled.calls[0], {
    name: 'cancel_ai_path_realtime_admission',
    args: {
      p_reservation_id: reservationId,
      p_user_key: binding.userKey,
      p_session_key: binding.sessionKey,
      p_now: cancelCommand.now,
    },
  })
})

test('invalid commands fail before transport access', async () => {
  const mock = mockClient(() => {
    throw new Error('must not be called')
  })
  const repository = new SupabaseRealtimeAdmissionRepository(mock.client)
  await assert.rejects(
    repository.atomicReserve({ ...reserveCommand, expiresAt: '2026-07-17T12:00:59.999Z' }),
    error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'invalid_command',
  )
  await assert.rejects(
    repository.atomicFinalize({
      reservationId: 'not-a-uuid',
      binding,
      actualCents: 1,
      now: reserveCommand.now,
      policy,
    }),
    error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'invalid_command',
  )
  await assert.rejects(
    repository.atomicCancel({ reservationId, binding, now: 'not-a-time' }),
    error => error instanceof SupabaseRealtimeAdmissionGatewayError && error.code === 'invalid_command',
  )
  assert.deepEqual(mock.calls, [])
})

test('provider errors, thrown values, and malformed wrappers are normalized without leakage', async () => {
  const privateDetail = 'private transcript and service credential'
  for (const handler of [
    () => ({ data: null, error: { code: 'XX000', message: privateDetail } }),
    () => { throw new Error(privateDetail) },
    () => ({ data: { kind: 'not_found' }, error: null, privateDetail }),
  ]) {
    const mock = mockClient(handler)
    await assert.rejects(
      new SupabaseRealtimeAdmissionRepository(mock.client).atomicReserve(reserveCommand),
      error => (
        error instanceof SupabaseRealtimeAdmissionGatewayError
        && !String(error).includes(privateDetail)
      ),
    )
  }
})

test('fixed admission deadline aborts a stalled RPC and service denies provider progression', { concurrency: false }, async () => {
  const originalTimeout = AbortSignal.timeout
  let receivedSignal
  let resolveRpc
  let providerProgressed = false
  AbortSignal.timeout = milliseconds => {
    assert.equal(milliseconds, 4_000)
    const controller = new AbortController()
    queueMicrotask(() => controller.abort())
    return controller.signal
  }

  try {
    const repository = new SupabaseRealtimeAdmissionRepository({
      rpc(_name, _args, signal) {
        receivedSignal = signal
        return new Promise(resolve => { resolveRpc = resolve })
      },
    })
    await assert.rejects(
      repository.atomicReserve(reserveCommand),
      error => (
        error instanceof SupabaseRealtimeAdmissionGatewayError
        && error.code === 'rpc_timeout'
        && error.message === 'The durable Realtime admission operation failed closed.'
      ),
    )
    assert.equal(receivedSignal.aborted, true)

    const service = new RealtimeAdmissionService(repository, policy, {
      now: () => new Date(reserveCommand.now),
    })
    const result = await service.reserve({
      binding,
      idempotencyKey: reserveCommand.idempotencyKey,
      estimatedCents: reserveCommand.estimatedCents,
    })
    if (result.status === 'admitted') providerProgressed = true

    assert.deepEqual(result, { status: 'denied', reason: 'store_unavailable' })
    assert.equal(providerProgressed, false)
    resolveRpc({
      data: { kind: 'reserved', reservation: reservation(), idempotent: false },
      error: null,
    })
    await Promise.resolve()
    assert.equal(providerProgressed, false)
    assert.equal(AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS, 4_000)
  } finally {
    AbortSignal.timeout = originalTimeout
  }
})

test('server factory is independently latched, server-only, and route-free', async () => {
  const serverSource = await readFile(
    new URL('./lib/realtime-admission-supabase.server.ts', import.meta.url),
    'utf8',
  )
  const domainSource = await readFile(
    new URL('./lib/realtime-admission-supabase.ts', import.meta.url),
    'utf8',
  )
  const publicAdmissionSource = await readFile(
    new URL('./lib/realtime-admission.ts', import.meta.url),
    'utf8',
  )

  assert.match(serverSource, /import 'server-only'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /activation\.credentialScope !== 'service-role'/)
  assert.match(serverSource, /activation\.atomicSqlProof !== 'passed'/)
  assert.match(serverSource, /activation\.lifecycleSqlProof !== 'passed'/)
  assert.match(serverSource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION = '20260717070000'/)
  assert.match(serverSource, /\.abortSignal\(signal\)/)
  assert.doesNotMatch(serverSource, /process\.env|fetch\s*\(|console\./)
  assert.match(domainSource, /AbortSignal\.timeout\(AI_PATH_REALTIME_ADMISSION_RPC_DEADLINE_MS\)/)
  assert.doesNotMatch(domainSource, /deadlineMs\??:/)
  assert.doesNotMatch(domainSource, /process\.env|fetch\s*\(|console\.|transcript|audio|sdp/i)
  assert.match(publicAdmissionSource, /AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH = false as const/)

  const routeSource = await readFile(
    new URL('../api/ai-path/realtime/session/route.ts', import.meta.url),
    'utf8',
  )
  assert.doesNotMatch(routeSource, /realtime-admission-supabase\.server/)
})
