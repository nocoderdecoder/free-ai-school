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

function requireResult(result) {
  assert.ok(result, 'expected a complete diagnostic to produce a result')
  return result
}

function useCaseExecutionFingerprint(result) {
  return {
    architecture: result.architecture,
    prototype: result.prototype,
    skills: result.skills,
    weeks: result.weeks,
    firstAction: result.firstAction,
    resources: result.resources,
  }
}

function capabilityPlanFingerprint(result) {
  return {
    nextCapability: result.nextCapability,
    project: result.project,
    definitionOfDone: result.definitionOfDone,
    weeks: result.weeks,
    firstAction: result.firstAction,
    resources: result.resources,
  }
}

function combinedCapabilityPlanText(result) {
  return JSON.stringify(capabilityPlanFingerprint(result)).toLowerCase()
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
  assert.equal(unsupportedCapability.status, 'complete', 'unsupported broad-stage claims are downgraded in the result instead of blocking the learner')

  assert.equal(validateUseCaseIntake(useCaseFixture).status, 'complete')
  assert.equal(validateCapabilityIntake(capabilityFixture).status, 'complete')

  const competingDirections = validateCapabilityIntake({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['automate-repeated-work', 'build-ai-tool'] },
  })
  assert.equal(competingDirections.sections.find(section => section.id === 'direction').status, 'complete')

  const conflictingDiscovery = validateCapabilityIntake({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['discover-fit', 'build-ai-tool'] },
  })
  assert.equal(conflictingDiscovery.sections.find(section => section.id === 'direction').status, 'missing')
  assert.match(conflictingDiscovery.sections.find(section => section.id === 'direction').issues.join(' '), /discovery by itself/i)
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
  assert.deepEqual(capability.direction.interests, ['automate-repeated-work', 'build-ai-tool'])
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

test('use-case execution changes when risk, available time, build approach, team, or budget changes', () => {
  const baseline = requireResult(composeUseCaseBlueprint(useCaseFixture))
  const lowerRisk = requireResult(composeUseCaseBlueprint({
    ...useCaseFixture,
    risk: { ...useCaseFixture.risk, dataSensitivity: 'public', consequence: 'low', humanApproval: 'no' },
  }))
  assert.notDeepEqual(lowerRisk.risk, baseline.risk, 'risk answers must change safeguards')
  assert.notDeepEqual(
    useCaseExecutionFingerprint(lowerRisk),
    useCaseExecutionFingerprint(baseline),
    'risk answers must change an execution decision, not only a badge',
  )

  const lowerTime = requireResult(composeUseCaseBlueprint({
    ...useCaseFixture,
    constraints: { ...useCaseFixture.constraints, weeklyHours: 2 },
  }))
  assert.notDeepEqual(lowerTime.weeks, baseline.weeks, 'weekly hours must resize the execution plan')

  const noCode = requireResult(composeUseCaseBlueprint({
    ...useCaseFixture,
    constraints: {
      ...useCaseFixture.constraints,
      codingComfort: 'none',
      approach: 'no-code-first',
    },
  }))
  assert.notDeepEqual(noCode.prototype, baseline.prototype, 'coding comfort and approach must change prototype scope')
  assert.notDeepEqual(noCode.resources, baseline.resources, 'coding comfort and approach must change the learning route')

  const solo = requireResult(composeUseCaseBlueprint({
    ...useCaseFixture,
    constraints: { ...useCaseFixture.constraints, teamMode: 'solo' },
  }))
  assert.notDeepEqual(solo.weeks, baseline.weeks, 'solo and team plans must assign different execution work')
  assert.notEqual(solo.firstAction, baseline.firstAction, 'solo and team execution must not start identically')

  const freeOnly = requireResult(composeUseCaseBlueprint({
    ...useCaseFixture,
    constraints: { ...useCaseFixture.constraints, budget: 'free-only' },
  }))
  assert.notDeepEqual(freeOnly.resources, baseline.resources, 'budget must change the governed resource route')
})

