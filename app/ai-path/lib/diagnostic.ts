export const AI_PATH_DIAGNOSTIC_VERSION = '2026-07-18.v1' as const

export const USE_CASE_SECTION_IDS = [
  'outcome',
  'workflow',
  'specification',
  'experience',
  'risk',
  'constraints',
] as const

export const CAPABILITY_SECTION_IDS = [
  'direction',
  'experience',
  'evidence',
  'reasoning',
  'foundations',
  'constraints',
] as const

export type UseCaseSectionId = typeof USE_CASE_SECTION_IDS[number]
export type CapabilitySectionId = typeof CAPABILITY_SECTION_IDS[number]
export type DiagnosticPath = 'use-case' | 'capability-growth'
export type ReadinessStatus = 'missing' | 'needs_evidence' | 'complete'
export type ExperienceLevel = 'none' | 'exposure' | 'guided' | 'adapted' | 'independent' | 'demonstrated' | 'operational'
export type DataSensitivity = 'public' | 'internal' | 'confidential' | 'regulated' | 'unsure'
export type ConsequenceLevel = 'low' | 'moderate' | 'serious' | 'critical'
export type CodingComfort = 'none' | 'modify-examples' | 'small-programs' | 'experienced'
export type BuildApproach = 'no-code-first' | 'code-first' | 'either'
export type CapabilityDomain = 'ai-assisted-work' | 'automation' | 'applications' | 'data-retrieval' | 'evaluation-safety'

export type UseCaseIntake = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  path: 'use-case'
  outcome: Readonly<{ desiredOutcome: string }>
  workflow: Readonly<{ currentProcess: string }>
  specification: Readonly<{ inputs: string; output: string; success: string }>
  experience: Readonly<{ level: ExperienceLevel; evidence: string; artifactUrl: string }>
  risk: Readonly<{
    dataSensitivity: DataSensitivity | ''
    existingSystems: string
    consequence: ConsequenceLevel | ''
    humanApproval: 'yes' | 'no' | 'unsure' | ''
  }>
  constraints: Readonly<{
    role: string
    codingComfort: CodingComfort | ''
    weeklyHours: number | null
    approach: BuildApproach | ''
    teamMode: 'solo' | 'team' | ''
    budget: 'free-only' | 'low-cost-ok' | 'organisation-decides' | ''
  }>
}>

export type CapabilityIntake = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  path: 'capability-growth'
  direction: Readonly<{ roleContext: string; interests: readonly string[] }>
  experience: Readonly<{ levels: Readonly<Record<CapabilityDomain, ExperienceLevel>> }>
  evidence: Readonly<{ description: string; supportedDomains: readonly CapabilityDomain[]; artifactUrl: string }>
  reasoning: Readonly<{ scenarioId: string; response: string }>
  foundations: Readonly<{ codingComfort: CodingComfort | ''; dataComfort: 'documents' | 'spreadsheets' | 'queries' | 'pipelines' | ''; tools: readonly string[] }>
  constraints: Readonly<{
    weeklyHours: number | null
    learningPreference: 'guided' | 'projects' | 'balanced' | ''
    pace: 'exploratory' | '30-day' | 'longer' | ''
    resourceBudget: 'free-only' | 'paid-ok' | ''
    publicProject: 'yes' | 'no' | 'unsure' | ''
  }>
}>

export type SectionReadiness<Id extends string> = Readonly<{
  id: Id
  status: ReadinessStatus
  issues: readonly string[]
}>

export type DiagnosticReadiness<Id extends string> = Readonly<{
  status: ReadinessStatus
  canSubmit: boolean
  sections: readonly SectionReadiness<Id>[]
}>

const emptyLevels: Record<CapabilityDomain, ExperienceLevel> = {
  'ai-assisted-work': 'none',
  automation: 'none',
  applications: 'none',
  'data-retrieval': 'none',
  'evaluation-safety': 'none',
}

export const INITIAL_USE_CASE_INTAKE: UseCaseIntake = deepFreeze({
  version: AI_PATH_DIAGNOSTIC_VERSION,
  path: 'use-case',
  outcome: { desiredOutcome: '' },
  workflow: { currentProcess: '' },
  specification: { inputs: '', output: '', success: '' },
  experience: { level: 'none', evidence: '', artifactUrl: '' },
  risk: { dataSensitivity: '', existingSystems: '', consequence: '', humanApproval: '' },
  constraints: { role: '', codingComfort: '', weeklyHours: null, approach: '', teamMode: '', budget: '' },
})

