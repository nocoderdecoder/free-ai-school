import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  MINIMUM_REVIEWED_INPUTS,
  activeReviewedInputs,
  canRemoveReviewedInput,
  reviewedUnderstandingTelemetry,
} from './lib/reviewed-understanding.ts'

const inputs = [
  { id: 'goal', value: 'Ship a reliable weekly research workflow.' },
  { id: 'evidence-1', value: 'I built and checked a source-backed brief.' },
  { id: 'constraint', value: 'I have two hours each week.' },
]

const advisorSource = readFileSync(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')

test('first-use intake starts blank and keeps the learner journey to four plain-language stages', () => {
  assert.match(advisorSource, /const GOAL_TYPE: AiPathGoalType = 'workflows'/)
  assert.match(advisorSource, /type Stage = 'start' \| 'conversation' \| 'confirm' \| 'path'/)
  assert.match(advisorSource, /What would you like AI to help you do better\?/)
  assert.match(advisorSource, /Start typed conversation/)
  assert.match(advisorSource, /const \[goal, setGoal\] = useState\(''\)/)
  assert.match(advisorSource, /const \[role, setRole\] = useState\(''\)/)
  assert.match(advisorSource, /const \[experience, setExperience\] = useState\(''\)/)
  assert.match(advisorSource, /const \[constraint, setConstraint\] = useState\(''\)/)
  assert.equal((advisorSource.match(/placeholder="For example:/g) ?? []).length, 1)
  assert.doesNotMatch(advisorSource, /Workflow-builder private alpha|goalOptions/)
})

test('confirmation keeps three editable summaries and makes detailed evidence optional', () => {
  assert.equal((advisorSource.match(/data-testid="confirmation-part"/g) ?? []).length, 3)
  assert.match(advisorSource, /Here’s what I heard/)
  assert.match(advisorSource, /aria-label="Your goal"/)
  assert.match(advisorSource, /aria-label="What you have tried"/)
  assert.match(advisorSource, /Review conversation details/)
  assert.match(advisorSource, /const reviewedInputs = \[/)
  assert.match(advisorSource, /\.\.\.Object\.entries\(reviewAnswers\)/)
  assert.doesNotMatch(advisorSource, /Edit this|Remove from report|Restore interpretation/)
})

test('removed and blank interpretations never cross the reviewed-input boundary', () => {
  const withBlank = [...inputs, { id: 'blank', value: '   ' }]
  assert.deepEqual(
    activeReviewedInputs(withBlank, { 'evidence-1': true }).map(input => input.id),
    ['goal', 'constraint'],
  )
})

test('removal preserves the minimum valid reviewed inputs and restore re-enables an item', () => {
  assert.equal(MINIMUM_REVIEWED_INPUTS, 2)
  assert.equal(canRemoveReviewedInput(inputs, {}, 'evidence-1'), true)

  const removed = { 'evidence-1': true }
  assert.equal(canRemoveReviewedInput(inputs, removed, 'goal'), false)
  assert.equal(activeReviewedInputs(inputs, removed).length, 2)
  assert.equal(activeReviewedInputs(inputs, {}).length, 3)
})

test('correction telemetry is deterministic, bounded to known ids, and content-free', () => {
  assert.deepEqual(
    reviewedUnderstandingTelemetry(
      inputs,
      { goal: true, unknown: true },
      { 'evidence-1': true, missing: true },
    ),
    { correctionCount: 1, removedObservationCount: 1 },
  )
})