test('capability role and selected goals materially change the recommended project', () => {
  const operations = requireResult(composeCapabilityPrescription(capabilityFixture))
  const marketing = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: {
      roleContext: 'Marketing manager creating campaign briefs and reviewing brand claims',
      interests: capabilityFixture.direction.interests,
    },
  }))
  assert.notDeepEqual(marketing.project, operations.project, 'role context must ground the recommended project')
  assert.notEqual(marketing.firstAction, operations.firstAction, 'role context must ground the first action')

  const application = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['build-ai-tool'] },
  }))
  assert.notDeepEqual(application.project, operations.project)
  assert.notDeepEqual(application.resources, operations.resources)
})

test('capability experience changes plan difficulty rather than only the evidence label', () => {
  const beginner = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    experience: { levels: {
      'ai-assisted-work': 'exposure', automation: 'guided', applications: 'none', 'data-retrieval': 'none', 'evaluation-safety': 'none',
    } },
    evidence: { description: 'I have followed examples but have not built a complete workflow yet.', supportedDomains: [], artifactUrl: '' },
  }))
  const experienced = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    experience: { levels: {
      'ai-assisted-work': 'demonstrated', automation: 'demonstrated', applications: 'independent', 'data-retrieval': 'adapted', 'evaluation-safety': 'adapted',
    } },
    evidence: {
      description: 'I built, tested, documented, and handed off a repeatable ticket-routing workflow with a regression set and human escalation.',
      supportedDomains: ['ai-assisted-work', 'automation', 'applications', 'data-retrieval', 'evaluation-safety'],
      artifactUrl: 'https://example.com/inspectable-project',
    },
  }))
  assert.notDeepEqual(
    capabilityPlanFingerprint(beginner),
    capabilityPlanFingerprint(experienced),
    'verified experience must alter project difficulty, pacing, resources, or first action',
  )
  assert.notEqual(beginner.firstAction, experienced.firstAction, 'beginners and experienced builders need different starting actions')
})

test('capability coding, data, time, modality, budget, and publication constraints alter visible plan facets', () => {
  const baseline = requireResult(composeCapabilityPrescription(capabilityFixture))
  const noCode = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    foundations: { ...capabilityFixture.foundations, codingComfort: 'none' },
  }))
  assert.notDeepEqual(noCode.project, baseline.project, 'coding comfort must change the build route')
  assert.notDeepEqual(noCode.weeks, baseline.weeks, 'coding comfort must change build activities')

  const pipelineData = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    foundations: { ...capabilityFixture.foundations, dataComfort: 'pipelines' },
  }))
  assert.notDeepEqual(pipelineData.project, baseline.project, 'data comfort must change the project data route')
  assert.notDeepEqual(pipelineData.weeks, baseline.weeks, 'data comfort must change weekly activities')

  const twoHours = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    constraints: { ...capabilityFixture.constraints, weeklyHours: 2 },
  }))
  assert.notDeepEqual(twoHours.weeks, baseline.weeks, 'available time must resize the weekly plan')

  const guided = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    constraints: { ...capabilityFixture.constraints, learningPreference: 'guided', pace: 'exploratory' },
  }))
  assert.notDeepEqual(guided.weeks, baseline.weeks, 'learning preference and pace must change weekly activities')
  assert.notDeepEqual(guided.resources, baseline.resources, 'learning preference must change the resource route')

  const paid = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    foundations: { ...capabilityFixture.foundations, codingComfort: 'experienced' },
    constraints: { ...capabilityFixture.constraints, learningPreference: 'guided', resourceBudget: 'paid-ok' },
  }))
  const free = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    foundations: { ...capabilityFixture.foundations, codingComfort: 'experienced' },
    constraints: { ...capabilityFixture.constraints, learningPreference: 'guided', resourceBudget: 'free-only' },
  }))
  assert.notDeepEqual(free.resources, paid.resources, 'budget must change governed resource eligibility')
  assert.ok(free.resources.every(resource => resource.cost.kind === 'free'), 'free-only plans must contain only free resources')

  const privateProject = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    constraints: { ...capabilityFixture.constraints, publicProject: 'no' },
  }))
  assert.notDeepEqual(privateProject.project, baseline.project, 'sharing preference must change the project deliverable')
  assert.notDeepEqual(privateProject.weeks, baseline.weeks, 'sharing preference must change packaging work')
})

