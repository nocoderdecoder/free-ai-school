import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  createVerifiedSupabaseContext,
  getSupabasePersistenceCapability,
} from './supabase-auth.server.ts'
import {
  isSafeSupabaseProjectUrl,
  isSafeSupabasePublicKey,
} from './supabase-persistence.ts'
import {
  AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH,
  AI_PATH_TRUSTED_ANALYSIS_TRANSITION_MIGRATION_VERSION,
  AI_PATH_TRUSTED_REPORT_WRITER_LATCH,
  createSupabaseTrustedAnalysisTransition,
  createSupabaseTrustedReportWriter,
} from './supabase-session-repository.server.ts'
import { TrustedAnalysisCoordinator } from './trusted-analysis.ts'

// Independent request-assembly latch. Public assessment runtime selection does
// not import this module, and deployment flags cannot make it reachable.
export const AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH = false as const

function activation() {
  return {
    enabled: process.env.AI_PATH_TRUSTED_ANALYSIS_ENABLED,
    schemaVersion: process.env.AI_PATH_TRUSTED_ANALYSIS_SCHEMA_VERSION,
    credentialScope: process.env.AI_PATH_TRUSTED_ANALYSIS_CREDENTIAL_SCOPE,
  }
}

/**
 * Dormant request-scoped split-credential assembly.
 *
 * Every literal latch and public capability check occurs before authentication,
 * service-credential access, or client construction. The verified user context
 * establishes owner identity; one separately constructed non-persistent service
 * client is narrowed to the transition and report-completion RPC adapters.
 */
export async function createDurableTrustedAnalysisRuntime(request: Request) {
  if (
    !AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH
    || !AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH
    || !AI_PATH_TRUSTED_REPORT_WRITER_LATCH
  ) {
    throw new Error('Durable trusted analysis runtime is disabled by the reviewed code-level latch.')
  }

  const capability = getSupabasePersistenceCapability()
  if (!capability.available || !capability.productionReady || capability.mode !== 'supabase') {
    throw new Error(`Durable trusted analysis runtime is unavailable: ${capability.reason}.`)
  }

  const reviewedActivation = activation()
  if (
    reviewedActivation.enabled !== 'true'
    || reviewedActivation.schemaVersion !== AI_PATH_TRUSTED_ANALYSIS_TRANSITION_MIGRATION_VERSION
    || reviewedActivation.credentialScope !== 'verified-owner+service-role'
  ) {
    throw new Error('Durable trusted analysis activation evidence is incomplete.')
  }

  const context = await createVerifiedSupabaseContext(request)
  if (!context.principal || context.principal.source !== 'supabase') {
    throw new Error('Verified Supabase authentication is required for durable trusted analysis.')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (
    !supabaseUrl
    || !isSafeSupabaseProjectUrl(supabaseUrl)
    || !serviceRoleKey
    || isSafeSupabasePublicKey(serviceRoleKey)
  ) {
    throw new Error('Durable trusted analysis service-role configuration is incomplete.')
  }

  const serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  const adapterActivation = {
    enabled: 'true',
    schemaVersion: AI_PATH_TRUSTED_ANALYSIS_TRANSITION_MIGRATION_VERSION,
    credentialScope: 'verified-owner+service-role',
  }
  const transition = createSupabaseTrustedAnalysisTransition(
    serviceRoleClient,
    adapterActivation,
  )
  const writer = createSupabaseTrustedReportWriter(
    serviceRoleClient,
    adapterActivation,
  )

  return Object.freeze({
    capability,
    principal: context.principal,
    coordinator: new TrustedAnalysisCoordinator(transition, writer),
    pendingCookies: context.pendingCookies,
    pendingHeaders: context.pendingHeaders,
  })
}
