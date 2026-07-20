import type { AssessmentPrincipal } from './session-persistence'

export const AI_PATH_SUPABASE_MIGRATION_VERSION = '20260717050000'

// This code-level latch intentionally cannot be changed by deployment config.
// Enabling durable persistence requires a reviewed code change after migrations,
// RLS integration tests, cookie refresh plumbing, and operational rollback exist.
export const AI_PATH_SUPABASE_PRODUCTION_LATCH = false as const

export type SupabasePersistenceEnvironment = {
  nodeEnv?: string
  enablePersistence?: string
  schemaVersion?: string
  authReady?: string
  rateLimitReady?: string
  supabaseUrl?: string
  publishableKey?: string
  serviceRoleKey?: string
}

export type SupabasePersistenceCapability = {
  mode: 'disabled' | 'supabase'
  available: boolean
  productionReady: boolean
  persistence: 'none' | 'supabase-postgres'
  reason: string
}

export function resolveSupabasePersistenceCapability(
  environment: SupabasePersistenceEnvironment,
): SupabasePersistenceCapability {
  const disabled = (reason: string): SupabasePersistenceCapability => ({
    mode: 'disabled',
    available: false,
    productionReady: false,
    persistence: 'none',
    reason,
  })

  if (environment.nodeEnv !== 'production') return disabled('durable persistence is production-only')
  if (environment.enablePersistence !== 'true') return disabled('durable persistence is not explicitly enabled')
  if (environment.schemaVersion !== AI_PATH_SUPABASE_MIGRATION_VERSION) {
    return disabled(`database migration ${AI_PATH_SUPABASE_MIGRATION_VERSION} is not attested`)
  }
  if (environment.authReady !== 'true') return disabled('cookie authentication and refresh handling are not attested')
  if (environment.rateLimitReady !== 'true') return disabled('trusted distributed rate limiting is not attested')
  if (!environment.supabaseUrl || !environment.publishableKey) {
    return disabled('Supabase URL and publishable key are not configured')
  }
  if (!isSafeSupabaseProjectUrl(environment.supabaseUrl)) {
    return disabled('Supabase URL is not a reviewed HTTPS project origin')
  }
  if (!isSafeSupabasePublicKey(environment.publishableKey)) {
    return disabled('the user-route Supabase credential is not a publishable or anon key')
  }
  if (environment.serviceRoleKey && environment.publishableKey === environment.serviceRoleKey) {
    return disabled('the user-route client must not use the Supabase service-role key')
  }
  if (!AI_PATH_SUPABASE_PRODUCTION_LATCH) {
    return disabled('the reviewed code-level production latch remains closed')
  }
  return {
    mode: 'supabase',
    available: true,
    productionReady: true,
    persistence: 'supabase-postgres',
    reason: 'durable authenticated persistence is ready',
  }
}

function legacyJwtRole(key: string): string | null {
  const payload = key.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=')
    const parsed = JSON.parse(atob(base64)) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

export function isSafeSupabasePublicKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true
  if (key.startsWith('sb_secret_')) return false
  return legacyJwtRole(key) === 'anon'
}

export function isSafeSupabaseProjectUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && url.username === ''
      && url.password === ''
      && url.port === ''
      && url.search === ''
      && url.hash === ''
      && (url.pathname === '' || url.pathname === '/')
      && /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname)
  } catch {
    return false
  }
}

export function supabaseAuthCookieOptions(
  nodeEnv: string | undefined,
  options: { remember?: boolean } = {},
) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    path: '/',
    secure: nodeEnv === 'production',
    ...(options.remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  }
}

export type RequestCookie = { name: string; value: string }

export function parseCookieHeader(cookieHeader: string | null): RequestCookie[] {
  if (!cookieHeader) return []
  return cookieHeader.split(';').flatMap(part => {
    const separator = part.indexOf('=')
    if (separator <= 0) return []
    const name = part.slice(0, separator).trim()
    const encodedValue = part.slice(separator + 1).trim()
    if (!name) return []
    try {
      return [{ name, value: decodeURIComponent(encodedValue) }]
    } catch {
      return [{ name, value: encodedValue }]
    }
  })
}

export type VerifiedUserClient = {
  auth: {
    getUser(): Promise<{
      data: { user: { id: string } | null }
      error: { message: string } | null
    }>
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Uses getUser(), never cookie-derived getSession(), for authorization identity. */
export async function verifySupabasePrincipal(client: VerifiedUserClient): Promise<AssessmentPrincipal | null> {
  const { data, error } = await client.auth.getUser()
  if (error || !data.user || !uuidPattern.test(data.user.id)) return null
  return { userId: data.user.id, source: 'supabase' }
}
