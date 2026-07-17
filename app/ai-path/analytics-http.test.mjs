import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAnalyticsEventRequest } from './lib/analytics-http.ts'
import {
  AI_PATH_ANALYTICS_MAX_BODY_BYTES,
  InMemoryPrivacySafeAnalyticsSink,
  PrivacySafeAnalyticsService,
} from './lib/analytics.ts'

const requestURL = 'http://127.0.0.1:3022/api/ai-path/events'
const origin = 'http://127.0.0.1:3022'
const now = new Date('2026-07-17T03:00:00.000Z')

function validEvent(overrides = {}) {
  return {
    measurementVersion: '2026-07-16.v1',
    eventName: 'landing_viewed',
    occurredAt: now.toISOString(),
    anonymousId: 'anon_http-user-01',
    assessmentSessionId: null,
    properties: { audience: 'workflow-builder-alpha', source: 'direct' },
    ...overrides,
  }
}

function request(body, options = {}) {
  return new Request(requestURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: options.origin ?? origin,
      ...(options.headers ?? {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function runtime(service) {
  return {
    available: Boolean(service),
    mode: service ? 'memory-test' : 'disabled',
    reason: service ? 'test' : 'disabled',
    service,
  }
}

test('analytics intake requires an exact same-origin browser request', async () => {
  const noOrigin = new Request(requestURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validEvent()),
  })
  const missing = await handleAnalyticsEventRequest(noOrigin, runtime(null))
  assert.equal(missing.status, 403)
  assert.deepEqual(await missing.json(), { error: 'origin_required' })

  const crossOrigin = await handleAnalyticsEventRequest(
    request(validEvent(), { origin: 'https://attacker.example' }),
    runtime(null),
  )
  assert.equal(crossOrigin.status, 403)
  assert.deepEqual(await crossOrigin.json(), { error: 'cross_origin_request_rejected' })
})

test('analytics intake bounds streamed JSON before validation or sink access', async () => {
  const service = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const oversized = request(`{"padding":"${'x'.repeat(AI_PATH_ANALYTICS_MAX_BODY_BYTES)}"}`)
  const response = await handleAnalyticsEventRequest(oversized, runtime(service))
  assert.equal(response.status, 413)
  assert.deepEqual(await response.json(), { error: 'request_too_large' })
  assert.equal(service.operationalSnapshot().received, 0)
})

test('disabled intake returns a stable unavailable error without external fallback', async () => {
  const response = await handleAnalyticsEventRequest(request(validEvent()), runtime(null))
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { error: 'analytics_unavailable' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('accepted events and exact retries return content-free 202 responses', async () => {
  const service = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const first = await handleAnalyticsEventRequest(request(validEvent()), runtime(service))
  assert.equal(first.status, 202)
  assert.deepEqual(await first.json(), { accepted: true, duplicate: false })
  const replay = await handleAnalyticsEventRequest(request(validEvent()), runtime(service))
  assert.equal(replay.status, 202)
  assert.deepEqual(await replay.json(), { accepted: false, duplicate: true })
})

test('validation errors never echo attacker-controlled fields or values', async () => {
  const service = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const malicious = {
    ...validEvent(),
    transcript: 'my private answer and learner@example.com',
    properties: {
      audience: 'workflow-builder-alpha',
      source: 'direct',
      employerName: 'Secret Customer Incorporated',
    },
  }
  const response = await handleAnalyticsEventRequest(request(malicious), runtime(service))
  assert.equal(response.status, 400)
  const serialized = JSON.stringify(await response.json())
  assert.equal(serialized, '{"error":"invalid_event"}')
  assert.doesNotMatch(serialized, /private|learner|secret|customer|employer|transcript/i)
})

test('event-time and sink failures map to stable public status codes', async () => {
  const ordinary = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const stale = await handleAnalyticsEventRequest(request(validEvent({
    occurredAt: '2025-01-01T00:00:00.000Z',
  })), runtime(ordinary))
  assert.equal(stale.status, 422)
  assert.deepEqual(await stale.json(), { error: 'event_time_out_of_bounds' })

  const failing = new PrivacySafeAnalyticsService({
    async append() { throw new Error('secret sink detail') },
    async readAll() { return [] },
    async deleteByAnonymousId() { return 0 },
  }, { now: () => now })
  const failure = await handleAnalyticsEventRequest(request(validEvent()), runtime(failing))
  assert.equal(failure.status, 503)
  const body = JSON.stringify(await failure.json())
  assert.equal(body, '{"error":"sink_error"}')
  assert.doesNotMatch(body, /secret|detail/i)
})

test('every response is private no-store and nosniff', async () => {
  const service = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const response = await handleAnalyticsEventRequest(request(validEvent()), runtime(service))
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})
