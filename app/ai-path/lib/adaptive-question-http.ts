import { readBoundedJson } from './request-body.ts'
import { adaptiveClarifierFor, decideAdaptiveInterviewPolicy, MAXIMUM_INTERVIEW_CLARIFIERS } from './adaptive-interview-policy.ts'
import {
  CAPABILITY_SECTION_IDS,
  INITIAL_CAPABILITY_INTAKE,
  INITIAL_USE_CASE_INTAKE,
  USE_CASE_SECTION_IDS,
  validateCapabilityIntake,
  validateUseCaseIntake,
  type DiagnosticPath,
} from './diagnostic.ts'
import {
  CONSTRAINED_QUESTION_VERSION,
  approvedClarifierPresentation,
  approvedQuestionVariantOptions,
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

function answersThroughCompletedSection(
  path: DiagnosticPath,
  completedSectionId: DiagnosticSectionId,
  answers: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const ids: readonly DiagnosticSectionId[] = path === 'use-case'
    ? USE_CASE_SECTION_IDS
    : CAPABILITY_SECTION_IDS
  const completedIndex = ids.indexOf(completedSectionId)
  if (completedIndex < 0) return {}
  return Object.fromEntries(
    ids.slice(0, completedIndex + 1)
      .filter(id => Object.hasOwn(answers, id))
      .map(id => [id, answers[id]]),
  )
}

function completedPrefixIsReady(
  path: DiagnosticPath,
  completedSectionId: DiagnosticSectionId,
  answers: Readonly<Record<string, unknown>>,
): boolean {
  const ids: readonly DiagnosticSectionId[] = path === 'use-case'
    ? USE_CASE_SECTION_IDS
    : CAPABILITY_SECTION_IDS
  const completedIndex = ids.indexOf(completedSectionId)
  if (completedIndex < 0) return false
  const boundedAnswers = answersThroughCompletedSection(path, completedSectionId, answers)

  try {
    if (path === 'use-case') {
      const candidate = { ...INITIAL_USE_CASE_INTAKE } as Record<string, unknown>
      for (const id of USE_CASE_SECTION_IDS) {
        if (Object.hasOwn(boundedAnswers, id)) candidate[id] = boundedAnswers[id]
      }
      const readiness = validateUseCaseIntake(candidate as typeof INITIAL_USE_CASE_INTAKE)
      return readiness.sections
        .slice(0, completedIndex + 1)
        .every(section => section.status === 'complete')
    }

    const candidate = { ...INITIAL_CAPABILITY_INTAKE } as Record<string, unknown>
    for (const id of CAPABILITY_SECTION_IDS) {
      if (Object.hasOwn(boundedAnswers, id)) candidate[id] = boundedAnswers[id]
    }
    const readiness = validateCapabilityIntake(candidate as typeof INITIAL_CAPABILITY_INTAKE)
    return readiness.sections
      .slice(0, completedIndex + 1)
      .every(section => section.status === 'complete')
  } catch {
    return false
  }
}

export type AdaptiveVariantGenerator = (input: Readonly<{
  path: 'use-case' | 'capability-growth'
  currentSectionId: DiagnosticSectionId
  nextSectionId: DiagnosticSectionId
  allowedActions: readonly AdaptiveQuestionAction[]
  fallbackAction: AdaptiveQuestionAction
  approvedClarifier: Readonly<{ reason: string; prompt: string; answerGuidance: string }> | null
  allowedVariants: readonly Readonly<{ variantId: string; title: string; reason: string; prompt: string; context: string | null }>[]
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
  if (!completedPrefixIsReady(input.path, input.completedSectionId, input.answers)) {
    return Response.json({ error: 'incomplete_adaptive_question_progress' }, {
      status: 422,
      headers: noStoreHeaders(),
    })
  }
  const completedAnswers = answersThroughCompletedSection(input.path, input.completedSectionId, input.answers)

  const policy = decideAdaptiveInterviewPolicy({
    path: input.path,
    completedSectionId: input.completedSectionId,
    answers: completedAnswers,
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
  const fallback: AdaptiveQuestionAdaptation = policy.action === 'clarify_current' && policy.clarifier
    ? {
        action: 'clarify_current',
        presentation: approvedClarifierPresentation(input.path, input.completedSectionId, policy.clarifier),
      }
    : {
        action: 'advance',
        presentation: selectDeterministicQuestionPresentation(input.path, nextSectionId, completedAnswers),
      }
  const approvedClarifier = usedClarifierSections.size < MAXIMUM_INTERVIEW_CLARIFIERS
    && !usedClarifierSections.has(input.completedSectionId)
    ? policy.clarifier ?? adaptiveClarifierFor(input.path, input.completedSectionId)
    : null
  // The application owns the fixed route and the local completion gate. The
  // provider may personalize the copy for that route decision, but it may not
  // decide to hold, skip, or reorder sections on its own. This keeps the
  // interview feeling intelligent without making the demo path unpredictable.
  const allowedActions: readonly AdaptiveQuestionAction[] = [fallback.action]
  const allowedVariants = fallback.action === 'clarify_current'
    ? [{
        variantId: fallback.presentation.variantId,
        title: fallback.presentation.title,
        reason: fallback.presentation.reason,
        prompt: fallback.presentation.prompt,
        context: fallback.presentation.context,
      }]
    : fallback.presentation.source === 'deterministic'
      ? approvedQuestionVariantOptions(input.path, nextSectionId)
          .filter(variant => variant.variantId === fallback.presentation.variantId)
      : approvedQuestionVariantOptions(input.path, nextSectionId)
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
          approvedClarifier,
          allowedVariants,
          answers: completedAnswers,
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
