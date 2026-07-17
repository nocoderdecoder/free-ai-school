import type { CookieOptions } from '@supabase/ssr'

import type { LearningPlanHttpService } from './learning-plan-service.ts'
import type { AssessmentPrincipal } from './session-persistence.ts'

export type LearningPlanRuntimeCapability = {
  available: boolean
  productionReady: boolean
  persistence: 'none' | 'ephemeral-memory' | 'supabase-postgres'
  reason: string
}
export type LearningPlanRequestRuntime = {
  mode: 'disabled' | 'memory-test' | 'supabase'
  capability: LearningPlanRuntimeCapability
  principal: AssessmentPrincipal | null
  service: LearningPlanHttpService | null
  pendingCookies: Array<{ name: string; value: string; options: CookieOptions }>
  pendingHeaders: Record<string, string>
}
