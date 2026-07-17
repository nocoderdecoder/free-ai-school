import type { AssessmentRequestRuntime } from './request-runtime.ts'

/** Cookie-authenticated mutations require an exact browser Origin match. */
export function crossOriginMutationResponse(
  request: Request,
  runtime: AssessmentRequestRuntime,
): Response | null {
  if (runtime.mode !== 'supabase') return null
  const origin = request.headers.get('origin')
  if (!origin) {
    return Response.json({ error: 'origin_required' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null
  } catch {
    // Fall through to the same non-disclosing error as a cross-origin request.
  }
  return Response.json({ error: 'cross_origin_request_rejected' }, {
    status: 403,
    headers: { 'Cache-Control': 'no-store' },
  })
}

