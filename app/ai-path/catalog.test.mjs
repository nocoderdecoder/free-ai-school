import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_CATALOG_SKILL_IDS,
  AI_PATH_CATALOG_VERSION as CATALOG_RUNTIME_VERSION,
  AI_PATH_CATALOG_TARGET_AUDIENCE,
  selectEligibleCatalogResources,
  validateCatalogForPublication,
  validateCatalogSnapshot,
} from './catalog/catalog.ts'
import {
  AI_PATH_CATALOG_VERSION as FOUNDATION_CATALOG_VERSION,
  AI_PATH_SKILL_IDS as FOUNDATION_SKILL_IDS,
} from './lib/foundation.ts'
import { AI_PATH_CATALOG_V1 } from './catalog/v1.ts'
import { selectPublishedCatalogResources } from './catalog/production.mjs'
import {
  AI_PATH_MEASUREMENT_VERSION,
  computeTargetUserMetrics,
  validateAiPathEvent,
} from './catalog/measurement.ts'

const AS_OF = '2026-07-20T00:00:00.000Z'

test('self-contained catalog runtime stays pinned to the foundation contract', () => {
  assert.equal(CATALOG_RUNTIME_VERSION, FOUNDATION_CATALOG_VERSION)
  assert.deepEqual(AI_PATH_CATALOG_SKILL_IDS, FOUNDATION_SKILL_IDS)
})

function publicationReadyCatalog() {
  const catalog = structuredClone(AI_PATH_CATALOG_V1)
  catalog.publicationStatus = 'published'
  catalog.publishedAt = '2026-07-20T00:00:00.000Z'
  for (const resource of catalog.resources) {
    if (resource.canonicalUrl === null) continue
    resource.linkHealth = {
      status: 'healthy',
      checkedAt: '2026-07-20T00:00:00.000Z',
      nextCheckDueAt: '2026-08-19T00:00:00.000Z',
      httpStatus: 200,
      finalUrl: null,
    }
  }
  return catalog
}

test('published catalog is structurally valid and carries current review and link evidence', () => {
  assert.equal(Object.isFrozen(AI_PATH_CATALOG_V1), true)
  assert.equal(Object.isFrozen(AI_PATH_CATALOG_V1.resources), true)
  const structural = validateCatalogSnapshot(AI_PATH_CATALOG_V1, AS_OF)
  assert.equal(structural.ok, true)
  assert.deepEqual(structural.issues, [])

  const publication = validateCatalogForPublication(AI_PATH_CATALOG_V1, AS_OF)
  assert.equal(publication.ok, true)
  assert.deepEqual(publication.issues, [])

  const deepLearning = AI_PATH_CATALOG_V1.resources.find(resource => resource.provider === 'DeepLearning.AI')
  assert.equal(deepLearning.cost.kind, 'freemium')
  assert.match(deepLearning.cost.disclosure, /PRO/)
  assert.equal(deepLearning.estimatedMinutes, 300)
  assert.equal(deepLearning.linkHealth.status, 'redirected')
  assert.equal(deepLearning.linkHealth.httpStatus, 308)
  assert.equal(deepLearning.linkHealth.finalUrl, 'https://www.deeplearning.ai/courses/generative-ai-for-everyone')
})

test('first-party evidence sprints cover every skill with deterministic, free project options', () => {
  const projects = AI_PATH_CATALOG_V1.resources.filter(resource =>
    resource.provider === 'Free AI School' && resource.format === 'project'
  )
  const coveredSkills = new Set(projects.flatMap(resource => resource.skills.map(mapping => mapping.skillId)))

  assert.deepEqual(
    AI_PATH_CATALOG_SKILL_IDS.filter(skillId => !coveredSkills.has(skillId)),
    []
  )
  assert.deepEqual(
    projects.map(resource => resource.id).sort(),
    [
      'free-ai-school-bounded-agent-sprint',
      'free-ai-school-capability-decision-sprint',
      'free-ai-school-context-evaluation-sprint',
      'free-ai-school-grounded-retrieval-sprint',
      'free-ai-school-integration-design-sprint',
      'free-ai-school-operational-pilot-sprint',
      'free-ai-school-operational-readiness-tabletop',
      'free-ai-school-workflow-evidence-sprint',
    ]
  )
  assert.ok(projects.every(resource => resource.cost.kind === 'free' && resource.canonicalUrl === null))
})

