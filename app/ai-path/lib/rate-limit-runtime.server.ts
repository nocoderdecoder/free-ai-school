import 'server-only'

import { createClient } from '@supabase/supabase-js'

import {
  AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH,
  AI_PATH_RATE_LIMIT_SCHEMA_VERSION,
  type AtomicRateLimitStore,
  type DistributedRateLimitActivation,
} from './rate-limit.ts'
import { SupabaseAtomicRateLimitStore } from './rate-limit-supabase.ts'
import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence.ts'

// A second code-owned latch prevents credentials or deployment flags from
// activating the new RPC until hosted atomicity and rollback evidence exists.
export const AI_PATH_SUPABASE_RATE_LIMIT_GATEWAY_LATCH = false as const

export type ProductionRateLimitRuntime = Readonly<{
  store: AtomicRateLimitStore
  activation: DistributedRateLimitActivation
  identitySalt: string
}>

export function getProductionRateLimitRuntime(): ProductionRateLimitRuntime | null {
  if (!AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH || !AI_PATH_SUPABASE_RATE_LIMIT_GATEWAY_LATCH) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const identitySalt = process.env.AI_PATH_RATE_LIMIT_IDENTITY_SALT
  if (!supabaseUrl || !isSafeSupabaseProjectUrl(supabaseUrl)
    || !serviceRoleKey || isSafeSupabasePublicKey(serviceRoleKey)
    || !identitySalt || identitySalt.length < 32 || identitySalt.length > 256) return null

  const trustedProxyHops = Number(process.env.AI_PATH_RATE_LIMIT_TRUSTED_PROXY_HOPS)
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  })
  return {
    store: new SupabaseAtomicRateLimitStore(client),
    identitySalt,
    activation: {
      enabled: process.env.AI_PATH_DISTRIBUTED_RATE_LIMIT_ENABLED,
      schemaVersion: process.env.AI_PATH_RATE_LIMIT_SCHEMA_VERSION || AI_PATH_RATE_LIMIT_SCHEMA_VERSION,
      credentialScope: process.env.AI_PATH_RATE_LIMIT_CREDENTIAL_SCOPE,
      atomicityProof: process.env.AI_PATH_RATE_LIMIT_ATOMICITY_PROOF,
      trustedProxyHops,
      trustedProxyReviewReference: process.env.AI_PATH_RATE_LIMIT_PROXY_REVIEW_REFERENCE,
      rollbackReady: process.env.AI_PATH_RATE_LIMIT_ROLLBACK_READY,
    },
  }
}
