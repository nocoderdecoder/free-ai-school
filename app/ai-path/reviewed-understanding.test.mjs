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

test('Diagnostic Studio exposes exactly two local paths with shared voice and typed fields', () => {
  assert.match(advisorSource, /type DiagnosticResult = UseCaseBlueprint \| CapabilityPrescription/)
  assert.match(advisorSource, /I have an AI use case/)
  assert.match(advisorSource, /I want to grow my AI skills/)
  assert.match(advisorSource, /<UseCaseForm/)
  assert.match(advisorSource, /<CapabilityForm/)
  assert.match(advisorSource, /createBrowserMicrophonePreflightController/)
  assert.match(advisorSource, /aria-label=\{`Answer \$\{label\} by voice`\}/)
  assert.match(advisorSource, /<textarea id=\{id\} value=\{value\}/)
  assert.doesNotMatch(advisorSource, /createTextSession|analyzeReviewedAssessment|\bfetch\s*\(/)
})

test('the two six-section paths produce distinct result scenes with edit and restart controls', () => {
  assert.match(advisorSource, /USE_CASE_SECTION_IDS/)
  assert.match(advisorSource, /CAPABILITY_SECTION_IDS/)
  assert.match(advisorSource, /data-path="use-case"/)
  assert.match(advisorSource, /data-path="capability-growth"/)
  assert.match(advisorSource, /data-result-kind=\{result\.kind\}/)
  assert.match(advisorSource, /Use-case blueprint/)
  assert.match(advisorSource, /Capability prescription/)
  assert.match(advisorSource, /← Edit diagnostic/)
  assert.match(advisorSource, /Start a new diagnostic/)
  assert.match(advisorSource, /No service, course or paid tool was activated/)
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