test('the governed stack covers every skill without depending on one provider or format', () => {
  const active = AI_PATH_CATALOG_V1.resources.filter(resource => resource.status === 'active')
  const coveredSkills = new Set(active.flatMap(resource => resource.skills.map(mapping => mapping.skillId)))
  const providers = new Set(active.map(resource => resource.provider))
  const formats = new Set(active.map(resource => resource.format))

  assert.deepEqual(AI_PATH_CATALOG_SKILL_IDS.filter(skillId => !coveredSkills.has(skillId)), [])
  assert.ok(providers.size >= 5)
  assert.deepEqual([...formats].sort(), ['course', 'project', 'reading', 'reference'])
  assert.ok(active.some(resource => resource.id === 'openai-api-quickstart' && resource.skills.some(mapping => mapping.skillId === 'coding-apis')))
  assert.ok(active.filter(resource => resource.provenance.origin === 'first-party').every(resource => resource.canonicalUrl === null))
})

test('publication requires deterministic review and link-health evidence', () => {
  const catalog = publicationReadyCatalog()
  const validation = validateCatalogForPublication(catalog, AS_OF)
  assert.equal(validation.ok, true)
  assert.deepEqual(validation.issues, [])
})

test('duplicate identifiers and canonical URLs are rejected in stable order', () => {
  const catalog = structuredClone(AI_PATH_CATALOG_V1)
  catalog.resources[1].id = catalog.resources[0].id
  catalog.resources[1].canonicalUrl = catalog.resources[0].canonicalUrl

  const first = validateCatalogSnapshot(catalog, AS_OF)
  const second = validateCatalogSnapshot(catalog, AS_OF)
  assert.equal(first.ok, false)
  assert.deepEqual(first.issues, second.issues)
  assert.deepEqual(
    first.issues.map(issue => issue.code),
    ['duplicate_canonical_url', 'duplicate_resource_id']
  )
})

test('review dates and link-health checks become stale deterministically', () => {
  const catalog = publicationReadyCatalog()
  const validation = validateCatalogForPublication(catalog, '2026-10-16T00:00:00.000Z')
  assert.equal(validation.ok, false)
  assert.equal(validation.issues.filter(issue => issue.code === 'review_stale').length, 12)
  assert.equal(validation.issues.filter(issue => issue.code === 'link_check_stale').length, 4)
})

test('eligible resource selection excludes unchecked, stale, oversized, and nonmatching resources', () => {
  const catalog = publicationReadyCatalog()
  const eligible = selectEligibleCatalogResources(catalog, {
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 600,
    freeOnly: true,
    formats: ['course', 'project'],
  })
  assert.deepEqual(eligible.map(resource => resource.id), [
    'free-ai-school-bounded-agent-sprint',
    'free-ai-school-capability-decision-sprint',
    'free-ai-school-context-evaluation-sprint',
    'free-ai-school-grounded-retrieval-sprint',
    'free-ai-school-integration-design-sprint',
    'free-ai-school-operational-pilot-sprint',
    'free-ai-school-operational-readiness-tabletop',
    'free-ai-school-workflow-evidence-sprint',
  ])

  const allFreeEligible = selectEligibleCatalogResources(AI_PATH_CATALOG_V1, {
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 600,
    freeOnly: true,
  })
  assert.ok(!allFreeEligible.some(resource => resource.id === 'deeplearning-ai-generative-ai-for-everyone'))
})

