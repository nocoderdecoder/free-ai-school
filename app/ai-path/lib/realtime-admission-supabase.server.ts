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

export const AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION = '20260717080000' as const

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
 * Dormant server-only construction boundary for the split-credential RPC adapter.
 * It does not read credentials, construct a route, or make a network call.
 */
export function createSupabaseRealtimeAdmissionService(
  clients: {
    authenticatedClient: SupabaseClient<Database>
    serviceRoleClient: SupabaseClient<Database>
  },
  activation: SupabaseRealtimeAdmissionActivation,
) {
  if (
    !AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH
    || !AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION
    || activation.credentialScope !== 'authenticated-intent+service-role'
    || activation.atomicSqlProof !== 'passed'
    || activation.lifecycleSqlProof !== 'passed'
    || activation.policyVersion !== AI_PATH_REALTIME_ADMISSION_POLICY.version
    || activation.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY.policyId
  ) {
    throw new Error('Durable Realtime admission networking is disabled by the reviewed code-level latch.')
  }

  const narrowRpcClient = (client: SupabaseClient<Database>): SupabaseRealtimeAdmissionRpcClient => ({
    rpc(name, args, signal) {
      return client.rpc(name as never, args as never).abortSignal(signal)
    },
  })
  const repository = new SupabaseRealtimeAdmissionRepository({
    authenticatedClient: narrowRpcClient(clients.authenticatedClient),
    serviceRoleClient: narrowRpcClient(clients.serviceRoleClient),
  })
  return new RealtimeAdmissionService(
    repository,
    AI_PATH_REALTIME_ADMISSION_POLICY,
  )
}
