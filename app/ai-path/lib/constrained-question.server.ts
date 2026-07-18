import 'server-only'

import type { AdaptiveVariantGenerator } from './adaptive-question-http.ts'
import {
  buildAdaptiveResponsesRequest,
  parseAdaptiveResponsesSelection,
} from './adaptive-question-provider.ts'

// Opening this latch can consume paid credits. It requires an explicit user
// approval and reviewed code change; environment variables cannot open it.
export const AI_PATH_ADAPTIVE_MODEL_LATCH = false as const

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses'

export function getAdaptiveQuestionModelCapability() {
  const configured = process.env.AI_PATH_ADAPTIVE_MODEL_ENABLED === 'true'
    && Boolean(process.env.OPENAI_API_KEY)
    && Boolean(process.env.AI_PATH_ADAPTIVE_MODEL)
  const liveEnabled = configured && AI_PATH_ADAPTIVE_MODEL_LATCH
  return Object.freeze({
    liveEnabled,
    noNetworkCall: !liveEnabled,
    model: process.env.AI_PATH_ADAPTIVE_MODEL || 'not-configured',
    reason: liveEnabled
      ? 'constrained adaptive model is explicitly enabled'
      : !AI_PATH_ADAPTIVE_MODEL_LATCH
        ? 'paid adaptive-model latch is closed'
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
