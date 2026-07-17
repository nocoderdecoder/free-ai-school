import assert from 'node:assert/strict'
import test from 'node:test'

import { scoreSkills, validateEvidenceAgainstTranscript } from './lib/foundation.ts'
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

test('later reviewed ownership denials contradict earlier evidence instead of being ignored', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Build a workflow I can own and improve.' },
      { id: 'evidence-1', value: 'I personally built and owned the customer research workflow.' },
      { id: 'evidence-2', value: 'I did not build or own it; someone else built it.' },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const workflowEvidence = parsed.value.evidence.filter(item => item.skillId === 'workflow-design')
  assert.equal(workflowEvidence.filter(item => !item.contradiction).length, 1)
  assert.equal(workflowEvidence.filter(item => item.contradiction).length, 1)
  assert.equal(workflowEvidence.find(item => item.contradiction)?.quote, 'I did not build or own it;')
  const workflowResult = scoreSkills(parsed.value.evidence).find(item => item.skillId === 'workflow-design')
  assert.equal(workflowResult.confidence, 'low')
  assert.equal(workflowResult.status, 'not_assessed')
  assert.equal(workflowResult.level, null)
  assert.equal(workflowResult.contradictionIds.length, 1)
})

test('natural role-responsibility phrasing produces conservative auditable evidence', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 4,
    reviewedInputs: [
      { id: 'goal', value: 'Make our customer brief more reliable.' },
      {
        id: 'evidence-1',
        value: 'In my last role, I was responsible for a source-grounded customer brief. I checked every claim against the original documents and kept its citations.',
      },
      { id: 'constraint', value: 'I can work on this on Fridays.' },
    ],
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.ok(parsed.value.evidence.some(item => item.skillId === 'data-retrieval'))
  assert.ok(parsed.value.evidence.some(item => item.skillId === 'evaluation-reliability'))
  assert.ok(parsed.value.evidence.every(item => parsed.value.transcriptTurns.some(turn => turn.text.includes(item.quote))))
})

test('separate reviewed examples produce multiple uniquely identified evidence items per skill', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'workflows',
    weeklyHours: 4,
    reviewedInputs: [
      { id: 'goal', value: 'Improve a recurring customer workflow.' },
      { id: 'evidence-1', value: 'I mapped the intake workflow and its approval handoff.' },
      { id: 'evidence-2', value: 'I redesigned the same workflow after reviewing failed handoffs.' },
      { id: 'constraint', value: 'I have four hours each week.' },
    ],
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const workflowEvidence = parsed.value.evidence.filter(item => item.skillId === 'workflow-design' && !item.contradiction)
  assert.equal(workflowEvidence.length, 2)
  assert.equal(new Set(workflowEvidence.map(item => item.id)).size, 2)
  assert.deepEqual(workflowEvidence.map(item => item.sourceTurnIds[0]), ['review-evidence-1', 'review-evidence-2'])
})

test('shipped stages are reachable only from multiple strong transcript-auditable examples', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'builder',
    weeklyHours: 6,
    reviewedInputs: [
      { id: 'goal', value: 'Improve the reliability of a production AI workflow.' },
      { id: 'evidence-1', value: 'I owned and shipped a production evaluation dashboard with a 120-example test set that blocked 4 regressions before release.' },
      { id: 'evidence-2', value: 'I maintained release gates and failure handling for the live evaluation pipeline; weekly monitoring reduced escaped defects by 30 percent.' },
      { id: 'constraint', value: 'I have six hours each week.' },
    ],
  })

  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const evaluationEvidence = parsed.value.evidence.filter(item => item.skillId === 'evaluation-reliability' && !item.contradiction)
  assert.equal(evaluationEvidence.length, 2)
  assert.ok(evaluationEvidence.every(item => item.observedLevel === 3 && item.strength === 'strong'))
  assert.equal(validateEvidenceAgainstTranscript(parsed.value.evidence, parsed.value.transcriptTurns).ok, true)
  assert.equal(scoreSkills(parsed.value.evidence).find(item => item.skillId === 'evaluation-reliability')?.level, 3)

  const singleExampleResult = scoreSkills([evaluationEvidence[0]]).find(item => item.skillId === 'evaluation-reliability')
  assert.notEqual(singleExampleResult?.level, 3)
})

test('reviewed input provenance defaults to typed and preserves validated voice transcript sources', () => {
  const parsed = parseReviewedAssessment({
    goalType: 'builder',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Build a source-backed workflow.' },
      { id: 'evidence-1', value: 'I built a cited workflow with a review handoff.', source: 'voice-transcript' },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  assert.equal(parsed.value.transcriptTurns[0].source, 'typed-response')
  assert.equal(parsed.value.transcriptTurns[1].source, 'voice-transcript')
  assert.ok(parsed.value.evidence.filter(item => item.sourceTurnIds.includes('review-evidence-1')).every(item => item.source === 'voice-transcript'))

  const invalid = parseReviewedAssessment({
    goalType: 'builder',
    weeklyHours: 3,
    reviewedInputs: [
      { id: 'goal', value: 'Build a source-backed workflow.', source: 'model-inferred' },
      { id: 'constraint', value: 'I have three hours each week.' },
    ],
  })
  assert.equal(invalid.ok, false)
  assert.match(invalid.errors.join(' '), /source is invalid/)
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
