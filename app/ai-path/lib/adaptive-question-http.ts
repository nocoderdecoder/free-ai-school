import { readBoundedJson } from './request-body.ts'
import { adaptiveClarifierFor, decideAdaptiveInterviewPolicy, MAXIMUM_INTERVIEW_CLARIFIERS } from './adaptive-interview-policy.ts'
import {
  CONSTRAINED_QUESTION_VERSION,
  approvedClarifierPresentation,
  parseAdaptiveQuestionRequest,
  resolveModelQuestionAdaptation,
  selectDeterministicQuestionPresentation,
  type AdaptiveQuestionAction,
  type AdaptiveQuestionAdaptation,
  type DiagnosticSectionId,
  type ModelQuestionAdaptation,
} from './constrained-question-routing.ts'

const MAXIMUM_ADAPTIVE_REQUEST_BYTES = 24_000
const PROVIDER_UNAVAILABLE = Symbol('provider-unavailable')

export type AdaptiveVariantGenerator = (input: Readonly<{
  path: 'use-case' | 'capability-growth'
  currentSectionId: DiagnosticSectionId
  nextSectionId: DiagnosticSectionId
  allowedActions: readonly AdaptiveQuestionAction[]
  fallbackAction: AdaptiveQuestionAction
  approvedClarifier: Readonly<{ reason: string; prompt: string; answerGuidance: string }> | null
  answers: Readonly<Record<string, unknown>>
  signal: AbortSignal
}>) => Promise<ModelQuestionAdaptation | unknown>

function noStoreHeaders() {
  return {
    'Cache-Control': 'private, no-store',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  }
}

function crossOriginResponse(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin) return null
  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)
    const requestHost = request.headers.get('host')
    if (
      originUrl.origin === requestUrl.origin
      || (requestHost && originUrl.host === requestHost && ['http:', 'https:'].includes(originUrl.protocol))
    ) return null
  } catch {
    // Fall through to the same content-free rejection.
  }
  return Response.json({ error: 'cross_origin_request_rejected' }, {
    status: 403,
    headers: noStoreHeaders(),
  })
}

export async function handleAdaptiveQuestionPost(
  request: Request,
  options: Readonly<{ generate?: AdaptiveVariantGenerator; timeoutMs?: number }> = {},
) {
  const originError = crossOriginResponse(request)
  if (originError) return originError

  const body = await readBoundedJson(request, MAXIMUM_ADAPTIVE_REQUEST_BYTES)
  if (!body.ok) {
    return Response.json({ error: body.error }, { status: body.status, headers: noStoreHeaders() })
  }
  const input = parseAdaptiveQuestionRequest(body.value)
  if (!input) {
    return Response.json({ error: 'invalid_adaptive_question_request' }, {
      status: 400,
      headers: noStoreHeaders(),
    })
  }

  const policy = decideAdaptiveInterviewPolicy({
    path: input.path,
    completedSectionId: input.completedSectionId,
    answers: input.answers,
    usedClarifierSectionIds: input.usedClarifierSectionIds,
  })
  if (policy.action === 'complete' || !policy.nextSectionId) {
    return Response.json({ error: 'diagnostic_route_complete' }, {
      status: 409,
      headers: noStoreHeaders(),
    })
  }

  const nextSectionId = policy.nextSectionId
  const usedClarifierSections = new Set(input.usedClarifierSectionIds)
  const providerClarifier = usedClarifierSections.size < MAXIMUM_INTERVIEW_CLARIFIERS
    && !usedClarifierSections.has(input.completedSectionId)
    ? adaptiveClarifierFor(input.path, input.completedSectionId)
    : null
  const fallback: AdaptiveQuestionAdaptation = policy.action === 'clarify_current' && policy.clarifier
    ? {
        action: 'clarify_current',
        presentation: approvedClarifierPresentation(input.path, input.completedSectionId, policy.clarifier),
      }
    : {
        action: 'advance',
        presentation: selectDeterministicQuestionPresentation(input.path, nextSectionId, input.answers),
      }
  // The application owns the fixed route and required data. When the provider
  // is enabled, it may still choose whether the current answer deserves one
  // bounded clarification before the next fixed section.
  const allowedActions: readonly AdaptiveQuestionAction[] = options.generate && providerClarifier && policy.action === 'advance'
    ? ['clarify_current', 'advance']
    : [policy.action]
  let resolved = fallback

  if (options.generate) {
    const timeout = AbortSignal.timeout(Math.max(100, Math.min(options.timeoutMs ?? 2_500, 5_000)))
    const signal = AbortSignal.any([request.signal, timeout])
    try {
      const candidate = await Promise.race([
        options.generate({
          path: input.path,
          currentSectionId: input.completedSectionId,
          nextSectionId,
          allowedActions,
          fallbackAction: fallback.action,
          approvedClarifier: providerClarifier,
          answers: input.answers,
          signal,
        }).catch(() => PROVIDER_UNAVAILABLE),
        new Promise<typeof PROVIDER_UNAVAILABLE>(resolve => {
          if (signal.aborted) resolve(PROVIDER_UNAVAILABLE)
          else signal.addEventListener('abort', () => resolve(PROVIDER_UNAVAILABLE), { once: true })
        }),
      ])
      if (candidate !== PROVIDER_UNAVAILABLE && !signal.aborted) {
        resolved = resolveModelQuestionAdaptation(
          input.path,
          input.completedSectionId,
          nextSectionId,
          allowedActions,
          candidate,
          fallback,
        )
      }
    } catch {
      // Provider failures must never block the fixed diagnostic route.
    }
  }

  return Response.json({
    version: CONSTRAINED_QUESTION_VERSION,
    fixedRoute: true,
    action: resolved.action,
    presentation: resolved.presentation,
  }, { headers: noStoreHeaders() })
}
