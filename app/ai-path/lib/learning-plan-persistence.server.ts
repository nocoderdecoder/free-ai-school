import 'server-only'

import {
  InMemoryLearningPlanRepository,
  LearningPlanService,
} from './learning-plan.ts'
import { resolveLearningPlanPersistenceCapability } from './learning-plan-capability.ts'
import type {
  LearningPlanRequestRuntime,
} from './learning-plan-runtime.ts'
import { OwnedLearningPlanService } from './learning-plan-service.ts'
import {
  authenticateAssessmentRequest,
  getAssessmentSessionRuntime,
} from './session-persistence.server.ts'

const processState = globalThis as typeof globalThis & {
  __aiPathMemoryLearningPlanRepository?: InMemoryLearningPlanRepository
}

const memoryRepository = process.env.NODE_ENV === 'production'
  ? new InMemoryLearningPlanRepository()
  : processState.__aiPathMemoryLearningPlanRepository ??= new InMemoryLearningPlanRepository()
const memoryPlanService = new LearningPlanService(memoryRepository)
const memoryHttpService = new OwnedLearningPlanService(
  getAssessmentSessionRuntime().service,
  memoryPlanService,
)

export async function selectLearningPlanRequestRuntime(
  request: Request,
): Promise<LearningPlanRequestRuntime> {
  const capability = resolveLearningPlanPersistenceCapability({
    nodeEnv: process.env.NODE_ENV,
    store: process.env.AI_PATH_PLAN_STORE,
    sessionStore: process.env.AI_PATH_SESSION_STORE,
    enableTestAuth: process.env.AI_PATH_ENABLE_TEST_AUTH,
    enableDurable: process.env.AI_PATH_ENABLE_DURABLE_PLANS,
    schemaVersion: process.env.AI_PATH_PLAN_SCHEMA_VERSION,
  })

  if (capability.mode === 'memory-test') {
    const assessmentRuntime = getAssessmentSessionRuntime()
    if (!assessmentRuntime.capability.available) {
      return {
        mode: 'disabled',
        capability: {
          available: false,
          productionReady: false,
          persistence: 'none',
          reason: 'the required assessment-session memory store is unavailable',
        },
        principal: null,
        service: null,
        pendingCookies: [],
        pendingHeaders: {},
      }
    }
    return {
      mode: 'memory-test',
      capability,
      principal: authenticateAssessmentRequest(request),
      service: memoryHttpService,
      pendingCookies: [],
      pendingHeaders: {},
    }
  }

  // Durable construction is intentionally absent from request selection while
  // the literal code latch is false, so no Supabase client or network call can
  // be reached through deployment flags alone.
  return {
    mode: 'disabled',
    capability,
    principal: null,
    service: null,
    pendingCookies: [],
    pendingHeaders: {},
  }
}
