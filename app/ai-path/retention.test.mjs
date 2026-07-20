import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAiPathRetentionPost } from './lib/retention-http.ts'
import { AiPathRetentionError, runAiPathRetentionCycle } from './lib/retention.ts'

const now = () => new Date('2026-07-17T03:00:00.000Z')

test('retention cycle purges both bounded targets and emits content-free completion', async () => {
  const order = []
  const events = []
  const result = await runAiPathRetentionCycle([
    { target: 'assessment-sessions', purgeExpired: async () => { order.push('sessions'); return 2 } },
    { target: 'learning-plans', purgeExpired: async () => { order.push('plans'); return 3 } },
  ], {
    runId: 'retention_testcycle01',
    now,
    onOperationalEvent: event => events.push(event),
  })
  assert.deepEqual(order, ['plans', 'sessions'])
  assert.deepEqual(result.deleted, { 'assessment-sessions': 2, 'learning-plans': 3 })
  assert.deepEqual(events, [{
    kind: 'retention_cycle_completed',
    occurredAt: now().toISOString(),
    runId: 'retention_testcycle01',
    deleted: { 'assessment-sessions': 2, 'learning-plans': 3 },
  }])
  assert.equal(JSON.stringify(events).includes('transcript'), false)
})

test('retention fails closed for missing targets, store errors, and invalid counts', async () => {
  await assert.rejects(
    runAiPathRetentionCycle([{ target: 'assessment-sessions', purgeExpired: async () => 0 }], { runId: 'retention_missing01' }),
    error => error instanceof AiPathRetentionError && error.code === 'invalid_configuration',
  )
  const events = []
  await assert.rejects(runAiPathRetentionCycle([
    { target: 'assessment-sessions', purgeExpired: async () => 0 },
    { target: 'learning-plans', purgeExpired: async () => { throw new Error('database details must not escape') } },
  ], { runId: 'retention_failure01', now, onOperationalEvent: event => events.push(event) }), error => (
    error instanceof AiPathRetentionError && error.code === 'purge_failed' && !error.message.includes('database')
  ))
  assert.equal(events[0].errorCode, 'purge_failed')

  await assert.rejects(runAiPathRetentionCycle([
    { target: 'assessment-sessions', purgeExpired: async () => 0 },
    { target: 'learning-plans', purgeExpired: async () => 1_000_001 },
  ], { runId: 'retention_badcount01' }), error => error instanceof AiPathRetentionError && error.code === 'invalid_delete_count')
})

test('retention HTTP boundary is unavailable by default and authenticates enabled jobs', async () => {
  const request = new Request('https://app.example/api/cron/ai-path-retention', { method: 'POST' })
  const unavailable = await handleAiPathRetentionPost(request, { available: false, secret: null, run: async () => assert.fail() })
  assert.equal(unavailable.status, 503)
  assert.deepEqual(await unavailable.json(), { error: 'retention_job_unavailable' })

  const secret = 'test-retention-secret-1234567890'
  const enabled = { available: true, secret, run: async runId => ({ runId, completedAt: now().toISOString(), deleted: { 'assessment-sessions': 1, 'learning-plans': 1 } }) }
  assert.equal((await handleAiPathRetentionPost(request, enabled)).status, 401)
  const authorized = await handleAiPathRetentionPost(new Request(request.url, { method: 'POST', headers: { authorization: `Bearer ${secret}` } }), enabled)
  assert.equal(authorized.status, 200)
  const body = await authorized.json()
  assert.equal(body.ok, true)
  assert.match(body.runId, /^retention_[a-f0-9]{32}$/)
})

test('retention route activation remains a non-configurable code gate', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(new URL('../api/cron/ai-path-retention/route.ts', import.meta.url), 'utf8'))
  assert.match(source, /AI_PATH_RETENTION_JOB_READY = false as const/)
})