export const INITIAL_CAPABILITY_INTAKE: CapabilityIntake = deepFreeze({
  version: AI_PATH_DIAGNOSTIC_VERSION,
  path: 'capability-growth',
  direction: { roleContext: '', interests: [] },
  experience: { levels: emptyLevels },
  evidence: { description: '', supportedDomains: [], artifactUrl: '' },
  reasoning: { scenarioId: '', response: '' },
  foundations: { codingComfort: '', dataComfort: '', tools: [] },
  constraints: { weeklyHours: null, learningPreference: '', pace: '', resourceBudget: '', publicProject: '' },
})

const experienceRank: Record<ExperienceLevel, number> = {
  none: 0,
  exposure: 1,
  guided: 2,
  adapted: 3,
  independent: 4,
  demonstrated: 5,
  operational: 6,
}

const experienceLabel: Record<ExperienceLevel, string> = {
  none: 'Unassessed in practice',
  exposure: 'Exposure',
  guided: 'Guided practice',
  adapted: 'Adapted practice',
  independent: 'Independent application',
  demonstrated: 'Demonstrated practice',
  operational: 'Operational mastery',
}

const domainLabel: Record<CapabilityDomain, string> = {
  'ai-assisted-work': 'AI-assisted work',
  automation: 'Automation and integrations',
  applications: 'Building AI applications',
  'data-retrieval': 'Data and retrieval',
  'evaluation-safety': 'Evaluation, safety and reliability',
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.values(value as Record<string, unknown>).forEach(deepFreeze)
  return Object.freeze(value)
}

function present(value: string, minimum = 1): boolean {
  return value.trim().length >= minimum
}

function validHours(value: number | null): boolean {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 40
}

function section<Id extends string>(id: Id, missing: string[], evidence: string[] = []): SectionReadiness<Id> {
  const status: ReadinessStatus = missing.length ? 'missing' : evidence.length ? 'needs_evidence' : 'complete'
  return { id, status, issues: [...missing, ...evidence] }
}

function overallReadiness<Id extends string>(sections: readonly SectionReadiness<Id>[]): DiagnosticReadiness<Id> {
  const status: ReadinessStatus = sections.some(item => item.status === 'missing')
    ? 'missing'
    : sections.some(item => item.status === 'needs_evidence') ? 'needs_evidence' : 'complete'
  return deepFreeze({ status, canSubmit: status === 'complete', sections })
}

export function validateUseCaseIntake(input: UseCaseIntake): DiagnosticReadiness<UseCaseSectionId> {
  const experienceNeedsEvidence = experienceRank[input.experience.level] >= experienceRank.adapted && !present(input.experience.evidence, 20)
  return overallReadiness([
    section('outcome', present(input.outcome.desiredOutcome, 20) ? [] : ['Describe the user, task, and desired outcome.']),
    section('workflow', present(input.workflow.currentProcess, 20) ? [] : ['Describe the current process and its failure point.']),
    section('specification', [
      ...(!present(input.specification.inputs, 3) ? ['Describe what information goes in.'] : []),
      ...(!present(input.specification.output, 3) ? ['Describe the expected output.'] : []),
      ...(!present(input.specification.success, 8) ? ['Provide an observable success criterion.'] : []),
    ]),
    section('experience', [], experienceNeedsEvidence ? ['This experience level requires a concrete build or test description.'] : []),
    section('risk', [
      ...(!input.risk.dataSensitivity ? ['Select the data sensitivity.'] : []),
      ...(!input.risk.consequence ? ['Select the consequence of an incorrect result.'] : []),
      ...(!input.risk.humanApproval ? ['Select the human approval requirement.'] : []),
    ]),
    section('constraints', [
      ...(!present(input.constraints.role, 2) ? ['Describe your role.'] : []),
      ...(!input.constraints.codingComfort ? ['Select your coding comfort.'] : []),
      ...(!validHours(input.constraints.weeklyHours) ? ['Choose 1–40 available hours per week.'] : []),
      ...(!input.constraints.approach ? ['Select a build approach.'] : []),
    ]),
  ])
}