test('the first selected capability goal is primary and an optional second goal remains represented', () => {
  const automationReliability = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['automate-repeated-work', 'improve-reliability'] },
  }))
  const reliabilityAutomation = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['improve-reliability', 'automate-repeated-work'] },
  }))
  assert.notEqual(automationReliability.nextCapability, reliabilityAutomation.nextCapability, 'the declared main goal must change the primary recommendation')
  assert.match(automationReliability.nextCapability, /workflow automation/i)
  assert.match(reliabilityAutomation.nextCapability, /evaluating and improving/i)
  const combined = combinedCapabilityPlanText(automationReliability)
  assert.match(combined, /automat|workflow/, 'the plan must represent the automation goal')
  assert.match(combined, /reliab|evaluat|quality|test/, 'the plan must represent the reliability goal')

  const automationOnly = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: { ...capabilityFixture.direction, interests: ['automate-repeated-work'] },
  }))
  assert.notDeepEqual(
    capabilityPlanFingerprint(automationReliability),
    capabilityPlanFingerprint(automationOnly),
    'adding a second selected goal must change at least one visible plan facet',
  )
})

test('capability plans use the learner’s real example and do not award unsupported experience', () => {
  const result = requireResult(composeCapabilityPrescription({
    ...capabilityFixture,
    direction: { roleContext: 'Sales manager at a technology company', interests: ['everyday-work'] },
    experience: { levels: {
      'ai-assisted-work': 'independent', automation: 'adapted', applications: 'adapted', 'data-retrieval': 'adapted', 'evaluation-safety': 'guided',
    } },
    evidence: {
      description: 'I used AI to compare historical sales performance and draft quarterly sales targets.',
      supportedDomains: ['ai-assisted-work'],
      artifactUrl: 'https://example.com/unverified',
    },
  }))
  assert.match(JSON.stringify(result.project), /sales targets/i)
  assert.doesNotMatch(result.project.title, /I used AI/i, 'headings should use a concise task label rather than repeat the full answer')
  assert.ok(result.project.title.length < 120, 'the recommended project title should remain scannable')
  assert.equal(result.evidenceProfile.find(item => item.domain === 'automation').assessedLevel, 'none')
  assert.equal(result.evidenceProfile.find(item => item.domain === 'applications').assessedLevel, 'none')
  assert.equal(result.confidence, 'moderate', 'an uninspected link must not create high confidence')
})

test('internal learning activities include a concrete outcome', () => {
  const result = requireResult(composeCapabilityPrescription(capabilityFixture))
  for (const resource of result.resources.filter(resource => resource.canonicalUrl === null)) {
    assert.ok(resource.outcome.length > 20)
  }
})

test('result composition is deterministic and does not mutate either diagnostic input', () => {
  const useCase = structuredClone(useCaseFixture)
  const useCaseBefore = structuredClone(useCase)
  const firstUseCase = requireResult(composeUseCaseBlueprint(useCase))
  const secondUseCase = requireResult(composeUseCaseBlueprint(structuredClone(useCase)))
  assert.deepEqual(firstUseCase, secondUseCase)
  assert.deepEqual(useCase, useCaseBefore)

  const capability = structuredClone(capabilityFixture)
  const capabilityBefore = structuredClone(capability)
  const firstCapability = requireResult(composeCapabilityPrescription(capability))
  const secondCapability = requireResult(composeCapabilityPrescription(structuredClone(capability)))
  assert.deepEqual(firstCapability, secondCapability)
  assert.deepEqual(capability, capabilityBefore)
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
