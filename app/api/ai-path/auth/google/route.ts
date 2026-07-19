import { NextResponse } from 'next/server'

import {
  AI_PATH_AUTH_HOME,
  isExactMutationOrigin,
  normalizeAIPathReturnPath,
} from '@/app/ai-path/lib/consumer-auth'
import {
  applyConsumerAuthResponse,
  consumerAuthPublicOrigin,
  createConsumerAuthRequestContext,
  getConsumerAuthCapability,
} from '@/app/ai-path/lib/consumer-auth.server'
import { checkAiPathRateLimit } from '@/app/ai-path/lib/rate-limit.server'

const MAX_AUTH_FORM_BYTES = 2_048
const REMEMBER_SEARCH_VALUE = '1'

function authPageRedirect(request: Request, parameters: Record<string, string>): NextResponse {
  const capability = getConsumerAuthCapability()
  const destination = new URL(AI_PATH_AUTH_HOME, consumerAuthPublicOrigin(request, capability))
  for (const [name, value] of Object.entries(parameters)) destination.searchParams.set(name, value)
  return NextResponse.redirect(destination, 303)
}

function isTrustedSupabaseAuthorizationUrl(value: string, supabaseUrl: string): boolean {
  try {
    const authorization = new URL(value)
    const project = new URL(supabaseUrl)
    return authorization.protocol === 'https:'
      && authorization.origin === project.origin
      && authorization.pathname === '/auth/v1/authorize'
      && authorization.searchParams.get('provider') === 'google'
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  const capability = getConsumerAuthCapability()
  if (!capability.available) return authPageRedirect(request, { error: 'not_configured' })

  const requestOrigin = consumerAuthPublicOrigin(request, capability)
  if (!isExactMutationOrigin(request, requestOrigin)) {
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
  const next = normalizeAIPathReturnPath(form.get('next'))
  const remember = form.get('remember') === REMEMBER_SEARCH_VALUE
  const callback = new URL('/ai-path/auth/callback', requestOrigin)
  callback.searchParams.set('next', next)
  if (remember) callback.searchParams.set('remember', REMEMBER_SEARCH_VALUE)

  const context = createConsumerAuthRequestContext(request)
  const { data, error } = await context.client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback.toString(),
      skipBrowserRedirect: true,
    },
  })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (error || !data.url || !supabaseUrl || !isTrustedSupabaseAuthorizationUrl(data.url, supabaseUrl)) {
    return applyConsumerAuthResponse(
      context,
      authPageRedirect(request, { error: 'google_sign_in_failed', next }),
    )
  }

  return applyConsumerAuthResponse(context, NextResponse.redirect(data.url, 303))
}

export async function GET(request: Request) {
  return authPageRedirect(request, {})
}