export function validateCapabilityIntake(input: CapabilityIntake): DiagnosticReadiness<CapabilitySectionId> {
  const claimedDomains = (Object.keys(input.experience.levels) as CapabilityDomain[])
    .filter(domain => experienceRank[input.experience.levels[domain]] >= experienceRank.adapted)
  const unsupportedClaims = claimedDomains.filter(domain => !input.evidence.supportedDomains.includes(domain))
  const evidenceIssues = [
    ...(claimedDomains.length && !present(input.evidence.description, 30) ? ['Higher experience claims require a concrete description of personal work and evaluation.'] : []),
    ...(unsupportedClaims.length ? [`Select which evidence supports: ${unsupportedClaims.map(domain => domainLabel[domain]).join(', ')}.`] : []),
  ]
  return overallReadiness([
    section('direction', [
      ...(!present(input.direction.roleContext, 2) ? ['Describe your role or working context.'] : []),
      ...(!input.direction.interests.length ? ['Choose at least one outcome.'] : []),
      ...(input.direction.interests.includes('discover-fit') && input.direction.interests.length > 1 ? ['Choose discovery by itself, or select the outcomes you already know.'] : []),
    ]),
    section('experience', [
      ...(Object.values(input.experience.levels).every(level => level === 'none') ? ['Choose the statement that best describes your experience.'] : []),
      ...(!Object.values(input.experience.levels).every(level => level in experienceRank) ? ['Choose a valid experience statement.'] : []),
    ]),
    section('evidence', present(input.evidence.description, 12) ? [] : ['Describe your strongest work, or state that you have not built anything yet.'], evidenceIssues),
    section('reasoning', [
      ...(!present(input.reasoning.scenarioId) ? ['Select an applied reasoning scenario.'] : []),
      ...(!present(input.reasoning.response, 30) ? ['Explain how you would test or control the scenario.'] : []),
    ]),
    section('foundations', [
      ...(!input.foundations.codingComfort ? ['Select your coding foundation.'] : []),
      ...(!input.foundations.dataComfort ? ['Select your data foundation.'] : []),
    ]),
    section('constraints', [
      ...(!validHours(input.constraints.weeklyHours) ? ['Choose 1–40 available hours per week.'] : []),
      ...(!input.constraints.learningPreference ? ['Select a learning preference.'] : []),
      ...(!input.constraints.pace ? ['Select a pace.'] : []),
    ]),
  ])
}

export type NormalizedUseCasePayload = Omit<UseCaseIntake, 'experience'> & Readonly<{
  experience: Readonly<{ level: ExperienceLevel; evidence?: string; artifactUrl?: string }>
}>

export type NormalizedCapabilityPayload = Omit<CapabilityIntake, 'evidence'> & Readonly<{
  evidence: Readonly<{ description: string; supportedDomains: readonly CapabilityDomain[]; artifactUrl?: string }>
}>

export function normalizeUseCaseIntake(input: UseCaseIntake): NormalizedUseCasePayload {
  const activeEvidence = input.experience.level !== 'none'
  return deepFreeze({
    ...structuredClone(input),
    experience: {
      level: input.experience.level,
      ...(activeEvidence && present(input.experience.evidence) ? { evidence: input.experience.evidence.trim() } : {}),
      ...(activeEvidence && present(input.experience.artifactUrl) ? { artifactUrl: input.experience.artifactUrl.trim() } : {}),
    },
  })
}

export function normalizeCapabilityIntake(input: CapabilityIntake): NormalizedCapabilityPayload {
  const hasArtifactContext = present(input.evidence.description) && input.evidence.supportedDomains.length > 0
  return deepFreeze({
    ...structuredClone(input),
    direction: { ...input.direction, interests: [...new Set(input.direction.interests)].slice(0, 4) },
    evidence: {
      description: input.evidence.description.trim(),
      supportedDomains: [...input.evidence.supportedDomains],
      ...(hasArtifactContext && present(input.evidence.artifactUrl) ? { artifactUrl: input.evidence.artifactUrl.trim() } : {}),
    },
  })
}

