import 'server-only'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from './database.types'
import {
  resolveConsumerAuthRequestOrigin,
  resolveConsumerAuthCapability,
  type ConsumerAuthCapability,
} from './consumer-auth'
import { parseCookieHeader, supabaseAuthCookieOptions } from './supabase-persistence'

export type PendingConsumerAuthCookie = { name: string; value: string; options: CookieOptions }

export type ConsumerAuthRequestContext = {
  capability: ConsumerAuthCapability
  client: SupabaseClient<Database>
  pendingCookies: PendingConsumerAuthCookie[]
  pendingHeaders: Record<string, string>
  remember: boolean
}

export class ConsumerAuthUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConsumerAuthUnavailableError'
  }
}

export function getConsumerAuthCapability(): ConsumerAuthCapability {
  return resolveConsumerAuthCapability({
    nodeEnv: process.env.NODE_ENV,
    enabled: process.env.AI_PATH_CONSUMER_AUTH_ENABLED,
    publicOrigin: process.env.AI_PATH_PUBLIC_ORIGIN,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY,
  })
}

export type VerifiedConsumerUser = Readonly<{
  id: string
  email: string | null
  provider: string | null
  createdAt: string | null
  lastSignInAt: string | null
}>

/**
 * Reads the request-time cookie store and asks Supabase to verify the user.
 * Configuration availability alone is never treated as authentication.
 */
export async function getVerifiedConsumerUser(): Promise<VerifiedConsumerUser | null> {
  const capability = getConsumerAuthCapability()
  if (!capability.available) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !publishableKey) return null

  try {
    const cookieStore = await cookies()
    const client = createServerClient<Database>(supabaseUrl, publishableKey, {
      cookieOptions: supabaseAuthCookieOptions(process.env.NODE_ENV),
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {
          // Server Components cannot write cookies. Refreshes happen in route handlers/proxy.
        },
      },
    })
    const { data, error } = await client.auth.getUser()
    const user = error ? null : data.user
    if (!user?.id) return null
    return {
      id: user.id,
      email: user.email ?? null,
      provider: user.app_metadata?.provider ?? user.identities?.[0]?.provider ?? null,
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    }
  } catch {
    return null
  }
}

export async function hasVerifiedConsumerSession(): Promise<boolean> {
  return Boolean(await getVerifiedConsumerUser())
}

function secureCookieOptions(options: CookieOptions, remember: boolean): CookieOptions {
  return {
    ...supabaseAuthCookieOptions(process.env.NODE_ENV, { remember }),
    ...options,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  }
}

export function createConsumerAuthRequestContext(
  request: Request,
  options: { remember?: boolean } = {},
): ConsumerAuthRequestContext {
  const capability = getConsumerAuthCapability()
  if (!capability.available) throw new ConsumerAuthUnavailableError(capability.reason)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !publishableKey) {
    throw new ConsumerAuthUnavailableError('Supabase public authentication configuration is incomplete.')
  }

  const pendingCookies: PendingConsumerAuthCookie[] = []
  const pendingHeaders: Record<string, string> = {}
  const client = createServerClient<Database>(supabaseUrl, publishableKey, {
    cookieOptions: supabaseAuthCookieOptions(process.env.NODE_ENV),
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie')),
      setAll: (cookies, headers) => {
        pendingCookies.push(...cookies.map(cookie => ({
          ...cookie,
          options: secureCookieOptions(cookie.options, options.remember === true),
        })))
        Object.assign(pendingHeaders, headers)
      },
    },
  })

  return { capability, client, pendingCookies, pendingHeaders, remember: options.remember === true }
}

const allowedAuthResponseHeaders = new Set(['cache-control', 'expires', 'pragma'])

export function applyConsumerAuthResponse(
  context: Pick<ConsumerAuthRequestContext, 'pendingCookies' | 'pendingHeaders'>,
  response: NextResponse,
): NextResponse {
  for (const [name, value] of Object.entries(context.pendingHeaders)) {
    if (allowedAuthResponseHeaders.has(name.toLowerCase())) response.headers.set(name, value)
  }
  for (const cookie of context.pendingCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options)
  }
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0')
  response.headers.set('Vary', 'Cookie')
  return response
}

export function consumerAuthPublicOrigin(request: Request, capability: ConsumerAuthCapability): string {
  return resolveConsumerAuthRequestOrigin(
    request.url,
    capability.publicOrigin,
    process.env.NODE_ENV,
    request.headers.get('origin'),
  )
}
