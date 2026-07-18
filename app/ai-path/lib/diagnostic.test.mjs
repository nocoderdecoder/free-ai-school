import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  AI_PATH_DIAGNOSTIC_VERSION,
  CAPABILITY_SECTION_IDS,
  INITIAL_CAPABILITY_INTAKE,
  INITIAL_USE_CASE_INTAKE,
  USE_CASE_SECTION_IDS,
  composeCapabilityPrescription,
  composeDiagnosticResult,
  composeUseCaseBlueprint,
  normalizeCapabilityIntake,
  normalizeUseCaseIntake,
  validateCapabilityIntake,
  validateUseCaseIntake,
} from './diagnostic.ts'

const useCaseFixture = {
  version: AI_PATH_DIAGNOSTIC_VERSION,
  path: 'use-case',
  outcome: { desiredOutcome: 'Help salespeople answer RFP questions from approved company documents with citations.' },
  workflow: { currentProcess: 'Salespeople search old proposals and ask legal and product teams to verify every answer.' },
  specification: {
    inputs: 'Approved product documents, security policies, legal language, and historical proposals',
    output: 'draft RFP response with a source citation and confidence indicator',
    success: 'Reduce first-draft time by 50%; every answer must cite approved material.',
  },
  experience: { level: 'adapted', evidence: 'Tested prompts on ten historical questions and recorded where answers used old statements.', artifactUrl: '' },
  risk: { dataSensitivity: 'confidential', existingSystems: 'Company Drive', consequence: 'serious', humanApproval: 'yes' },
  constraints: { role: 'Sales operations manager', codingComfort: 'modify-examples', weeklyHours: 5, approach: 'either', teamMode: 'team', budget: 'organisation-decides' },
}

const capabilityFixture = {
  version: AI_PATH_DIAGNOSTIC_VERSION,
  path: 'capability-growth',
  direction: { roleContext: 'Operations analyst', interests: ['automate-repeated-work'] },
  experience: { levels: {
    'ai-assisted-work': 'adapted', automation: 'guided', applications: 'guided', 'data-retrieval': 'exposure', 'evaluation-safety': 'none',
  } },
  evidence: {
    description: 'I made and revised a support-ticket summarization prompt for my own process, but did not build a formal test set.',
    supportedDomains: ['ai-assisted-work'], artifactUrl: '',
  },
  reasoning: {
    scenarioId: 'automation-reliability',
    response: 'I would collect expected examples, measure incorrect outputs, require a person to review uncertain cases, and test before sending anything.',
  },
  foundations: { codingComfort: 'modify-examples', dataComfort: 'spreadsheets', tools: ['ChatGPT', 'Python'] },
  constraints: { weeklyHours: 4, learningPreference: 'balanced', pace: '30-day', resourceBudget: 'free-only', publicProject: 'yes' },
}

test('the versioned diagnostic has exactly six top-level sections per path and frozen initial values', () => {
  assert.equal(USE_CASE_SECTION_IDS.length, 6)
  assert.equal(CAPABILITY_SECTION_IDS.length, 6)
  assert.deepEqual(Object.keys(INITIAL_USE_CASE_INTAKE).filter(key => !['version', 'path'].includes(key)), USE_CASE_SECTION_IDS)
  assert.deepEqual(Object.keys(INITIAL_CAPABILITY_INTAKE).filter(key => !['version', 'path'].includes(key)), CAPABILITY_SECTION_IDS)
  assert.equal(Object.isFrozen(INITIAL_USE_CASE_INTAKE), true)
  assert.equal(Object.isFrozen(INITIAL_CAPABILITY_INTAKE.experience.levels), true)
})

test('readiness distinguishes missing fields, unsupported evidence, and complete fixtures', () => {
  const emptyUseCase = validateUseCaseIntake(INITIAL_USE_CASE_INTAKE)
  assert.equal(emptyUseCase.status, 'missing')
  assert.equal(emptyUseCase.canSubmit, false)
  assert.equal(emptyUseCase.sections.length, 6)

  const emptyCapability = validateCapabilityIntake(INITIAL_CAPABILITY_INTAKE)
  assert.equal(emptyCapability.sections.find(section => section.id === 'experience').status, 'missing')
  assert.match(emptyCapability.sections.find(section => section.id === 'experience').issues.join(' '), /best describes your experience/i)

  const unsupportedUseCase = validateUseCaseIntake({ ...useCaseFixture, experience: { level: 'independent', evidence: '', artifactUrl: '' } })
  assert.equal(unsupportedUseCase.status, 'needs_evidence')
  assert.equal(unsupportedUseCase.sections.find(section => section.id === 'experience').status, 'needs_evidence')

  const unsupportedCapability = validateCapabilityIntake({
    ...capabilityFixture,
    experience: { levels: { ...capabilityFixture.experience.levels, automation: 'independent' } },
  })
  assert.equal(unsupportedCapability.status, 'needs_evidence')
  assert.match(unsupportedCapability.sections.find(section => section.id === 'evidence').issues.join(' '), /Automation/)

  assert.equal(validateUseCaseIntake(useCaseFixture).status, 'complete')
  assert.equal(validateCapabilityIntake(capabilityFixture).status, 'complete')

  const competingDirections = validateCapabilityIntake({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['automate-repeated-work', 'build-ai-tool'] },
  })
  assert.equal(competingDirections.sections.find(section => section.id === 'direction').status, 'missing')
  assert.match(competingDirections.sections.find(section => section.id === 'direction').issues.join(' '), /only one primary outcome/i)
})