export type LearningResource = Readonly<{ id: string; title: string; purpose: string }>
export type DiagnosticWeek = Readonly<{ week: 1 | 2 | 3 | 4; focus: string; outcome: string }>

export type UseCaseBlueprint = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  kind: 'use-case-blueprint'
  title: string
  useCase: string
  feasibility: Readonly<{ rating: 'strong-fit' | 'possible-with-constraints' | 'unsuitable-as-stated'; rationale: string }>
  risk: Readonly<{ level: 'low' | 'moderate' | 'high'; safeguards: readonly string[] }>
  architecture: Readonly<{ pattern: string; stages: readonly string[] }>
  prototype: Readonly<{ title: string; scope: string; excluded: readonly string[] }>
  evaluation: Readonly<{ acceptanceTarget: string; checks: readonly string[] }>
  skills: readonly string[]
  weeks: readonly DiagnosticWeek[]
  firstAction: string
  resources: readonly LearningResource[]
}>

export type CapabilityPrescription = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  kind: 'capability-prescription'
  title: string
  evidenceProfile: readonly Readonly<{
    domain: CapabilityDomain
    label: string
    claimedLevel: ExperienceLevel
    assessedLevel: ExperienceLevel
    assessment: string
  }>[]
  confidence: 'limited' | 'moderate' | 'high'
  strongest: string
  untested: readonly string[]
  nextCapability: string
  project: Readonly<{ title: string; outcome: string; deliverables: readonly string[] }>
  definitionOfDone: readonly string[]
  weeks: readonly DiagnosticWeek[]
  firstAction: string
  resources: readonly LearningResource[]
}>

function architectureFor(input: UseCaseIntake) {
  const corpus = `${input.outcome.desiredOutcome} ${input.workflow.currentProcess} ${input.specification.inputs} ${input.specification.output}`.toLowerCase()
  if (/document|knowledge|citation|source|policy|proposal|search|retrieve/.test(corpus)) {
    return {
      pattern: 'Retrieval-assisted copilot with human approval',
      stages: ['Prepare an approved source collection', 'Retrieve relevant evidence', 'Generate a source-grounded draft', 'Flag insufficient evidence', 'Require human review before use'],
      skills: ['Retrieval and source grounding', 'Evaluation-set design', 'Human-review workflow design'],
    }
  }
  if (/classif|extract|categor|route|triage|field/.test(corpus)) {
    return {
      pattern: 'Structured extraction and review workflow',
      stages: ['Define a strict output schema', 'Process representative examples', 'Validate every output', 'Route uncertain cases to a person', 'Measure errors before automation'],
      skills: ['Structured outputs', 'Representative test design', 'Confidence and escalation rules'],
    }
  }
  return {
    pattern: 'Bounded AI-assisted workflow',
    stages: ['Define one repeatable input', 'Generate one reviewable output', 'Compare against a baseline', 'Add a human decision point', 'Expand only after measured success'],
    skills: ['Workflow decomposition', 'Prompt and context design', 'Output evaluation'],
  }
}

function classifyUseCaseRisk(input: UseCaseIntake): UseCaseBlueprint['risk'] {
  const high = input.risk.consequence === 'critical' || input.risk.dataSensitivity === 'regulated'
  const moderate = input.risk.consequence === 'serious' || ['internal', 'confidential', 'unsure'].includes(input.risk.dataSensitivity)
  const level = high ? 'high' : moderate ? 'moderate' : 'low'
  const safeguards = [
    ...(input.risk.dataSensitivity !== 'public' ? ['Use only approved data access and retention boundaries.'] : []),
    ...(input.risk.humanApproval !== 'no' || level !== 'low' ? ['Require a named human to approve consequential outputs.'] : []),
    ...(level !== 'low' ? ['Test failure and refusal behavior before any workflow integration.'] : []),
    'Keep the first prototype read-only and reversible.',
  ]
  return { level, safeguards }
}

