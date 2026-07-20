import assert from 'node:assert/strict'
import test from 'node:test'

import { AiPathBrowserAnalytics, weeklyHoursBand } from './analytics.ts'

function fixture(status = 202) {
  const requests = []
  let uuid = 0
  const client = new AiPathBrowserAnalytics({
    fetch: async (url, options) => {
      requests.push({ url, options, event: JSON.parse(options.body) })
      return new Response(null, { status })
    },
    randomUUID: () => `00000000-0000-4000-8000-${String(++uuid).padStart(12, '0')}`,
    now: () => new Date('2026-07-17T06:00:00.000Z'),
  })
  return { client, requests }
}

test('browser analytics emits only governed opaque funnel events', async () => {
  const { client, requests } = fixture()
  await client.landingViewed('direct')
  await client.profileCompleted('builder', weeklyHoursBand('5'))
  await client.assessmentStarted()
  await client.assessmentCompleted(9_999)
  await client.understandingReviewed(2, 3)
  await client.reportViewed()
  await client.planSaved('private-alpha-v1')

  assert.deepEqual(requests.map(request => request.event.eventName), [
    'landing_viewed',
    'profile_completed',
    'assessment_started',
    'assessment_completed',
    'understanding_reviewed',
    'report_viewed',
    'plan_saved',
  ])
  assert.match(requests[0].event.anonymousId, /^anon_[A-Za-z0-9_-]{6,96}$/)
  assert.equal(requests[0].event.assessmentSessionId, null)
  assert.match(requests[2].event.assessmentSessionId, /^assessment_[A-Za-z0-9_-]{6,96}$/)
  assert.equal(requests[3].event.properties.durationSeconds, 3_600)
  assert.equal(requests[4].event.properties.correctionCount, 2)
  assert.equal(requests[4].event.properties.removedObservationCount, 3)
  assert.ok(requests.every(request => request.url === '/api/ai-path/events'))
  assert.ok(requests.every(request => request.options.credentials === 'same-origin' && request.options.keepalive === true))
  const propertyKeys = requests.flatMap(request => Object.keys(request.event.properties))
  assert.ok(propertyKeys.every(key => !/answer|email|goal|name|prompt|role|transcript|url/i.test(key)))
})

test('feedback is numeric, bounded, and cannot accept free-form learner content', async () => {
  const { client, requests } = fixture()
  await client.assessmentStarted()
  await client.feedbackSubmitted(99, -10)
  await client.findingFeedbackSubmitted(3, 50)
  assert.deepEqual(requests[1].event.properties, {
    audience: 'workflow-builder-alpha',
    planFitRating: 5,
    reportUsefulnessRating: 1,
  })
  assert.deepEqual(requests[2].event.properties, {
    audience: 'workflow-builder-alpha',
    totalFindings: 3,
    materiallyWrongFindings: 3,
  })
})

test('disabled and unreachable analytics never interrupt the learner flow', async () => {
  const unavailable = fixture(503).client
  assert.equal(await unavailable.landingViewed(), 'unavailable')
  const unreachable = new AiPathBrowserAnalytics({
    fetch: async () => { throw new Error('offline') },
    randomUUID: () => '11111111-1111-4111-8111-111111111111',
  })
  assert.equal(await unreachable.landingViewed(), 'unavailable')
})

test('deletion is session-free and weekly time maps to governed bands', async () => {
  const { client, requests } = fixture()
  await client.assessmentStarted()
  await client.dataDeleted()
  assert.equal(requests[1].event.assessmentSessionId, null)
  assert.equal(requests[1].event.properties.scope, 'all-preview-data')
  assert.deepEqual(['1', '3', '5', '7'].map(weeklyHoursBand), ['1', '2-3', '4-6', '7-plus'])
})
