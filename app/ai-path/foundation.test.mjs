import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_CONSENT_VERSION,
  AI_PATH_VOICE_CONSENT_VERSION,
  AI_PATH_SKILL_IDS,
  AI_PATH_TAXONOMY,
  buildAssessmentReport,
  canBootstrapPublicRealtime,
  parseEvidenceRecords,
  parseSessionStartInput,
  parseTranscriptTurns,
  rankRecommendations,
  resolveRealtimeCapability,
  scoreSkills,
  validateEvidenceAgainstTranscript,
  validateSessionTransition,
} from './lib/foundation.ts'
import { selectPublishedCatalogResources } from './catalog/production.mjs'

function evidence(overrides = {}) {
  return {
    id: 'evidence-1',
    skillId: 'evaluation-reliability',
    observedLevel: 3,
    strength: 'strong',
    independence: 'owner',
    sourceTurnIds: ['turn-1'],
    quote: 'I built a regression set with 120 examples.',
    speaker: 'user',
    source: 'voice-transcript',
    artifact: '120-example regression set',
    outcome: 'blocked two regressions',
    recencyMonths: 2,
    ...overrides,
  }
}

test('taxonomy is complete, versionable, and has unique IDs', () => {
  assert.equal(AI_PATH_TAXONOMY.length, AI_PATH_SKILL_IDS.length)
  assert.equal(new Set(AI_PATH_TAXONOMY.map(skill => skill.id)).size, AI_PATH_SKILL_IDS.length)
  for (const skill of AI_PATH_TAXONOMY) {
    assert.deepEqual(Object.keys(skill.levels), ['0', '1', '2', '3', '4'])
  }
})

test('session input accepts only the server-pinned consent version', () => {
  const valid = parseSessionStartInput({
    consentVersion: AI_PATH_VOICE_CONSENT_VERSION,
    locale: 'en-US',
    mode: 'voice',
    goal: 'I want to build and evaluate a reliable AI research workflow.',
    goalType: 'builder',
    saveTranscript: false,
  })
  assert.equal(valid.ok, true)
  assert.equal(valid.value.goalType, 'builder')

  const textWithVoiceConsent = parseSessionStartInput({
    consentVersion: AI_PATH_VOICE_CONSENT_VERSION,
    locale: 'en-US',
    mode: 'text',
    goal: 'I want to build and evaluate a reliable AI research workflow.',
    goalType: 'builder',
    saveTranscript: false,
  })
  assert.equal(textWithVoiceConsent.ok, false)

  const voiceWithTextConsent = parseSessionStartInput({
    consentVersion: AI_PATH_CONSENT_VERSION,
    locale: 'en-US',
    mode: 'voice',
    goal: 'I want to build and evaluate a reliable AI research workflow.',
    goalType: 'builder',
    saveTranscript: false,
  })
  assert.equal(voiceWithTextConsent.ok, false)

  const arbitrary = parseSessionStartInput({
    consentVersion: 'client-invented-v99',
    locale: 'en-US',
    mode: 'voice',
    goal: 'I want to build and evaluate a reliable AI research workflow.',
    goalType: 'builder',
    saveTranscript: false,
  })
  assert.equal(arbitrary.ok, false)
  assert.match(arbitrary.errors.join(' '), /consentVersion must be/)

  const unboundedGoalType = parseSessionStartInput({
    consentVersion: AI_PATH_VOICE_CONSENT_VERSION,
    locale: 'en-US',
    mode: 'voice',
    goal: 'I want to build and evaluate a reliable AI research workflow.',
    goalType: 'browser-invented-track',
    saveTranscript: false,
  })
  assert.equal(unboundedGoalType.ok, false)
  assert.match(unboundedGoalType.errors.join(' '), /goalType is invalid/)
})

test('evidence requires an exact quote, user speaker, and known source', () => {
  const parsed = parseEvidenceRecords([evidence()])
  assert.equal(parsed.ok, true)

  const invalid = parseEvidenceRecords([evidence({ speaker: 'assistant', quote: '' })])
  assert.equal(invalid.ok, false)
  assert.match(invalid.errors.join(' '), /quote is required/)
  assert.match(invalid.errors.join(' '), /speaker must be user/)
})

test('evidence is auditable against exact user transcript spans', () => {
  const parsedEvidence = parseEvidenceRecords([evidence()])
  const parsedTurns = parseTranscriptTurns([{
    id: 'turn-1',
    speaker: 'user',
    source: 'voice-transcript',
    text: 'I built a regression set with 120 examples. It blocked two regressions.',
  }])
  assert.equal(parsedEvidence.ok, true)
  assert.equal(parsedTurns.ok, true)
  assert.equal(validateEvidenceAgainstTranscript(parsedEvidence.value, parsedTurns.value).ok, true)

  const wrongQuote = parseEvidenceRecords([evidence({ quote: 'This sentence was never spoken.' })])
  assert.equal(wrongQuote.ok, true)
  const audit = validateEvidenceAgainstTranscript(wrongQuote.value, parsedTurns.value)
  assert.equal(audit.ok, false)
  assert.match(audit.errors.join(' '), /not an exact transcript span/)
})

