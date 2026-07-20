import assert from 'node:assert/strict'
import test from 'node:test'

import { AIPathApiError, buildAnalysisPayload, createTextSession, createVoiceSession, deleteOwnedSession, exportOwnedSession } from './api.ts'
import { createVoiceConsent } from './realtime-consent.ts'

test('client sends reviewed inputs but cannot assign skill evidence', () => {
  const payload = buildAnalysisPayload({
    assessmentSessionId: 'session-123',
    goal: 'Build a repeatable AI-assisted research workflow with reliable citations.',
    goalType: 'workflows',
    weeklyHours: 3,
    codingComfort: 'Some, but I prefer no-code first',
    reviewedInputs: [
      { id: 'goal', value: 'I want to ship a cited weekly research brief.' },
      { id: 'starting-point', value: 'I summarize sources manually and lose claim-to-source links.', source: 'voice-transcript' },
      { id: 'constraint', value: 'I can work in three short sessions each week.' },
    ],
  })

  assert.equal(payload.weeklyHours, 3)
  assert.equal(payload.codingPreference, 'no-code')
  assert.equal(payload.assessmentSessionId, 'session-123')
  assert.equal(payload.reviewedInputs.length, 3)
  assert.equal(payload.reviewedInputs[1].source, 'voice-transcript')
  assert.equal('source' in payload.reviewedInputs[0], false)
  assert.equal('evidence' in payload, false)
  assert.equal('targetLevels' in payload, false)
})

test('client bounds weekly time without inventing assessment results', () => {
  const payload = buildAnalysisPayload({
    goal: 'Explore useful AI workflows without pretending I have prior evidence.',
    goalType: 'new-future-track',
    weeklyHours: 100,
    codingComfort: 'Professional software engineer',
    reviewedInputs: [],
  })

  assert.equal(payload.weeklyHours, 20)
  assert.equal(payload.codingPreference, 'code-ready')
  assert.equal(payload.goalType, 'new-future-track')
  assert.deepEqual(payload.reviewedInputs, [])

  const beginner = buildAnalysisPayload({
    goal: 'Understand how to improve a useful work process with AI.',
    goalType: 'workflows',
    weeklyHours: 1,
    codingComfort: 'No coding yet',
    reviewedInputs: [],
  })
  assert.equal(beginner.codingPreference, 'no-code')
})

test('session creation sends affirmative consent metadata and returns ownership capability', async () => {
  const previousFetch = globalThis.fetch
  const previousNavigator = globalThis.navigator
  let request
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-GB' } })
  globalThis.fetch = async (url, options) => {
    request = { url, options }
    return Response.json({
      session: { id: 'session-123', status: 'consented', createdAt: '2026-07-17T00:00:00.000Z', mode: 'text', locale: 'en-GB', goal: 'Ship a workflow', goalType: 'workflows', targetRole: 'Operator', consentVersion: '2026-07-17.private-alpha.v1', saveTranscript: false },
      owned: false,
      persistence: 'ephemeral-memory',
      productionReady: false,
    })
  }
  try {
    const result = await createTextSession({ goal: 'Ship a workflow', goalType: 'workflows', targetRole: 'Operator' })
    const body = JSON.parse(request.options.body)
    assert.equal(request.url, '/api/ai-path/session')
    assert.equal(request.options.method, 'POST')
    assert.equal(body.locale, 'en-GB')
    assert.equal(body.mode, 'text')
    assert.equal(body.goalType, 'workflows')
    assert.equal(body.saveTranscript, false)
    assert.equal(result.owned, false)
    assert.equal(result.persistence, 'ephemeral-memory')
  } finally {
    globalThis.fetch = previousFetch
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator })
  }
})

test('voice session creation requires current explicit consent and records a voice envelope without provider work', async () => {
  const previousFetch = globalThis.fetch
  const previousNavigator = globalThis.navigator
  const requests = []
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-US' } })
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    return Response.json({
      session: { id: 'voice-123', status: 'consented', createdAt: '2026-07-17T00:00:00.000Z', mode: 'voice', locale: 'en-US', goal: 'Ship a reliable workflow', goalType: 'workflows', targetRole: 'Operator', consentVersion: '2026-07-17.voice.v1', saveTranscript: false },
      owned: true,
      persistence: 'supabase-postgres',
      productionReady: true,
    }, { status: 201 })
  }
  try {
    await assert.rejects(
      createVoiceSession({ goal: 'Ship a reliable workflow', goalType: 'workflows', targetRole: 'Operator', consent: null }),
      error => error instanceof AIPathApiError && error.status === 400,
    )
    assert.equal(requests.length, 0)

    const consent = createVoiceConsent({ audioStreamingAccepted: true, transcriptReviewAccepted: true })
    const result = await createVoiceSession({ goal: 'Ship a reliable workflow', goalType: 'workflows', targetRole: 'Operator', consent })
    assert.equal(result.session.mode, 'voice')
    assert.equal(result.owned, true)
    const body = JSON.parse(requests[0].options.body)
    assert.equal(body.mode, 'voice')
    assert.equal(body.consentVersion, consent.version)
    assert.equal(body.saveTranscript, false)
  } finally {
    globalThis.fetch = previousFetch
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator })
  }
})

test('owner export and deletion encode the session identifier and use no-store requests', async () => {
  const previousFetch = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options })
    if (options.method === 'DELETE') return Response.json({ deleted: true, sessionId: 'session/123' })
    return Response.json({ exportedAt: '2026-07-17T00:00:00.000Z', persistence: 'ephemeral-memory', session: {} })
  }
  try {
    await exportOwnedSession('session/123')
    await deleteOwnedSession('session/123')
    assert.deepEqual(requests.map(request => request.url), ['/api/ai-path/session/session%2F123', '/api/ai-path/session/session%2F123'])
    assert.deepEqual(requests.map(request => request.options.method), ['GET', 'DELETE'])
    assert.ok(requests.every(request => request.options.cache === 'no-store'))
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('API errors expose a safe recovery message without leaking server configuration', async () => {
  const previousFetch = globalThis.fetch
  const previousNavigator = globalThis.navigator
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { language: 'en-US' } })
  globalThis.fetch = async () => Response.json({ error: 'authenticated_alpha_unavailable', internalReason: 'secret configuration details' }, { status: 503 })
  try {
    await assert.rejects(
      createTextSession({ goal: 'Ship a workflow', goalType: 'workflows', targetRole: 'Operator' }),
      error => error instanceof AIPathApiError && error.status === 503 && !error.message.includes('secret')
    )
  } finally {
    globalThis.fetch = previousFetch
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: previousNavigator })
  }
})
