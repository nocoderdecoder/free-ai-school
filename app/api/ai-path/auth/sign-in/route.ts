import { NextResponse } from 'next/server'

import {
  AI_PATH_AUTH_HOME,
  isExactMutationOrigin,
  isValidConsumerEmail,
  normalizeAIPathReturnPath,
} from '@/app/ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  consumerAuthPublicOrigin,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
} from '@/app/ai-path/lib/consumer-auth.server'
import { checkAiPathRateLimit } from '@/app/ai-path/lib/rate-limit.server'

const MAX_AUTH_FORM_BYTES = 8_192
const REMEMBER_SEARCH_VALUE = '1'

function authPageRedirect(request: Request, parameters: Record<string, string>): NextResponse {
  const capability = getConsumerAuthCapability()
  const destination = new URL(AI_PATH_AUTH_HOME, consumerAuthPublicOrigin(request, capability))
  for (const [name, value] of Object.entries(parameters)) destination.searchParams.set(name, value)
  return NextResponse.redirect(destination, 303)
}

export async function POST(request: Request) {
  const capability = getConsumerAuthCapability()
  if (!capability.available) {
    return authPageRedirect(request, { error: 'not_configured' })
  }
  if (!isExactMutationOrigin(request, consumerAuthPublicOrigin(request, capability))) {
    return NextResponse.json({ error: 'cross_origin_request_rejected' }, {
      status: 403,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const rateLimit = await checkAiPathRateLimit(request, 'ai-path-auth-sign-in')
  if (!rateLimit.allowed) {
    const response = authPageRedirect(request, {
      error: rateLimit.reason === 'unavailable' ? 'sign_in_unavailable' : 'too_many_attempts',
    })
    response.headers.set('Retry-After', String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1_000))))
    return response
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() || ''
  const declaredLength = Number(request.headers.get('content-length') || '0')
  if (!contentType.startsWith('application/x-www-form-urlencoded')
    || !Number.isFinite(declaredLength)
    || declaredLength > MAX_AUTH_FORM_BYTES) {
    return authPageRedirect(request, { error: 'invalid_request' })
  }

  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_AUTH_FORM_BYTES) {
    return authPageRedirect(request, { error: 'invalid_request' })
  }
  const form = new URLSearchParams(body)
  const email = form.get('email')?.trim()
  const next = normalizeAIPathReturnPath(form.get('next'))
  const remember = form.get('remember') === REMEMBER_SEARCH_VALUE
  if (!isValidConsumerEmail(email)) {
    return authPageRedirect(request, { error: 'invalid_email', next })
  }

  const emailRateLimit = await checkAiPathRateLimit(
    request,
    'ai-path-auth-email',
    null,
    email.toLowerCase(),
  )
  if (!emailRateLimit.allowed) {
    const response = authPageRedirect(request, {
      error: emailRateLimit.reason === 'unavailable' ? 'sign_in_unavailable' : 'too_many_attempts',
    })
    response.headers.set('Retry-After', String(Math.max(1, Math.ceil((emailRateLimit.resetAt - Date.now()) / 1_000))))
    return response
  }

  const context = createConsumerAuthRequestContext(request)
  const callback = new URL('/ai-path/auth/callback', consumerAuthPublicOrigin(request, capability))
  callback.searchParams.set('next', next)
  if (remember) callback.searchParams.set('remember', REMEMBER_SEARCH_VALUE)
  const { error } = await context.client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callback.toString(),
      shouldCreateUser: true,
    },
  })

  const response = authPageRedirect(request, error
    ? { error: 'sign_in_failed', next }
    : { sent: '1', next })
  return applyConsumerAuthResponse(context, response)
}

export async function GET(request: Request) {
  return authPageRedirect(request, {})
}
