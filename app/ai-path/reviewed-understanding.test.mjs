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

test('first use starts blank and enters a voice-first five-surface journey without form work', () => {
  assert.match(advisorSource, /const GOAL_TYPE: AiPathGoalType = 'workflows'/)
  assert.match(advisorSource, /type VisibleStage = 'welcome' \| 'sound-check' \| 'conversation' \| 'understanding' \| 'path'/)
  assert.match(advisorSource, /GOAL_DISCOVERY_PROMPT = 'What is one part of your work/)
  assert.match(advisorSource, /<WelcomeScreen/)
  assert.match(advisorSource, /<SoundCheckScreen/)
  assert.match(advisorSource, /onType=\{beginTypedConversation\}/)
  assert.match(advisorSource, /const \[goal, setGoal\] = useState\(''\)/)
  assert.match(advisorSource, /const \[role, setRole\] = useState\(''\)/)
  assert.match(advisorSource, /const \[experience, setExperience\] = useState\(''\)/)
  assert.match(advisorSource, /const \[constraint, setConstraint\] = useState\(''\)/)
  assert.doesNotMatch(advisorSource, /Start typed conversation|placeholder="For example:|Workflow-builder private alpha|goalOptions/)
})

test('understanding review keeps three editable summaries and makes detailed evidence optional', () => {
  assert.equal((advisorSource.match(/<SummaryRow/g) ?? []).length, 3)
  assert.match(advisorSource, /data-testid="confirmation-part"/)
  assert.match(advisorSource, /Did I understand you correctly\?/)
  assert.match(advisorSource, /What you want to improve/)
  assert.match(advisorSource, /Where things stand today/)
  assert.match(advisorSource, /What the plan needs to respect/)
  assert.match(advisorSource, /id="ap-review-goal"/)
  assert.match(advisorSource, /id="ap-review-experience"/)
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