test('missing evidence remains not assessed instead of becoming a zero score', () => {
  const results = scoreSkills([])
  assert.equal(results.length, AI_PATH_SKILL_IDS.length)
  assert.ok(results.every(result => result.status === 'not_assessed'))
  assert.ok(results.every(result => result.level === null))
})

test('deterministic scoring requires multiple strong items for shipped evidence', () => {
  const results = scoreSkills([
    evidence(),
    evidence({
      id: 'evidence-2',
      sourceTurnIds: ['turn-2'],
      quote: 'I added release gates and reviewed failures every week.',
      independence: 'independent',
      artifact: 'release gate',
    }),
  ])
  const evaluation = results.find(result => result.skillId === 'evaluation-reliability')
  assert.equal(evaluation.level, 3)
  assert.equal(evaluation.confidence, 'high')
})

test('contradictory evidence lowers level and confidence', () => {
  const results = scoreSkills([
    evidence(),
    evidence({
      id: 'evidence-2',
      sourceTurnIds: ['turn-2'],
      quote: 'I added release gates and reviewed failures every week.',
    }),
    evidence({
      id: 'contradiction-1',
      sourceTurnIds: ['turn-3'],
      quote: 'I actually only reviewed examples manually.',
      contradiction: true,
    }),
  ])
  const evaluation = results.find(result => result.skillId === 'evaluation-reliability')
  assert.equal(evaluation.level, 2)
  assert.equal(evaluation.confidence, 'low')
  assert.deepEqual(evaluation.contradictionIds, ['contradiction-1'])
})

test('skill results expose exact supporting and contradictory evidence references', () => {
  const report = buildAssessmentReport({
    goal: 'Improve the reliability of a bounded AI workflow.',
    evidence: [
      evidence(),
      evidence({
        id: 'contradiction-1',
        sourceTurnIds: ['turn-2'],
        quote: 'I did not own that evaluation work.',
        contradiction: true,
      }),
    ],
    preferences: {
      targetLevels: { 'evaluation-reliability': 3 },
      timeBudgetHours: 4,
      freeOnly: true,
    },
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  })
  const evaluation = report.results.find(result => result.skillId === 'evaluation-reliability')
  assert.deepEqual(evaluation.evidenceReferences, [
    {
      id: 'evidence-1',
      quote: 'I built a regression set with 120 examples.',
      sourceTurnIds: ['turn-1'],
      observedLevel: 3,
      strength: 'strong',
      contradiction: false,
    },
    {
      id: 'contradiction-1',
      quote: 'I did not own that evaluation work.',
      sourceTurnIds: ['turn-2'],
      observedLevel: 3,
      strength: 'strong',
      contradiction: true,
    },
  ])
})

test('recommendations are deterministic and prerequisite-aware over the governed catalog', () => {
  const emptyResults = scoreSkills([])
  const preferences = {
    targetLevels: { 'safety-governance': 3, 'coding-apis': 3, 'agents-tools': 3 },
    timeBudgetHours: 12,
    freeOnly: true,
    limit: 6,
  }
  const catalog = selectPublishedCatalogResources({
    asOf: '2026-07-20T00:00:00.000Z',
    language: 'en',
    maximumMinutes: preferences.timeBudgetHours * 60,
    freeOnly: preferences.freeOnly,
  })
  assert.equal(catalog.status, 'available')
  const first = rankRecommendations(emptyResults, preferences, catalog.resources)
  const second = rankRecommendations(emptyResults, preferences, catalog.resources)
  assert.deepEqual(first, second)
  assert.ok(first.some(resource => resource.provider === 'OWASP'))
  assert.ok(!first.some(resource => resource.id === 'openai-function-calling'))
  assert.ok(catalog.resources.every(resource => resource.free))
})

test('session state machine rejects skipped and terminal transitions', () => {
  assert.equal(validateSessionTransition('created', 'consented').ok, true)
  assert.equal(validateSessionTransition('created', 'active').ok, false)
  assert.equal(validateSessionTransition('complete', 'active').ok, false)
})

