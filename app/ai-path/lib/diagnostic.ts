import { AI_PATH_CATALOG_V1 } from '../catalog/v1.ts'

export const AI_PATH_DIAGNOSTIC_VERSION = '2026-07-18.v1' as const
export const AI_PATH_RESULT_POLICY_VERSION = '2026-07-19.v3' as const

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
  experience: Readonly<{ level: ExperienceLevel | ''; evidence: string; artifactUrl: string }>
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
  experience: { level: '', evidence: '', artifactUrl: '' },
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

function validOptionalHttpsUrl(value: string): boolean {
  if (!present(value)) return true
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
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
  const experienceNeedsEvidence = input.experience.level !== ''
    && experienceRank[input.experience.level] >= experienceRank.adapted
    && !present(input.experience.evidence, 20)
  return overallReadiness([
    section('outcome', present(input.outcome.desiredOutcome, 20) ? [] : ['Describe the user, task, and desired outcome.']),
    section('workflow', present(input.workflow.currentProcess, 20) ? [] : ['Describe the current process and its failure point.']),
    section('specification', [
      ...(!present(input.specification.inputs, 3) ? ['Describe what information goes in.'] : []),
      ...(!present(input.specification.output, 3) ? ['Describe the expected output.'] : []),
      ...(!present(input.specification.success, 8) ? ['Provide an observable success criterion.'] : []),
    ]),
    section('experience', [
      ...(!input.experience.level ? ['Choose the statement that best describes your experience.'] : []),
      ...(validOptionalHttpsUrl(input.experience.artifactUrl) ? [] : ['Use a complete HTTPS link, or leave the artifact link blank.']),
    ], experienceNeedsEvidence ? ['This experience level requires a concrete build or test description.'] : []),
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
      ...(!input.constraints.teamMode ? ['Choose whether you will work solo or with a team.'] : []),
      ...(!input.constraints.budget ? ['Choose a tool budget.'] : []),
    ]),
  ])
}

