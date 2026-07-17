import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  SupabaseRealtimeAdmissionRepository,
  type SupabaseRealtimeAdmissionRpcClient,
} from './realtime-admission-supabase.ts'
import {
  RealtimeAdmissionService,
  type RealtimeAdmissionPolicy,
} from './realtime-admission.ts'

export const AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION = '20260717070000' as const

// Independent review gate. Deployment flags, credentials, migration claims,
// and the public Realtime latch cannot activate this adapter while it is false.
export const AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH = false as const

export type SupabaseRealtimeAdmissionActivation = {
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  atomicSqlProof?: string
  lifecycleSqlProof?: string
}

/**
 * Dormant server-only construction boundary for the service-role RPC adapter.
 * It does not read credentials, construct a route, or make a network call.
 */
export function createSupabaseRealtimeAdmissionService(
  serviceRoleClient: SupabaseClient<Database>,
  policy: RealtimeAdmissionPolicy,
  activation: SupabaseRealtimeAdmissionActivation,
) {
  if (
    !AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION
    || activation.credentialScope !== 'service-role'
    || activation.atomicSqlProof !== 'passed'
    || activation.lifecycleSqlProof !== 'passed'
  ) {
    throw new Error('Durable Realtime admission networking is disabled by the reviewed code-level latch.')
  }

  // Narrow the service-role client to the three reviewed RPC names. The
  // repository has no table, auth, storage, logging, or arbitrary-RPC surface.
  const rpcClient: SupabaseRealtimeAdmissionRpcClient = {
    rpc(name, args) {
      // The narrow adapter has already correlated each reviewed RPC name with
      // its exact validated argument object. `never` bridges Supabase's
      // generated overload union without broadening this boundary.
      return serviceRoleClient.rpc(name, args as never)
    },
  }
  return new RealtimeAdmissionService(
    new SupabaseRealtimeAdmissionRepository(rpcClient),
    policy,
  )
}
