import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH,
  AI_PATH_REALTIME_BOOTSTRAP_ESTIMATED_CENTS,
  prepareAuthenticatedRealtimeBootstrap,
  realtimeReservationIdempotencyKey,
} from './lib/realtime-bootstrap.ts'
import {
  AI_PATH_REALTIME_ADMISSION_VERSION,
  RealtimeAdmissionService,
  createVerifiedRealtimeAdmissionIntent,
} from './lib/realtime-admission.ts'
import { AI_PATH_CONSENT_VERSION, AI_PATH_VOICE_CONSENT_VERSION } from './lib/foundation.ts'
import {
  AssessmentSessionService,
  InMemoryAssessmentSessionRepository,
} from './lib/session-persistence.ts'

const userId = '11111111-1111-4111-8111-111111111111'
const outsiderId = '22222222-2222-4222-8222-222222222222'
const sessionId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'
const intentId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const reservationId = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'
const now = new Date('2026-07-17T12:00:00.000Z')
const policy = {
  version: '2026-07-17.v1',
  policyId: '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
  limits: {
    maxGlobalConcurrent: 2,
    maxUserConcurrent: 1,
    maxUserDailyCents: 100,
    maxGlobalDailyCents: 1_000,
    maxReservationCents: 100,
    reservationTtlMs: 120_000,
  },
}
const voiceSession = {
  consentVersion: AI_PATH_VOICE_CONSENT_VERSION,
  locale: 'en-US',
  mode: 'voice',
  goal: 'Build a reliable AI evaluation workflow.',
  goalType: 'workflows',
  targetRole: 'Product manager',
  saveTranscript: false,
}

function request(body = { assessmentSessionId: sessionId, sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n' }, origin = 'https://app.example') {
  return new Request('https://app.example/api/ai-path/realtime/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

async function sessionService(input = voiceSession, owner = userId) {
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository(), {
    idFactory: () => sessionId,
    now: () => now,
  })
  const created = await service.createOwnedSession({ userId: owner, source: 'supabase' }, input)
  assert.equal(created.ok, true)
  return service
}

async function runtime(overrides = {}) {
  return {
    mode: 'supabase',
    capability: {
      available: true,
      productionReady: true,
      persistence: 'supabase-postgres',
      reason: 'test durable runtime',
    },
    principal: { userId, source: 'supabase' },
    service: await sessionService(),
    pendingCookies: [],
    pendingHeaders: {},
    ...overrides,
  }
}

function admittedService(calls) {
  const repository = {
    async issueIntent(command) {
      calls.push({ operation: 'issue', command })
      return createVerifiedRealtimeAdmissionIntent({
        intentId,
        policyId: policy.policyId,
        expiresAt: '2026-07-17T12:02:00.000Z',
      }, command.binding)
    },
    async atomicReserve(command) {
      calls.push({ operation: 'reserve', command })
      return {
        kind: 'reserved',
        idempotent: false,
        reservation: {
          id: reservationId,
          version: AI_PATH_REALTIME_ADMISSION_VERSION,
          policyId: policy.policyId,
          intentId,
          idempotencyKey: command.idempotencyKey,
          utcDay: '2026-07-17',
          estimatedCents: command.estimatedCents,
          actualCents: null,
          status: 'reserved',
          createdAt: '2026-07-17T12:00:00.000Z',
          expiresAt: '2026-07-17T12:02:00.000Z',
          finalizedAt: null,
          cancelledAt: null,
        },
      }
    },
    async atomicFinalize() { throw new Error('provider lifecycle must not start') },
    async atomicCancel() { throw new Error('provider lifecycle must not start') },
  }
  return new RealtimeAdmissionService(repository, policy, { now: () => now })
}

test('authenticated bootstrap latch stays closed and source has no provider call surface', async () => {
  assert.equal(AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH, false)
  const source = await readFile(new URL('./lib/realtime-bootstrap.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /createLiveRealtimeCall|api\.openai\.com|OPENAI_API_KEY|\bfetch\s*\(/)
})

test('verified owner reaches exactly intent issuance then atomic reservation', async () => {
  const calls = []
  const result = await prepareAuthenticatedRealtimeBootstrap(
    request(),
    await runtime(),
    admittedService(calls),
  )
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.verifiedUserId, userId)
  assert.equal(result.value.assessmentSessionId, sessionId)
  assert.equal(result.value.reservation.id, reservationId)
  assert.equal(result.value.sdp.startsWith('v=0'), true)
  assert.deepEqual(calls.map(call => call.operation), ['issue', 'reserve'])
  assert.equal(calls[1].command.estimatedCents, AI_PATH_REALTIME_BOOTSTRAP_ESTIMATED_CENTS)
  assert.equal(calls[1].command.idempotencyKey, `rt_${intentId.replaceAll('-', '')}`)
  assert.equal(calls[1].command.binding.ownerId, userId)
})

test('retry identity is deterministic from the database-owned single-use intent', () => {
  const intent = { intentId }
  assert.equal(realtimeReservationIdempotencyKey(intent), realtimeReservationIdempotencyKey(intent))
  assert.equal(realtimeReservationIdempotencyKey(intent), 'rt_bbbbbbbbbbbb4bbb8bbbbbbbbbbbbbb1')
  assert.throws(() => realtimeReservationIdempotencyKey({ intentId: 'attacker-key' }))
})

test('anonymous, test-principal, unavailable, and cross-origin requests stop before ownership or admission', async () => {
  const admissionCalls = []
  const admission = {
    async issueIntent() { admissionCalls.push('issue'); throw new Error('must not run') },
    async reserve() { admissionCalls.push('reserve'); throw new Error('must not run') },
  }
  const base = await runtime()
  const cases = [
    [await runtime({ principal: null }), request(), 401],
    [await runtime({ principal: { userId, source: 'test-header' } }), request(), 401],
    [await runtime({ mode: 'memory-test', capability: { ...base.capability, productionReady: false } }), request(), 503],
    [base, request(undefined, 'https://attacker.example'), 403],
  ]
  for (const [candidateRuntime, candidateRequest, status] of cases) {
    const result = await prepareAuthenticatedRealtimeBootstrap(candidateRequest, candidateRuntime, admission)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.response.status, status)
  }
  assert.deepEqual(admissionCalls, [])
})

test('strict body parser rejects unknown keys, malformed UUID, non-SDP, NUL, and oversize offers', async () => {
  const admission = { issueIntent: async () => { throw new Error('must not run') }, reserve: async () => { throw new Error('must not run') } }
  const bodies = [
    { assessmentSessionId: sessionId, sdp: 'v=0\r\n', ownerId: userId },
    { assessmentSessionId: 'not-a-uuid', sdp: 'v=0\r\n' },
    { assessmentSessionId: sessionId, sdp: 'offer' },
    { assessmentSessionId: sessionId, sdp: 'v=0\0' },
    { assessmentSessionId: sessionId, sdp: `v=0\n${'a'.repeat(200_000)}` },
  ]
  for (const body of bodies) {
    const result = await prepareAuthenticatedRealtimeBootstrap(request(body), await runtime(), admission)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.response.status, 400)
  }
})

test('unowned, non-voice, stale-consent, and non-reservable sessions stop before intent issuance', async () => {
  let calls = 0
  const admission = { issueIntent: async () => { calls += 1; throw new Error('must not run') }, reserve: async () => { calls += 1; throw new Error('must not run') } }

  const unowned = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime({ principal: { userId: outsiderId, source: 'supabase' } }), admission)
  assert.equal(unowned.ok, false)
  if (!unowned.ok) assert.equal(unowned.response.status, 404)

  const textService = await sessionService({ ...voiceSession, mode: 'text' })
  const text = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime({ service: textService }), admission)
  assert.equal(text.ok, false)
  if (!text.ok) assert.equal(text.response.status, 409)

  const staleConsentService = await sessionService({ ...voiceSession, consentVersion: AI_PATH_CONSENT_VERSION })
  const staleConsent = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime({ service: staleConsentService }), admission)
  assert.equal(staleConsent.ok, false)
  if (!staleConsent.ok) assert.equal(staleConsent.response.status, 409)

  const endedService = { getOwnedSession: async () => ({
    ...(await (await sessionService()).getOwnedSession({ userId, source: 'supabase' }, sessionId)),
    status: 'complete',
  }) }
  const ended = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime({ service: endedService }), admission)
  assert.equal(ended.ok, false)
  if (!ended.ok) assert.equal(ended.response.status, 409)
  assert.equal(calls, 0)
})