export function composeUseCaseBlueprint(input: UseCaseIntake): UseCaseBlueprint | null {
  if (!validateUseCaseIntake(input).canSubmit) return null
  const architecture = architectureFor(input)
  const risk = classifyUseCaseRisk(input)
  const constrained = risk.level !== 'low' || input.risk.humanApproval !== 'no'
  const titleSubject = input.specification.output.trim().replace(/[.!?]+$/, '').replace(/^(?:a|an|the)\s+/i, '')
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    kind: 'use-case-blueprint',
    title: `Build a reviewable ${titleSubject}`,
    useCase: input.outcome.desiredOutcome.trim(),
    feasibility: {
      rating: constrained ? 'possible-with-constraints' : 'strong-fit',
      rationale: constrained
        ? 'The use case is feasible as an assistive workflow, but its data or error consequences require explicit review boundaries.'
        : 'The outcome, inputs, output, and success measure are bounded enough for a small testable prototype.',
    },
    risk,
    architecture: { pattern: architecture.pattern, stages: architecture.stages },
    prototype: {
      title: `One-workflow ${titleSubject} prototype`,
      scope: `Use 10–20 representative examples to produce ${input.specification.output.trim()} from ${input.specification.inputs.trim()}.`,
      excluded: ['Autonomous consequential actions', 'Organisation-wide rollout', 'Additional use cases before the benchmark passes'],
    },
    evaluation: {
      acceptanceTarget: input.specification.success.trim(),
      checks: ['Create expected results before tuning the prototype.', 'Record incorrect, unsupported, and escalated outputs separately.', 'Compare the prototype with the current process.'],
    },
    skills: architecture.skills,
    weeks: [
      { week: 1, focus: 'Define', outcome: 'Create the benchmark, approved inputs, and review boundary.' },
      { week: 2, focus: 'Prototype', outcome: `Build the smallest ${architecture.pattern.toLowerCase()}.` },
      { week: 3, focus: 'Evaluate', outcome: 'Run representative and failure cases; fix the highest-risk errors.' },
      { week: 4, focus: 'Pilot', outcome: 'Run a controlled human-reviewed trial and document the release decision.' },
    ],
    firstAction: 'Select ten representative examples and write the expected result and trusted source for each before choosing more tools.',
    resources: [
      { id: 'workflow-design', title: 'AI workflow design', purpose: 'Turn the current process into bounded inputs, decisions, and review points.' },
      { id: architecture.pattern.startsWith('Retrieval') ? 'grounded-retrieval' : 'structured-output', title: architecture.pattern.startsWith('Retrieval') ? 'Source-grounded retrieval' : 'Structured AI outputs', purpose: 'Learn the core technical pattern required by this prototype.' },
      { id: 'evaluation-basics', title: 'Evaluating AI systems', purpose: 'Build a benchmark and distinguish quality from confident-looking output.' },
    ].slice(0, 3),
  })
}

function cappedAssessedLevel(input: CapabilityIntake, domain: CapabilityDomain): ExperienceLevel {
  const claimed = input.experience.levels[domain]
  if (experienceRank[claimed] < experienceRank.adapted) return claimed
  if (!input.evidence.supportedDomains.includes(domain) || !present(input.evidence.description, 30)) return 'guided'
  if (experienceRank[claimed] >= experienceRank.demonstrated && !present(input.evidence.artifactUrl)) return 'independent'
  return claimed
}

function capabilityDirection(input: CapabilityIntake) {
  const interests = input.direction.interests.join(' ').toLowerCase()
  if (/automat|workflow/.test(interests)) return {
    capability: 'Reliable AI workflow automation',
    project: 'Build and evaluate a human-reviewed triage workflow',
    outcome: 'Turn representative requests into a structured routing recommendation with an escalation path.',
    deliverables: ['A repeatable workflow', 'A 50-example evaluation set', 'A human-review threshold'],
    resources: ['Workflow automation patterns', 'Structured outputs', 'AI evaluation basics'],
  }
  if (/app|build/.test(interests)) return {
    capability: 'Building testable AI applications',
    project: 'Build a small AI application with validated input and output',
    outcome: 'Deliver one useful workflow with explicit failure behavior and repeatable tests.',
    deliverables: ['A working application', 'A representative regression set', 'A short architecture and limitations note'],
    resources: ['AI application architecture', 'Structured outputs', 'Application evaluation'],
  }
  if (/reliab|evaluat|accurate/.test(interests)) return {
    capability: 'Evaluating and improving AI systems',
    project: 'Build a practical quality test for one recurring AI task',
    outcome: 'Measure useful answers, mistakes, and uncertain cases before changing the workflow.',
    deliverables: ['A representative test set', 'A clear quality rubric', 'A documented human-review rule'],
    resources: ['AI evaluation basics', 'Failure analysis', 'Human review patterns'],
  }
  if (/discover|explore|fit/.test(interests)) return {
    capability: 'Finding valuable AI opportunities',
    project: 'Test three small AI opportunities from your real work',
    outcome: 'Compare three bounded experiments and choose one based on usefulness, effort, and risk.',
    deliverables: ['Three opportunity statements', 'Three small experiments', 'A scored decision and next step'],
    resources: ['AI opportunity discovery', 'Rapid workflow experiments', 'Practical evaluation'],
  }
  return {
    capability: 'Evidence-based AI-assisted work',
    project: 'Redesign and evaluate one recurring work task with AI',
    outcome: 'Compare a bounded AI-assisted workflow with the current process using representative examples.',
    deliverables: ['A documented before-and-after workflow', 'A small evaluation rubric', 'A reusable operating guide'],
    resources: ['AI workflow design', 'Prompt and context patterns', 'Practical evaluation'],
  }
}

