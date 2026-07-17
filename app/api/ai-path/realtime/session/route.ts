import {
  getRealtimeCapability,
} from '../../../../ai-path/lib/realtime.server'
import { canBootstrapPublicRealtime } from '../../../../ai-path/lib/foundation'
import { checkRateLimit, rateLimitResponse } from '../../../../lib/rateLimit'

export const runtime = 'nodejs'
export const maxDuration = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, { tool: 'ai-path-realtime-session', limit: 10, windowMs: 60 * 60 * 1000 })
  if (!rate.allowed) return rateLimitResponse(rate)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 })
  }
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
      reason: capability.reason,
      message: 'Realtime is safely disabled. Enable it only after approving paid API usage and configuring all server-only environment flags.',
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
