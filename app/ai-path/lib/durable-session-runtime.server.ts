import 'server-only'

import { AssessmentSessionService } from './session-persistence'
import {
  createVerifiedSupabaseContext,
  getSupabasePersistenceCapability,
} from './supabase-auth.server'
import { createSupabaseAssessmentSessionRepository } from './supabase-session-repository.server'

/**
 * Fully wired future boundary for a request-scoped authenticated repository.
 * The code-level capability latch is closed, so calling this today fails before
 * a Supabase client is created or any network request can occur.
 */
export async function createDurableAssessmentSessionRuntime(request: Request) {
  const capability = getSupabasePersistenceCapability()
  const context = await createVerifiedSupabaseContext(request)
  const repository = createSupabaseAssessmentSessionRepository(context.client, capability)
  return {
    capability,
    principal: context.principal,
    service: new AssessmentSessionService(repository),
    pendingCookies: context.pendingCookies,
    pendingHeaders: context.pendingHeaders,
  }
}

