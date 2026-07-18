import { AI_PATH_CATALOG_V1 } from '../catalog/v1.ts'

export const AI_PATH_DIAGNOSTIC_VERSION = '2026-07-18.v1' as const
export const AI_PATH_RESULT_POLICY_VERSION = '2026-07-18.v2' as const

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

export type LearningResource = Readonly<{
  id: string
  title: string
  purpose: string
  provider: string
  canonicalUrl: string | null
  format: 'reading' | 'course' | 'project' | 'reference'
  estimatedMinutes: number
  cost: Readonly<{ kind: 'free' | 'freemium' | 'paid'; disclosure: string }>
}>

export type DiagnosticWeek = Readonly<{
  week: 1 | 2 | 3 | 4
  focus: string
  outcome: string
  activities: readonly string[]
  estimatedMinutes: number
}>

export type PersonalizationReason = Readonly<{
  id: string
  source: string
  detail: string
}>

export type PlanAssumption = Readonly<{
  id: string
  detail: string
}>

export type PersonalizedPlanProfile = Readonly<{
  role: string
  weeklyHours: number
  buildMode: string
  learningMode: string
  collaborationMode: string
  budgetMode: string
  dataMode: string
  evidenceMode: string
  sharingMode: string
  toolsUsed: readonly string[]
}>

export type UseCaseBlueprint = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  policyVersion: typeof AI_PATH_RESULT_POLICY_VERSION
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
  planProfile: PersonalizedPlanProfile
  personalizationReasons: readonly PersonalizationReason[]
  assumptions: readonly PlanAssumption[]
}>

export type CapabilityPrescription = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  policyVersion: typeof AI_PATH_RESULT_POLICY_VERSION
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
  secondaryCapabilities: readonly string[]
  evidenceGap: Readonly<{ summary: string; domains: readonly CapabilityDomain[] }>
  planProfile: PersonalizedPlanProfile
  personalizationReasons: readonly PersonalizationReason[]
  assumptions: readonly PlanAssumption[]
}>

const catalogById = new Map(AI_PATH_CATALOG_V1.resources.map(resource => [resource.id, resource]))

function governedResource(id: string, purpose: string): LearningResource {
  const resource = catalogById.get(id)
  if (!resource || resource.status !== 'active' || resource.review.status !== 'approved') {
    throw new Error(`Unknown or unapproved AI Path catalog resource: ${id}`)
  }
  return {
    id: resource.id,
    title: resource.title,
    purpose,
    provider: resource.provider,
    canonicalUrl: resource.canonicalUrl,
    format: resource.format,
    estimatedMinutes: resource.estimatedMinutes,
    cost: { kind: resource.cost.kind, disclosure: resource.cost.disclosure },
  }
}