test('owned-session storage errors are normalized and stop before intent issuance', async () => {
  let calls = 0
  const result = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime({
    service: { async getOwnedSession() { throw new Error(`private storage detail for ${userId}`) } },
  }), {
    issueIntent: async () => { calls += 1; throw new Error('must not run') },
    reserve: async () => { calls += 1; throw new Error('must not run') },
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.response.status, 503)
  assert.deepEqual(await result.response.json(), { error: 'authenticated_realtime_unavailable' })
  assert.equal(calls, 0)
})

test('intent failure prevents reserve and normalizes store details', async () => {
  let reserves = 0
  const result = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime(), {
    issueIntent: async () => ({ status: 'denied', reason: 'store_unavailable' }),
    reserve: async () => { reserves += 1; throw new Error('must not run') },
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.response.status, 503)
  assert.deepEqual(await result.response.json(), { error: 'realtime_admission_unavailable' })
  assert.equal(reserves, 0)
})

test('atomic denial remains content-free and never produces a prepared provider input', async () => {
  for (const [reason, status, publicReason] of [
    ['user_daily_budget_exceeded', 429, 'budget_unavailable'],
    ['user_concurrency_exceeded', 409, 'capacity_unavailable'],
    ['store_unavailable', 503, undefined],
  ]) {
    const result = await prepareAuthenticatedRealtimeBootstrap(request(), await runtime(), {
      issueIntent: async ({ binding }) => ({
        status: 'issued',
        intent: createVerifiedRealtimeAdmissionIntent({
          intentId,
          policyId: policy.policyId,
          expiresAt: '2026-07-17T12:02:00.000Z',
        }, binding),
      }),
      reserve: async () => ({ status: 'denied', reason }),
    })
    assert.equal(result.ok, false)
    if (result.ok) continue
    assert.equal(result.response.status, status)
    const body = await result.response.json()
    assert.equal(body.reason, publicReason)
    assert.doesNotMatch(JSON.stringify(body), new RegExp(`${userId}|${sessionId}|${intentId}|${reservationId}`))
  }
})
