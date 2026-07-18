import { readBoundedJson } from './request-body.ts'
import {
  CONSTRAINED_QUESTION_VERSION,
  approvedVariantIds,
  nextDiagnosticQuestionSection,
  parseAdaptiveQuestionRequest,
  resolveModelVariantSelection,
  selectDeterministicQuestionPresentation,
  type ModelVariantSelection,
} from './constrained-question-routing.ts'

const MAXIMUM_ADAPTIVE_REQUEST_BYTES = 24_000

export type AdaptiveVariantGenerator = (input: Readonly<{
  path: 'use-case' | 'capability-growth'
  sectionId: string
  approvedVariantIds: readonly string[]
  answers: Readonly<Record<string, unknown>>
  signal: AbortSignal
}>) => Promise<ModelVariantSelection | unknown>

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

  const nextSectionId = nextDiagnosticQuestionSection(input.path, input.completedSectionId)
  if (!nextSectionId) {
    return Response.json({ error: 'diagnostic_route_complete' }, {
      status: 409,
      headers: noStoreHeaders(),
    })
  }

  const fallback = selectDeterministicQuestionPresentation(input.path, nextSectionId, input.answers)
  let resolved = fallback

  if (options.generate) {
    const timeout = AbortSignal.timeout(Math.max(100, Math.min(options.timeoutMs ?? 2_500, 5_000)))
    try {
      const candidate = await options.generate({
        path: input.path,
        sectionId: nextSectionId,
        approvedVariantIds: approvedVariantIds(input.path, nextSectionId),
        answers: input.answers,
        signal: timeout,
      })
      if (!timeout.aborted) {
        resolved = resolveModelVariantSelection(input.path, nextSectionId, candidate, fallback)
      }
    } catch {
      // Provider failures must never block the fixed diagnostic route.
    }
  }

  return Response.json({
    version: CONSTRAINED_QUESTION_VERSION,
    fixedRoute: true,
    presentation: resolved,
  }, { headers: noStoreHeaders() })
}
