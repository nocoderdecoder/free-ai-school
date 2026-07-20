import 'server-only'

import {
  PrivacySafeAnalyticsService,
} from './analytics.ts'
import {
  governedSinkMatchesActivation,
  resolveProductionAnalyticsCapability,
  type GovernedProductionAnalyticsSink,
  type ProductionAnalyticsActivation,
} from './analytics-production.ts'

export * from './analytics-production.ts'

export function createProductionAnalyticsService(
  sink: GovernedProductionAnalyticsSink,
  activation: ProductionAnalyticsActivation,
) {
  if (!governedSinkMatchesActivation(sink, activation)) {
    throw new Error('Production analytics sink governance does not match the reviewed activation contract.')
  }
  const capability = resolveProductionAnalyticsCapability(activation)
  if (!capability.available) {
    throw new Error('Production analytics networking is disabled by the reviewed capability boundary.')
  }
  return new PrivacySafeAnalyticsService(sink)
}
