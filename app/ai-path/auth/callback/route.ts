import { NextResponse } from 'next/server'

import {
  AI_PATH_AUTH_HOME,
  normalizeAIPathReturnPath,
} from '@/app/ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  consumerAuthPublicOrigin,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
} from '@/app/ai-path/lib/consumer-auth.server'
import { checkAiPathRateLimit } from '@/app/ai-path/lib/rate-limit.server'

function safeAuthorizationCode(value: string | null): value is string {
  return Boolean(value && value.length <= 2_048 && !/[\s\u0000-\u001f\u007f]/.test(value))
}

export async function GET(request: Request) {
  const capability = getConsumerAuthCapability()
  const publicOrigin = capability.publicOrigin || new URL(request.url).origin
  const requestUrl = new URL(request.url)
  const next = normalizeAIPathReturnPath(requestUrl.searchParams.get('next'))
  const code = requestUrl.searchParams.get('code')

  if (!capability.available || !safeAuthorizationCode(code)) {
    const destination = new URL(AI_PATH_AUTH_HOME, publicOrigin)
    destination.searchParams.set('error', capability.available ? 'invalid_callback' : 'not_configured')
    return NextResponse.redirect(destination, 303)
  }

  const rateLimit = await checkAiPathRateLimit(request, 'ai-path-auth-callback')
  if (!rateLimit.allowed) {
    const destination = new URL(AI_PATH_AUTH_HOME, publicOrigin)
    destination.searchParams.set('error', rateLimit.reason === 'unavailable' ? 'session_unavailable' : 'invalid_callback')
    const response = NextResponse.redirect(destination, 303)
    response.headers.set('Retry-After', String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))))
    return response
  }

  const context = createConsumerAuthRequestContext(request)
  const { error } = await context.client.auth.exchangeCodeForSession(code)
  const destination = new URL(error ? AI_PATH_AUTH_HOME : next, consumerAuthPublicOrigin(request, capability))
  if (error) destination.searchParams.set('error', 'invalid_callback')
  return applyConsumerAuthResponse(context, NextResponse.redirect(destination, 303))
}