test('Realtime remains inert until every server-side live and paid gate is explicit', () => {
  const base = {
    apiKey: 'test-key',
    safetyIdentifierSalt: 'test-salt',
    model: 'test-realtime-model',
    nodeEnv: 'production',
  }
  assert.equal(resolveRealtimeCapability(base).liveEnabled, false)
  assert.equal(resolveRealtimeCapability({ ...base, enableLiveRealtime: 'true' }).liveEnabled, false)
  assert.equal(resolveRealtimeCapability({
    ...base,
    enableLiveRealtime: 'true',
    allowPaidApiCalls: 'true',
  }).liveEnabled, false)
  const fullyConfiguredCapability = resolveRealtimeCapability({
    ...base,
    enableLiveRealtime: 'true',
    allowPaidApiCalls: 'true',
    authReady: 'true',
    distributedRateLimitReady: 'true',
    spendControlsReady: 'true',
    approvedDailyBudgetUsd: '25',
  })
  assert.equal(fullyConfiguredCapability.liveEnabled, false)
  assert.match(fullyConfiguredCapability.reason, /admission/)
  const admittedCapability = resolveRealtimeCapability({
    ...base,
    enableLiveRealtime: 'true',
    allowPaidApiCalls: 'true',
    authReady: 'true',
    distributedRateLimitReady: 'true',
    spendControlsReady: 'true',
    admissionReady: true,
    approvedDailyBudgetUsd: '25',
  })
  assert.equal(admittedCapability.liveEnabled, true)
  assert.equal(canBootstrapPublicRealtime(admittedCapability), false)
  const previewCapability = resolveRealtimeCapability({
    ...base,
    enableLiveRealtime: 'true',
    allowPaidApiCalls: 'true',
    localPreviewEnabled: 'true',
    nodeEnv: 'development',
  })
  assert.equal(previewCapability.liveEnabled, true)
  assert.match(previewCapability.reason, /local Realtime preview/)
  assert.equal(canBootstrapPublicRealtime(previewCapability), true)
  assert.equal(resolveRealtimeCapability({
    ...base,
    enableLiveRealtime: 'true',
    allowPaidApiCalls: 'true',
    authReady: 'true',
    distributedRateLimitReady: 'true',
    spendControlsReady: 'true',
    approvedDailyBudgetUsd: '0',
  }).liveEnabled, false)
})

test('report output pins all versions and only uses published eligible catalog resources', () => {
  const report = buildAssessmentReport({
    goal: 'Build a tested AI research workflow for weekly competitive analysis.',
    evidence: [],
    preferences: {
      targetLevels: { foundations: 2, 'workflow-design': 2 },
      timeBudgetHours: 12,
      freeOnly: true,
    },
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  })
  const eligible = selectPublishedCatalogResources({
    asOf: report.generatedAt,
    language: 'en',
    maximumMinutes: 720,
    freeOnly: true,
  })
  assert.match(report.reportVersion, /^2026-07-16/)
  assert.equal(report.generatedAt, '2026-07-20T12:00:00.000Z')
  assert.equal(report.recommendationStatus, 'available')
  assert.ok(report.recommendations.every(recommendation =>
    eligible.resources.some(resource => resource.id === recommendation.id)
  ))
  assert.ok(report.recommendations.every(recommendation => recommendation.costDisclosure.length > 10))
  assert.ok(!report.recommendations.some(recommendation => recommendation.id === 'deeplearning-ai-generative-ai-for-everyone'))
  assert.ok(!report.recommendations.some(recommendation => recommendation.id === 'openai-academy-foundations'))
})

test('report returns an explicit no-resources state when the published catalog has no matching skill', () => {
  const report = buildAssessmentReport({
    goal: 'Operate a reliable deployed AI service.',
    evidence: [],
    preferences: {
      targetLevels: { 'deployment-operations': 3 },
      timeBudgetHours: 12,
      freeOnly: true,
      formats: ['course'],
    },
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  })
  assert.equal(report.recommendationStatus, 'no_eligible_resources')
  assert.deepEqual(report.recommendations, [])
})

test('no-code free-only reports use governed account-free projects instead of code-first API material', () => {
  const report = buildAssessmentReport({
    goal: 'Design a bounded integration workflow without writing application code.',
    evidence: [],
    preferences: {
      targetLevels: { 'coding-apis': 2, 'prompt-context': 2 },
      timeBudgetHours: 4,
      freeOnly: true,
      codingPreference: 'no-code',
      accessPreference: 'open-only',
      allowPaidServiceExercise: false,
      goalType: 'builder',
    },
    generatedAt: new Date('2026-07-20T12:00:00.000Z'),
  })

  assert.equal(report.recommendationStatus, 'available')
  assert.ok(report.recommendations.some(resource => resource.id === 'free-ai-school-integration-design-sprint'))
  assert.ok(!report.recommendations.some(resource => resource.id === 'openai-api-quickstart'))
  assert.ok(report.recommendations.every(resource => resource.codingRequirement === 'none'))
  assert.ok(report.recommendations.every(resource => resource.accountRequirement === 'none'))
  assert.ok(report.recommendations.every(resource => resource.paidServiceRequirement === 'none'))
})

test('goal-stage policy excludes catalog items the current plan explicitly defers', () => {
  const selection = selectPublishedCatalogResources({
    asOf: '2026-07-20T12:00:00.000Z',
    language: 'en',
    maximumMinutes: 720,
    freeOnly: true,
    codingPreference: 'light-code',
    accessPreference: 'account-ok',
    goalType: 'workflows',
  })

  assert.ok(!selection.resources.some(resource => resource.id === 'free-ai-school-bounded-agent-sprint'))
  assert.ok(!selection.resources.some(resource => resource.id === 'free-ai-school-operational-pilot-sprint'))
  assert.ok(!selection.resources.some(resource => resource.id === 'free-ai-school-operational-readiness-tabletop'))
})
