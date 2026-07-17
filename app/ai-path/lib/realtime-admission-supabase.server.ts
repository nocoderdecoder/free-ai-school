import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  SupabaseRealtimeAdmissionRepository,
  type SupabaseRealtimeAdmissionRpcClient,
} from './realtime-admission-supabase.ts'
import {
  AI_PATH_REALTIME_ADMISSION_POLICY,
  AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH,
} from './realtime-admission-policy.server.ts'
import { RealtimeAdmissionService } from './realtime-admission.ts'

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
  policyVersion?: string
  policyId?: string
}

/**
 * Dormant server-only construction boundary for the service-role RPC adapter.
 * It does not read credentials, construct a route, or make a network call.
 */
export function createSupabaseRealtimeAdmissionService(
  serviceRoleClient: SupabaseClient<Database>,
  activation: SupabaseRealtimeAdmissionActivation,
) {
  if (
    !AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH
    || !AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION
    || activation.credentialScope !== 'service-role'
    || activation.atomicSqlProof !== 'passed'
    || activation.lifecycleSqlProof !== 'passed'
    || activation.policyVersion !== AI_PATH_REALTIME_ADMISSION_POLICY.version
    || activation.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY.policyId
  ) {
    throw new Error('Durable Realtime admission networking is disabled by the reviewed code-level latch.')
  }

  // Narrow the service-role client to the three reviewed RPC names. The
  // repository has no table, auth, storage, logging, or arbitrary-RPC surface.
  const rpcClient: SupabaseRealtimeAdmissionRpcClient = {
    rpc(name, args, signal) {
      // The narrow adapter has already correlated each reviewed RPC name with
      // its exact validated argument object. `never` bridges Supabase's
      // generated overload union without broadening this boundary.
      return serviceRoleClient.rpc(name, args as never).abortSignal(signal)
    },
  }
  return new RealtimeAdmissionService(
    new SupabaseRealtimeAdmissionRepository(rpcClient),
    AI_PATH_REALTIME_ADMISSION_POLICY.limits,
  )
}
