import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import type { AiPathRetentionHttpRuntime } from './retention-http.ts'
import {
  AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET,
  AI_PATH_RETENTION_TARGET_TIMEOUT_MS,
} from './retention-supabase.ts'
import {
  AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH,
  AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION,
  createSupabaseRetentionRunner,
} from './retention-supabase.server.ts'
import { isSafeSupabaseProjectUrl, isSafeSupabasePublicKey } from './supabase-persistence.ts'

const unavailableRuntime = (): AiPathRetentionHttpRuntime => ({
  available: false,
  secret: null,
  run: async () => {
    throw new Error('AI Path retention is unavailable.')
  },
})

function validSchedulerSecret(value: string | undefined): value is string {
  return typeof value === 'string'
    && value.length >= 24
    && value.length <= 256
    && !/\s/.test(value)
}

/**
 * Dormant production assembly for the authenticated retention route.
 *
 * Both literal code latches are evaluated before any credential is read or a
 * Supabase client is constructed. Once separately reviewed open, the assembly
 * pins the SQL batch ceiling and the application deadline instead of accepting
 * either from deployment configuration or the HTTP request.
 */
export function getAiPathRetentionHttpRuntime(
  routeReady: boolean,
): AiPathRetentionHttpRuntime {
  if (!routeReady || !AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH) {
    return unavailableRuntime()
  }

  const enabled = process.env.AI_PATH_SUPABASE_RETENTION_ENABLED
  const schemaVersion = process.env.AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION
  const credentialScope = process.env.AI_PATH_SUPABASE_RETENTION_CREDENTIAL_SCOPE
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const secret = process.env.AI_PATH_RETENTION_JOB_SECRET
  if (
    enabled !== 'true'
    || schemaVersion !== AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION
    || credentialScope !== 'service-role'
    || !supabaseUrl
    || !isSafeSupabaseProjectUrl(supabaseUrl)
    || !serviceRoleKey
    || isSafeSupabasePublicKey(serviceRoleKey)
    || !validSchedulerSecret(secret)
  ) {
    return unavailableRuntime()
  }

  const serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  const runSupabase = createSupabaseRetentionRunner(serviceRoleClient, {
    enabled: 'true',
    schemaVersion: AI_PATH_SUPABASE_RETENTION_SCHEMA_VERSION,
    credentialScope: 'service-role',
  })

  return {
    available: true,
    secret,
    run: runId => runSupabase({
      runId,
      maximumDeletesPerTarget: AI_PATH_RETENTION_MAXIMUM_DELETES_PER_TARGET,
      targetTimeoutMs: AI_PATH_RETENTION_TARGET_TIMEOUT_MS,
    }),
  }
}
