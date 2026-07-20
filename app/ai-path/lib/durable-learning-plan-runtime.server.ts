import 'server-only'

import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types.ts'
import {
  AI_PATH_LEARNING_PLAN_MIGRATION_VERSION,
  resolveLearningPlanPersistenceCapability,
} from './learning-plan-capability.ts'
import {
  createSupabaseLearningPlanService,
  resolveSupabaseLearningPlanGatewayCapability,
} from './learning-plan-supabase.server.ts'
import {
  createVerifiedSupabaseContext,
  getSupabasePersistenceCapability,
} from './supabase-auth.server.ts'
import { isSafeSupabasePublicKey } from './supabase-persistence.ts'

const durableActivation = () => ({
  enabled: process.env.AI_PATH_ENABLE_DURABLE_PLANS,
  schemaVersion: process.env.AI_PATH_PLAN_SCHEMA_VERSION,
  credentialScope: process.env.AI_PATH_PLAN_CREDENTIAL_SCOPE,
})

/**
 * Dormant request-scoped construction boundary for the owner plan routes.
 *
 * Capability checks deliberately run before authentication, credential access,
 * client construction, or a gateway call. With either literal code latch closed,
 * this factory cannot read the service credential or create a network client.
 */
export async function createDurableLearningPlanRequestRuntime(request: Request) {
  const planCapability = resolveLearningPlanPersistenceCapability({
    nodeEnv: process.env.NODE_ENV,
    store: process.env.AI_PATH_PLAN_STORE,
    sessionStore: process.env.AI_PATH_SESSION_STORE,
    enableTestAuth: process.env.AI_PATH_ENABLE_TEST_AUTH,
    enableDurable: process.env.AI_PATH_ENABLE_DURABLE_PLANS,
    schemaVersion: process.env.AI_PATH_PLAN_SCHEMA_VERSION,
    serviceRoleReady: process.env.AI_PATH_PLAN_SERVICE_ROLE_READY,
  })
  if (!planCapability.available || planCapability.mode !== 'supabase') {
    throw new Error(`Durable learning-plan request runtime is unavailable: ${planCapability.reason}.`)
  }

  const assessmentCapability = getSupabasePersistenceCapability()
  if (!assessmentCapability.available || assessmentCapability.mode !== 'supabase') {
    throw new Error(`Durable assessment-session dependency is unavailable: ${assessmentCapability.reason}.`)
  }

  const gatewayCapability = resolveSupabaseLearningPlanGatewayCapability(durableActivation())
  if (!gatewayCapability.available) {
    throw new Error(`Durable learning-plan request runtime is unavailable: ${gatewayCapability.reason}.`)
  }

  const context = await createVerifiedSupabaseContext(request)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceRoleKey || isSafeSupabasePublicKey(serviceRoleKey)) {
    throw new Error('Durable learning-plan server configuration is incomplete.')
  }

  const serviceRoleClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  })
  const service = createSupabaseLearningPlanService(
    context.client,
    serviceRoleClient,
    {
      enabled: 'true',
      schemaVersion: AI_PATH_LEARNING_PLAN_MIGRATION_VERSION,
      credentialScope: 'authenticated-user+service-role',
    },
  )

  return {
    capability: planCapability,
    principal: context.principal,
    service,
    pendingCookies: context.pendingCookies,
    pendingHeaders: context.pendingHeaders,
  }
}
