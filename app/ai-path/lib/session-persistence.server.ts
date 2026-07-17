import 'server-only'

import { createDurableAssessmentSessionRuntime } from './durable-session-runtime.server'
import type { AssessmentRequestRuntime } from './request-runtime'
import {
  AssessmentSessionService,
  InMemoryAssessmentSessionRepository,
  parseTestPrincipal,
  resolveSessionPersistenceCapability,
  type AssessmentPrincipal,
} from './session-persistence'
import { getSupabasePersistenceCapability } from './supabase-auth.server'

export { applyAssessmentRuntimeResponse } from './runtime-response'

const processState = globalThis as typeof globalThis & {
  __aiPathMemorySessionRepository?: InMemoryAssessmentSessionRepository
}

// Next development mode can evaluate Route Handler bundles independently.
// Keep the explicitly test-only adapter process-global so those bundles share
// one contract store. Production never uses this adapter, even if flags are set.
const repository = process.env.NODE_ENV === 'production'
  ? new InMemoryAssessmentSessionRepository()
  : processState.__aiPathMemorySessionRepository ??= new InMemoryAssessmentSessionRepository()
const service = new AssessmentSessionService(repository)

export function getAssessmentSessionRuntime() {
  const capability = resolveSessionPersistenceCapability({
    nodeEnv: process.env.NODE_ENV,
    store: process.env.AI_PATH_SESSION_STORE,
    enableTestAuth: process.env.AI_PATH_ENABLE_TEST_AUTH,
  })
  return { capability, service }
}

export function authenticateAssessmentRequest(request: Request): AssessmentPrincipal | null {
  const { capability } = getAssessmentSessionRuntime()
  return parseTestPrincipal(request.headers.get('x-ai-path-test-user-id'), capability)
}

export async function selectAssessmentRequestRuntime(request: Request): Promise<AssessmentRequestRuntime> {
  const durableCapability = getSupabasePersistenceCapability()
  if (durableCapability.available) {
    const durable = await createDurableAssessmentSessionRuntime(request)
    return {
      mode: 'supabase',
      capability: durable.capability,
      principal: durable.principal,
      service: durable.service,
      pendingCookies: durable.pendingCookies,
      pendingHeaders: durable.pendingHeaders,
    }
  }

  const local = getAssessmentSessionRuntime()
  if (local.capability.available) {
    return {
      mode: 'memory-test',
      capability: local.capability,
      principal: authenticateAssessmentRequest(request),
      service: local.service,
      pendingCookies: [],
      pendingHeaders: {},
    }
  }

  return {
    mode: 'mock',
    capability: local.capability,
    principal: null,
    service: null,
    pendingCookies: [],
    pendingHeaders: {},
  }
}
