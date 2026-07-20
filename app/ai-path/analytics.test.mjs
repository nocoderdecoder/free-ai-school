import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH,
  AI_PATH_DELETION_LATENCY_TARGET_MS,
  AI_PATH_EVENT_MAX_AGE_MS,
  AI_PATH_EVENT_MAX_FUTURE_SKEW_MS,
  InMemoryPrivacySafeAnalyticsSink,
  PrivacySafeAnalyticsService,
  resolveAnalyticsCapability,
} from './lib/analytics.ts'

const now = new Date('2026-07-17T03:00:00.000Z')
const serverSource = await readFile(new URL('./lib/analytics.server.ts', import.meta.url), 'utf8')
const routeSource = await readFile(new URL('../api/ai-path/events/route.ts', import.meta.url), 'utf8')

function event(overrides = {}) {
  return {
    measurementVersion: '2026-07-16.v1',
    eventName: 'landing_viewed',
    occurredAt: now.toISOString(),
    anonymousId: 'anon_qa-user-0001',
    assessmentSessionId: null,
    properties: {
      audience: 'workflow-builder-alpha',
      source: 'direct',
    },
    ...overrides,
  }
}

test('production analytics remains closed regardless of deployment flags', () => {
  assert.equal(AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH, false)
  const capability = resolveAnalyticsCapability({
    nodeEnv: 'production',
    store: 'memory-test',
    enableTestSink: 'true',
  })
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.match(capability.reason, /latch remains closed/i)
})

