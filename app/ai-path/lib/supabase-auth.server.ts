import 'server-only'

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import type { AssessmentPrincipal } from './session-persistence'
import {
  parseCookieHeader,
  resolveSupabasePersistenceCapability,
  supabaseAuthCookieOptions,
  verifySupabasePrincipal,
  type SupabasePersistenceCapability,
} from './supabase-persistence'

export type PendingAuthCookie = { name: string; value: string; options: CookieOptions }

export type VerifiedSupabaseContext = {
  principal: AssessmentPrincipal | null
  client: SupabaseClient<Database>
  pendingCookies: PendingAuthCookie[]
  pendingHeaders: Record<string, string>
}

export class SupabaseAuthUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupabaseAuthUnavailableError'
  }
}

function environmentCapability(): SupabasePersistenceCapability {
  return resolveSupabasePersistenceCapability({
    nodeEnv: process.env.NODE_ENV,
    enablePersistence: process.env.AI_PATH_SUPABASE_PERSISTENCE_ENABLED,
    schemaVersion: process.env.AI_PATH_SUPABASE_SCHEMA_VERSION,
    authReady: process.env.AI_PATH_SUPABASE_AUTH_READY,
    rateLimitReady: process.env.AI_PATH_SUPABASE_RATE_LIMIT_READY,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  })
}

export function getSupabasePersistenceCapability() {
  return environmentCapability()
}

/**
 * Future request boundary. The closed code-level capability latch guarantees
 * this function throws before creating a client or contacting Supabase today.
 */
export async function createVerifiedSupabaseContext(request: Request): Promise<VerifiedSupabaseContext> {
  const capability = environmentCapability()
  if (!capability.available) throw new SupabaseAuthUnavailableError(capability.reason)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !publishableKey) {
    throw new SupabaseAuthUnavailableError('Supabase public configuration is incomplete.')
  }

  const pendingCookies: PendingAuthCookie[] = []
  const pendingHeaders: Record<string, string> = {}
  const client = createServerClient<Database>(supabaseUrl, publishableKey, {
    cookieOptions: supabaseAuthCookieOptions(process.env.NODE_ENV),
    cookies: {
      getAll: () => parseCookieHeader(request.headers.get('cookie')),
      setAll: (cookies, headers) => {
        pendingCookies.push(...cookies)
        Object.assign(pendingHeaders, headers)
      },
    },
  })
  const principal = await verifySupabasePrincipal(client)
  return { principal, client, pendingCookies, pendingHeaders }
}
