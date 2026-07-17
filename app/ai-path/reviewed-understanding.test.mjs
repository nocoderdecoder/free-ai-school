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

test('workflow-builder intake starts blank and labels every canned example', () => {
  assert.match(advisorSource, /id: 'workflows'/)
  assert.match(advisorSource, /Workflow-builder private alpha/)
  assert.match(advisorSource, /const \[role, setRole\] = useState\(''\)/)
  assert.match(advisorSource, /const \[outcome, setOutcome\] = useState\(''\)/)
  assert.match(advisorSource, /const \[blocker, setBlocker\] = useState\(''\)/)
  assert.equal((advisorSource.match(/placeholder="Example only:/g) ?? []).length, 3)
  assert.doesNotMatch(advisorSource, /setGoal|goalOptions/)
})

test('review cards expose content-free edit, remove, and restore controls', () => {
  assert.match(advisorSource, /'Edit this'/)
  assert.match(advisorSource, /'Remove from report'/)
  assert.match(advisorSource, /'Restore interpretation'/)
  assert.match(advisorSource, /reviewedInputs: activeUnderstanding\.map/)
  assert.match(advisorSource, /reviewTelemetry\.correctionCount, reviewTelemetry\.removedObservationCount/)
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
