import {
  getRealtimeCapability,
} from '../../../../ai-path/lib/realtime.server'
import { canBootstrapPublicRealtime } from '../../../../ai-path/lib/foundation'
import { AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH } from '../../../../ai-path/lib/realtime-bootstrap'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../../ai-path/lib/rate-limit.server'
import { readBoundedJson } from '../../../../ai-path/lib/request-body'

export const runtime = 'nodejs'
export const maxDuration = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function POST(request: Request) {
  const rate = await checkAiPathRateLimit(request, 'ai-path-realtime-session')
  if (!rate.allowed) return aiPathRateLimitResponse(rate)

  const bodyResult = await readBoundedJson(request, 220_000)
  if (!bodyResult.ok) return Response.json({ error: bodyResult.error }, { status: bodyResult.status })
  const body = bodyResult.value
  if (!isRecord(body)) return Response.json({ error: 'invalid_body' }, { status: 400 })

  const assessmentSessionId = typeof body.assessmentSessionId === 'string'
    ? body.assessmentSessionId.trim()
    : ''
  if (!assessmentSessionId || assessmentSessionId.length > 100) {
    return Response.json({ error: 'invalid_assessment_session_id' }, { status: 400 })
  }

  const capability = getRealtimeCapability()
  if (!capability.liveEnabled) {
    return Response.json({
      mode: 'mock',
      live: false,
      noNetworkCall: true,
      fallbackMode: 'text',
      assessmentSessionId,
      model: capability.model,
      error: 'realtime_unavailable',
      message: 'Voice is not available in this environment. Continue with the complete text assessment.',
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  if (canBootstrapPublicRealtime(capability)) {
    // The provider-free owner -> intent -> atomic-reserve sequence exists in
    // realtime-bootstrap.ts, but route assembly remains separately review-gated.
    // This branch cannot open through deployment flags or credentials.
    if (!AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH) {
      return Response.json({
        error: 'authenticated_admission_bootstrap_not_activated',
        live: false,
        noNetworkCall: true,
      }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
    }

    return Response.json({ error: 'live_provider_bootstrap_not_wired' }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  return Response.json({
    error: 'authenticated_realtime_not_activated',
    live: false,
    noNetworkCall: true,
    message: 'Live Realtime remains fail-closed while authenticated persistence, atomic admission, and provider activation gates are closed.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