test('normalization excludes hidden, irrelevant evidence values', () => {
  const useCase = normalizeUseCaseIntake({
    ...useCaseFixture,
    experience: { level: 'none', evidence: 'stale hidden evidence', artifactUrl: 'https://invalid.example/stale' },
  })
  assert.deepEqual(useCase.experience, { level: 'none' })

  const capability = normalizeCapabilityIntake({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['automate-repeated-work', 'build-ai-tool'] },
    evidence: { description: 'I have not built anything yet.', supportedDomains: [], artifactUrl: 'https://invalid.example/stale' },
  })
  assert.equal('artifactUrl' in capability.evidence, false)
  assert.deepEqual(capability.direction.interests, ['automate-repeated-work'])
})

test('Path A composes a deterministic, bounded use-case blueprint', () => {
  const first = composeUseCaseBlueprint(useCaseFixture)
  const second = composeDiagnosticResult(structuredClone(useCaseFixture))
  assert.deepEqual(first, second)
  assert.equal(first.kind, 'use-case-blueprint')
  assert.equal(first.feasibility.rating, 'possible-with-constraints')
  assert.equal(first.title, 'Build a reviewable draft RFP response with a source citation and confidence indicator')
  assert.match(first.architecture.pattern, /Retrieval/)
  assert.match(first.prototype.scope, /10–20 representative examples/)
  assert.equal(first.weeks.length, 4)
  assert.ok(first.firstAction.length > 20)
  assert.ok(first.resources.length <= 3)
  assert.ok(first.risk.safeguards.some(item => /human/i.test(item)))
})

test('Path B composes an evidence-calibrated capability prescription', () => {
  const result = composeCapabilityPrescription(capabilityFixture)
  assert.equal(result.kind, 'capability-prescription')
  assert.equal(result.confidence, 'moderate')
  assert.match(result.strongest, /AI-assisted work: Adapted practice/)
  assert.ok(result.untested.includes('Evaluation, safety and reliability'))
  assert.match(result.nextCapability, /workflow automation/i)
  assert.match(result.project.title, /triage workflow/i)
  assert.ok(result.definitionOfDone.some(item => /failures/i.test(item)))
  assert.equal(result.weeks.length, 4)
  assert.ok(result.resources.length <= 3)
})

test('each plain-language direction produces a relevant project recommendation', () => {
  const expectations = [
    ['everyday-work', /Evidence-based AI-assisted work/i, /recurring work task/i],
    ['automate-repeated-work', /workflow automation/i, /triage workflow/i],
    ['build-ai-tool', /testable AI applications/i, /small AI application/i],
    ['improve-reliability', /evaluating and improving AI systems/i, /quality test/i],
    ['discover-fit', /finding valuable AI opportunities/i, /three small AI opportunities/i],
  ]

  for (const [interest, capabilityPattern, projectPattern] of expectations) {
    const result = composeCapabilityPrescription({
      ...capabilityFixture,
      direction: { ...capabilityFixture.direction, interests: [interest] },
    })
    assert.match(result.nextCapability, capabilityPattern)
    assert.match(result.project.title, projectPattern)
  }
})

test('the two paths cannot collapse into a generic shared output', () => {
  const useCase = composeDiagnosticResult(useCaseFixture)
  const capability = composeDiagnosticResult(capabilityFixture)
  assert.notEqual(useCase.kind, capability.kind)
  assert.ok('architecture' in useCase)
  assert.ok('feasibility' in useCase)
  assert.ok(!('evidenceProfile' in useCase))
  assert.ok('evidenceProfile' in capability)
  assert.ok('nextCapability' in capability)
  assert.ok(!('architecture' in capability))
  assert.notDeepEqual(useCase.weeks, capability.weeks)
})

test('invalid diagnostics fail closed and the domain model has no provider surface', () => {
  assert.equal(composeUseCaseBlueprint(INITIAL_USE_CASE_INTAKE), null)
  assert.equal(composeCapabilityPrescription(INITIAL_CAPABILITY_INTAKE), null)
  const source = readFileSync(new URL('./diagnostic.ts', import.meta.url), 'utf8')
  for (const forbidden of [/\bfetch\s*\(/, /\bWebSocket\b/, /\bprocess\.env\b/, /\bAPI_KEY\b/, /\bAuthorization\b/]) {
    assert.doesNotMatch(source, forbidden)
  }
})
