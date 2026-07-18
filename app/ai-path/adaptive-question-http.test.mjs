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
      return {
        version: CONSTRAINED_QUESTION_VERSION,
        action: 'advance',
        title: 'How far have you taken AI workflows?',
        reason: 'Start from a repeatable example you can support.',
        prompt: 'What is the most repeatable AI workflow you have personally created or tested?',
        context: null,
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
  assert.equal(body.presentation.variantId, 'model-contextual')
  assert.equal(body.presentation.source, 'model-constrained')
})

test('invalid model output and provider failure use approved deterministic fallback', async () => {
  for (const generate of [
    async () => ({ version: CONSTRAINED_QUESTION_VERSION, action: 'advance', title: 'Buy a course', reason: 'This is unsafe copy.', prompt: 'Will you buy it?', context: null }),
    async () => { throw new Error('provider details must not leak') },
  ]) {
    const response = await handleAdaptiveQuestionPost(request(validBody), { generate })
    assert.equal(response.status, 200)
    const body = await response.json()
    assert.equal(body.presentation.sectionId, 'experience')
    assert.equal(body.presentation.variantId, 'experience-automation')
    assert.notEqual(body.presentation.source, 'model-constrained')
    assert.doesNotMatch(JSON.stringify(body), /provider details|Buy a course/)
  }
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
  assert.match(server, /AI_PATH_ADAPTIVE_MODEL_LATCH = false as const/)
  assert.match(server, /import 'server-only'/)
  assert.match(provider, /text:\s*\{[\s\S]*type: 'json_schema'[\s\S]*strict: true/)
  assert.match(route, /sessionRuntime\.mode !== 'supabase' \|\| !sessionRuntime\.principal/)
  assert.match(route, /checkAiPathRateLimit\([\s\S]*'ai-path-question-adaptation'[\s\S]*sessionRuntime\.principal\.userId/)
})