test('production adapter fails closed for draft, unchecked, and stale catalogs', () => {
  const input = { asOf: AS_OF, language: 'en', maximumMinutes: 1_000, freeOnly: true }
  const draft = structuredClone(AI_PATH_CATALOG_V1)
  draft.publicationStatus = 'draft'
  draft.publishedAt = null
  assert.equal(selectPublishedCatalogResources(input, draft).status, 'catalog_unavailable')

  const unchecked = structuredClone(AI_PATH_CATALOG_V1)
  unchecked.resources[0].linkHealth = {
    status: 'unchecked',
    checkedAt: null,
    nextCheckDueAt: null,
    httpStatus: null,
    finalUrl: null,
  }
  assert.equal(selectPublishedCatalogResources(input, unchecked).status, 'catalog_unavailable')

  const stale = structuredClone(AI_PATH_CATALOG_V1)
  assert.equal(selectPublishedCatalogResources({ ...input, asOf: '2026-10-16T00:00:00.000Z' }, stale).status, 'catalog_unavailable')
})

test('production adapter excludes freemium and other ineligible resources before ranking', () => {
  const selection = selectPublishedCatalogResources({
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 600,
    freeOnly: true,
    formats: ['course', 'project'],
  })
  assert.equal(selection.status, 'available')
  assert.deepEqual(selection.resources.map(resource => resource.id), [
    'free-ai-school-bounded-agent-sprint',
    'free-ai-school-capability-decision-sprint',
    'free-ai-school-context-evaluation-sprint',
    'free-ai-school-grounded-retrieval-sprint',
    'free-ai-school-integration-design-sprint',
    'free-ai-school-operational-pilot-sprint',
    'free-ai-school-operational-readiness-tabletop',
    'free-ai-school-workflow-evidence-sprint',
  ])

  const broadSelection = selectPublishedCatalogResources({
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 1_000,
    freeOnly: true,
  })
  assert.ok(!broadSelection.resources.some(resource => resource.id === 'openai-api-quickstart'))
  const paidExerciseOptIn = selectPublishedCatalogResources({
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 1_000,
    freeOnly: true,
    codingPreference: 'code-ready',
    accessPreference: 'account-ok',
    allowPaidServiceExercise: true,
    goalType: 'builder',
  })
  const quickstart = paidExerciseOptIn.resources.find(resource => resource.id === 'openai-api-quickstart')
  assert.match(quickstart.costDisclosure, /paid API usage/)

  const noCode = selectPublishedCatalogResources({
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 1_000,
    freeOnly: true,
    codingPreference: 'no-code',
    accessPreference: 'open-only',
    goalType: 'builder',
  })
  assert.ok(noCode.resources.length > 0)
  assert.ok(noCode.resources.every(resource => resource.codingRequirement === 'none'))
  assert.ok(noCode.resources.every(resource => resource.accountRequirement === 'none'))
  assert.ok(noCode.resources.every(resource => resource.paidServiceRequirement === 'none'))
  assert.ok(!noCode.resources.some(resource => resource.id === 'openai-api-quickstart'))

  const paused = structuredClone(AI_PATH_CATALOG_V1)
  paused.resources
    .filter(resource => resource.provider === 'Free AI School' && resource.format === 'project')
    .forEach(resource => { resource.status = 'paused' })
  const noMatch = selectPublishedCatalogResources({
    asOf: AS_OF,
    language: 'en',
    maximumMinutes: 600,
    freeOnly: true,
    formats: ['project'],
  }, paused)
  assert.equal(noMatch.status, 'no_eligible_resources')
  assert.deepEqual(noMatch.resources, [])
})

function event(eventName, occurredAt, anonymousId, assessmentSessionId, properties) {
  return {
    measurementVersion: AI_PATH_MEASUREMENT_VERSION,
    eventName,
    occurredAt,
    anonymousId,
    assessmentSessionId,
    properties: { audience: AI_PATH_CATALOG_TARGET_AUDIENCE, ...properties },
  }
}

test('event validation rejects transcript content, unknown properties, and missing sessions', () => {
  const unsafe = event('assessment_started', '2026-07-01T00:00:00.000Z', 'anon_user001', null, {
    mode: 'text',
    transcriptText: 'private learner answer',
  })
  const validation = validateAiPathEvent(unsafe)
  assert.equal(validation.ok, false)
  assert.deepEqual(validation.issues.map(issue => issue.code), [
    'missing_session_id',
    'forbidden_sensitive_property',
    'unknown_property',
  ])
})

