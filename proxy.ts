import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import {
  AI_PATH_AUTH_HOME,
  consumerAuthBoundaryMode,
  isMissingConsumerAuthSessionError,
  isAIPathAuthPublicPath,
  isAIPathLocalRealtimePreviewPublicPath,
  normalizeAIPathReturnPath,
} from './app/ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
} from './app/ai-path/lib/consumer-auth.server'

function unauthenticatedResponse(request: NextRequest, unavailable = false): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: unavailable ? 'authentication_unavailable' : 'authentication_required' }, {
      status: unavailable ? 503 : 401,
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    })
  }

  const capability = getConsumerAuthCapability()
  const destination = new URL(AI_PATH_AUTH_HOME, capability.publicOrigin || request.url)
  destination.searchParams.set('next', normalizeAIPathReturnPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  ))
  if (unavailable) destination.searchParams.set('error', 'session_unavailable')
  return NextResponse.redirect(destination, 307)
}

function invalidAuthConfigurationResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'authentication_unavailable' }, {
      status: 503,
      headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '60' },
    })
  }
  return new NextResponse('AI Path authentication is temporarily unavailable.', {
    status: 503,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      'Retry-After': '60',
    },
  })
}

export async function proxy(request: NextRequest) {
  const capability = getConsumerAuthCapability()
  if (isAIPathAuthPublicPath(request.nextUrl.pathname)) return NextResponse.next()
  if (isAIPathLocalRealtimePreviewPublicPath(request.nextUrl.pathname, {
    nodeEnv: process.env.NODE_ENV,
    allowPaidApiCalls: process.env.AI_PATH_ALLOW_PAID_API_CALLS,
    legacyAllowPaidApiCalls: process.env.ALLOW_PAID_API_CALLS,
    localPreviewEnabled: process.env.AI_PATH_REALTIME_LOCAL_PREVIEW_ENABLED,
  })) return NextResponse.next()
  const boundaryMode = consumerAuthBoundaryMode(
    process.env.NODE_ENV,
    process.env.AI_PATH_CONSUMER_AUTH_ENABLED,
    capability,
  )
  if (boundaryMode !== 'protect') {
    // Local development can keep the current preview. Production fails shut
    // whenever the complete reviewed auth configuration is unavailable.
    if (boundaryMode === 'preview') return NextResponse.next()
    return invalidAuthConfigurationResponse(request)
  }

  try {
    const context = createConsumerAuthRequestContext(request)
    const { data, error } = await context.client.auth.getUser()
    if (error) {
      return applyConsumerAuthResponse(
        context,
        unauthenticatedResponse(request, !isMissingConsumerAuthSessionError(error)),
      )
    }
    if (!data.user) return applyConsumerAuthResponse(context, unauthenticatedResponse(request))
    return applyConsumerAuthResponse(context, NextResponse.next())
  } catch {
    return unauthenticatedResponse(request, true)
  }
}

export const config = {
  matcher: ['/ai-path/:path*', '/api/ai-path/:path*'],
}
