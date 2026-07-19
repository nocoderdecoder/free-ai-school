import 'server-only'

import type { AdaptiveVariantGenerator } from './adaptive-question-http.ts'
import {
  buildAdaptiveResponsesRequest,
  parseAdaptiveResponsesSelection,
} from './adaptive-question-provider.ts'

// Paid transport stays fail-closed behind the code latch, environment opt-in,
// exact model pin, and the workspace-wide explicit paid-call approval gate.
export const AI_PATH_ADAPTIVE_MODEL_LATCH = true as const
export const AI_PATH_ADAPTIVE_MODEL_ID = 'gpt-5-nano' as const

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export function getAdaptiveQuestionModelCapability() {
  const configuredModel = process.env.AI_PATH_ADAPTIVE_MODEL || AI_PATH_ADAPTIVE_MODEL_ID
  const costApprovedModel = configuredModel === AI_PATH_ADAPTIVE_MODEL_ID
  const paidApiCallsApproved = process.env.AI_PATH_ALLOW_PAID_API_CALLS === 'true'
  const configured = process.env.AI_PATH_ADAPTIVE_MODEL_ENABLED === 'true'
    && Boolean(process.env.OPENAI_API_KEY)
    && costApprovedModel
    && paidApiCallsApproved
  const liveEnabled = configured && AI_PATH_ADAPTIVE_MODEL_LATCH
  return Object.freeze({
    liveEnabled,
    noNetworkCall: !liveEnabled,
    model: AI_PATH_ADAPTIVE_MODEL_ID,
    reason: liveEnabled
      ? 'constrained adaptive model is explicitly enabled'
      : !AI_PATH_ADAPTIVE_MODEL_LATCH
        ? 'paid adaptive-model latch is closed'
        : !paidApiCallsApproved
          ? 'paid API calls are not explicitly approved'
        : !costApprovedModel
          ? 'configured model is outside the reviewed low-cost boundary'
        : 'adaptive model configuration is incomplete',
  })
}
export function createAdaptiveQuestionModelGenerator(): AdaptiveVariantGenerator | undefined {
  const capability = getAdaptiveQuestionModelCapability()
  if (!capability.liveEnabled) return undefined

  return async input => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('adaptive_model_unavailable')
    const response = await fetch(OPENAI_RESPONSES_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildAdaptiveResponsesRequest({
        model: capability.model,
        path: input.path,
        currentSectionId: input.currentSectionId,
        nextSectionId: input.nextSectionId,
        allowedActions: input.allowedActions,
        fallbackAction: input.fallbackAction,
        approvedClarifier: input.approvedClarifier,
        allowedVariants: input.allowedVariants,
        answers: input.answers,
      })),
      signal: input.signal,
    })
    if (!response.ok) throw new Error('adaptive_model_unavailable')
    const selection = parseAdaptiveResponsesSelection(await response.json())
    if (!selection) throw new Error('adaptive_model_invalid_output')
    return selection
  }
}
