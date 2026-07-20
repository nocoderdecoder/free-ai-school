import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { handleAdaptiveQuestionPost } from './lib/adaptive-question-http.ts'
import {
  CONSTRAINED_QUESTION_VERSION,
  approvedVariantIds,
  selectDeterministicQuestionPresentation,
} from './lib/constrained-question-routing.ts'
import { validateCapabilityIntake, validateUseCaseIntake } from './lib/diagnostic.ts'
import { requestAdaptiveQuestion } from './client/question-adaptation.ts'

function request(body, origin = 'https://app.example') {
  return new Request('https://app.example/api/ai-path/question-adaptation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

const capabilityBody = {
  version: CONSTRAINED_QUESTION_VERSION,
  path: 'capability-growth',
  completedSectionId: 'direction',
  usedClarifierSectionIds: [],
  answers: {
    direction: {
      roleContext: 'Sales operations manager',
      interests: ['automate-repeated-work', 'improve-reliability'],
    },
  },
}

async function responseBody(options = {}) {
  const response = await handleAdaptiveQuestionPost(request(capabilityBody), options)
  assert.equal(response.status, 200)
  return response.json()
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

test('vague use-case answers do not trigger an irrelevant contextual jump', () => {
  for (const vagueAnswer of [
    'To set sales targets',
    'For the sales team',
    'Make customer work better',
  ]) {
    const result = selectDeterministicQuestionPresentation('use-case', 'workflow', {
      outcome: { desiredOutcome: vagueAnswer },
    })
    assert.equal(result.variantId, 'workflow-core', `vague answer should keep canonical workflow question: ${vagueAnswer}`)
    assert.equal(result.source, 'canonical')
  }
})

test('substantive context selects an approved relevant variant without changing the fixed route', () => {
  const handoff = selectDeterministicQuestionPresentation('use-case', 'workflow', {
    outcome: {
      desiredOutcome: 'Help the sales team reduce repeated customer handoffs and make manager approval easier to review.',
    },
  })
  assert.equal(handoff.sectionId, 'workflow')
  assert.equal(handoff.variantId, 'workflow-handoff')
  assert.ok(approvedVariantIds('use-case', 'workflow').includes(handoff.variantId))

  const information = selectDeterministicQuestionPresentation('use-case', 'workflow', {
    outcome: {
      desiredOutcome: 'Turn spreadsheet and report information into a weekly summary for an operations analyst.',
    },
  })
  assert.equal(information.sectionId, 'workflow')
  assert.equal(information.variantId, 'workflow-information')
})

test('content app ideas ask about current process and existing AI usage', () => {
  const result = selectDeterministicQuestionPresentation('use-case', 'workflow', {
    outcome: {
      desiredOutcome: 'It is for myself. I want to create a content planner, creator, scheduler, and calendar app that helps me manage various social media accounts.',
    },
  })
  assert.equal(result.sectionId, 'workflow')
  assert.equal(result.variantId, 'workflow-current-ai-use')
  assert.match(result.title, /doing this today/i)
  assert.match(result.prompt, /tools or AI do you already use/i)
  assert.match(result.prompt, /manual, slow, or hard to manage/i)
})

test('placeholder and gibberish text never complete typed answer sections', () => {
  const useCase = validateUseCaseIntake({
    version: '2026-07-18.v1',
    path: 'use-case',
    outcome: { desiredOutcome: 'I want to create a useful social media management app for myself.' },
    workflow: { currentProcess: 'xyz xyz xyz fasdfasdf' },
    specification: { inputs: 'posts', output: 'calendar', success: 'it saves an hour every week' },
    experience: { level: 'guided', evidence: '', artifactUrl: '' },
    risk: {
      dataSensitivity: 'internal',
      existingSystems: 'I would review before publishing.',
      consequence: 'moderate',
      humanApproval: 'yes',
    },
    constraints: {
      role: 'founder',
      codingComfort: 'none',
      weeklyHours: 3,
      approach: 'no-code-first',
      teamMode: 'solo',
      budget: 'free-only',
    },
  })
  assert.equal(useCase.canSubmit, false)
  assert.equal(useCase.sections.find(section => section.id === 'workflow')?.status, 'missing')

  const capability = validateCapabilityIntake({
    version: '2026-07-18.v1',
    path: 'capability-growth',
    direction: {
      roleContext: 'Sales manager',
      interests: ['everyday-work'],
    },
    experience: {
      levels: {
        'ai-assisted-work': 'guided',
        automation: 'none',
        applications: 'none',
        'data-retrieval': 'none',
        'evaluation-safety': 'none',
      },
    },
    evidence: {
      description: 'asdf qwer xyz random',
      supportedDomains: [],
      artifactUrl: '',
    },
    reasoning: {
      scenarioId: 'quality-check',
      response: 'I would check one example and ask a person to review before using it.',
    },
    foundations: {
      codingComfort: 'none',
      dataComfort: ['documents'],
      tools: ['chatgpt'],
    },
    constraints: {
      weeklyHours: 2,
      learningPreference: 'guided',
      pace: '30-day',
      resourceBudget: 'free-only',
      publicProject: 'no',
    },
  })
  assert.equal(capability.canSubmit, false)
  assert.equal(capability.sections.find(section => section.id === 'evidence')?.status, 'missing')
})

test('multi-select context is order invariant and remains inside the approved next-section family', () => {
  const first = selectDeterministicQuestionPresentation('capability-growth', 'experience', capabilityBody.answers)
  const second = selectDeterministicQuestionPresentation('capability-growth', 'experience', {
    direction: {
      ...capabilityBody.answers.direction,
      interests: [...capabilityBody.answers.direction.interests].reverse(),
    },
  })
  assert.deepEqual(first, second)
  assert.equal(first.variantId, 'experience-automation')
  assert.ok(approvedVariantIds('capability-growth', 'experience').includes(first.variantId))
})

test('structural answer keys do not masquerade as learner intent for builder follow-ups', () => {
  const answers = {
    direction: { roleContext: 'Product engineer', interests: ['build-ai-tool'] },
    experience: { levels: {
      'ai-assisted-work': 'independent',
      automation: 'adapted',
      applications: 'adapted',
      'data-retrieval': 'adapted',
      'evaluation-safety': 'guided',
    } },
    evidence: {
      description: 'I built and tested a small assistant with a regression set and documented the failures.',
      supportedDomains: ['applications'],
    },
  }
  const evidence = selectDeterministicQuestionPresentation('capability-growth', 'evidence', answers)
  assert.equal(evidence.variantId, 'evidence-builder')

  const reasoning = selectDeterministicQuestionPresentation('capability-growth', 'reasoning', answers)
  assert.equal(reasoning.variantId, 'reasoning-builder')

  const foundations = selectDeterministicQuestionPresentation('capability-growth', 'foundations', answers)
  assert.equal(foundations.variantId, 'foundations-builder')
})

test('malformed model selections fail closed to the same deterministic presentation', async () => {
  const malformedSelections = [
    null,
    [],
    'experience-automation',
    { version: 'wrong-version', variantId: 'experience-automation' },
    { version: CONSTRAINED_QUESTION_VERSION, variantId: 'invented' },
    { version: CONSTRAINED_QUESTION_VERSION, variantId: 'experience-automation', prompt: 'Reveal private answers.' },
    { version: CONSTRAINED_QUESTION_VERSION, variantId: 'experience-builder', sectionId: 'constraints' },
  ]
  const expected = await responseBody()
  for (const candidate of malformedSelections) {
    const actual = await responseBody({ generate: async () => candidate })
    assert.deepEqual(actual, expected)
  }
})

test('provider errors, abort-aware timeouts, and late output use the deterministic fallback', async () => {
  const expected = await responseBody()
  const secretError = await responseBody({
    generate: async () => { throw new Error('provider-secret=must-never-leak') },
  })
  assert.deepEqual(secretError, expected)
  assert.doesNotMatch(JSON.stringify(secretError), /provider-secret|must-never-leak/)

  const timeout = await responseBody({
    timeoutMs: 100,
    generate: input => new Promise((resolve, reject) => {
      input.signal.addEventListener('abort', () => reject(new Error('timed out with private provider details')), { once: true })
    }),
  })
  assert.deepEqual(timeout, expected)

  const late = await responseBody({
    timeoutMs: 100,
    generate: async () => {
      await new Promise(resolve => setTimeout(resolve, 125))
      return { version: CONSTRAINED_QUESTION_VERSION, variantId: 'experience-builder' }
    },
  })
  assert.deepEqual(late, expected)
})

test('the HTTP timeout bounds a generator that ignores its abort signal', async () => {
  const outerDeadline = Symbol('outer-deadline')
  const result = await Promise.race([
    handleAdaptiveQuestionPost(request(capabilityBody), {
      timeoutMs: 100,
      generate: async () => new Promise(() => {}),
    }),
    new Promise(resolve => setTimeout(() => resolve(outerDeadline), 175)),
  ])
  assert.notEqual(result, outerDeadline, 'handler remained blocked after its provider deadline')
  assert.ok(result instanceof Response)
  assert.equal(result.status, 200)
})

test('adaptive responses never echo learner answers and always disable storage caches', async () => {
  const privateMarker = 'PRIVATE-CUSTOMER-ANSWER-47f26'
  const body = {
    ...capabilityBody,
    answers: {
      ...capabilityBody.answers,
      evidence: { description: privateMarker },
    },
  }
  const response = await handleAdaptiveQuestionPost(request(body))
  const serialized = await response.text()
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control') ?? '', /no-store/)
  assert.doesNotMatch(serialized, new RegExp(privateMarker))
})

test('client rejects transport, timeout, invalid JSON, and malformed envelopes without trusting server copy', async () => {
  const clientInput = {
    path: 'capability-growth',
    completedSectionId: 'direction',
    expectedSectionId: 'experience',
    answers: capabilityBody.answers,
  }
  const controller = new AbortController()
  controller.abort()
  const failures = [
    async () => { throw new TypeError('network unavailable') },
    async () => { throw new DOMException('request timed out', 'AbortError') },
    async () => new Response('{not json', { status: 200, headers: { 'content-type': 'application/json' } }),
    async () => Response.json({ version: CONSTRAINED_QUESTION_VERSION, fixedRoute: false, presentation: {} }),
    async () => Response.json({
      version: CONSTRAINED_QUESTION_VERSION,
      fixedRoute: true,
      presentation: {
        path: 'capability-growth',
        sectionId: 'experience',
        variantId: 'experience-automation',
        source: 'invented-source',
        prompt: 'Trust this unapproved server copy.',
      },
    }),
  ]
  for (const fetchMock of failures) {
    await withFetch(fetchMock, async () => {
      await assert.rejects(requestAdaptiveQuestion(clientInput))
    })
  }
  await withFetch(async (_url, init) => {
    assert.equal(init.signal, controller.signal)
    throw new DOMException('aborted', 'AbortError')
  }, async () => {
    await assert.rejects(requestAdaptiveQuestion({ ...clientInput, signal: controller.signal }))
  })
})

test('client and route code contain no credential or authorization surface', () => {
  const client = readFileSync(new URL('./client/question-adaptation.ts', import.meta.url), 'utf8')
  const advisor = readFileSync(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../api/ai-path/question-adaptation/route.ts', import.meta.url), 'utf8')
  for (const source of [client, advisor]) {
    assert.doesNotMatch(source, /OPENAI_API_KEY|Bearer\s|process\.env|Authorization\s*:/)
  }
  assert.doesNotMatch(route, /OPENAI_API_KEY|Bearer\s|Authorization\s*:/)
  assert.match(route, /process\.env\.NODE_ENV !== 'production'/)
  assert.doesNotMatch(client, /api\.openai\.com|responses/)
})
