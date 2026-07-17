import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAnalysisPayload } from './analysis-payload.ts'

test('client sends reviewed inputs but cannot assign skill evidence', () => {
  const payload = buildAnalysisPayload({
    assessmentSessionId: 'session-123',
    goal: 'Build a repeatable AI-assisted research workflow with reliable citations.',
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'I want to ship a cited weekly research brief.' },
      { id: 'starting-point', value: 'I summarize sources manually and lose claim-to-source links.' },
      { id: 'constraint', value: 'I can work in three short sessions each week.' },
    ],
  })

  assert.equal(payload.weeklyHours, 3)
  assert.equal(payload.assessmentSessionId, 'session-123')
  assert.equal(payload.reviewedInputs.length, 3)
  assert.equal('evidence' in payload, false)
  assert.equal('targetLevels' in payload, false)
})

test('client bounds weekly time without inventing assessment results', () => {
  const payload = buildAnalysisPayload({
    goal: 'Explore useful AI workflows without pretending I have prior evidence.',
    goalType: 'new-future-track',
    weeklyHours: 100,
    reviewedInputs: [],
  })

  assert.equal(payload.weeklyHours, 20)
  assert.equal(payload.goalType, 'new-future-track')
  assert.deepEqual(payload.reviewedInputs, [])
})
