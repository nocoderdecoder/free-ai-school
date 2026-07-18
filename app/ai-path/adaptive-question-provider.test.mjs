import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ADAPTIVE_MODEL_CONTEXT_MAX_CHARS,
  buildAdaptiveModelContext,
  buildAdaptiveResponsesRequest,
  parseAdaptiveResponsesSelection,
} from './lib/adaptive-question-provider.ts'
import { CONSTRAINED_QUESTION_VERSION } from './lib/constrained-question-routing.ts'

test('provider context contains only completed bounded sections and removes links', () => {
  const context = buildAdaptiveModelContext('capability-growth', 'reasoning', {
    direction: { roleContext: 'Sales manager', interests: ['everyday-work'] },
    experience: { levels: { 'ai-assisted-work': 'guided' } },
    evidence: {
      description: `I tried a draft at https://private.example/work/${'x'.repeat(800)}`,
      artifactUrl: 'https://private.example/secret',
    },
    reasoning: { response: 'future answer must not be sent' },
    constraints: { weeklyHours: 10 },
  })
  const serialized = JSON.stringify(context)
  assert.match(serialized, /Sales manager/)
  assert.match(serialized, /\[link omitted\]/)
  assert.doesNotMatch(serialized, /private\.example|artifactUrl|future answer|weeklyHours/)
  assert.ok(serialized.length <= ADAPTIVE_MODEL_CONTEXT_MAX_CHARS)
})

test('Responses request fixes the route and uses a strict bounded action schema', () => {
  const body = buildAdaptiveResponsesRequest({
    model: 'configured-test-model',
    path: 'capability-growth',
    currentSectionId: 'evidence',
    nextSectionId: 'reasoning',
    allowedActions: ['clarify_current', 'advance'],
    fallbackAction: 'clarify_current',
    approvedClarifier: {
      reason: 'A concrete example is needed.',
      prompt: 'What did you personally do and check?',
      answerGuidance: 'One action, result, and check.',
    },
    answers: { evidence: { description: 'To set sales targets' } },
  })
  assert.equal(body.model, 'configured-test-model')
  assert.equal(body.store, false)
  assert.equal(body.text.format.type, 'json_schema')
  assert.equal(body.text.format.strict, true)
  assert.equal(body.text.format.schema.additionalProperties, false)
  assert.deepEqual(body.text.format.schema.properties.action.enum, ['clarify_current', 'advance'])
  assert.deepEqual(body.text.format.schema.required, ['version', 'action', 'title', 'reason', 'prompt', 'context'])
  assert.equal('tools' in body, false)
  const input = JSON.parse(body.input[1].content[0].text)
  assert.equal(input.currentFixedSectionId, 'evidence')
  assert.equal(input.nextFixedSectionId, 'reasoning')
  assert.equal(input.fallbackAction, 'clarify_current')
})

function providerResponse(content, overrides = {}) {
  return {
    status: 'completed',
    error: null,
    incomplete_details: null,
    output: [{ type: 'message', content }],
    ...overrides,
  }
}

test('provider parser accepts one completed strict adaptation', () => {
  const selection = parseAdaptiveResponsesSelection(providerResponse([{
    type: 'output_text',
    text: JSON.stringify({
      version: CONSTRAINED_QUESTION_VERSION,
      action: 'clarify_current',
      title: 'Tell us about one real attempt',
      reason: 'A concrete example makes the plan useful.',
      prompt: 'What did you personally do, produce, and check?',
      context: 'One task and one result are enough.',
    }),
  }]))
  assert.equal(selection?.action, 'clarify_current')
  assert.match(selection?.prompt ?? '', /personally do/)
})

test('provider parser rejects refusals, incomplete output, ambiguity, and extra keys', () => {
  const validText = JSON.stringify({
    version: CONSTRAINED_QUESTION_VERSION,
    action: 'advance',
    title: 'How would you test this?',
    reason: 'A test makes the next step concrete.',
    prompt: 'What would you check before relying on the result?',
    context: null,
  })
  const cases = [
    providerResponse([{ type: 'refusal', refusal: 'No' }, { type: 'output_text', text: validText }]),
    providerResponse([{ type: 'output_text', text: validText }], { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }),
    providerResponse([{ type: 'output_text', text: validText }, { type: 'output_text', text: validText }]),
    providerResponse([{ type: 'output_text', text: '{not json' }]),
    providerResponse([{ type: 'output_text', text: JSON.stringify({ ...JSON.parse(validText), nextSectionId: 'constraints' }) }]),
  ]
  for (const value of cases) assert.equal(parseAdaptiveResponsesSelection(value), null)
})
