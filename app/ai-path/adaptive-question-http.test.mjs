import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { handleAdaptiveQuestionPost } from './lib/adaptive-question-http.ts'
import { CONSTRAINED_QUESTION_VERSION } from './lib/constrained-question-routing.ts'

function request(body, origin = 'https://app.example') {
  return new Request('https://app.example/api/ai-path/question-adaptation', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin },
    body: JSON.stringify(body),
  })
}

const validBody = {
  version: CONSTRAINED_QUESTION_VERSION,
  path: 'capability-growth',
  completedSectionId: 'direction',
  usedClarifierSectionIds: [],
  answers: { direction: { roleContext: 'Operations lead', interests: ['automate-repeated-work'] } },
}

test('adaptive HTTP handler computes the fixed next section and accepts an approved model ID', async () => {
  let calls = 0
  const response = await handleAdaptiveQuestionPost(request(validBody), {
    generate: async input => {
      calls += 1
      assert.equal(input.currentSectionId, 'direction')
      assert.equal(input.nextSectionId, 'experience')
      assert.deepEqual(input.allowedActions, ['advance'])
      assert.ok(input.allowedVariants.some(variant => variant.variantId === 'experience-automation'))
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        variantId: 'experience-automation',
      }
    },
  })
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control') ?? '', /no-store/)
  const body = await response.json()
  assert.equal(calls, 1)
  assert.equal(body.fixedRoute, true)
  assert.equal(body.presentation.sectionId, 'experience')
  assert.equal(body.action, 'advance')
  assert.equal(body.presentation.variantId, 'experience-automation')
  assert.equal(body.presentation.source, 'model-constrained')
})

test('provider personalizes the fixed workflow question for clear app ideas without holding the user back', async () => {
  const response = await handleAdaptiveQuestionPost(request({
    ...validBody,
    path: 'use-case',
    completedSectionId: 'outcome',
    answers: {
      outcome: { desiredOutcome: 'I want to create a social media management app.' },
    },
  }), {
    generate: async input => {
      assert.equal(input.currentSectionId, 'outcome')
      assert.equal(input.nextSectionId, 'workflow')
      assert.deepEqual(input.allowedActions, ['advance'])
      assert.equal(input.fallbackAction, 'advance')
      assert.equal(input.approvedClarifier?.reason, 'A real task makes the project and learning advice specific.')
      assert.ok(input.allowedVariants.some(variant => variant.variantId === 'workflow-current-ai-use'))
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        variantId: 'workflow-current-ai-use',
      }
    },
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.action, 'advance')
  assert.equal(body.presentation.sectionId, 'workflow')
  assert.equal(body.presentation.variantId, 'workflow-current-ai-use')
  assert.equal(body.presentation.source, 'model-constrained')
  assert.match(body.presentation.prompt, /What tools or AI do you already use/i)
})

test('provider can personalize a required local clarification but cannot advance past it', async () => {
  const personalized = await handleAdaptiveQuestionPost(request({
    ...validBody,
    path: 'use-case',
    completedSectionId: 'outcome',
    answers: {
      outcome: { desiredOutcome: 'Make things better with AI.' },
    },
  }), {
    generate: async input => {
      assert.deepEqual(input.allowedActions, ['clarify_current'])
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'clarify_current',
        variantId: input.allowedVariants[0].variantId,
      }
    },
  })
  assert.equal(personalized.status, 200)
  const personalizedBody = await personalized.json()
  assert.equal(personalizedBody.action, 'clarify_current')
  assert.equal(personalizedBody.presentation.sectionId, 'outcome')
  assert.equal(personalizedBody.presentation.variantId, 'use-case-real-task')
  assert.equal(personalizedBody.presentation.source, 'model-constrained')

  const response = await handleAdaptiveQuestionPost(request({
    ...validBody,
    path: 'use-case',
    completedSectionId: 'outcome',
    answers: {
      outcome: { desiredOutcome: 'Make things better with AI.' },
    },
  }), {
    generate: async input => {
      assert.equal(input.currentSectionId, 'outcome')
      assert.equal(input.nextSectionId, 'workflow')
      assert.deepEqual(input.allowedActions, ['clarify_current'])
      assert.equal(input.fallbackAction, 'clarify_current')
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        variantId: 'workflow-core',
      }
    },
  })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.action, 'clarify_current')
  assert.equal(body.presentation.sectionId, 'outcome')
  assert.notEqual(body.presentation.source, 'model-constrained')
})

test('invalid model output and provider failure use approved deterministic fallback', async () => {
  for (const generate of [
    async () => ({ version: CONSTRAINED_QUESTION_VERSION, action: 'advance', variantId: 'forged-course-variant' }),
    async () => { throw new Error('provider details must not leak') },
  ]) {
    const response = await handleAdaptiveQuestionPost(request(validBody), { generate })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.presentation.sectionId, 'experience')
    assert.equal(body.presentation.variantId, 'experience-automation')
    assert.notEqual(body.presentation.source, 'model-constrained')
    assert.doesNotMatch(JSON.stringify(body), /provider details|forged-course-variant/)
  }
})

