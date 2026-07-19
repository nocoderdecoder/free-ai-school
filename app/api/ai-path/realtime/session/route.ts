import {
  createRealtimeClientSecret,
  getRealtimeCapability,
  RealtimeBootstrapError,
} from '../../../../ai-path/lib/realtime.server'
import { NextResponse } from 'next/server'
import { canBootstrapPublicRealtime } from '../../../../ai-path/lib/foundation'
import {
  applyConsumerAuthResponse,
  createConsumerAuthRequestContext,
  ConsumerAuthUnavailableError,
  type ConsumerAuthRequestContext,
} from '../../../../ai-path/lib/consumer-auth.server'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../../ai-path/lib/rate-limit.server'
import { readBoundedJson } from '../../../../ai-path/lib/request-body'
import { sameOriginMutationResponse } from '../../../../ai-path/lib/request-security'

export const runtime = 'nodejs'
export const maxDuration = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function jsonNoStore(body: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init?.headers ?? undefined)),
      'Cache-Control': 'no-store',
    },
  })
}

export async function POST(request: Request) {
  const originResponse = sameOriginMutationResponse(request)
  if (originResponse) return originResponse

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
    let authContext: ConsumerAuthRequestContext | null = null
    let verifiedUserId = ''
    try {
      authContext = createConsumerAuthRequestContext(request)
      const { data, error } = await authContext.client.auth.getUser()
      if (!error && data.user?.id) verifiedUserId = `supabase:${data.user.id}`
    } catch (error) {
      if (process.env.NODE_ENV === 'production' || !(error instanceof ConsumerAuthUnavailableError)) {
        return jsonNoStore({
          error: 'auth_unavailable',
          live: false,
          message: 'Sign in before starting a live voice session.',
        }, { status: 401 })
      }
    }
    const localPreview = process.env.NODE_ENV !== 'production' && process.env.AI_PATH_REALTIME_LOCAL_PREVIEW_ENABLED !== 'false'
    if (!verifiedUserId) {
      if (!localPreview) {
        return jsonNoStore({
          error: 'auth_required',
          live: false,
          message: 'Sign in before starting a live voice session.',
        }, { status: 401 })
      }
      verifiedUserId = `local-preview:${assessmentSessionId}`
    }

    try {
      const live = await createRealtimeClientSecret({
        assessmentSessionId,
        verifiedUserId,
      })
      const response = NextResponse.json({
        mode: 'live',
        live: true,
        assessmentSessionId,
        model: live.model,
        clientSecret: live.clientSecret,
        expiresAt: live.expiresAt,
      }, {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      })
      return authContext ? applyConsumerAuthResponse(authContext, response) : response
    } catch (error) {
      const status = error instanceof RealtimeBootstrapError ? error.status : 502
      return jsonNoStore({
        error: 'realtime_bootstrap_failed',
        live: false,
        message: 'The voice session could not be started. Continue by typing.',
      }, { status })
    }
  }

  return Response.json({
    error: 'authenticated_realtime_not_activated',
    live: false,
    noNetworkCall: true,
    message: 'Live Realtime remains fail-closed while authenticated persistence, atomic admission, and provider activation gates are closed.',
  }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
}