export function composeCapabilityPrescription(input: CapabilityIntake): CapabilityPrescription | null {
  if (!validateCapabilityIntake(input).canSubmit) return null
  const domains = Object.keys(input.experience.levels) as CapabilityDomain[]
  const evidenceProfile = domains.map(domain => {
    const claimedLevel = input.experience.levels[domain]
    const assessedLevel = cappedAssessedLevel(input, domain)
    return {
      domain,
      label: domainLabel[domain],
      claimedLevel,
      assessedLevel,
      assessment: assessedLevel === 'none' ? 'Unassessed; missing evidence is not a zero score.' : experienceLabel[assessedLevel],
    }
  })
  const ranked = [...evidenceProfile].sort((left, right) => experienceRank[right.assessedLevel] - experienceRank[left.assessedLevel])
  const strongest = ranked[0].assessedLevel === 'none'
    ? 'No applied capability is established yet.'
    : `${ranked[0].label}: ${experienceLabel[ranked[0].assessedLevel]}`
  const untested = evidenceProfile.filter(item => item.assessedLevel === 'none').map(item => item.label)
  const highest = experienceRank[ranked[0].assessedLevel]
  const confidence = highest >= experienceRank.demonstrated && present(input.evidence.artifactUrl)
    ? 'high' : highest >= experienceRank.adapted ? 'moderate' : 'limited'
  const direction = capabilityDirection(input)
  const resourceIds = ['core-pattern', 'applied-practice', 'evaluation']
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    kind: 'capability-prescription',
    title: `Your next capability: ${direction.capability}`,
    evidenceProfile,
    confidence,
    strongest,
    untested,
    nextCapability: direction.capability,
    project: { title: direction.project, outcome: direction.outcome, deliverables: direction.deliverables },
    definitionOfDone: [...direction.deliverables, 'Document at least three failures and the changes made in response.', 'Produce evidence another person can inspect or rerun.'],
    weeks: [
      { week: 1, focus: 'Baseline', outcome: 'Define the task, representative examples, and quality rubric.' },
      { week: 2, focus: 'Build', outcome: 'Create the smallest end-to-end working version.' },
      { week: 3, focus: 'Test', outcome: 'Measure results, inspect failures, and add human review.' },
      { week: 4, focus: 'Demonstrate', outcome: 'Package the artifact, evidence, decisions, and limitations for reassessment.' },
    ],
    firstAction: 'Choose one recurring task and collect ten representative examples, including at least two difficult failures.',
    resources: direction.resources.slice(0, 3).map((title, index) => ({ id: resourceIds[index], title, purpose: index === 0 ? 'Learn the core capability.' : index === 1 ? 'Apply it in the project.' : 'Measure whether it works reliably.' })),
  })
}

export function composeDiagnosticResult(input: UseCaseIntake): UseCaseBlueprint | null
export function composeDiagnosticResult(input: CapabilityIntake): CapabilityPrescription | null
export function composeDiagnosticResult(input: UseCaseIntake | CapabilityIntake): UseCaseBlueprint | CapabilityPrescription | null {
  return input.path === 'use-case' ? composeUseCaseBlueprint(input) : composeCapabilityPrescription(input)
}
