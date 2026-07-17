import {
  getRealtimeCapability,
} from '../../../../ai-path/lib/realtime.server'
import { canBootstrapPublicRealtime } from '../../../../ai-path/lib/foundation'
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
  const rate = await checkAiPathRateLimit(request, { tool: 'ai-path-realtime-session', limit: 10, windowMs: 60 * 60 * 1000 })
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
    // Intentionally unreachable until the launch invariant in foundation.ts is
    // changed alongside authenticated persistence and concurrency enforcement.
    return Response.json({ error: 'live_bootstrap_not_wired' }, { status: 503 })
  }

  return Response.json({
    error: 'authenticated_persistence_not_implemented',
    live: false,
    noNetworkCall: true,
    message: 'Live Realtime remains fail-closed until this route verifies persisted session ownership and enforces one active session per user.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
