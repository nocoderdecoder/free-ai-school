import type { CookieOptions } from '@supabase/ssr'

import type { AssessmentPrincipal, AssessmentSessionService } from './session-persistence'

export type AssessmentRuntimeCapability = {
  available: boolean
  productionReady: boolean
  persistence: 'none' | 'ephemeral-memory' | 'supabase-postgres'
  reason: string
}

export type AssessmentRequestRuntime = {
  mode: 'mock' | 'memory-test' | 'supabase'
  capability: AssessmentRuntimeCapability
  principal: AssessmentPrincipal | null
  service: AssessmentSessionService | null
  pendingCookies: Array<{ name: string; value: string; options: CookieOptions }>
  pendingHeaders: Record<string, string>
}

