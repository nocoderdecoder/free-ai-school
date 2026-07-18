import { decideAdaptiveInterviewPolicy } from '../lib/adaptive-interview-policy.ts'
import {
  CONSTRAINED_QUESTION_VERSION,
  approvedClarifierPresentation,
  approvedQuestionPresentation,
  resolveModelQuestionAdaptation,
  selectDeterministicQuestionPresentation,
  type AdaptiveQuestionAdaptation,
  type AdaptiveQuestionPresentation,
  type AdaptiveQuestionSource,
  type DiagnosticSectionId,
} from '../lib/constrained-question-routing.ts'
import type { DiagnosticPath } from '../lib/diagnostic.ts'

const endpoint = '/api/ai-path/question-adaptation'

export type AdaptiveQuestionClientResult = AdaptiveQuestionAdaptation & AdaptiveQuestionPresentation

type AdaptationInput = Readonly<{
  path: DiagnosticPath
  completedSectionId: DiagnosticSectionId
  answers: Readonly<Record<string, unknown>>
  expectedSectionId: DiagnosticSectionId
  usedClarifierSectionIds?: readonly DiagnosticSectionId[]
  signal?: AbortSignal
}>

function combined(result: AdaptiveQuestionAdaptation): AdaptiveQuestionClientResult {
  return Object.freeze({ ...result.presentation, ...result })
}

export function localAdaptiveQuestionDecision(input: AdaptationInput): AdaptiveQuestionClientResult {
  const policy = decideAdaptiveInterviewPolicy({
    path: input.path,
    completedSectionId: input.completedSectionId,
    answers: input.answers,
    usedClarifierSectionIds: input.usedClarifierSectionIds ?? [],
  })
  if (policy.action === 'complete' || !policy.nextSectionId) {
    throw new Error('adaptive_question_route_complete')
  }
  if (policy.action === 'clarify_current' && policy.clarifier) {
    return combined({
      action: 'clarify_current',
      presentation: approvedClarifierPresentation(input.path, input.completedSectionId, policy.clarifier),
    })
  }
  return combined({
    action: 'advance',
    presentation: selectDeterministicQuestionPresentation(input.path, policy.nextSectionId, input.answers),
  })
}

export async function requestAdaptiveQuestion(input: AdaptationInput): Promise<AdaptiveQuestionClientResult> {
  const fallback = localAdaptiveQuestionDecision(input)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    signal: input.signal,
    body: JSON.stringify({
      version: CONSTRAINED_QUESTION_VERSION,
      path: input.path,
      completedSectionId: input.completedSectionId,
      usedClarifierSectionIds: input.usedClarifierSectionIds ?? [],
      answers: input.answers,
    }),
  })
  if (!response.ok) throw new Error('adaptive_question_unavailable')
  const body = await response.json() as {
    version?: unknown
    fixedRoute?: unknown
    action?: unknown
    presentation?: Record<string, unknown>
  }
  const candidate = body.presentation
  const expectedSectionId = fallback.action === 'clarify_current'
    ? input.completedSectionId
    : input.expectedSectionId
  if (
    body.version !== CONSTRAINED_QUESTION_VERSION
    || body.fixedRoute !== true
    || body.action !== fallback.action
    || !candidate
    || candidate.path !== input.path
    || candidate.sectionId !== expectedSectionId
    || typeof candidate.variantId !== 'string'
  ) throw new Error('adaptive_question_invalid_response')

  const source = candidate.source
  if (source !== 'canonical' && source !== 'deterministic' && source !== 'model-constrained') {
    throw new Error('adaptive_question_invalid_response')
  }

  if (source === 'model-constrained') {
    const resolved = resolveModelQuestionAdaptation(
      input.path,
      input.completedSectionId,
      input.expectedSectionId,
      [fallback.action],
      {
        version: body.version,
        action: body.action,
        title: candidate.title,
        reason: candidate.reason,
        prompt: candidate.prompt,
        context: candidate.context,
      },
      fallback,
    )
    return combined(resolved)
  }

  if (fallback.action === 'clarify_current') return fallback
  const presentation = approvedQuestionPresentation(
    input.path,
    input.expectedSectionId,
    candidate.variantId,
    source as AdaptiveQuestionSource,
  )
  if (!presentation) throw new Error('adaptive_question_invalid_response')
  return combined({ action: 'advance', presentation })
}

export const AI_PATH_QUESTION_ADAPTATION_ENDPOINT = endpoint
