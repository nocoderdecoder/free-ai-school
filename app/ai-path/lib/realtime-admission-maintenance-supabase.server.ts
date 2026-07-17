import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  maintainSupabaseRealtimeAdmission,
  type SupabaseRealtimeAdmissionMaintenanceRpcClient,
} from './realtime-admission-maintenance-supabase.ts'

export const AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_SCHEMA_VERSION =
  '20260717070000' as const

// Scheduler flags, credentials, and lifecycle attestations cannot activate a
// database mutation while this independent reviewed latch remains false.
export const AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH = false as const

export type SupabaseRealtimeAdmissionMaintenanceActivation = {
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  lifecycleSqlProof?: string
  retentionOperationsReady?: string
}

/**
 * Dormant server-only construction boundary. Construction makes no request and
 * returns only a runner for the single reviewed maintenance RPC.
 */
export function createSupabaseRealtimeAdmissionMaintenanceRunner(
  serviceRoleClient: SupabaseClient<Database>,
  activation: SupabaseRealtimeAdmissionMaintenanceActivation,
) {
  if (
    !AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_SCHEMA_VERSION
    || activation.credentialScope !== 'service-role'
    || activation.lifecycleSqlProof !== 'passed'
    || activation.retentionOperationsReady !== 'true'
  ) {
    throw new Error('Durable Realtime admission maintenance is disabled by the reviewed code-level latch.')
  }

  const client: SupabaseRealtimeAdmissionMaintenanceRpcClient = {
    rpc(name, args, signal) {
      return serviceRoleClient.rpc(name, args).abortSignal(signal)
    },
  }
  return (input: Parameters<typeof maintainSupabaseRealtimeAdmission>[1]) => (
    maintainSupabaseRealtimeAdmission(client, input)
  )
}