export function validateCapabilityIntake(input: CapabilityIntake): DiagnosticReadiness<CapabilitySectionId> {
  const claimedDomains = (Object.keys(input.experience.levels) as CapabilityDomain[])
    .filter(domain => experienceRank[input.experience.levels[domain]] >= experienceRank.adapted)
  const evidenceIssues = [
    ...(claimedDomains.length && !present(input.evidence.description, 30) ? ['Higher experience claims require a concrete description of personal work and evaluation.'] : []),
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
    section('evidence', [
      ...(present(input.evidence.description, 12) ? [] : ['Describe your strongest work, or state that you have not built anything yet.']),
      ...(validOptionalHttpsUrl(input.evidence.artifactUrl) ? [] : ['Use a complete HTTPS link, or leave the artifact link blank.']),
    ], evidenceIssues),
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
      ...(!input.constraints.resourceBudget ? ['Choose a resource budget.'] : []),
      ...(!input.constraints.publicProject ? ['Choose whether the project may be public.'] : []),
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
  const level = input.experience.level || 'none'
  const activeEvidence = level !== 'none'
  return deepFreeze({
    ...structuredClone(input),
    experience: {
      level,
      ...(activeEvidence && present(input.experience.evidence) ? { evidence: input.experience.evidence.trim() } : {}),
      ...(activeEvidence && present(input.experience.artifactUrl) ? { artifactUrl: input.experience.artifactUrl.trim() } : {}),
    },
  })
}

export function normalizeCapabilityIntake(input: CapabilityIntake): NormalizedCapabilityPayload {
  const hasArtifactContext = present(input.evidence.description) && input.evidence.supportedDomains.length > 0
  return deepFreeze({
    ...structuredClone(input),
    direction: { ...input.direction, interests: [...new Set(input.direction.interests)].slice(0, 2) },
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
  outcome: string
  provider: string
  canonicalUrl: string | null
  format: 'reading' | 'course' | 'project' | 'reference'
  estimatedMinutes: number
  week: 1 | 2 | 3 | 4
  planMinutes: number
  cost: Readonly<{ kind: 'free' | 'freemium' | 'paid'; disclosure: string }>
}>

export type PlanPersona = 'beginner' | 'practitioner' | 'advanced' | 'executive'

export type PlanExecutiveSummary = Readonly<{
  recommendation: string
  reason: string
  owner: string
  riskBoundary: string
  decisionGate: string
  checkpoint: string
}>

export type PlanFirstStep = Readonly<{
  task: string
  inputs: readonly string[]
  artifactId: string
  timeboxMinutes: number
  doneWhen: string
}>

export type StarterArtifactField = Readonly<{
  label: string
  guidance: string
  example?: string
}>

export type StarterArtifact = Readonly<{
  id: string
  title: string
  format: 'brief' | 'table' | 'checklist' | 'scorecard'
  instructions: string
  fields: readonly StarterArtifactField[]
}>

export type EvidenceProjectLink = Readonly<{
  id: string
  signal: string
  interpretation: string
  projectEffect: string
}>

export type DiscoveryExample = Readonly<{
  id: string
  title: string
  input: string
  output: string
  timeboxMinutes: number
  completionCheck: string
  privacyBoundary: string
}>

export type UseCaseDomainPolicy = Readonly<{
  domain: 'general' | 'finance-narrative'
  calculationBoundary: string
  allowedAiRole: string
  blockedActions: readonly string[]
  releaseRule: string
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
  persona: PlanPersona
  summary: PlanExecutiveSummary
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
  firstStep: PlanFirstStep
  starterArtifact: StarterArtifact
  evidenceProjectLinks: readonly EvidenceProjectLink[]
  domainPolicy: UseCaseDomainPolicy
  resources: readonly LearningResource[]
  planProfile: PersonalizedPlanProfile
  personalizationReasons: readonly PersonalizationReason[]
  assumptions: readonly PlanAssumption[]
}>

export type CapabilityPrescription = Readonly<{
  version: typeof AI_PATH_DIAGNOSTIC_VERSION
  policyVersion: typeof AI_PATH_RESULT_POLICY_VERSION
  kind: 'capability-prescription'
  persona: PlanPersona
  summary: PlanExecutiveSummary
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
  firstStep: PlanFirstStep
  starterArtifact: StarterArtifact
  evidenceProjectLinks: readonly EvidenceProjectLink[]
  resources: readonly LearningResource[]
  secondaryCapabilities: readonly string[]
  discoveryExamples: readonly DiscoveryExample[]
  evidenceGap: Readonly<{ summary: string; domains: readonly CapabilityDomain[] }>
  planProfile: PersonalizedPlanProfile
  personalizationReasons: readonly PersonalizationReason[]
  assumptions: readonly PlanAssumption[]
}>

const catalogById = new Map(AI_PATH_CATALOG_V1.resources.map(resource => [resource.id, resource]))

function governedResource(id: string, purpose: string, week: 1 | 2 | 3 | 4, planMinutes: number): LearningResource {
  const resource = catalogById.get(id)
  if (!resource || resource.status !== 'active' || resource.review.status !== 'approved') {
    throw new Error(`Unknown or unapproved AI Path catalog resource: ${id}`)
  }
  return {
    id: resource.id,
    title: resource.title,
    purpose,
    outcome: resource.outcome,
    provider: resource.provider,
    canonicalUrl: resource.canonicalUrl,
    format: resource.format,
    estimatedMinutes: resource.estimatedMinutes,
    week,
    planMinutes: Math.min(resource.estimatedMinutes, Math.max(15, Math.round(planMinutes / 15) * 15)),
    cost: { kind: resource.cost.kind, disclosure: resource.cost.disclosure },
  }
}

function compactText(value: string, maximum = 160): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`
}

type TaskArchetype =
  | 'rfp-response'
  | 'forecast-review'
  | 'finance-variance'
  | 'employee-communications'
  | 'research-synthesis'
  | 'classification-routing'
  | 'support-triage'
  | 'workflow-automation'
  | 'quality-evaluation'
  | 'opportunity-discovery'
  | 'general-workflow'

type SemanticTaskContext = Readonly<{
  archetype: TaskArchetype
  label: string
  inputLabel: string
  outputLabel: string
  ownerLabel: string
  source: 'use-case' | 'evidence' | 'role' | 'fallback'
}>

const taskCopy: Readonly<Record<TaskArchetype, Omit<SemanticTaskContext, 'archetype' | 'source'>>> = {
  'rfp-response': { label: 'cited RFP response drafting', inputLabel: 'approved RFP questions and source material', outputLabel: 'source-backed draft responses', ownerLabel: 'response owner and subject-matter reviewer' },
  'forecast-review': { label: 'sales forecasting and target review', inputLabel: 'sanitized opportunities and current forecast criteria', outputLabel: 'evidence-backed forecast review', ownerLabel: 'forecast owner and sales reviewer' },
  'finance-variance': { label: 'reconciled variance narrative review', inputLabel: 'reconciled figures and source references', outputLabel: 'reviewed variance narrative', ownerLabel: 'finance owner and named approver' },
  'employee-communications': { label: 'employee announcement drafting and review', inputLabel: 'approved facts and audience requirements', outputLabel: 'reviewed employee announcement', ownerLabel: 'communications owner and policy reviewer' },
  'research-synthesis': { label: 'source-grounded research synthesis', inputLabel: 'approved source material and research questions', outputLabel: 'cited research synthesis', ownerLabel: 'research owner and source reviewer' },
  'classification-routing': { label: 'structured classification and routing', inputLabel: 'representative requests and expected routes', outputLabel: 'reviewable routing recommendations', ownerLabel: 'workflow owner and escalation reviewer' },
  'support-triage': { label: 'support triage and escalation', inputLabel: 'sanitized support requests and escalation rules', outputLabel: 'reviewable triage recommendations', ownerLabel: 'support owner and escalation reviewer' },
  'workflow-automation': { label: 'human-reviewed workflow automation', inputLabel: 'representative workflow inputs and current rules', outputLabel: 'reviewable workflow output', ownerLabel: 'process owner and review owner' },
  'quality-evaluation': { label: 'AI output quality evaluation', inputLabel: 'representative examples and expected results', outputLabel: 'quality scorecard and failure log', ownerLabel: 'evaluation owner and release reviewer' },
  'opportunity-discovery': { label: 'AI opportunity discovery', inputLabel: 'three recurring tasks and current effort', outputLabel: 'scored opportunity shortlist', ownerLabel: 'learner and practical reviewer' },
  'general-workflow': { label: 'one recurring work task', inputLabel: 'representative examples and expected results', outputLabel: 'reviewable work product', ownerLabel: 'task owner and reviewer' },
}

function archetypeFromCorpus(corpus: string, fallback: TaskArchetype): TaskArchetype {
  const text = corpus.toLowerCase()
  if (/\b(?:finance|financial|accounting|ledger|controller|fp&a)\b/.test(text) && /\b(?:variance|reconcil|actual|budget|total|calculation|forecast)\b/.test(text)) return 'finance-variance'
  if (/\b(?:rfp|proposal|security questionnaire|vendor questionnaire)\b/.test(text)) return 'rfp-response'
  if (/\b(?:forecast|pipeline|sales targets?|quota|opportunit(?:y|ies))\b/.test(text)) return 'forecast-review'
  if (/\b(?:employee announcement|internal communication|staff update|all-hands|people communication|hr communication)\b/.test(text)) return 'employee-communications'
  if (/\b(?:support ticket|customer support|service request|escalation)\b/.test(text)) return 'support-triage'
  if (/\b(?:research|source|citation|literature|synthesi[sz])\b/.test(text)) return 'research-synthesis'
  if (/\b(?:classif|categor|route|triage|extract)\b/.test(text)) return 'classification-routing'
  if (/\b(?:reliab|evaluat|quality|test set|rubric|failure)\b/.test(text)) return 'quality-evaluation'
  if (/\b(?:automat|integration|handoff|recurring process|workflow)\b/.test(text)) return 'workflow-automation'
  return fallback
}

function semanticContext(archetype: TaskArchetype, source: SemanticTaskContext['source']): SemanticTaskContext {
  return { archetype, source, ...taskCopy[archetype] }
}

function semanticUseCaseContext(input: UseCaseIntake): SemanticTaskContext {
  const corpus = [input.outcome.desiredOutcome, input.workflow.currentProcess, input.specification.inputs, input.specification.output, input.constraints.role].join(' ')
  return semanticContext(archetypeFromCorpus(corpus, 'general-workflow'), 'use-case')
}

function isExecutiveRole(role: string): boolean {
  return /\b(?:chief|c-suite|ceo|cfo|coo|cto|cio|cmo|chief\s+\w+\s+officer|senior vice president|vice president|president|founder|executive)\b/i.test(role)
}

function planPersonaForUseCase(input: UseCaseIntake): PlanPersona {
  const level = input.experience.level || 'none'
  if (isExecutiveRole(input.constraints.role)) return 'executive'
  if (experienceRank[level] >= experienceRank.demonstrated || input.constraints.codingComfort === 'experienced') return 'advanced'
  if (experienceRank[level] <= experienceRank.guided) return 'beginner'
  return 'practitioner'
}

function sampleCountForPersona(persona: PlanPersona, hours: number): number {
  if (persona === 'beginner') return Math.min(8, Math.max(3, hours * 2))
  if (persona === 'advanced') return Math.min(50, Math.max(25, hours * 5))
  if (persona === 'executive') return Math.min(12, Math.max(5, hours * 2))
  return Math.min(20, Math.max(8, hours * 4))
}

function starterArtifactForContext(context: SemanticTaskContext, persona: PlanPersona): StarterArtifact {
  const examples = persona === 'beginner'
  const presets: Readonly<Record<TaskArchetype, readonly [string, string][]>> = {
    'rfp-response': [['Question', 'One approved RFP question'], ['Approved source', 'Where the answer is supported'], ['Supported claim', 'What the evidence permits'], ['Citation', 'Exact source reference'], ['Reviewer decision', 'Approve, revise, or escalate']],
    'forecast-review': [['Opportunity or segment', 'One sanitized forecast item'], ['Expected outcome', 'Current forecast and timing'], ['Supporting evidence', 'Signals that support the forecast'], ['Risk', 'What could change the outcome'], ['Reviewer decision', 'Keep, revise, or escalate']],
    'finance-variance': [['Reconciled figure', 'Approved deterministic result'], ['Variance driver', 'Supported explanation'], ['Source', 'System-of-record reference'], ['Narrative draft', 'AI-assisted prose using approved figures only'], ['Approver', 'Named finance reviewer']],
    'employee-communications': [['Audience', 'Who needs the message'], ['Approved facts', 'Facts cleared for use'], ['Draft', 'Proposed announcement'], ['Sensitive claim', 'Claim requiring review'], ['Reviewer decision', 'Approve, revise, or remove']],
    'research-synthesis': [['Question', 'Bounded research question'], ['Source', 'Approved source and citation'], ['Finding', 'Source-supported finding'], ['Uncertainty', 'What the source does not establish'], ['Reviewer decision', 'Include, revise, or exclude']],
    'classification-routing': [['Input', 'Representative request'], ['Expected route', 'Human-defined route'], ['Actual route', 'Prototype recommendation'], ['Uncertainty', 'Reason for low confidence'], ['Escalation', 'Human owner and action']],
    'support-triage': [['Request', 'Sanitized support request'], ['Expected priority', 'Human-defined priority'], ['Suggested route', 'Prototype recommendation'], ['Uncertainty', 'Missing or conflicting information'], ['Escalation', 'Owner and next action']],
    'workflow-automation': [['Input', 'Representative workflow item'], ['Expected result', 'Human-defined result'], ['Actual result', 'Prototype result'], ['Failure category', 'What went wrong'], ['Escalation', 'Human review action']],
    'quality-evaluation': [['Example', 'Representative input'], ['Expected result', 'Human-defined result'], ['Actual result', 'Observed AI result'], ['Failure category', 'Consistent error label'], ['Fix', 'Change and retest decision']],
    'opportunity-discovery': [['Task', 'One recurring work task'], ['Frequency', 'How often it occurs'], ['Value', 'Time or quality opportunity'], ['Effort', 'Smallest test needed'], ['Risk', 'Data and decision boundary'], ['Next experiment', '20–30 minute safe test']],
    'general-workflow': [['Example', 'Representative input'], ['Expected result', 'Human-defined result'], ['Actual result', 'Prototype result'], ['Quality check', 'How the result is judged'], ['Reviewer decision', 'Accept, revise, or stop']],
  }
  const id = `${context.archetype}-${persona === 'executive' ? 'decision-brief' : 'starter-table'}`
  return {
    id,
    title: persona === 'executive' ? `${context.label} decision brief` : `${context.label} starter table`,
    format: persona === 'executive' ? 'brief' : persona === 'advanced' ? 'checklist' : context.archetype === 'quality-evaluation' ? 'scorecard' : 'table',
    instructions: `Copy this template and complete one row per example before choosing or changing tools.`,
    fields: presets[context.archetype].map(([label, guidance], index) => ({
      label,
      guidance,
      ...(examples ? { example: index === 0 ? `Example ${index + 1}` : `Write ${guidance.toLowerCase()}` } : {}),
    })),
  }
}

export function formatFirstAction(step: PlanFirstStep): string {
  return `${step.task} Use ${step.inputs.join(' and ')}. Timebox: ${step.timeboxMinutes} minutes. Done when ${step.doneWhen.charAt(0).toLowerCase()}${step.doneWhen.slice(1)}`
}

function firstStepForContext(context: SemanticTaskContext, persona: PlanPersona, artifact: StarterArtifact, sampleCount: number): PlanFirstStep {
  const count = persona === 'executive' ? Math.min(5, sampleCount) : persona === 'beginner' ? Math.min(3, sampleCount) : sampleCount
  return {
    task: persona === 'advanced'
      ? `Audit ${count} existing ${context.label} examples in the included template.`
      : `Complete the first ${count} rows of the included ${context.label} template.`,
    inputs: [context.inputLabel, 'the current review criteria'],
    artifactId: artifact.id,
    timeboxMinutes: persona === 'executive' ? 30 : persona === 'beginner' ? 25 : persona === 'advanced' ? 45 : 30,
    doneWhen: persona === 'advanced'
      ? `Every row has an expected result, a failure label, and a release or rollback decision.`
      : `Every row has an expected result and a reviewer decision.`,
  }
}

function domainPolicyForUseCase(context: SemanticTaskContext): UseCaseDomainPolicy {
  if (context.archetype === 'finance-variance') {
    return {
      domain: 'finance-narrative',
      calculationBoundary: 'All calculations, reconciliations, totals, variances, and forecasts stay in deterministic formulas or code.',
      allowedAiRole: 'AI may draft narrative only from reconciled, source-traced, approved figures.',
      blockedActions: ['Do not ask AI to calculate or alter figures.', 'Do not let AI fill missing values or choose the system of record.', 'Block narrative generation when a source is missing or reconciliation fails.', 'Reject prose containing a number absent from the approved input.'],
      releaseRule: 'A named finance approver must review the figures and narrative before distribution.',
    }
  }
  return {
    domain: 'general',
    calculationBoundary: 'Keep deterministic rules and source-of-truth values outside the generative step.',
    allowedAiRole: 'AI may assist with a bounded, reviewable output.',
    blockedActions: ['Do not allow autonomous consequential actions.', 'Do not expand beyond the tested workflow.'],
    releaseRule: 'Release only after the acceptance target and review boundary pass.',
  }
}

function summaryForUseCase(context: SemanticTaskContext, persona: PlanPersona, risk: UseCaseBlueprint['risk']): PlanExecutiveSummary {
  return {
    recommendation: `Start with one bounded ${context.label} pilot.`,
    reason: `It creates a useful result while keeping evidence, review, and failure handling visible.`,
    owner: context.ownerLabel,
    riskBoundary: `Do not automate or expand until the benchmark and human-review rule pass.`,
    decisionGate: risk.level === 'low' ? 'Approve only after the stated success target passes.' : 'Approve only after failure cases and escalation behavior pass.',
    checkpoint: persona === 'executive' ? 'Decision review at the end of week 1.' : 'Pilot decision at the end of week 4.',
  }
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
  const evidence = experienceLabel[input.experience.level || 'none']
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
  if (/\b(?:finance|financial|accounting|ledger|controller|fp&a)\b/.test(corpus) && /\b(?:variance|reconcil|actual|budget|total|calculation|forecast)\b/.test(corpus)) {
    return {
      pattern: 'Deterministic calculation with AI-assisted narrative',
      stages: ['Calculate and reconcile figures with formulas or code', 'Trace every approved figure to its source', 'Block on missing or mismatched values', 'Draft narrative from approved figures only', 'Require finance approval before distribution'],
      skills: ['Deterministic financial controls', 'Source-traced narrative grounding', 'Finance approval workflow design'],
    }
  }
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
  const context = semanticUseCaseContext(input)
  const safeguards = [
    ...(input.risk.dataSensitivity !== 'public' ? ['Use only approved data access and retention boundaries.'] : []),
    ...(input.risk.humanApproval !== 'no' || level !== 'low' ? ['Require a named human to approve consequential outputs.'] : []),
    ...(level !== 'low' ? ['Test failure and refusal behavior before any workflow integration.'] : []),
    ...(context.archetype === 'finance-variance' ? ['Keep every calculation deterministic; AI may draft narrative from reconciled approved figures only.', 'Block generation on missing sources or reconciliation mismatches and require finance approval.'] : []),
    'Keep the first prototype read-only and reversible.',
  ]
  return { level, safeguards }
}

export function composeUseCaseBlueprint(input: UseCaseIntake): UseCaseBlueprint | null {
  if (!validateUseCaseIntake(input).canSubmit) return null
  const experienceLevel = input.experience.level || 'none'
  const context = semanticUseCaseContext(input)
  const persona = planPersonaForUseCase(input)
  const architecture = architectureFor(input)
  const risk = classifyUseCaseRisk(input)
  const domainPolicy = domainPolicyForUseCase(context)
  const constrained = risk.level !== 'low' || input.risk.humanApproval !== 'no'
  const planProfile = profileForUseCase(input)
  const hours = input.constraints.weeklyHours ?? 1
  const weekBudget = weeklyMinutes(hours, '30-day')
  const sampleCount = sampleCountForPersona(persona, hours)
  const starterArtifact = starterArtifactForContext(context, persona)
  const firstStep = firstStepForContext(context, persona, starterArtifact, sampleCount)
  const summary = summaryForUseCase(context, persona, risk)
  const owner = input.constraints.teamMode === 'team' ? context.ownerLabel : 'task owner and reviewer'
  const systemBoundary = present(input.risk.existingSystems)
    ? `Use approved, read-only access to ${input.risk.existingSystems.trim()}.`
    : 'Use a copied, approved sample before connecting any live system.'
  const experienceAction = experienceRank[experienceLevel] >= experienceRank.adapted
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
  const resourceMinutes = Math.max(15, Math.min(60, Math.floor((weekBudget * 0.25) / 15) * 15))
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    policyVersion: AI_PATH_RESULT_POLICY_VERSION,
    kind: 'use-case-blueprint',
    persona,
    summary,
    title: `Build a reviewable ${context.label} pilot`,
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
      title: `${context.label} pilot`,
      scope: `Use ${sampleCount} representative examples to produce ${context.outputLabel} from ${context.inputLabel}. Build it as a ${planProfile.buildMode.toLowerCase()} for the ${owner}.`,
      excluded: [
        'Autonomous consequential actions',
        ...domainPolicy.blockedActions,
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
      { week: 1, focus: 'Define', outcome: `Create the ${sampleCount}-example benchmark and approval boundary.`, activities: [`Complete the included ${starterArtifact.title}.`, systemBoundary, experienceAction], estimatedMinutes: allocatedMinutes(weekBudget, 0.9) },
      { week: 2, focus: 'Prototype', outcome: `Build the smallest ${architecture.pattern.toLowerCase()} using a ${planProfile.buildMode.toLowerCase()}.`, activities: [implementationAction, `Produce ${context.outputLabel} from approved sample inputs.`, input.constraints.budget === 'free-only' ? 'Use only free, existing, or mocked tools.' : 'Record any account, API, or service dependency before using it.'], estimatedMinutes: allocatedMinutes(weekBudget, 1.1) },
      { week: 3, focus: 'Evaluate', outcome: risk.level === 'low' ? 'Measure quality and fix the most frequent failure.' : 'Run failure cases and prove the human-review safeguard.', activities: ['Apply the stated acceptance target to every benchmark row.', ...risk.safeguards.slice(0, 2)], estimatedMinutes: allocatedMinutes(weekBudget, 1) },
      { week: 4, focus: 'Pilot', outcome: input.constraints.teamMode === 'team' ? 'Run a controlled team handoff and record the release decision.' : 'Run a reversible solo trial and record the next decision.', activities: [systemBoundary, `Package the result for ${owner}.`, 'Record whether to stop, revise, or expand.'], estimatedMinutes: allocatedMinutes(weekBudget, 0.8) },
    ],
    firstStep,
    firstAction: formatFirstAction(firstStep),
    starterArtifact,
    evidenceProjectLinks: [
      { id: 'task-context', signal: `The intake describes a ${context.label} use case.`, interpretation: 'A bounded task can be tested before any broader rollout.', projectEffect: `The project starts with a ${sampleCount}-example ${context.label} benchmark.` },
      { id: 'experience-scope', signal: `${experienceLabel[experienceLevel]} is the supported starting level.`, interpretation: `The plan uses a ${persona} scope.`, projectEffect: `${sampleCount} examples and a ${firstStep.timeboxMinutes}-minute first step are assigned.` },
      { id: 'risk-boundary', signal: `${risk.level} risk with human approval set to ${input.risk.humanApproval}.`, interpretation: 'Review and failure behavior must be proven before expansion.', projectEffect: summary.riskBoundary },
      { id: 'time-budget', signal: `${hours} hours are available each week.`, interpretation: 'Work must fit the stated weekly capacity.', projectEffect: `Each week is capped at ${weekBudget} minutes and resources are assigned as short plan segments.` },
    ],
    domainPolicy,
    resources: [
      governedResource(primaryResourceId, `Practice the ${architecture.pattern.toLowerCase()} required by this use case.`, 1, resourceMinutes),
      governedResource(implementationResourceId, `Implement the prototype using the selected ${planProfile.buildMode.toLowerCase()} route.`, 2, resourceMinutes),
      governedResource(operationsResourceId, risk.level === 'low' ? 'Confirm the opportunity and reversible operating boundary.' : 'Rehearse review, failure, and release decisions before integration.', 3, resourceMinutes),
    ],
    planProfile,
    personalizationReasons: [
      { id: 'outcome-workflow', source: 'outcome, workflow and specification', detail: `The plan is bounded around ${compactText(input.outcome.desiredOutcome, 120)} and compares it with the stated current process.` },
      { id: 'experience', source: 'experience', detail: `${experienceLabel[experienceLevel]} determines whether the plan begins with a manual baseline or extends prior evidence.` },
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
  if (!input.evidence.supportedDomains.includes(domain) || !present(input.evidence.description, 30)) return 'none'
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

function capabilityDirections(input: CapabilityIntake): CapabilityDirection[] {
  return input.direction.interests
    .slice(0, 2)
    .map(interest => capabilityDirectionByInterest[interest])
    .filter((direction): direction is CapabilityDirection => Boolean(direction))
}

function hasPositiveEvidence(description: string): boolean {
  return present(description, 12) && !/^(?:i )?(?:have not|haven't|have not yet|haven't yet|not built|not tried|nothing yet)/i.test(description.trim())
}

function semanticCapabilityContext(input: CapabilityIntake, direction: CapabilityDirection): SemanticTaskContext {
  const directionFallback: Readonly<Record<string, TaskArchetype>> = {
    'automate-repeated-work': 'workflow-automation',
    'build-ai-tool': 'general-workflow',
    'improve-reliability': 'quality-evaluation',
    'discover-fit': 'opportunity-discovery',
    'everyday-work': 'general-workflow',
  }
  if (hasPositiveEvidence(input.evidence.description)) {
    const inferred = archetypeFromCorpus(input.evidence.description, directionFallback[direction.id] ?? 'general-workflow')
    const archetype = inferred === 'quality-evaluation' && direction.id !== 'improve-reliability'
      ? directionFallback[direction.id] ?? 'general-workflow'
      : inferred
    return semanticContext(archetype, 'evidence')
  }
  const roleArchetype = archetypeFromCorpus(input.direction.roleContext, directionFallback[direction.id] ?? 'general-workflow')
  return semanticContext(roleArchetype, roleArchetype === (directionFallback[direction.id] ?? 'general-workflow') ? 'fallback' : 'role')
}

function planPersonaForCapability(input: CapabilityIntake, highestAssessedLevel: ExperienceLevel): PlanPersona {
  if (isExecutiveRole(input.direction.roleContext)) return 'executive'
  if (experienceRank[highestAssessedLevel] >= experienceRank.demonstrated
    || (input.foundations.codingComfort === 'experienced' && experienceRank[highestAssessedLevel] >= experienceRank.independent)) return 'advanced'
  if (experienceRank[highestAssessedLevel] <= experienceRank.guided) return 'beginner'
  return 'practitioner'
}

function discoveryExamplesFor(input: CapabilityIntake, context: SemanticTaskContext): DiscoveryExample[] {
  const shared = { timeboxMinutes: 25, privacyBoundary: 'Use public, fictional, or sanitized material only.' }
  if (/student|educat|teach|learn/i.test(input.direction.roleContext)) {
    return [
      { id: 'reading-summary', title: 'Source-check one reading summary', input: 'One assigned reading', output: 'A five-point summary with page or section references', completionCheck: 'Every point is supported by the reading and one unsupported claim is removed.', ...shared },
      { id: 'rubric-revision', title: 'Revise one paragraph against a rubric', input: 'One paragraph and the course rubric', output: 'A revised paragraph with a change log', completionCheck: 'Every change maps to one rubric criterion and the student accepts or rejects it.', ...shared },
      { id: 'study-questions', title: 'Create and verify five study questions', input: 'One chapter or lecture note', output: 'Five questions with verified answers', completionCheck: 'Every answer is checked against the source and uncertainty is marked.', ...shared },
    ]
  }
  const baseInput = context.inputLabel
  return [
    { id: 'draft-test', title: `Test one ${context.label} draft`, input: baseInput, output: context.outputLabel, completionCheck: 'The result is compared with a human-created expectation and all differences are marked.', ...shared },
    { id: 'quality-test', title: `Score three ${context.label} examples`, input: `Three sanitized examples of ${baseInput}`, output: 'A simple useful/incorrect/uncertain scorecard', completionCheck: 'All three examples have an expected result and reviewer decision.', ...shared },
    { id: 'workflow-map', title: `Map the current ${context.label} workflow`, input: 'The current steps, owner, and common failure', output: 'A before-and-after workflow sketch', completionCheck: 'One AI-assisted step and one required human decision are clearly marked.', ...shared },
  ]
}

function summaryForCapability(context: SemanticTaskContext, persona: PlanPersona): PlanExecutiveSummary {
  return {
    recommendation: persona === 'advanced' ? `Harden an existing ${context.label} workflow.` : `Build one small ${context.label} proof point.`,
    reason: persona === 'beginner' ? 'A concrete, reviewable example will teach more than another broad course.' : 'The project converts current experience into evidence and a clear next decision.',
    owner: context.ownerLabel,
    riskBoundary: 'Do not expand the workflow until expected results, failures, and human review are documented.',
    decisionGate: persona === 'advanced' ? 'Release only after regression, authorization, observability, and rollback checks pass.' : 'Continue only when the sample rubric and reviewer decision show useful results.',
    checkpoint: persona === 'executive' ? 'Decision review at the end of week 1.' : 'Capability review at the end of week 4.',
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
  const confidence = highest >= experienceRank.adapted ? 'moderate' : 'limited'
  const directions = capabilityDirections(input)
  const direction = directions[0] ?? capabilityDirectionByInterest['everyday-work']
  const secondaryDirections = directions.slice(1)
  const persona = planPersonaForCapability(input, ranked[0].assessedLevel)
  const context = semanticCapabilityContext(input, direction)
  const buildMode = capabilityBuildMode(input)
  const planProfile = profileForCapability(input, strongest)
  const weeklyBudget = weeklyMinutes(input.constraints.weeklyHours ?? 1, input.constraints.pace)
  const reasoningHasEvaluation = /test|evaluat|measure|expected|example|rubric|quality|incorrect|failure/i.test(input.reasoning.response)
  const reasoningHasReview = /human|person|review|approve|escalat|uncertain/i.test(input.reasoning.response)
  const secondaryCapabilities = secondaryDirections.map(item => item.capability)
  const secondaryDeliverables = secondaryDirections.map(item => `Secondary objective: ${item.capability} — ${item.deliverables[0].toLowerCase()}.`)
  const sampleCount = sampleCountForPersona(persona, input.constraints.weeklyHours ?? 1)
  const starterArtifact = starterArtifactForContext(context, persona)
  const discoveryExamples = direction.id === 'discover-fit' ? discoveryExamplesFor(input, context) : []
  const selectedDiscoveryExample = discoveryExamples[0]
  const firstStep = selectedDiscoveryExample ? {
    task: selectedDiscoveryExample.title,
    inputs: [selectedDiscoveryExample.input],
    artifactId: starterArtifact.id,
    timeboxMinutes: selectedDiscoveryExample.timeboxMinutes,
    doneWhen: selectedDiscoveryExample.completionCheck,
  } : firstStepForContext(context, persona, starterArtifact, sampleCount)
  const summary = summaryForCapability(context, persona)
  const primaryDeliverables = direction.deliverables.map(item => item === 'A 50-example evaluation set'
    ? `A ${sampleCount}-example evaluation set`
    : item)
  const projectTitle = persona === 'advanced'
    ? `Harden an existing ${context.label} workflow`
    : `Create one ${context.label} proof point`
  const sharingDeliverable = input.constraints.publicProject === 'yes'
    ? 'A public-safe demo or case study with sensitive details removed'
    : input.constraints.publicProject === 'no'
      ? 'A private walkthrough and evidence pack for an approved reviewer'
      : 'A private evidence pack plus a later sharing decision'
  const toolConstraint = input.foundations.tools.length
    ? `Reuse familiar tools where suitable: ${[...new Set(input.foundations.tools)].sort((left, right) => left.localeCompare(right)).join(', ')}.`
    : 'Choose a tool only after the input, output, and evaluation contract are written.'
  const experienceStart = persona === 'beginner'
    ? 'Reproduce one small example manually before building the end-to-end project.'
    : persona === 'advanced'
      ? 'Audit the strongest existing artifact, preserve its evaluation set, and turn failures into a regression baseline.'
      : 'Turn the strongest existing attempt into a ten-example baseline before expanding it.'
  const primaryResourceId = persona === 'advanced'
    ? 'free-ai-school-operational-pilot-sprint'
    : direction.resourceId
  const modalityResourceId = persona === 'advanced'
    ? 'free-ai-school-context-evaluation-sprint'
    : input.constraints.resourceBudget === 'paid-ok' && input.constraints.learningPreference === 'guided'
    ? 'deeplearning-ai-generative-ai-for-everyone'
    : input.constraints.learningPreference === 'guided'
      ? 'free-ai-school-capability-decision-sprint'
      : input.foundations.codingComfort === 'none'
        ? 'free-ai-school-integration-design-sprint'
        : 'free-ai-school-context-evaluation-sprint'
  const evidenceResourceId = persona === 'advanced'
    ? 'free-ai-school-workflow-evidence-sprint'
    : secondaryDirections[0]?.resourceId ?? 'free-ai-school-workflow-evidence-sprint'
  const selectedResourceIds = [...new Set([primaryResourceId, modalityResourceId, evidenceResourceId])].slice(0, 3)
  const resourceMinutes = Math.max(15, Math.min(60, Math.floor((weeklyBudget * 0.25) / 15) * 15))
  const gapDomains = evidenceProfile.filter(item => item.assessedLevel === 'none').map(item => item.domain)
  const gapSummary = gapDomains.length
    ? `Evidence is still needed in ${gapDomains.slice(0, 2).map(domain => domainLabel[domain]).join(' and ')}${gapDomains.length > 2 ? ` plus ${gapDomains.length - 2} other area${gapDomains.length - 2 === 1 ? '' : 's'}` : ''}.`
    : 'Every capability area has at least some practical evidence; the next step is to deepen the weakest demonstrated area.'
  return deepFreeze({
    version: AI_PATH_DIAGNOSTIC_VERSION,
    policyVersion: AI_PATH_RESULT_POLICY_VERSION,
    kind: 'capability-prescription',
    persona,
    summary,
    title: `Your next capability: ${direction.capability}`,
    evidenceProfile,
    confidence,
    strongest,
    untested,
    nextCapability: direction.capability,
    project: {
      title: projectTitle,
      outcome: `${direction.outcome} Ground it in ${context.label}, using ${planProfile.dataMode.toLowerCase()} and a ${buildMode.toLowerCase()}.`,
      deliverables: [...primaryDeliverables, ...secondaryDeliverables, sharingDeliverable, toolConstraint],
    },
    definitionOfDone: [
      ...primaryDeliverables,
      ...secondaryDeliverables,
      reasoningHasEvaluation ? 'Preserve the proposed measurement method and results.' : 'Add expected examples and a quality rubric before accepting results.',
      reasoningHasReview ? 'Document the proposed human-review or escalation rule.' : 'Add a named human-review rule for uncertain or consequential outputs.',
      persona === 'advanced' ? 'Document at least five failures, authorization boundaries, observability signals, a release gate, and a rollback rule.' : 'Document at least three failures and the changes made in response.',
      sharingDeliverable,
    ],
    weeks: [
      { week: 1, focus: persona === 'advanced' ? 'Audit' : 'Baseline', outcome: input.constraints.learningPreference === 'guided' ? 'Follow one bounded example, then define the task and quality rubric.' : 'Define the task, representative examples, and quality rubric through the project.', activities: [experienceStart, `Choose examples for ${context.label}.`, `Complete the included ${starterArtifact.title}.`], estimatedMinutes: allocatedMinutes(weeklyBudget, input.constraints.pace === 'exploratory' ? 0.7 : 0.9) },
      { week: 2, focus: 'Build', outcome: `Create the smallest end-to-end version as a ${buildMode.toLowerCase()}.`, activities: [toolConstraint, planProfile.dataMode, ...secondaryDirections.slice(0, 1).map(item => `Include the secondary ${item.capability.toLowerCase()} objective without expanding the core workflow.`)], estimatedMinutes: allocatedMinutes(weeklyBudget, 1.1) },
      { week: 3, focus: 'Test', outcome: reasoningHasEvaluation ? 'Run the proposed evaluation, inspect failures, and tighten the review rule.' : 'Create the missing evaluation, inspect failures, and add human review.', activities: [persona === 'advanced' ? 'Run offline regression, authorization, abuse, latency, and cost checks; define online observability.' : 'Run the benchmark and label incorrect or uncertain results.', reasoningHasReview ? 'Test the stated review or escalation boundary.' : 'Name a reviewer and define when the workflow must escalate.', gapSummary], estimatedMinutes: allocatedMinutes(weeklyBudget, 1) },
      { week: 4, focus: input.constraints.publicProject === 'yes' ? 'Demonstrate' : 'Package', outcome: input.constraints.pace === 'longer' ? 'Package this first phase and choose the next capability for the longer program.' : 'Package the artifact, evidence, decisions, and limitations for reassessment.', activities: [sharingDeliverable, persona === 'advanced' ? 'Run the release gate and rehearse rollback before any broader use.' : `Explain the ${context.label} result to a practical reviewer.`, 'Record the next capability decision.'], estimatedMinutes: allocatedMinutes(weeklyBudget, input.constraints.pace === 'exploratory' ? 0.6 : 0.8) },
    ],
    firstStep,
    firstAction: formatFirstAction(firstStep),
    starterArtifact,
    evidenceProjectLinks: [
      { id: 'task-context', signal: context.source === 'evidence' ? `A concrete example supports ${context.label}.` : `The role and goal suggest ${context.label}.`, interpretation: context.source === 'evidence' ? 'The strongest practical example should anchor the project.' : 'No stronger practical example is established yet.', projectEffect: `The project and starter template focus on ${context.label}.` },
      { id: 'experience-scope', signal: `${strongest}`, interpretation: `The plan uses a ${persona} scope.`, projectEffect: `${sampleCount} examples and a ${firstStep.timeboxMinutes}-minute first step are assigned.` },
      { id: 'foundations-route', signal: `${input.foundations.codingComfort} coding and ${input.foundations.dataComfort} data comfort.`, interpretation: 'The build route should fit demonstrated foundations.', projectEffect: buildMode },
      { id: 'review-boundary', signal: reasoningHasReview ? 'The response includes a review or escalation boundary.' : 'The response does not yet name a review boundary.', interpretation: 'Uncertain or consequential outputs require a human decision.', projectEffect: summary.riskBoundary },
      { id: 'time-budget', signal: `${input.constraints.weeklyHours} hours are available each week.`, interpretation: 'The plan must fit stated capacity.', projectEffect: `Each week is capped at ${weeklyBudget} minutes and resources are assigned as short segments.` },
    ],
    resources: selectedResourceIds.map((id, index) => governedResource(id, index === 0 ? `Build the primary ${direction.capability.toLowerCase()} capability.` : index === 1 ? `Fit the ${input.constraints.learningPreference} learning preference and ${buildMode.toLowerCase()} route.` : secondaryDirections.length ? `Add the selected secondary capability: ${secondaryDirections[0].capability}.` : 'Turn practice into inspectable evidence.', (index + 1) as 1 | 2 | 3, resourceMinutes)),
    secondaryCapabilities,
    discoveryExamples,
    evidenceGap: { summary: gapSummary, domains: gapDomains },
    planProfile,
    personalizationReasons: [
      { id: 'role-goals', source: 'direction', detail: `${compactText(input.direction.roleContext, 100)} and ${directions.map(item => item.capability).join(' plus ')} determine the project context and objectives.` },
      { id: 'evidence-level', source: 'experience and evidence', detail: `${strongest}; ${persona} scope is based on supported domains, the evidence description, and ${present(input.evidence.artifactUrl) ? 'an inspectable artifact' : 'no inspectable artifact link'}.` },
      { id: 'reasoning', source: 'reasoning', detail: `The ${input.reasoning.scenarioId} response ${reasoningHasEvaluation ? 'already includes evaluation thinking' : 'needs an explicit evaluation method'} and ${reasoningHasReview ? 'includes a review boundary' : 'needs a review boundary'}.` },
      { id: 'foundations', source: 'foundations', detail: `${input.foundations.codingComfort === 'none' ? 'No' : input.foundations.codingComfort} coding and ${input.foundations.dataComfort} data experience set the ${buildMode.toLowerCase()} route; familiar tools are carried into the first prototype.` },
      { id: 'constraints', source: 'constraints', detail: `${input.constraints.weeklyHours} hours, ${input.constraints.learningPreference}, ${input.constraints.pace}, ${input.constraints.resourceBudget}, and ${input.constraints.publicProject} sharing determine workload, resource eligibility, and the final artifact.` },
    ],
    assumptions: [
      { id: 'suggested-task', detail: context.source === 'evidence'
        ? `We used ${context.label} as the project starting point because it was the clearest practical example; you can replace it with another recurring task.`
        : `No specific future task is established on this path, so the plan suggests ${context.label} from the stated work context; replace it with a better real task if needed.` },
      ...(!present(input.evidence.artifactUrl) ? [{ id: 'evidence-link', detail: 'No artifact link was supplied, so confidence is based on the described work and selected supported domains.' }] : []),
    ],
  })
}

export function composeDiagnosticResult(input: UseCaseIntake): UseCaseBlueprint | null
export function composeDiagnosticResult(input: CapabilityIntake): CapabilityPrescription | null
export function composeDiagnosticResult(input: UseCaseIntake | CapabilityIntake): UseCaseBlueprint | CapabilityPrescription | null {
  return input.path === 'use-case' ? composeUseCaseBlueprint(input) : composeCapabilityPrescription(input)
}
