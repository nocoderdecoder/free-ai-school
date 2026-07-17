import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import type { AssessmentRequestRuntime } from './request-runtime.ts'
import { AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH } from './realtime-admission.ts'
import {
  AI_PATH_REALTIME_ADMISSION_POLICY,
  AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH,
} from './realtime-admission-policy.server.ts'
import {
  createSupabaseRealtimeAdmissionService,
  AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION,
  AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH,
} from './realtime-admission-supabase.server.ts'
import { AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH } from './realtime-bootstrap.ts'
import { AssessmentSessionService } from './session-persistence.ts'
import {
  createVerifiedSupabaseContext,
  getSupabasePersistenceCapability,
} from './supabase-auth.server.ts'
import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence.ts'
import { createSupabaseAssessmentSessionRepository } from './supabase-session-repository.server.ts'

// Independent assembly review gate. It must remain a literal false until an
// isolated staging deployment proves the complete request path with split
// credentials. Deployment flags and existing credentials cannot open it.
export const AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH = false as const

export type RealtimeBootstrapRequestRuntime = Readonly<{
  runtime: AssessmentRequestRuntime
  admission: ReturnType<typeof createSupabaseRealtimeAdmissionService>
}>

function admissionActivation() {
  return {
    enabled: process.env.AI_PATH_ENABLE_REALTIME_ADMISSION,
    schemaVersion: process.env.AI_PATH_REALTIME_ADMISSION_SCHEMA_VERSION,
    credentialScope: process.env.AI_PATH_REALTIME_ADMISSION_CREDENTIAL_SCOPE,
    atomicSqlProof: process.env.AI_PATH_REALTIME_ADMISSION_ATOMIC_SQL_PROOF,
    lifecycleSqlProof: process.env.AI_PATH_REALTIME_ADMISSION_LIFECYCLE_SQL_PROOF,
    policyVersion: process.env.AI_PATH_REALTIME_ADMISSION_POLICY_VERSION,
    policyId: process.env.AI_PATH_REALTIME_ADMISSION_POLICY_ID,
  }
}

/**
 * Dormant, request-scoped split-credential assembly for the provider-free
 * owner -> intent -> atomic-reservation preparation boundary.
 *
 * Every code-level and capability check runs before authentication, service
 * credential access, or client construction. When reviewed in a future staging
 * change, one verified cookie-authenticated client is reused for ownership and
 * intent issuance. A separately constructed, non-persistent service-role client
 * can reach only the opaque reserve/finalize/cancel RPC adapter. Neither client,
 * credential, nor provider data is exposed by the returned DTO.
 */
export async function createRealtimeBootstrapRequestRuntime(
  request: Request,
): Promise<RealtimeBootstrapRequestRuntime> {
  if (
    !AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH
    || !AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH
    || !AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH
    || !AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH
    || !AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH
  ) {
    throw new Error('Realtime request assembly is disabled by the reviewed code-level latch.')
  }

  const capability = getSupabasePersistenceCapability()
  if (!capability.available || !capability.productionReady || capability.mode !== 'supabase') {
    throw new Error(`Realtime request assembly is unavailable: ${capability.reason}.`)
  }

  const activation = admissionActivation()
  if (
    activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_SUPABASE_REALTIME_ADMISSION_SCHEMA_VERSION
    || activation.credentialScope !== 'authenticated-intent+service-role'
    || activation.atomicSqlProof !== 'passed'
    || activation.lifecycleSqlProof !== 'passed'
    || activation.policyVersion !== AI_PATH_REALTIME_ADMISSION_POLICY.version
    || activation.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY.policyId
  ) {
    throw new Error('Realtime admission staging evidence is incomplete.')
  }

  const context = await createVerifiedSupabaseContext(request)
  if (!context.principal || context.principal.source !== 'supabase') {
    throw new Error('Verified Supabase authentication is required for Realtime request assembly.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl
      || !isSafeSupabaseProjectUrl(supabaseUrl)
      || !serviceRoleKey
      || isSafeSupabasePublicKey(serviceRoleKey)) {
    throw new Error('Realtime service-role configuration is incomplete.')
  }

  const serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  const sessionRepository = createSupabaseAssessmentSessionRepository(context.client, capability)
  const admission = createSupabaseRealtimeAdmissionService({
    authenticatedClient: context.client,
    serviceRoleClient,
  }, activation)

  return Object.freeze({
    runtime: {
      mode: 'supabase',
      capability,
      principal: context.principal,
      service: new AssessmentSessionService(sessionRepository),
      pendingCookies: context.pendingCookies,
      pendingHeaders: context.pendingHeaders,
    },
    admission,
  })
}
