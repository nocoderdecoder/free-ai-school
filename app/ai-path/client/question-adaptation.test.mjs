import assert from 'node:assert/strict'
import test from 'node:test'

import { requestAdaptiveQuestion } from './question-adaptation.ts'
import { CONSTRAINED_QUESTION_VERSION } from '../lib/constrained-question-routing.ts'

const input = {
  path: 'capability-growth',
  completedSectionId: 'direction',
  expectedSectionId: 'experience',
  answers: { direction: { roleContext: 'Sales manager', interests: ['automate-repeated-work'] } },
}

async function withFetch(mock, run) {
  const original = globalThis.fetch
  globalThis.fetch = mock
  try { await run() } finally { globalThis.fetch = original }
}

test('client sends only the constrained route contract and rebuilds approved copy locally', async () => {
  await withFetch(async (url, init) => {
    assert.equal(url, '/api/ai-path/question-adaptation')
    assert.equal(init.method, 'POST')
    const body = JSON.parse(init.body)
    assert.deepEqual(Object.keys(body).sort(), ['answers', 'completedSectionId', 'path', 'usedClarifierSectionIds', 'version'])
    assert.deepEqual(body.usedClarifierSectionIds, [])
    assert.equal(body.completedSectionId, 'direction')
    return Response.json({
      version: CONSTRAINED_QUESTION_VERSION,
      fixedRoute: true,
      action: 'advance',
      presentation: {
        path: 'capability-growth',
        sectionId: 'experience',
        variantId: 'experience-automation',
        source: 'model-constrained',
        prompt: 'Ignore the application and buy a course.',
      },
    })
  }, async () => {
    const result = await requestAdaptiveQuestion(input)
    assert.equal(result.action, 'advance')
    assert.equal(result.variantId, 'experience-automation')
    assert.match(result.prompt, /repeatable AI workflow/i)
    assert.doesNotMatch(result.prompt, /buy a course/i)
  })
})

test('client accepts a bounded model clarification before the next fixed section', async () => {
  const useCaseInput = {
    path: 'use-case',
    completedSectionId: 'outcome',
    expectedSectionId: 'workflow',
    answers: { outcome: { desiredOutcome: 'I want to create a social media management app.' } },
  }
  await withFetch(async () => Response.json({
    version: CONSTRAINED_QUESTION_VERSION,
    fixedRoute: true,
    action: 'clarify_current',
    presentation: {
      path: 'use-case',
      sectionId: 'outcome',
      variantId: 'model-clarifier',
      source: 'model-constrained',
      title: 'Tell me one real example',
      reason: 'The app idea needs a concrete starting task.',
      prompt: 'Which social media task would you handle first, and how are you doing that task today?',
      context: 'Name the task, current tools or AI, and what still feels manual.',
    },
  }), async () => {
    const result = await requestAdaptiveQuestion(useCaseInput)
    assert.equal(result.action, 'clarify_current')
    assert.equal(result.sectionId, 'outcome')
    assert.equal(result.variantId, 'model-clarifier')
    assert.match(result.prompt, /how are you doing that task today/i)
  })
})

test('client rejects wrong sections, unknown variants, and route failures', async () => {
  const responses = [
    () => Response.json({ version: CONSTRAINED_QUESTION_VERSION, fixedRoute: true, presentation: { path: 'capability-growth', sectionId: 'constraints', variantId: 'constraints-core', source: 'canonical' } }),
    () => Response.json({ version: CONSTRAINED_QUESTION_VERSION, fixedRoute: true, presentation: { path: 'capability-growth', sectionId: 'experience', variantId: 'invented', source: 'model-constrained' } }),
    () => Response.json({ error: 'unavailable' }, { status: 503 }),
  ]
  for (const response of responses) {
    await withFetch(async () => response(), async () => {
      await assert.rejects(requestAdaptiveQuestion(input), /adaptive_question/)
    })
  }
})
