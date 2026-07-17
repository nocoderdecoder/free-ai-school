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

test('topic aspirations and explicit non-experience do not become competency evidence', () => {
  const result = parseReviewedAssessment({
    goalType: 'builder',
    weeklyHours: 2,
    reviewedInputs: [
      { id: 'goal', value: 'I want to build a monitored API-backed agent.' },
      { id: 'starting-point', value: 'I want to learn API testing and privacy. I have never built, tested, or deployed an application.' },
      { id: 'constraint', value: 'I have two hours each week.' },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.value.evidence, [])
})

test('owned artifact and observable outcome can support a conservative level-two signal', () => {
  const result = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'I want to improve a recurring research workflow.' },
      { id: 'starting-point', value: 'I personally built a cited research workflow and report that saved 3 hours each week. I tested the output against a checklist and reduced citation errors by 40 percent.' },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.ok(result.value.evidence.length >= 3)
  assert.ok(result.value.evidence.every(item => item.observedLevel === 2))
  assert.ok(result.value.evidence.every(item => item.strength === 'moderate' && item.independence === 'owner'))
  assert.ok(result.value.evidence.every(item => item.artifact && item.outcome))
})

test('a demonstrated artifact cannot lend evidence to later skill aspirations', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Learn agent tools, privacy governance, foundations, and prompting.' },
      {
        id: 'starting-point',
        value: 'I personally built a spreadsheet report that saved 3 hours. I want to learn agent tool calls. I want to understand privacy governance. I want to learn LLM prompting.',
      },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.evidence.map(item => item.skillId), [])
})

test('a demonstrated artifact cannot lend evidence across clauses in one sentence', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Learn agent tools, privacy governance, foundations, and prompting.' },
      {
        id: 'evidence-1',
        value: 'I personally built a spreadsheet report that saved 3 hours, and now I want to learn agent tool calls, privacy governance, and LLM prompting.',
      },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })

  assert.equal(parsed.ok, true)
  assert.deepEqual(parsed.value.evidence.map(item => item.skillId), [])
})

test('adaptive evidence turns remain separate, exact, and independently scoreable', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Build a reliable workflow with explicit quality checks.' },
      { id: 'evidence-1', value: 'I personally mapped a workflow and its review handoff.' },
      { id: 'evidence-2', value: 'I tested the workflow against eight examples and reviewed every failed result.' },
      { id: 'constraint', value: 'Meetings fragment my available time.' },
    ],
  })

  assert.equal(parsed.ok, true)
  assert.equal(parsed.value.inputs.length, 4)
  assert.deepEqual(parsed.value.transcriptTurns.map(turn => turn.text), [
    'Build a reliable workflow with explicit quality checks.',
    'I personally mapped a workflow and its review handoff.',
    'I tested the workflow against eight examples and reviewed every failed result.',
    'Meetings fragment my available time.',
  ])
  assert.ok(parsed.value.evidence.some(item => item.skillId === 'workflow-design'))
  assert.ok(parsed.value.evidence.some(item => item.skillId === 'evaluation-reliability'))
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
