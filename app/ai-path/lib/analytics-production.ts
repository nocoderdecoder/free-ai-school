import { AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH } from './analytics.ts'
import type { PrivacySafeAnalyticsSink } from './analytics.ts'

export const AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION = '2026-07-17.v1' as const
export const AI_PATH_ANALYTICS_MAX_RETENTION_DAYS = 90 as const
export const AI_PATH_ANALYTICS_DELETION_SLO_HOURS = 24 as const
export const AI_PATH_ANALYTICS_MINIMUM_COHORT = 10 as const

export type ProductionAnalyticsActivation = Readonly<{
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  dataRegion?: string
  retentionDays?: number
  deletionSloHours?: number
  minimumCohort?: number
  replaySafeWrites?: string
  leastPrivilegeAccess?: string
  encryption?: string
  rollbackReady?: string
  privacyReviewReference?: string
}>

export type ProductionAnalyticsCapability = Readonly<{
  available: boolean
  productionReady: boolean
  reason: string
}>

export interface GovernedProductionAnalyticsSink extends PrivacySafeAnalyticsSink {
  readonly governance: Readonly<{
    schemaVersion: typeof AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION
    dataRegion: string
    retentionDays: number
    deletionSloHours: typeof AI_PATH_ANALYTICS_DELETION_SLO_HOURS
    minimumCohort: number
    replaySafeWrites: true
    leastPrivilegeAccess: true
    encryption: 'at-rest-and-transit'
    rollbackReady: true
    privacyReviewReference: string
  }>
}

export function governedSinkMatchesActivation(
  sink: GovernedProductionAnalyticsSink,
  activation: ProductionAnalyticsActivation,
) {
  const governance = sink.governance
  return governance?.schemaVersion === activation.schemaVersion
    && governance.dataRegion === activation.dataRegion
    && governance.retentionDays === activation.retentionDays
    && governance.deletionSloHours === activation.deletionSloHours
    && governance.minimumCohort === activation.minimumCohort
    && governance.replaySafeWrites === true
    && activation.replaySafeWrites === 'true'
    && governance.leastPrivilegeAccess === true
    && activation.leastPrivilegeAccess === 'true'
    && governance.encryption === activation.encryption
    && governance.rollbackReady === true
    && activation.rollbackReady === 'true'
    && governance.privacyReviewReference === activation.privacyReviewReference
}

function reviewedReference(value: string | undefined) {
  if (!value) return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Vendor-neutral activation contract. No vendor SDK, credential, environment,
 * network client, or event body crosses this review boundary.
 */
export function resolveProductionAnalyticsCapability(
  activation: ProductionAnalyticsActivation,
): ProductionAnalyticsCapability {
  const disabled = (reason: string): ProductionAnalyticsCapability => ({
    available: false,
    productionReady: false,
    reason,
  })
  if (activation.enabled !== 'true') return disabled('production analytics is not explicitly enabled')
  if (activation.schemaVersion !== AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION) {
    return disabled('the governed analytics schema is not attested')
  }
  if (activation.credentialScope !== 'server-only') {
    return disabled('the analytics credential scope is not server-only')
  }
  if (!activation.dataRegion || !/^[a-z][a-z0-9-]{1,31}$/.test(activation.dataRegion)) {
    return disabled('the reviewed analytics data region is missing')
  }
  if (!Number.isInteger(activation.retentionDays)
      || (activation.retentionDays ?? 0) < 1
      || (activation.retentionDays ?? 0) > AI_PATH_ANALYTICS_MAX_RETENTION_DAYS) {
    return disabled('analytics retention is outside the reviewed bound')
  }
  if (activation.deletionSloHours !== AI_PATH_ANALYTICS_DELETION_SLO_HOURS) {
    return disabled('the analytics deletion SLO is not attested')
  }
  if (!Number.isInteger(activation.minimumCohort)
      || (activation.minimumCohort ?? 0) < AI_PATH_ANALYTICS_MINIMUM_COHORT) {
    return disabled('the analytics reporting cohort floor is too small')
  }
  if (activation.replaySafeWrites !== 'true') return disabled('replay-safe writes are not attested')
  if (activation.leastPrivilegeAccess !== 'true') return disabled('least-privilege access is not attested')
  if (activation.encryption !== 'at-rest-and-transit') return disabled('analytics encryption is not attested')
  if (activation.rollbackReady !== 'true') return disabled('analytics rollback is not attested')
  if (!reviewedReference(activation.privacyReviewReference)) {
    return disabled('a reviewed privacy decision reference is required')
  }
  if (!AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH) {
    return disabled('the reviewed production analytics sink latch remains closed')
  }
  return {
    available: true,
    productionReady: true,
    reason: 'the governed production analytics sink is ready',
  }
}
