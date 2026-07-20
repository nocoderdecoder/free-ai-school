import 'server-only'

import { createClient } from '@supabase/supabase-js'

import {
  AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH,
  AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION,
  SupabaseConsumerDiagnosticPersistence,
  createSupabaseConsumerDiagnosticPersistence,
  type ConsumerDiagnosticPersistenceActivation,
  type ConsumerDiagnosticPersistenceRpcClient,
} from './diagnostic-persistence-supabase.ts'
import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence.ts'

export type ConsumerDiagnosticPersistenceCapability = Readonly<{
  available: boolean
  reason: string
}>

function activation(): ConsumerDiagnosticPersistenceActivation {
  return {
    enabled: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_ENABLED,
    schemaVersion: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION,
    credentialScope: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_CREDENTIAL_SCOPE,
    hostedProof: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_HOSTED_PROOF,
    retentionReady: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_RETENTION_READY,
    rollbackReady: process.env.AI_PATH_CONSUMER_DIAGNOSTIC_ROLLBACK_READY,
  }
}

function attested(value: ConsumerDiagnosticPersistenceActivation) {
  return value.enabled === 'true'
    && value.schemaVersion === AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION
    && value.credentialScope === 'verified-owner+service-role'
    && value.hostedProof === 'passed'
    && value.retentionReady === 'true'
    && value.rollbackReady === 'true'
}

/** Safe server-rendered availability signal; it never constructs a client. */
export function getConsumerDiagnosticPersistenceCapability(): ConsumerDiagnosticPersistenceCapability {
  if (!AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH) {
    return { available: false, reason: 'consumer diagnostic persistence is code-latched off' }
  }
  if (!attested(activation())) {
    return { available: false, reason: 'consumer diagnostic persistence activation is incomplete' }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !isSafeSupabaseProjectUrl(supabaseUrl)
    || !serviceRoleKey || isSafeSupabasePublicKey(serviceRoleKey)
    || serviceRoleKey.length < 32) {
    return { available: false, reason: 'consumer diagnostic persistence credential is invalid' }
  }
  return { available: true, reason: 'consumer diagnostic persistence is ready' }
}

/**
 * Creates the narrow service-role transport only after every independent gate.
 * With the checked-in latch closed, this returns null before reading a secret.
 */
export function createConsumerDiagnosticPersistenceRuntime(): SupabaseConsumerDiagnosticPersistence | null {
  const capability = getConsumerDiagnosticPersistenceCapability()
  if (!capability.available) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceRoleKey) return null
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  }) as unknown as ConsumerDiagnosticPersistenceRpcClient
  return createSupabaseConsumerDiagnosticPersistence(client, activation())
}