test('target-user metrics use cohort-safe denominators and time-bounded outcomes', () => {
  const sessionOne = 'assessment_session001'
  const sessionTwo = 'assessment_session002'
  const events = [
    event('landing_viewed', '2026-07-01T00:00:00.000Z', 'anon_user001', null, { source: 'direct' }),
    event('profile_completed', '2026-07-01T00:01:00.000Z', 'anon_user001', null, { pathIntent: 'workflows', weeklyHoursBand: '2-3' }),
    event('assessment_started', '2026-07-01T00:02:00.000Z', 'anon_user001', sessionOne, { mode: 'text' }),
    event('assessment_completed', '2026-07-01T00:09:00.000Z', 'anon_user001', sessionOne, { mode: 'text', durationSeconds: 420 }),
    event('understanding_reviewed', '2026-07-01T00:11:00.000Z', 'anon_user001', sessionOne, { correctionCount: 1, removedObservationCount: 0 }),
    event('report_viewed', '2026-07-03T00:00:00.000Z', 'anon_user001', sessionOne, { resultStatus: 'validated' }),
    event('plan_saved', '2026-07-03T00:05:00.000Z', 'anon_user001', sessionOne, { planVersion: 'plan-v1' }),
    event('first_task_started', '2026-07-04T00:00:00.000Z', 'anon_user001', sessionOne, { taskKind: 'project' }),
    event('first_task_completed', '2026-07-12T00:00:00.000Z', 'anon_user001', sessionOne, { taskKind: 'project', elapsedMinutes: 300 }),
    event('feedback_submitted', '2026-07-04T00:10:00.000Z', 'anon_user001', sessionOne, { planFitRating: 4, reportUsefulnessRating: 5 }),
    event('finding_feedback_submitted', '2026-07-04T00:11:00.000Z', 'anon_user001', sessionOne, { totalFindings: 10, materiallyWrongFindings: 1 }),
    event('project_artifact_added', '2026-07-20T00:00:00.000Z', 'anon_user001', sessionOne, { artifactType: 'repository' }),
    event('reassessment_completed', '2026-08-10T00:00:00.000Z', 'anon_user001', sessionOne, { daysSinceInitial: 40 }),
    event('landing_viewed', '2026-07-02T00:00:00.000Z', 'anon_user002', null, { source: 'referral' }),
    event('profile_completed', '2026-07-02T00:01:00.000Z', 'anon_user002', null, { pathIntent: 'unsure', weeklyHoursBand: '1' }),
    event('assessment_started', '2026-07-02T00:02:00.000Z', 'anon_user002', sessionTwo, { mode: 'text' }),
  ]
  const window = { start: '2026-07-01T00:00:00.000Z', end: '2026-08-31T23:59:59.999Z' }
  const first = computeTargetUserMetrics(events, window)
  const second = computeTargetUserMetrics([...events].reverse(), window)
  assert.equal(first.ok, true)
  assert.deepEqual(first, second)
  if (!first.ok) return

  assert.equal(first.value.rates.profileCompletionRate, 1)
  assert.equal(first.value.rates.assessmentCompletionRate, 0.5)
  assert.equal(first.value.rates.sevenDayFirstTaskStartRate, 1)
  assert.equal(first.value.rates.sevenDayFirstTaskCompletionRate, 0)
  assert.equal(first.value.rates.planFitRate, 1)
  assert.equal(first.value.rates.materiallyWrongFindingRate, 0.1)
  assert.equal(first.value.rates.thirtyDayArtifactRate, 1)
  assert.equal(first.value.rates.fortyFiveDayReassessmentRate, 1)
  assert.deepEqual(first.value.targetStatus, {
    assessmentCompletion: 'missed',
    planFit: 'met',
    findingAccuracy: 'met',
    sevenDayAction: 'missed',
  })
})
