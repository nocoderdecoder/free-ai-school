import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence.ts'

export const AI_PATH_AUTH_HOME = '/ai-path/auth'
export const AI_PATH_AUTH_CALLBACK = '/ai-path/auth/callback'
export const AI_PATH_AUTH_DEFAULT_RETURN = '/ai-path'

export type ConsumerAuthEnvironment = {
  nodeEnv?: string
  enabled?: string
  publicOrigin?: string
  supabaseUrl?: string
  publishableKey?: string
  serviceRoleKey?: string
}

export type ConsumerAuthCapability = {
  available: boolean
  reason: string
  publicOrigin: string | null
}

export function consumerAuthBoundaryMode(
  nodeEnv: string | undefined,
  enabled: string | undefined,
  capability: Pick<ConsumerAuthCapability, 'available'>,
): 'preview' | 'protect' | 'unavailable' {
  if (capability.available) return 'protect'
  if (nodeEnv !== 'production' && enabled !== 'true') return 'preview'
  return 'unavailable'
}

function normalizePublicOrigin(value: string | undefined, nodeEnv: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    const safeProtocol = url.protocol === 'https:' || (nodeEnv !== 'production' && loopback && url.protocol === 'http:')
    if (!safeProtocol
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== '' && url.pathname !== '/')) return null
    return url.origin
  } catch {
    return null
  }
}

export function resolveConsumerAuthCapability(environment: ConsumerAuthEnvironment): ConsumerAuthCapability {
  const disabled = (reason: string): ConsumerAuthCapability => ({
    available: false,
    reason,
    publicOrigin: null,
  })

  if (environment.enabled !== 'true') return disabled('consumer authentication is not explicitly enabled')
  if (!environment.supabaseUrl || !environment.publishableKey) {
    return disabled('Supabase public authentication configuration is incomplete')
  }
  if (!isSafeSupabaseProjectUrl(environment.supabaseUrl)) {
    return disabled('Supabase authentication URL is not a reviewed HTTPS project origin')
  }
  if (!isSafeSupabasePublicKey(environment.publishableKey)) {
    return disabled('the authentication client requires a publishable or anon key')
  }
  if (environment.serviceRoleKey && environment.publishableKey === environment.serviceRoleKey) {
    return disabled('the authentication client must never use the service-role key')
  }

  const publicOrigin = normalizePublicOrigin(environment.publicOrigin, environment.nodeEnv)
  if (environment.publicOrigin && !publicOrigin) return disabled('the configured public origin is invalid')
  if (environment.nodeEnv === 'production' && !publicOrigin) {
    return disabled('a reviewed HTTPS public origin is required in production')
  }
  return {
    available: true,
    reason: 'consumer authentication is configured',
    publicOrigin,
  }
}

export function normalizeAIPathReturnPath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1_024) {
    return AI_PATH_AUTH_DEFAULT_RETURN
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return AI_PATH_AUTH_DEFAULT_RETURN
  }

  try {
    const decoded = decodeURIComponent(value)
    if (/[\\\u0000-\u001f\u007f]/.test(decoded)) return AI_PATH_AUTH_DEFAULT_RETURN
    const url = new URL(value, 'https://ai-path.invalid')
    const isAIPath = url.pathname === '/ai-path' || url.pathname.startsWith('/ai-path/')
    const isCallback = url.pathname === AI_PATH_AUTH_CALLBACK || url.pathname.startsWith(`${AI_PATH_AUTH_CALLBACK}/`)
    if (url.origin !== 'https://ai-path.invalid' || !isAIPath || isCallback) {
      return AI_PATH_AUTH_DEFAULT_RETURN
    }
    return `${url.pathname}${url.search}`
  } catch {
    return AI_PATH_AUTH_DEFAULT_RETURN
  }
}

export function isValidConsumerEmail(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const email = value.trim()
  return email.length >= 3
    && email.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isExactMutationOrigin(request: Request, configuredOrigin?: string | null): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const expected = configuredOrigin || new URL(request.url).origin
    return new URL(origin).origin === expected && origin === new URL(origin).origin
  } catch {
    return false
  }
}

export function isAIPathAuthPublicPath(pathname: string): boolean {
  return pathname === AI_PATH_AUTH_HOME
    || pathname === AI_PATH_AUTH_CALLBACK
    || pathname.startsWith('/api/ai-path/auth/')
}
