import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  runSupabaseRetentionCycle,
  type SupabaseRetentionRpcClient,
} from './retention-supabase.ts'

export const AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION = '20260717060000' as const

// Independent code-review gate. Scheduler flags, credentials, and migration
// attestations cannot make a durable deletion call while this remains false.
export const AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH = false as const

export type SupabaseRetentionActivation = {
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
}

/**
 * Future server-only construction boundary. The caller must supply a client
 * created with a service-role credential; the adapter never reads that secret.
 * Supabase's service-role-only EXECUTE grants provide the authoritative check.
 */
export function createSupabaseRetentionRunner(
  serviceRoleClient: SupabaseClient<Database>,
  activation: SupabaseRetentionActivation,
) {
  if (
    !AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION
    || activation.credentialScope !== 'service-role'
  ) {
    throw new Error('Durable retention networking is disabled by the reviewed code-level latch.')
  }

  // Narrow the full Supabase client to the only operation the retention domain
  // is permitted to use. No table reads, request bodies, or arbitrary RPC names
  // cross this boundary.
  const client: SupabaseRetentionRpcClient = {
    rpc(name, args) {
      return serviceRoleClient.rpc(name, args)
    },
  }
  return (options: Parameters<typeof runSupabaseRetentionCycle>[1]) => (
    runSupabaseRetentionCycle(client, options)
  )
}
