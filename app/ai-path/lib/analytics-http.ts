import { readBoundedJson } from './request-body.ts'
import {
  AI_PATH_ANALYTICS_MAX_BODY_BYTES,
  type PrivacySafeAnalyticsService,
} from './analytics.ts'

export type AnalyticsIntakeRuntime = {
  available: boolean
  mode: 'disabled' | 'memory-test'
  reason: string
  service: PrivacySafeAnalyticsService | null
}

function json(body: Record<string, unknown>, status: number): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export function sameOriginAnalyticsError(request: Request): Response | null {
  const origin = request.headers.get('origin')
  if (!origin) return json({ error: 'origin_required' }, 403)
  try {
    if (new URL(origin).origin === new URL(request.url).origin) return null
  } catch {
    // Use the same stable response as a valid but untrusted cross-origin request.
  }
  return json({ error: 'cross_origin_request_rejected' }, 403)
}

export async function handleAnalyticsEventRequest(
  request: Request,
  runtime: AnalyticsIntakeRuntime,
): Promise<Response> {
  const originError = sameOriginAnalyticsError(request)
  if (originError) return originError

  const body = await readBoundedJson(request, AI_PATH_ANALYTICS_MAX_BODY_BYTES)
  if (!body.ok) return json({ error: body.error }, body.status)
  if (!runtime.available || !runtime.service) return json({ error: 'analytics_unavailable' }, 503)

  const result = await runtime.service.ingest(body.value)
  if (!result.ok) {
    const status = result.reason === 'invalid_event'
      ? 400
      : result.reason === 'event_time_out_of_bounds'
        ? 422
        : 503
    return json({ error: result.reason }, status)
  }
  return json({ accepted: result.accepted, duplicate: result.duplicate }, 202)
}
