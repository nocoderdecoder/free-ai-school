import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_VERSION,
  createVerifiedRealtimeAdmissionBinding,
  createVerifiedRealtimeAdmissionIntent,
} from './lib/realtime-admission.ts'
import {
  AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH,
  decideMockRealtimeProviderLifecycle,
  reconcileMockRealtimeProviderLifecycle,
} from './lib/realtime-provider-lifecycle.ts'

const userId = '11111111-1111-4111-8111-111111111111'
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const intentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const reservationId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const policyId = '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000'

function prepared() {
  const binding = createVerifiedRealtimeAdmissionBinding({
    principal: { userId, source: 'supabase' },
    ownedSession: { id: sessionId, ownerId: userId, status: 'consented' },
  })
  const intent = createVerifiedRealtimeAdmissionIntent({
    intentId,
    policyId,
    expiresAt: '2026-07-17T12:02:00.000Z',
  }, binding)
  return Object.freeze({
    assessmentSessionId: sessionId,
    verifiedUserId: userId,
    sdp: 'v=0\r\n',
    binding,
    intent,
    reservation: Object.freeze({
      id: reservationId,
      version: AI_PATH_REALTIME_ADMISSION_VERSION,
      policyId,
      intentId,
      idempotencyKey: 'rt_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbb1',
      utcDay: '2026-07-17',
      estimatedCents: 100,
      actualCents: null,
      status: 'reserved',
      createdAt: '2026-07-17T12:00:00.000Z',
      expiresAt: '2026-07-17T12:02:00.000Z',
      finalizedAt: null,
      cancelledAt: null,
    }),
    idempotent: false,
  })
}

function admission(overrides = {}) {
  const calls = []
  return {
    calls,
    value: {
      async cancel(input) {
        calls.push({ operation: 'cancel', input })
        return { status: 'cancelled', reservation: {}, idempotent: false }
      },
      async finalize(input) {
        calls.push({ operation: 'finalize', input })
        return { status: 'finalized', reservation: {}, idempotent: false, budgetExceeded: false }
      },
      ...overrides,
    },
  }
}

test('mock lifecycle contract is independently latched and has no provider transport surface', async () => {
  assert.equal(AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH, false)
  const source = await readFile(new URL('./lib/realtime-provider-lifecycle.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /api\.openai\.com|OPENAI_API_KEY|OpenAI-Safety-Identifier|createLiveRealtimeCall|\bfetch\s*\(|https?:\/\//)
})

test('pure decision contract keeps unknown and active states mutation-free', async () => {
  for (const [observation, status] of [
    [{ kind: 'unknown_commit' }, 'reconciliation_required'],
    [{ kind: 'confirmed_active' }, 'provider_active'],
  ]) {
    const result = decideMockRealtimeProviderLifecycle(prepared(), observation)
    assert.deepEqual(result, {
      status,
      mutation: 'none',
    })
  }
})

test('pure decision contract selects bounded cancel or finalize intent without receiving a service', async () => {
  assert.deepEqual(decideMockRealtimeProviderLifecycle(prepared(), { kind: 'confirmed_absent' }), {
    status: 'confirmed_absent', mutation: 'cancel',
  })
  assert.deepEqual(decideMockRealtimeProviderLifecycle(prepared(), { kind: 'confirmed_ended', actualCents: 37 }), {
    status: 'confirmed_ended', mutation: 'finalize', actualCents: 37,
  })
})

test('malformed observations and forged preparation fail closed before admission mutation', async () => {
  const invalidObservations = [
    null,
    { kind: 'unknown_commit', retry: true },
    { kind: 'confirmed_absent', actualCents: 0 },
    { kind: 'confirmed_ended' },
    { kind: 'confirmed_ended', actualCents: -1 },
    { kind: 'confirmed_ended', actualCents: 1.5 },
    { kind: 'provider_says_retry' },
  ]
  for (const observation of invalidObservations) {
    assert.deepEqual(decideMockRealtimeProviderLifecycle(prepared(), observation), {
      status: 'invalid', mutation: 'none',
    })
  }

  const mock = admission()
  const value = prepared()
  const forged = { ...value, verifiedUserId: '22222222-2222-4222-8222-222222222222' }
  const result = decideMockRealtimeProviderLifecycle(forged, { kind: 'confirmed_absent' })
  assert.deepEqual(result, { status: 'invalid', mutation: 'none' })
  assert.deepEqual(mock.calls, [])
})

test('closed lifecycle latch prevents every admission mutation', async () => {
  for (const observation of [
    { kind: 'unknown_commit' },
    { kind: 'confirmed_active' },
    { kind: 'confirmed_absent' },
    { kind: 'confirmed_ended', actualCents: 40 },
  ]) {
    const mock = admission()
    const result = await reconcileMockRealtimeProviderLifecycle(prepared(), observation, mock.value)
    assert.deepEqual(result, {
      status: 'reconciliation_failed', admissionMutation: 'none',
      retryProviderBootstrap: false, reason: 'store_unavailable',
    })
    assert.deepEqual(mock.calls, [])
  }
})
