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

test('AI Path exposes exactly two constrained adaptive paths and explicit microphone consent', () => {
  assert.match(advisorSource, /type DiagnosticResult = UseCaseBlueprint \| CapabilityPrescription/)
  assert.match(advisorSource, /I have a task or idea/)
  assert.match(advisorSource, /I want to improve my AI skills/)
  assert.match(advisorSource, /<UseCaseForm/)
  assert.match(advisorSource, /<CapabilityForm/)
  assert.match(advisorSource, /createBrowserMicrophonePreflightController/)
  assert.match(advisorSource, /Test microphone locally/)
  assert.match(advisorSource, /does not transcribe or submit audio/)
  assert.match(advisorSource, /<textarea id=\{id\} value=\{value\}/)
  assert.match(advisorSource, /requestAdaptiveQuestion/)
  assert.match(advisorSource, /localAdaptiveQuestionDecision/)
  assert.doesNotMatch(advisorSource, /createTextSession|analyzeReviewedAssessment|ai-learning-compass|\bfetch\s*\(/)
})

test('the progressive form retains six semantic sections and explicit navigation', () => {
  assert.match(advisorSource, /USE_CASE_SECTION_IDS/)
  assert.match(advisorSource, /CAPABILITY_SECTION_IDS/)
  assert.match(advisorSource, /data-path="use-case"/)
  assert.match(advisorSource, /data-path="capability-growth"/)
  assert.match(advisorSource, /data-section-id=\{id\}/)
  assert.match(advisorSource, /className="ap-ds-progress"/)
  assert.match(advisorSource, />Back</)
  assert.match(advisorSource, /'Continue'/)
  assert.match(advisorSource, /Create my project plan/)
  assert.match(advisorSource, /Create my learning plan/)
  assert.match(advisorSource, /I use AI for everyday tasks/)
  assert.match(advisorSource, /writing and editing, email drafting, research, summaries/)
  assert.match(advisorSource, /I have created repeatable AI workflows/)
  assert.match(advisorSource, /Use AI better in my everyday work/)
  assert.match(advisorSource, /Save time by automating repeated work/)
  assert.match(advisorSource, /Help me discover what would suit me/)
  assert.match(advisorSource, /Choose a main goal and, optionally, one secondary goal/)
  assert.match(advisorSource, /limit=\{2\}/)
  assert.match(advisorSource, /exclusiveValue="discover-fit"/)
  assert.match(advisorSource, /setClarifierAnswerBaselines\(current =>/)
  assert.match(advisorSource, /ids\.slice\(changedIndex\)/)
  assert.match(advisorSource, /delete next\[id\]/)
  assert.doesNotMatch(advisorSource, /Understand models more deeply/)
  assert.doesNotMatch(advisorSource, /ap-level-/)
})

test('the two paths produce distinct result scenes with edit and restart controls', () => {
  assert.match(advisorSource, /data-result-kind=\{result\.kind\}/)
  assert.match(advisorSource, /result\.kind === 'use-case-blueprint'/)
  assert.match(advisorSource, /← Edit my answers/)
  assert.match(advisorSource, /Start over/)
  assert.match(advisorSource, /No account, course, paid tool or outside service was activated/)
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