function compactText(value: string, maximum = 160): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`
}

function buildModeForUseCase(input: UseCaseIntake): string {
  if (input.constraints.approach === 'no-code-first' || input.constraints.codingComfort === 'none') return 'Manual or no-code prototype'
  if (input.constraints.approach === 'code-first' && input.constraints.codingComfort === 'experienced') return 'Code-first validated integration'
  if (input.constraints.codingComfort === 'small-programs' || input.constraints.codingComfort === 'experienced') return 'Light-code prototype with validated boundaries'
  return 'Visual workflow with one optional code integration'
}

function capabilityBuildMode(input: CapabilityIntake): string {
  if (input.foundations.codingComfort === 'none') return 'Manual or no-code practice'
  if (input.foundations.codingComfort === 'experienced') return 'Code-first application with automated checks'
  if (input.foundations.codingComfort === 'small-programs') return 'Small coded prototype with repeatable tests'
  return 'Guided template with one modified integration'
}

function weeklyMinutes(hours: number, pace: string): number {
  const multiplier = pace === 'exploratory' ? 0.75 : pace === 'longer' ? 0.8 : 1
  return Math.max(45, Math.round(hours * 60 * multiplier / 15) * 15)
}

function allocatedMinutes(total: number, share: number): number {
  return Math.min(total, Math.max(30, Math.round(total * share / 15) * 15))
}

function profileForUseCase(input: UseCaseIntake): PersonalizedPlanProfile {
  const evidence = experienceLabel[input.experience.level]
  return {
    role: compactText(input.constraints.role),
    weeklyHours: input.constraints.weeklyHours ?? 1,
    buildMode: buildModeForUseCase(input),
    learningMode: input.constraints.approach || 'either',
    collaborationMode: input.constraints.teamMode || 'solo',
    budgetMode: input.constraints.budget || 'not-specified',
    dataMode: `${input.risk.dataSensitivity || 'unspecified'}${present(input.risk.existingSystems) ? ` · ${compactText(input.risk.existingSystems, 80)}` : ''}`,
    evidenceMode: `${evidence}${present(input.experience.evidence) ? ` · ${compactText(input.experience.evidence, 100)}` : ''}${present(input.experience.artifactUrl) ? ' · inspectable artifact supplied' : ''}`,
    sharingMode: input.constraints.teamMode === 'team' ? 'Team handoff and named review owner' : 'Private, reversible solo evidence',
    toolsUsed: present(input.risk.existingSystems) ? [compactText(input.risk.existingSystems, 80)] : [],
  }
}

function profileForCapability(input: CapabilityIntake, evidenceSummary: string): PersonalizedPlanProfile {
  const dataModeByComfort = {
    documents: 'Document-based examples and source checks',
    spreadsheets: 'Spreadsheet examples and structured comparisons',
    queries: 'Queryable data and repeatable transformations',
    pipelines: 'Pipeline data with automated validation',
  } as const
  const dataMode = input.foundations.dataComfort
    ? dataModeByComfort[input.foundations.dataComfort]
    : 'Data foundation not specified'
  return {
    role: compactText(input.direction.roleContext),
    weeklyHours: input.constraints.weeklyHours ?? 1,
    buildMode: capabilityBuildMode(input),
    learningMode: `${input.constraints.learningPreference || 'balanced'} · ${input.constraints.pace || 'exploratory'}`,
    collaborationMode: input.constraints.publicProject === 'yes' ? 'Inspectable public artifact' : input.constraints.publicProject === 'no' ? 'Private artifact' : 'Sharing decision deferred',
    budgetMode: input.constraints.resourceBudget || 'free-only',
    dataMode,
    evidenceMode: `${evidenceSummary} · scenario ${input.reasoning.scenarioId}: ${compactText(input.reasoning.response, 100)}`,
    sharingMode: input.constraints.publicProject || 'unsure',
    toolsUsed: [...new Set(input.foundations.tools.map(tool => compactText(tool, 60)))].sort((left, right) => left.localeCompare(right)),
  }
}

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
  const planProfile = profileForUseCase(input)
  const hours = input.constraints.weeklyHours ?? 1
  const weekBudget = weeklyMinutes(hours, '30-day')
  const sampleRange = hours <= 2 ? '5–10' : hours >= 8 || experienceRank[input.experience.level] >= experienceRank.demonstrated ? '20–30' : '10–20'
  const owner = input.constraints.teamMode === 'team' ? `${input.constraints.role.trim()} and the named reviewers` : input.constraints.role.trim()
  const systemBoundary = present(input.risk.existingSystems)
    ? `Use approved, read-only access to ${input.risk.existingSystems.trim()}.`
    : 'Use a copied, approved sample before connecting any live system.'
  const experienceAction = experienceRank[input.experience.level] >= experienceRank.adapted
    ? 'Reuse the strongest prior test, then add failures it did not cover.'
    : 'Start with a manual baseline before configuring or coding the AI step.'
  const implementationAction = `${planProfile.buildMode}; ${input.constraints.teamMode === 'team' ? 'document an owner and review handoff' : 'keep every step reversible and locally inspectable'}.`
  const primaryResourceId = architecture.pattern.startsWith('Retrieval')
    ? 'free-ai-school-grounded-retrieval-sprint'
    : architecture.pattern.startsWith('Structured')
      ? 'free-ai-school-context-evaluation-sprint'
      : 'free-ai-school-workflow-evidence-sprint'
  const implementationResourceId = input.constraints.budget === 'free-only' || input.constraints.codingComfort === 'none'
    ? 'free-ai-school-integration-design-sprint'
    : input.constraints.approach === 'code-first' && input.constraints.codingComfort === 'experienced'
      ? 'openai-api-quickstart'
      : 'free-ai-school-context-evaluation-sprint'
  const operationsResourceId = risk.level === 'high' || input.constraints.teamMode === 'team'
    ? 'free-ai-school-operational-readiness-tabletop'
    : 'free-ai-school-capability-decision-sprint'
  const titleSubject = input.specification.output.trim().replace(/[.!?]+$/, '').replace(/^(?:a|an|the)\s+/i, '')
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    policyVersion: AI_PATH_RESULT_POLICY_VERSION,
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
      scope: `Use ${sampleRange} representative examples to produce ${input.specification.output.trim()} from ${input.specification.inputs.trim()}. Build it as a ${planProfile.buildMode.toLowerCase()} for ${owner}.`,
      excluded: [
        'Autonomous consequential actions',
        input.constraints.teamMode === 'team' ? 'Team-wide rollout before the review owner signs off' : 'Sharing or rollout before the solo benchmark passes',
        input.constraints.budget === 'free-only' ? 'Any dependency on a paid API or paid-only service' : 'Additional use cases before the benchmark passes',
      ],
    },
    evaluation: {
      acceptanceTarget: input.specification.success.trim(),
      checks: [
        'Create expected results before tuning the prototype.',
        risk.level === 'low' ? 'Record incorrect and uncertain outputs separately.' : 'Record incorrect, unsupported, and escalated outputs separately.',
        `Compare the prototype with this current process: ${compactText(input.workflow.currentProcess, 140)}`,
      ],
    },
    skills: architecture.skills,
    weeks: [
      { week: 1, focus: 'Define', outcome: `Create the ${sampleRange}-example benchmark and approval boundary.`, activities: [compactText(input.outcome.desiredOutcome, 140), systemBoundary, experienceAction], estimatedMinutes: allocatedMinutes(weekBudget, 0.9) },
      { week: 2, focus: 'Prototype', outcome: `Build the smallest ${architecture.pattern.toLowerCase()} using a ${planProfile.buildMode.toLowerCase()}.`, activities: [implementationAction, `Produce ${compactText(input.specification.output, 100)} from approved sample inputs.`, input.constraints.budget === 'free-only' ? 'Use only free, existing, or mocked tools.' : 'Record any account, API, or service dependency before using it.'], estimatedMinutes: allocatedMinutes(weekBudget, 1.1) },
      { week: 3, focus: 'Evaluate', outcome: risk.level === 'low' ? 'Measure quality and fix the most frequent failure.' : 'Run failure cases and prove the human-review safeguard.', activities: [input.specification.success.trim(), ...risk.safeguards.slice(0, 2)], estimatedMinutes: allocatedMinutes(weekBudget, 1) },
      { week: 4, focus: 'Pilot', outcome: input.constraints.teamMode === 'team' ? 'Run a controlled team handoff and record the release decision.' : 'Run a reversible solo trial and record the next decision.', activities: [systemBoundary, `Package the result for ${owner}.`, 'Record whether to stop, revise, or expand.'], estimatedMinutes: allocatedMinutes(weekBudget, 0.8) },
    ],
    firstAction: input.constraints.teamMode === 'team'
      ? `${input.constraints.role.trim()}: ask the review owners to choose the first ${sampleRange.split('–')[0]} representative examples and agree the expected result before choosing tools.`
      : `${input.constraints.role.trim()}: choose the first ${sampleRange.split('–')[0]} representative examples and write the expected result before choosing tools; use a ${planProfile.buildMode.toLowerCase()}.`,
    resources: [
      governedResource(primaryResourceId, `Practice the ${architecture.pattern.toLowerCase()} required by this use case.`),
      governedResource(implementationResourceId, `Implement the prototype using the selected ${planProfile.buildMode.toLowerCase()} route.`),
      governedResource(operationsResourceId, risk.level === 'low' ? 'Confirm the opportunity and reversible operating boundary.' : 'Rehearse review, failure, and release decisions before integration.'),
    ],
    planProfile,
    personalizationReasons: [
      { id: 'outcome-workflow', source: 'outcome, workflow and specification', detail: `The plan is bounded around ${compactText(input.outcome.desiredOutcome, 120)} and compares it with the stated current process.` },
      { id: 'experience', source: 'experience', detail: `${experienceLabel[input.experience.level]} determines whether the plan begins with a manual baseline or extends prior evidence.` },
      { id: 'risk', source: 'risk', detail: `${input.risk.dataSensitivity} data and ${input.risk.consequence} consequences set a ${risk.level} safeguard level with human approval set to ${input.risk.humanApproval}.` },
      { id: 'execution', source: 'constraints', detail: `${hours} hours per week, ${input.constraints.approach}, ${input.constraints.teamMode || 'solo'}, and ${input.constraints.budget || 'unspecified budget'} determine scope, build mode, ownership, and resources.` },
    ],
    assumptions: [
      ...(!present(input.risk.existingSystems) ? [{ id: 'sample-data', detail: 'No live system was named, so the first version uses an approved copied sample.' }] : []),
      ...(!present(input.experience.artifactUrl) ? [{ id: 'evidence-link', detail: 'No inspectable artifact link was supplied, so prior experience is treated as self-described evidence.' }] : []),
    ],
  })
}

function cappedAssessedLevel(input: CapabilityIntake, domain: CapabilityDomain): ExperienceLevel {
  const claimed = input.experience.levels[domain]
  if (experienceRank[claimed] < experienceRank.adapted) return claimed
  if (!input.evidence.supportedDomains.includes(domain) || !present(input.evidence.description, 30)) return 'guided'
  if (experienceRank[claimed] >= experienceRank.demonstrated && !present(input.evidence.artifactUrl)) return 'independent'
  return claimed
}

type CapabilityDirection = Readonly<{
  id: string
  capability: string
  project: string
  outcome: string
  deliverables: readonly string[]
  resourceId: string
}>

const capabilityDirectionByInterest: Readonly<Record<string, CapabilityDirection>> = {
  'automate-repeated-work': {
    id: 'automate-repeated-work',
    capability: 'Reliable AI workflow automation',
    project: 'Build and evaluate a human-reviewed triage workflow',
    outcome: 'Turn representative requests into a structured routing recommendation with an escalation path.',
    deliverables: ['A repeatable workflow', 'A 50-example evaluation set', 'A human-review threshold'],
    resourceId: 'free-ai-school-workflow-evidence-sprint',
  },
  'build-ai-tool': {
    id: 'build-ai-tool',
    capability: 'Building testable AI applications',
    project: 'Build a small AI application with validated input and output',
    outcome: 'Deliver one useful workflow with explicit failure behavior and repeatable tests.',
    deliverables: ['A working application', 'A representative regression set', 'A short architecture and limitations note'],
    resourceId: 'free-ai-school-integration-design-sprint',
  },
  'improve-reliability': {
    id: 'improve-reliability',
    capability: 'Evaluating and improving AI systems',
    project: 'Build a practical quality test for one recurring AI task',
    outcome: 'Measure useful answers, mistakes, and uncertain cases before changing the workflow.',
    deliverables: ['A representative test set', 'A clear quality rubric', 'A documented human-review rule'],
    resourceId: 'free-ai-school-context-evaluation-sprint',
  },
  'discover-fit': {
    id: 'discover-fit',
    capability: 'Finding valuable AI opportunities',
    project: 'Test three small AI opportunities from your real work',
    outcome: 'Compare three bounded experiments and choose one based on usefulness, effort, and risk.',
    deliverables: ['Three opportunity statements', 'Three small experiments', 'A scored decision and next step'],
    resourceId: 'free-ai-school-capability-decision-sprint',
  },
  'everyday-work': {
    id: 'everyday-work',
    capability: 'Evidence-based AI-assisted work',
    project: 'Redesign and evaluate one recurring work task with AI',
    outcome: 'Compare a bounded AI-assisted workflow with the current process using representative examples.',
    deliverables: ['A documented before-and-after workflow', 'A small evaluation rubric', 'A reusable operating guide'],
    resourceId: 'free-ai-school-workflow-evidence-sprint',
  },
}

const capabilityInterestPriority = ['automate-repeated-work', 'build-ai-tool', 'improve-reliability', 'everyday-work', 'discover-fit'] as const

function capabilityDirections(input: CapabilityIntake): CapabilityDirection[] {
  const selected = new Set(input.direction.interests)
  return capabilityInterestPriority
    .filter(interest => selected.has(interest))
    .map(interest => capabilityDirectionByInterest[interest])
    .filter((direction): direction is CapabilityDirection => Boolean(direction))
}

function roleProjectContext(role: string): string {
  if (/market|content|brand|campaign/i.test(role)) return 'campaign briefs and brand-claim review'
  if (/sales|revenue|account|rfp/i.test(role)) return 'sales requests and customer-facing drafts'
  if (/support|service|success/i.test(role)) return 'support requests and escalation decisions'
  if (/operation|process|program/i.test(role)) return 'recurring operational requests and handoffs'
  if (/student|educat|teach|learn/i.test(role)) return 'learning materials and feedback tasks'
  if (/engineer|developer|technical|data/i.test(role)) return 'a bounded internal workflow with validated inputs and outputs'
  if (/manager|lead|director|founder|executive/i.test(role)) return 'a team workflow with a named decision and review owner'
  return 'one recurring task from the stated working context'
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
  const directions = capabilityDirections(input)
  const direction = directions[0] ?? capabilityDirectionByInterest['everyday-work']
  const secondaryDirections = directions.slice(1)
  const experienceBand = highest <= experienceRank.guided ? 'beginner' : highest >= experienceRank.demonstrated ? 'experienced' : 'practitioner'
  const context = roleProjectContext(input.direction.roleContext)
  const buildMode = capabilityBuildMode(input)
  const planProfile = profileForCapability(input, strongest)
  const weeklyBudget = weeklyMinutes(input.constraints.weeklyHours ?? 1, input.constraints.pace)
  const reasoningHasEvaluation = /test|evaluat|measure|expected|example|rubric|quality|incorrect|failure/i.test(input.reasoning.response)
  const reasoningHasReview = /human|person|review|approve|escalat|uncertain/i.test(input.reasoning.response)
  const secondaryCapabilities = secondaryDirections.map(item => item.capability)
  const secondaryDeliverables = secondaryDirections.map(item => `Secondary objective: ${item.capability} — ${item.deliverables[0].toLowerCase()}.`)
  const sampleCount = experienceBand === 'beginner'
    ? Math.min(12, Math.max(8, (input.constraints.weeklyHours ?? 1) * 3))
    : experienceBand === 'experienced'
      ? Math.min(50, Math.max(25, (input.constraints.weeklyHours ?? 1) * 5))
      : Math.min(30, Math.max(15, (input.constraints.weeklyHours ?? 1) * 4))
  const primaryDeliverables = direction.deliverables.map(item => item === 'A 50-example evaluation set'
    ? `A ${sampleCount}-example evaluation set`
    : item)
  const projectTitle = `${direction.project} for ${context}`
  const sharingDeliverable = input.constraints.publicProject === 'yes'
    ? 'A public-safe demo or case study with sensitive details removed'
    : input.constraints.publicProject === 'no'
      ? 'A private walkthrough and evidence pack for an approved reviewer'
      : 'A private evidence pack plus a later sharing decision'
  const toolConstraint = input.foundations.tools.length
    ? `Reuse familiar tools where suitable: ${[...new Set(input.foundations.tools)].sort((left, right) => left.localeCompare(right)).join(', ')}.`
    : 'Choose a tool only after the input, output, and evaluation contract are written.'
  const experienceStart = experienceBand === 'beginner'
    ? 'Reproduce one small example manually before building the end-to-end project.'
    : experienceBand === 'experienced'
      ? 'Audit the strongest existing artifact and turn its failures into a regression baseline.'
      : 'Turn the strongest existing attempt into a ten-example baseline before expanding it.'
  const firstAction = `${compactText(input.direction.roleContext, 80)}: ${experienceStart} Use ${context}; start with a ${buildMode.toLowerCase()}.`
  const primaryResourceId = input.constraints.resourceBudget === 'paid-ok' && input.foundations.codingComfort === 'experienced'
    ? 'openai-api-quickstart'
    : direction.resourceId
  const modalityResourceId = input.constraints.resourceBudget === 'paid-ok' && input.constraints.learningPreference === 'guided'
    ? 'deeplearning-ai-generative-ai-for-everyone'
    : input.constraints.learningPreference === 'guided'
      ? 'free-ai-school-capability-decision-sprint'
      : input.foundations.codingComfort === 'none'
        ? 'free-ai-school-integration-design-sprint'
        : 'free-ai-school-context-evaluation-sprint'
  const evidenceResourceId = secondaryDirections[0]?.resourceId
    ?? (highest >= experienceRank.demonstrated ? 'free-ai-school-operational-pilot-sprint' : 'free-ai-school-workflow-evidence-sprint')
  const selectedResourceIds = [...new Set([primaryResourceId, modalityResourceId, evidenceResourceId])].slice(0, 3)
  const gapDomains = evidenceProfile.filter(item => item.assessedLevel === 'none').map(item => item.domain)
  const gapSummary = gapDomains.length
    ? `Evidence is still needed in ${gapDomains.slice(0, 2).map(domain => domainLabel[domain]).join(' and ')}${gapDomains.length > 2 ? ` plus ${gapDomains.length - 2} other area${gapDomains.length - 2 === 1 ? '' : 's'}` : ''}.`
    : 'Every capability area has at least some practical evidence; the next step is to deepen the weakest demonstrated area.'
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    policyVersion: AI_PATH_RESULT_POLICY_VERSION,
    kind: 'capability-prescription',
    title: `Your next capability: ${direction.capability}`,
    evidenceProfile,
    confidence,
    strongest,
    untested,
    nextCapability: direction.capability,
    project: {
      title: projectTitle,
      outcome: `${direction.outcome} Ground it in ${context}, using ${planProfile.dataMode.toLowerCase()} and a ${buildMode.toLowerCase()}.`,
      deliverables: [...primaryDeliverables, ...secondaryDeliverables, sharingDeliverable, toolConstraint],
    },
    definitionOfDone: [
      ...primaryDeliverables,
      ...secondaryDeliverables,
      reasoningHasEvaluation ? 'Preserve the proposed measurement method and results.' : 'Add expected examples and a quality rubric before accepting results.',
      reasoningHasReview ? 'Document the proposed human-review or escalation rule.' : 'Add a named human-review rule for uncertain or consequential outputs.',
      experienceBand === 'experienced' ? 'Document at least five failures and the changes made in response.' : 'Document at least three failures and the changes made in response.',
      sharingDeliverable,
    ],
    weeks: [
      { week: 1, focus: experienceBand === 'experienced' ? 'Audit' : 'Baseline', outcome: input.constraints.learningPreference === 'guided' ? 'Follow one bounded example, then define the task and quality rubric.' : 'Define the task, representative examples, and quality rubric through the project.', activities: [experienceStart, `Choose examples from ${context}.`, compactText(input.evidence.description, 140)], estimatedMinutes: allocatedMinutes(weeklyBudget, input.constraints.pace === 'exploratory' ? 0.7 : 0.9) },
      { week: 2, focus: 'Build', outcome: `Create the smallest end-to-end version as a ${buildMode.toLowerCase()}.`, activities: [toolConstraint, planProfile.dataMode, ...secondaryDirections.slice(0, 1).map(item => `Include the secondary ${item.capability.toLowerCase()} objective without expanding the core workflow.`)], estimatedMinutes: allocatedMinutes(weeklyBudget, 1.1) },
      { week: 3, focus: 'Test', outcome: reasoningHasEvaluation ? 'Run the proposed evaluation, inspect failures, and tighten the review rule.' : 'Create the missing evaluation, inspect failures, and add human review.', activities: [compactText(input.reasoning.response, 140), reasoningHasReview ? 'Test the stated review or escalation boundary.' : 'Name a reviewer and define when the workflow must escalate.', gapSummary], estimatedMinutes: allocatedMinutes(weeklyBudget, 1) },
      { week: 4, focus: input.constraints.publicProject === 'yes' ? 'Demonstrate' : 'Package', outcome: input.constraints.pace === 'longer' ? 'Package this first phase and choose the next capability for the longer program.' : 'Package the artifact, evidence, decisions, and limitations for reassessment.', activities: [sharingDeliverable, `Explain the result for ${compactText(input.direction.roleContext, 80)}.`, 'Record the next capability decision.'], estimatedMinutes: allocatedMinutes(weeklyBudget, input.constraints.pace === 'exploratory' ? 0.6 : 0.8) },
    ],
    firstAction,
    resources: [...new Set([
      ...selectedResourceIds,
      'free-ai-school-operational-pilot-sprint',
      'free-ai-school-context-evaluation-sprint',
      'free-ai-school-capability-decision-sprint',
    ])].slice(0, 3).map((id, index) => governedResource(id, index === 0 ? `Build the primary ${direction.capability.toLowerCase()} capability.` : index === 1 ? `Fit the ${input.constraints.learningPreference} learning preference and ${buildMode.toLowerCase()} route.` : secondaryDirections.length ? `Add the selected secondary capability: ${secondaryDirections[0].capability}.` : 'Turn practice into inspectable evidence.')),
    secondaryCapabilities,
    evidenceGap: { summary: gapSummary, domains: gapDomains },
    planProfile,
    personalizationReasons: [
      { id: 'role-goals', source: 'direction', detail: `${compactText(input.direction.roleContext, 100)} and ${directions.map(item => item.capability).join(' plus ')} determine the project context and objectives.` },
      { id: 'evidence-level', source: 'experience and evidence', detail: `${strongest}; ${experienceBand} scope is based on supported domains, the evidence description, and ${present(input.evidence.artifactUrl) ? 'an inspectable artifact' : 'no inspectable artifact link'}.` },
      { id: 'reasoning', source: 'reasoning', detail: `The ${input.reasoning.scenarioId} response ${reasoningHasEvaluation ? 'already includes evaluation thinking' : 'needs an explicit evaluation method'} and ${reasoningHasReview ? 'includes a review boundary' : 'needs a review boundary'}.` },
      { id: 'foundations', source: 'foundations', detail: `${input.foundations.codingComfort} coding and ${input.foundations.dataComfort} data experience set the ${buildMode.toLowerCase()} route; familiar tools are carried into the first prototype.` },
      { id: 'constraints', source: 'constraints', detail: `${input.constraints.weeklyHours} hours, ${input.constraints.learningPreference}, ${input.constraints.pace}, ${input.constraints.resourceBudget}, and ${input.constraints.publicProject} sharing determine workload, resource eligibility, and the final artifact.` },
    ],
    assumptions: [
      { id: 'suggested-task', detail: `No specific future task is captured on this path, so the plan suggests ${context} based on the stated role; replace it with a better real task if needed.` },
      ...(!present(input.evidence.artifactUrl) ? [{ id: 'evidence-link', detail: 'No artifact link was supplied, so confidence is based on the described work and selected supported domains.' }] : []),
    ],
  })
}

export function composeDiagnosticResult(input: UseCaseIntake): UseCaseBlueprint | null
export function composeDiagnosticResult(input: CapabilityIntake): CapabilityPrescription | null
export function composeDiagnosticResult(input: UseCaseIntake | CapabilityIntake): UseCaseBlueprint | CapabilityPrescription | null {
  return input.path === 'use-case' ? composeUseCaseBlueprint(input) : composeCapabilityPrescription(input)
}
