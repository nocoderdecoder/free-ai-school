import { NextResponse } from 'next/server'

import {
  consumerAuthBoundaryMode,
  isMissingConsumerAuthSessionError,
} from '../../../ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
  type ConsumerAuthRequestContext,
} from '../../../ai-path/lib/consumer-auth.server'
import {
  diagnosticPreflightResponse,
  handleDiagnosticPost,
} from '../../../ai-path/lib/diagnostic-http'
import { createConsumerDiagnosticPersistenceRuntime } from '../../../ai-path/lib/diagnostic-persistence-runtime.server'
import {
  aiPathRateLimitResponse,
  checkAiPathRateLimit,
} from '../../../ai-path/lib/rate-limit.server'

export const runtime = 'nodejs'
export const maxDuration = 10

function privateError(error: string, status: number) {
  return NextResponse.json({ error }, {
    status,
    headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
  })
}

function withAuthCookies(context: ConsumerAuthRequestContext | null, response: Response): Response {
  if (!context) return response
  return applyConsumerAuthResponse(context, new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  }))
}

export async function POST(request: Request) {
  const preflight = diagnosticPreflightResponse(request)
  if (preflight) return preflight

  const capability = getConsumerAuthCapability()
  const boundaryMode = consumerAuthBoundaryMode(
    process.env.NODE_ENV,
    process.env.AI_PATH_CONSUMER_AUTH_ENABLED,
    capability,
  )
  if (boundaryMode === 'unavailable') return privateError('authentication_unavailable', 503)

  let authContext: ConsumerAuthRequestContext | null = null
  let verifiedUserId: string | null = null
  if (boundaryMode === 'protect') {
    try {
      authContext = createConsumerAuthRequestContext(request)
      const { data, error } = await authContext.client.auth.getUser()
      if (error) {
        return withAuthCookies(
          authContext,
          privateError(
            isMissingConsumerAuthSessionError(error) ? 'authentication_required' : 'authentication_unavailable',
            isMissingConsumerAuthSessionError(error) ? 401 : 503,
          ),
        )
      }
      if (!data.user) return withAuthCookies(authContext, privateError('authentication_required', 401))
      verifiedUserId = data.user.id
    } catch {
      return privateError('authentication_unavailable', 503)
    }
  }

  const rate = await checkAiPathRateLimit(request, 'ai-path-diagnostic', verifiedUserId)
  if (!rate.allowed) return withAuthCookies(authContext, aiPathRateLimitResponse(rate))
  return withAuthCookies(authContext, await handleDiagnosticPost(request, {
    verifiedOwnerId: verifiedUserId,
    persist: async input => {
      // This callback runs only after strict intake validation and deterministic
      // server result generation. The runtime stays null while any latch is closed.
      const persistence = createConsumerDiagnosticPersistenceRuntime()
      return persistence ? persistence.persist(input) : null
    },
  }))
}