test('server and route source contain no external sink, paid call, or body logging path', () => {
  const source = `${serverSource}\n${routeSource}`
  assert.doesNotMatch(source, /\bfetch\s*\(|axios|createClient|service[_-]?role/i)
  assert.doesNotMatch(source, /console\.|logger\.|request\.(json|text|formData)\s*\(/i)
  assert.match(serverSource, /AI_PATH_ANALYTICS_STORE/)
  assert.match(serverSource, /AI_PATH_ENABLE_TEST_ANALYTICS/)
  assert.match(routeSource, /handleAnalyticsEventRequest/)
})

test('process-local sink requires both explicit non-production test gates', () => {
  assert.equal(resolveAnalyticsCapability({ nodeEnv: 'test' }).available, false)
  assert.equal(resolveAnalyticsCapability({
    store: 'memory-test',
    enableTestSink: 'true',
  }).available, false)
  assert.equal(resolveAnalyticsCapability({
    nodeEnv: 'test',
    store: 'memory-test',
  }).available, false)
  const enabled = resolveAnalyticsCapability({
    nodeEnv: 'test',
    store: 'memory-test',
    enableTestSink: 'true',
  })
  assert.equal(enabled.mode, 'memory-test')
  assert.equal(enabled.available, true)
  assert.equal(enabled.productionReady, false)
})

test('valid governed events are accepted once and exact replays are idempotent', async () => {
  const sink = new InMemoryPrivacySafeAnalyticsSink()
  const service = new PrivacySafeAnalyticsService(sink, { now: () => now })
  assert.deepEqual(await service.ingest(event()), {
    ok: true,
    accepted: true,
    duplicate: false,
  })
  assert.deepEqual(await service.ingest(event()), {
    ok: true,
    accepted: false,
    duplicate: true,
  })
  assert.equal((await sink.readAll()).length, 1)
  assert.deepEqual(service.operationalSnapshot(), {
    received: 2,
    accepted: 1,
    duplicates: 1,
    rejected: { invalid_event: 0, event_time_out_of_bounds: 0, sink_error: 0 },
    deletions: {
      requested: 0,
      completed: 0,
      failed: 0,
      targetBreaches: 0,
      maximumLatencyMs: 0,
      averageLatencyMs: null,
    },
  })
})

test('intake rejects unknown envelopes and free-form or identifying content', async () => {
  const sink = new InMemoryPrivacySafeAnalyticsSink()
  const service = new PrivacySafeAnalyticsService(sink, { now: () => now })
  assert.deepEqual(await service.ingest({ ...event(), transcript: 'private learner answer' }), {
    ok: false,
    reason: 'invalid_event',
  })
  assert.deepEqual(await service.ingest(event({
    properties: {
      audience: 'workflow-builder-alpha',
      source: 'direct',
      email: 'learner@example.com',
    },
  })), { ok: false, reason: 'invalid_event' })
  assert.equal((await sink.readAll()).length, 0)
  const operations = JSON.stringify(service.operationalSnapshot())
  assert.doesNotMatch(operations, /private|learner|example\.com|transcript|email/i)
})

test('event-time bounds reject stale and future events at deterministic limits', async () => {
  const service = new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
    { now: () => now },
  )
  const stale = new Date(now.getTime() - AI_PATH_EVENT_MAX_AGE_MS - 1).toISOString()
  const future = new Date(now.getTime() + AI_PATH_EVENT_MAX_FUTURE_SKEW_MS + 1).toISOString()
  assert.deepEqual(await service.ingest(event({ occurredAt: stale })), {
    ok: false,
    reason: 'event_time_out_of_bounds',
  })
  assert.deepEqual(await service.ingest(event({ occurredAt: future })), {
    ok: false,
    reason: 'event_time_out_of_bounds',
  })
  assert.equal(service.operationalSnapshot().rejected.event_time_out_of_bounds, 2)
})

test('privacy deletion removes opaque-id events and records content-free latency', async () => {
  const sink = new InMemoryPrivacySafeAnalyticsSink()
  const service = new PrivacySafeAnalyticsService(sink, { now: () => now })
  await service.ingest(event())
  await service.ingest(event({
    anonymousId: 'anon_other-user-02',
    occurredAt: '2026-07-17T02:59:59.000Z',
  }))
  const requestedAt = new Date(now.getTime() - AI_PATH_DELETION_LATENCY_TARGET_MS - 1).toISOString()
  const deletion = await service.deleteAnonymousEvents('anon_qa-user-0001', requestedAt)
  assert.deepEqual(deletion, {
    ok: true,
    deleted: 1,
    latencyMs: AI_PATH_DELETION_LATENCY_TARGET_MS + 1,
  })
  const remaining = await sink.readAll()
  assert.equal(remaining.length, 1)
  assert.equal(remaining[0].anonymousId, 'anon_other-user-02')
  const operations = service.operationalSnapshot()
  assert.deepEqual(operations.deletions, {
    requested: 1,
    completed: 1,
    failed: 0,
    targetBreaches: 1,
    maximumLatencyMs: AI_PATH_DELETION_LATENCY_TARGET_MS + 1,
    averageLatencyMs: AI_PATH_DELETION_LATENCY_TARGET_MS + 1,
  })
  assert.doesNotMatch(JSON.stringify(operations), /anon_/)
})

test('metrics foundation computes governed cohort metrics from accepted events', async () => {
  const sink = new InMemoryPrivacySafeAnalyticsSink()
  const service = new PrivacySafeAnalyticsService(sink, { now: () => now })
  const sessionId = 'assessment_session-0001'
  await service.ingest(event({
    eventName: 'assessment_started',
    assessmentSessionId: sessionId,
    properties: { audience: 'workflow-builder-alpha', mode: 'text' },
  }))
  await service.ingest(event({
    eventName: 'assessment_completed',
    assessmentSessionId: sessionId,
    occurredAt: '2026-07-17T03:00:01.000Z',
    properties: { audience: 'workflow-builder-alpha', mode: 'text', durationSeconds: 90 },
  }))
  const metrics = await service.computeMetrics({
    start: '2026-07-17T00:00:00.000Z',
    end: '2026-07-18T00:00:00.000Z',
  })
  assert.equal(metrics.ok, true)
  if (!metrics.ok) return
  assert.equal(metrics.value.counts.assessmentStartedSessions, 1)
  assert.equal(metrics.value.counts.assessmentCompletedSessions, 1)
  assert.equal(metrics.value.rates.assessmentCompletionRate, 1)
  assert.equal(metrics.value.targetStatus.assessmentCompletion, 'met')
})

test('sink failures become stable counters without leaking exception text', async () => {
  const service = new PrivacySafeAnalyticsService({
    async append() { throw new Error('private database connection and payload') },
    async readAll() { return [] },
    async deleteByAnonymousId() { return 0 },
  }, { now: () => now })
  assert.deepEqual(await service.ingest(event()), { ok: false, reason: 'sink_error' })
  const snapshot = JSON.stringify(service.operationalSnapshot())
  assert.match(snapshot, /sink_error/)
  assert.doesNotMatch(snapshot, /private|database|connection|payload/i)
})
