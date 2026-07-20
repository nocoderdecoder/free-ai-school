import 'server-only'

import type { AnalyticsIntakeRuntime } from './analytics-http.ts'
import {
  InMemoryPrivacySafeAnalyticsSink,
  PrivacySafeAnalyticsService,
  resolveAnalyticsCapability,
} from './analytics.ts'

type AnalyticsGlobal = typeof globalThis & {
  __aiPathAnalyticsTestService?: PrivacySafeAnalyticsService
}

function processLocalTestService(): PrivacySafeAnalyticsService {
  const state = globalThis as AnalyticsGlobal
  state.__aiPathAnalyticsTestService ??= new PrivacySafeAnalyticsService(
    new InMemoryPrivacySafeAnalyticsSink(),
  )
  return state.__aiPathAnalyticsTestService
}

export function getAnalyticsIntakeRuntime(): AnalyticsIntakeRuntime {
  const capability = resolveAnalyticsCapability({
    nodeEnv: process.env.NODE_ENV,
    store: process.env.AI_PATH_ANALYTICS_STORE,
    enableTestSink: process.env.AI_PATH_ENABLE_TEST_ANALYTICS,
  })
  return {
    available: capability.available,
    mode: capability.mode,
    reason: capability.reason,
    service: capability.mode === 'memory-test' ? processLocalTestService() : null,
  }
}
