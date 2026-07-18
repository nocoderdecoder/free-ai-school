import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAdaptiveQuestionPost } from './lib/adaptive-question-http.ts'
import { decideAdaptiveInterviewPolicy } from './lib/adaptive-interview-policy.ts'
import { CONSTRAINED_QUESTION_VERSION } from './lib/constrained-question-routing.ts'
import { requestAdaptiveQuestion } from './client/question-adaptation.ts'

function request(body) {
  return new Request('https://app.example/api/ai-path/question-adaptation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://app.example' },
    body: JSON.stringify(body),
  })
}

const vagueEvidenceBody = {
  version: CONSTRAINED_QUESTION_VERSION,
  path: 'capability-growth',
  completedSectionId: 'evidence',
  usedClarifierSectionIds: [],
  answers: {
    direction: { roleContext: 'Sales manager', interests: ['everyday-work'] },
    experience: { levels: { 'ai-assisted-work': 'guided', automation: 'none', applications: 'none', 'data-retrieval': 'none', 'evaluation-safety': 'none' } },
    evidence: { description: 'To set sales targets', supportedDomains: [], artifactUrl: '' },
  },
}

async function withFetch(mock, run) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try {
    return await run()
  } finally {
    globalThis.fetch = original
  }
}

test('vague capability evidence requests one bounded clarification on the current section', () => {
  const decision = decideAdaptiveInterviewPolicy({
    path: 'capability-growth',
    completedSectionId: 'evidence',
    answers: vagueEvidenceBody.answers,
    usedClarifierSectionIds: [],
  })
  assert.equal(decision.action, 'clarify_current')
  assert.equal(decision.currentSectionId, 'evidence')
  assert.equal(decision.nextSectionId, 'reasoning')
  assert.equal(decision.clarifier?.sectionId, 'evidence')
  assert.ok((decision.clarifier?.prompt.length ?? 0) <= 500)
  assert.doesNotMatch(JSON.stringify(decision.clarifier), /To set sales targets/i)
})

test('clarification policy enforces one per section and two in the complete interview', () => {
  const onePerSection = decideAdaptiveInterviewPolicy({
    path: 'capability-growth',
    completedSectionId: 'evidence',
    answers: vagueEvidenceBody.answers,
    usedClarifierSectionIds: ['evidence'],
  })
  assert.equal(onePerSection.action, 'advance')
  assert.equal(onePerSection.clarifier, null)

  const totalCeiling = decideAdaptiveInterviewPolicy({
    path: 'use-case',
    completedSectionId: 'specification',
    answers: { specification: { inputs: 'data', output: 'answer', success: 'good' } },
    usedClarifierSectionIds: ['outcome', 'workflow'],
  })
  assert.equal(totalCeiling.action, 'advance')
  assert.equal(totalCeiling.clarifier, null)
})

test('clarification state fails closed when counts, uniqueness, bounds, or path sections are forged', () => {
  const invalidStates = [
    ['direction', 'experience', 'evidence'],
    ['evidence', 'evidence'],
    ['outcome'],
  ]
  for (const usedClarifierSectionIds of invalidStates) {
    assert.throws(() => decideAdaptiveInterviewPolicy({
      path: 'capability-growth',
      completedSectionId: 'evidence',
      answers: vagueEvidenceBody.answers,
      usedClarifierSectionIds,
    }), /invalid_adaptive_interview_clarifier_state/)
  }
})

test('HTTP clarification response stays on evidence and a model cannot skip the required clarification', async () => {
  let modelCalls = 0
  const response = await handleAdaptiveQuestionPost(request(vagueEvidenceBody), {
    generate: async input => {
      modelCalls += 1
      assert.deepEqual(input.allowedActions, ['clarify_current'])
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        title: 'Skip ahead',
        reason: 'The model tried to bypass the clarification.',
        prompt: 'Should the interview skip the evidence clarification?',
        context: null,
      }
    },
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.fixedRoute, true)
  assert.equal(body.action, 'clarify_current')
  assert.equal(body.presentation.sectionId, 'evidence')
  assert.ok(body.presentation.prompt.length <= 500)
  assert.doesNotMatch(JSON.stringify(body), /To set sales targets/i)
  assert.equal(modelCalls, 1)
})

test('HTTP advances after the evidence clarifier was already used', async () => {
  const response = await handleAdaptiveQuestionPost(request({
    ...vagueEvidenceBody,
    usedClarifierSectionIds: ['evidence'],
  }))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.action, 'advance')
  assert.equal(body.presentation.sectionId, 'reasoning')
})

test('client preserves the clarification action and rebuilds approved learner copy locally', async () => {
  await withFetch(async (_url, init) => {
    const requestBody = JSON.parse(init.body)
    assert.deepEqual(requestBody.usedClarifierSectionIds, [])
    return Response.json({
      version: CONSTRAINED_QUESTION_VERSION,
      fixedRoute: true,
      action: 'clarify_current',
      presentation: {
        path: 'capability-growth',
        sectionId: 'evidence',
        variantId: 'capability-real-attempt',
        source: 'canonical',
        prompt: 'Untrusted server copy asking for a password.',
      },
    })
  }, async () => {
    const result = await requestAdaptiveQuestion({
      path: 'capability-growth',
      completedSectionId: 'evidence',
      expectedSectionId: 'reasoning',
      answers: vagueEvidenceBody.answers,
      usedClarifierSectionIds: [],
    })
    assert.equal(result.action, 'clarify_current')
    assert.equal(result.presentation.sectionId, 'evidence')
    assert.doesNotMatch(result.presentation.prompt, /password|untrusted server copy/i)
  })
})