test('the server rejects missing required slots and gibberish before any provider can advance', async () => {
  let calls = 0
  const generate = async () => {
    calls += 1
    return {
      version: CONSTRAINED_QUESTION_VERSION,
      action: 'advance',
      variantId: 'constraints-core',
    }
  }

  const skippedPrefix = await handleAdaptiveQuestionPost(request({
    ...validBody,
    completedSectionId: 'evidence',
    answers: {
      evidence: {
        description: 'I created and checked one useful work example myself.',
        supportedDomains: ['ai-assisted-work'],
        artifactUrl: '',
      },
    },
  }), { generate })
  assert.equal(skippedPrefix.status, 422)
  assert.deepEqual(await skippedPrefix.json(), { error: 'incomplete_adaptive_question_progress' })

  const gibberishCurrentSlot = await handleAdaptiveQuestionPost(request({
    ...validBody,
    path: 'use-case',
    completedSectionId: 'workflow',
    answers: {
      outcome: { desiredOutcome: 'Help a sales manager create a reviewed weekly forecast.' },
      workflow: { currentProcess: 'asdf xyz xyz fasdfasdf' },
    },
  }), { generate })
  assert.equal(gibberishCurrentSlot.status, 422)
  assert.deepEqual(await gibberishCurrentSlot.json(), { error: 'incomplete_adaptive_question_progress' })
  assert.match(gibberishCurrentSlot.headers.get('cache-control') ?? '', /no-store/)
  assert.equal(calls, 0)
})

test('provider context cannot see or use answers from future fixed slots', async () => {
  const privateFutureMarker = 'PRIVATE-FUTURE-EVIDENCE-9831'
  const response = await handleAdaptiveQuestionPost(request({
    ...validBody,
    answers: {
      ...validBody.answers,
      evidence: { description: privateFutureMarker, supportedDomains: [], artifactUrl: '' },
      constraints: { weeklyHours: 40, learningPreference: 'projects', pace: 'longer', resourceBudget: 'paid-ok', publicProject: 'yes' },
    },
  }), {
    generate: async input => {
      assert.deepEqual(Object.keys(input.answers), ['direction'])
      assert.doesNotMatch(JSON.stringify(input.answers), new RegExp(privateFutureMarker))
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        variantId: 'experience-automation',
      }
    },
  })
  assert.equal(response.status, 200)
  assert.doesNotMatch(await response.text(), new RegExp(privateFutureMarker))
})

test('invalid or cross-origin requests fail before a generator is called', async () => {
  let calls = 0
  const generate = async () => { calls += 1; return null }
  const crossOrigin = await handleAdaptiveQuestionPost(request(validBody, 'https://attacker.example'), { generate })
  assert.equal(crossOrigin.status, 403)
  const forged = await handleAdaptiveQuestionPost(request({ ...validBody, nextSection: 'constraints' }), { generate })
  assert.equal(forged.status, 400)
  assert.equal(calls, 0)
})

test('default handler is provider-free and still returns answer-aware approved copy', async () => {
  const originalFetch = globalThis.fetch
  let networkCalls = 0
  globalThis.fetch = async () => { networkCalls += 1; throw new Error('network forbidden') }
  try {
    const response = await handleAdaptiveQuestionPost(request(validBody))
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.presentation.variantId, 'experience-automation')
    assert.equal(networkCalls, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('live model transport is code-latched, server-only, authenticated, and rate-limited before use', () => {
  const server = readFileSync(new URL('./lib/constrained-question.server.ts', import.meta.url), 'utf8')
  const provider = readFileSync(new URL('./lib/adaptive-question-provider.ts', import.meta.url), 'utf8')
  const route = readFileSync(new URL('../api/ai-path/question-adaptation/route.ts', import.meta.url), 'utf8')
  assert.match(server, /AI_PATH_ADAPTIVE_MODEL_LATCH = true as const/)
  assert.match(server, /AI_PATH_ADAPTIVE_MODEL_ID = 'gpt-5-nano' as const/)
  assert.match(server, /configuredModel === AI_PATH_ADAPTIVE_MODEL_ID/)
  assert.match(server, /import 'server-only'/)
  assert.match(provider, /text:\s*\{[\s\S]*type: 'json_schema'[\s\S]*strict: true/)
  assert.match(provider, /select the best approved question variant/)
  assert.match(provider, /Use exactly the supplied fallbackAction/)
  assert.match(provider, /what tools or AI are already used/)
  assert.match(provider, /requiredDataChecklist/)
  assert.match(provider, /reasoning:\s*\{ effort: 'minimal' \}/)
  assert.match(route, /process\.env\.NODE_ENV !== 'production'/)
  assert.match(route, /sessionRuntime\.mode !== 'supabase' \|\| !sessionRuntime\.principal/)
  assert.match(route, /checkAiPathRateLimit\([\s\S]*'ai-path-question-adaptation'[\s\S]*sessionRuntime\.principal\.userId/)
})
