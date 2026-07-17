import type { LearningPlanRuntimeCapability } from './learning-plan-runtime.ts'

export const AI_PATH_LEARNING_PLAN_MIGRATION_VERSION = '20260717010000' as const
export const AI_PATH_DURABLE_LEARNING_PLAN_LATCH = false as const

export type LearningPlanEnvironment = {
  nodeEnv?: string
  store?: string
  sessionStore?: string
  enableTestAuth?: string
  enableDurable?: string
  schemaVersion?: string
}
export function resolveLearningPlanPersistenceCapability(
  environment: LearningPlanEnvironment,
): LearningPlanRuntimeCapability & { mode: 'disabled' | 'memory-test' | 'supabase' } {
  if (
    (environment.nodeEnv === 'test' || environment.nodeEnv === 'development')
    && environment.store === 'memory'
    && environment.sessionStore === 'memory'
    && environment.enableTestAuth === 'true'
  ) {
    return {
      mode: 'memory-test',
      available: true,
      productionReady: false,
      persistence: 'ephemeral-memory',
      reason: 'explicit non-production plan and assessment memory stores are enabled',
    }
  }
  if (
    AI_PATH_DURABLE_LEARNING_PLAN_LATCH
    && environment.enableDurable === 'true'
    && environment.schemaVersion === AI_PATH_LEARNING_PLAN_MIGRATION_VERSION
  ) {
    return {
      mode: 'supabase',
      available: true,
      productionReady: true,
      persistence: 'supabase-postgres',
      reason: 'durable owner-scoped plan persistence is enabled',
    }
  }
  return {
    mode: 'disabled',
    available: false,
    productionReady: false,
    persistence: 'none',
    reason: environment.nodeEnv === 'production'
      ? 'durable learning-plan persistence is closed by a code-level production latch'
      : 'learning-plan persistence requires explicit plan, assessment, and test-auth memory gates',
  }
}
