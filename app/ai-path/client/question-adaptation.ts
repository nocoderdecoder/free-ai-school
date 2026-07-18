import {
  CONSTRAINED_QUESTION_VERSION,
  approvedQuestionPresentation,
  type AdaptiveQuestionPresentation,
  type AdaptiveQuestionSource,
  type DiagnosticSectionId,
} from '../lib/constrained-question-routing.ts'
import type { DiagnosticPath } from '../lib/diagnostic.ts'

const endpoint = '/api/ai-path/question-adaptation'

export async function requestAdaptiveQuestion(input: Readonly<{
  path: DiagnosticPath
  completedSectionId: DiagnosticSectionId
  answers: Readonly<Record<string, unknown>>
  expectedSectionId: DiagnosticSectionId
  signal?: AbortSignal
}>): Promise<AdaptiveQuestionPresentation> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: input.signal,
    body: JSON.stringify({
      version: CONSTRAINED_QUESTION_VERSION,
      path: input.path,
      completedSectionId: input.completedSectionId,
      answers: input.answers,
    }),
  })
  if (!response.ok) throw new Error('adaptive_question_unavailable')
  const body = await response.json() as {
    version?: unknown
    fixedRoute?: unknown
    presentation?: Record<string, unknown>
  }
  const candidate = body.presentation
  if (
    body.version !== CONSTRAINED_QUESTION_VERSION
    || body.fixedRoute !== true
    || !candidate
    || candidate.path !== input.path
    || candidate.sectionId !== input.expectedSectionId
    || typeof candidate.variantId !== 'string'
  ) throw new Error('adaptive_question_invalid_response')
  const source = candidate.source
  if (source !== 'canonical' && source !== 'deterministic' && source !== 'model-constrained') {
    throw new Error('adaptive_question_invalid_response')
  }
  const presentation = approvedQuestionPresentation(
    input.path,
    input.expectedSectionId,
    candidate.variantId,
    source as AdaptiveQuestionSource,
  )
  if (!presentation) throw new Error('adaptive_question_invalid_response')
  return presentation
}

export const AI_PATH_QUESTION_ADAPTATION_ENDPOINT = endpoint
