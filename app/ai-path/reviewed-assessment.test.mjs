import assert from 'node:assert/strict'
import test from 'node:test'

import { parseReviewedAssessment } from './lib/reviewed-assessment.ts'

test('server extracts only conservative signals from the experience response', () => {
  const result = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'I want to build a cited weekly brief.' },
      { id: 'starting-point', value: 'I manually review sources, verify citations, and follow the same workflow steps.' },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.timeBudgetHours, 12)
  assert.deepEqual(result.value.evidence.map(item => item.skillId), [
    'workflow-design',
    'data-retrieval',
    'evaluation-reliability',
  ])
  assert.ok(result.value.evidence.every(item => item.observedLevel === 1 && item.strength === 'weak'))
  assert.ok(result.value.evidence.every(item => item.sourceTurnIds[0] === 'review-starting-point'))
})

test('goal and constraints do not count as competency evidence', () => {
  const result = parseReviewedAssessment({
    goalType: 'builder',
    weeklyHours: 2,
    reviewedInputs: [
      { id: 'goal', value: 'I want to deploy an agent with an API and production monitoring.' },
      { id: 'constraint', value: 'I can study twice per week.' },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.value.evidence, [])
})

test('reviewed input boundary rejects duplicates and oversized time budgets', () => {
  const result = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 21,
    reviewedInputs: [
      { id: 'goal', value: 'First goal statement.' },
      { id: 'goal', value: 'Duplicate goal statement.' },
    ],
  })
  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(result.errors.some(error => error.includes('unique')))
  assert.ok(result.errors.some(error => error.includes('weeklyHours')))
})
