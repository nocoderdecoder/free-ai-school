import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_ANALYTICS_DELETION_SLO_HOURS,
  AI_PATH_ANALYTICS_MINIMUM_COHORT,
  AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION,
  governedSinkMatchesActivation,
  resolveProductionAnalyticsCapability,
} from './lib/analytics-production.ts'

const reviewedActivation = {
  enabled: 'true',
  schemaVersion: AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION,
  credentialScope: 'server-only',
  dataRegion: 'reviewed-us-region',
  retentionDays: 30,
  deletionSloHours: AI_PATH_ANALYTICS_DELETION_SLO_HOURS,
  minimumCohort: AI_PATH_ANALYTICS_MINIMUM_COHORT,
  replaySafeWrites: 'true',
  leastPrivilegeAccess: 'true',
  encryption: 'at-rest-and-transit',
  rollbackReady: 'true',
  privacyReviewReference: 'https://governance.example/reviews/ai-path-analytics',
}

test('complete activation attestations cannot open the literal-false production latch', () => {
  const capability = resolveProductionAnalyticsCapability(reviewedActivation)
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.match(capability.reason, /latch remains closed/)
})

test('every governance attestation is independently required before latch review', () => {
  const invalid = [
    ['enabled', 'false'],
    ['schemaVersion', 'wrong'],
    ['credentialScope', 'browser'],
    ['dataRegion', ''],
    ['retentionDays', 91],
    ['deletionSloHours', 25],
    ['minimumCohort', 9],
    ['replaySafeWrites', 'false'],
    ['leastPrivilegeAccess', 'false'],
    ['encryption', 'transport-only'],
    ['rollbackReady', 'false'],
    ['privacyReviewReference', 'not-a-reviewed-url'],
  ]
  for (const [key, value] of invalid) {
    const capability = resolveProductionAnalyticsCapability({
      ...reviewedActivation,
      [key]: value,
    })
    assert.equal(capability.available, false, `${key} must fail closed`)
    assert.doesNotMatch(capability.reason, /ready$/)
  }
})

test('an injected sink must own governance that exactly matches activation', () => {
  const sink = {
    append: async () => 'stored', readAll: async () => [], deleteByAnonymousId: async () => 0,
    governance: {
      schemaVersion: AI_PATH_ANALYTICS_SINK_SCHEMA_VERSION,
      dataRegion: reviewedActivation.dataRegion,
      retentionDays: reviewedActivation.retentionDays,
      deletionSloHours: AI_PATH_ANALYTICS_DELETION_SLO_HOURS,
      minimumCohort: AI_PATH_ANALYTICS_MINIMUM_COHORT,
      replaySafeWrites: true,
      leastPrivilegeAccess: true,
      encryption: 'at-rest-and-transit',
      rollbackReady: true,
      privacyReviewReference: reviewedActivation.privacyReviewReference,
    },
  }
  assert.equal(governedSinkMatchesActivation(sink, reviewedActivation), true)
  assert.equal(governedSinkMatchesActivation({ ...sink, governance: { ...sink.governance, dataRegion: 'other-region' } }, reviewedActivation), false)
  assert.equal(governedSinkMatchesActivation({ append: sink.append }, reviewedActivation), false)
})

test('production boundary is server-only, vendor-neutral, and has no credential or network surface', async () => {
  const source = await readFile(new URL('./lib/analytics-production.server.ts', import.meta.url), 'utf8')
  assert.match(source, /import 'server-only'/)
  assert.match(source, /resolveProductionAnalyticsCapability/)
  assert.doesNotMatch(source, /process\.env|\bfetch\s*\(|axios|createClient|segment|amplitude|mixpanel|posthog/i)
  assert.doesNotMatch(source, /console\.|logger\.|request\.(?:json|text|formData)/i)
})
