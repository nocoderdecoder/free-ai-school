import {
  AI_PATH_DIAGNOSTIC_VERSION,
  type BuildApproach,
  type CapabilityDomain,
  type CapabilityIntake,
  type CodingComfort,
  type ConsequenceLevel,
  type DataSensitivity,
  type ExperienceLevel,
  type UseCaseIntake,
} from './diagnostic.ts'

export const AI_PATH_DIAGNOSTIC_MAXIMUM_BYTES = 32_768

type ParseResult =
  | { ok: true; value: UseCaseIntake | CapabilityIntake }
  | { ok: false; error: 'invalid_diagnostic'; details: readonly string[] }

const experienceLevels = new Set<ExperienceLevel>([
  'none', 'exposure', 'guided', 'adapted', 'independent', 'demonstrated', 'operational',
])
const capabilityDomains = [
  'ai-assisted-work', 'automation', 'applications', 'data-retrieval', 'evaluation-safety',
] as const satisfies readonly CapabilityDomain[]
const dataSensitivities = new Set<DataSensitivity>(['public', 'internal', 'confidential', 'regulated', 'unsure'])
const consequences = new Set<ConsequenceLevel>(['low', 'moderate', 'serious', 'critical'])
const codingComforts = new Set<CodingComfort>(['none', 'modify-examples', 'small-programs', 'experienced'])
const buildApproaches = new Set<BuildApproach>(['no-code-first', 'code-first', 'either'])

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function boundedText(value: unknown, maximum: number, minimum = 0): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length >= minimum && normalized.length <= maximum ? normalized : null
}

function optionalUrl(value: unknown): string | null {
  if (value === '') return ''
  const text = boundedText(value, 2_048)
  if (text === null) return null
  try {
    const url = new URL(text)
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

function enumValue<T extends string>(value: unknown, allowed: ReadonlySet<T>, allowEmpty = false): T | '' | null {
  if (allowEmpty && value === '') return ''
  return typeof value === 'string' && allowed.has(value as T) ? value as T : null
}

function integerOrNull(value: unknown, minimum: number, maximum: number) {
  return value === null || (Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum)
    ? value as number | null
    : undefined
}

function stringList(value: unknown, allowed: ReadonlySet<string> | null, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value) || value.length > maximumItems) return null
  const result: string[] = []
  for (const item of value) {
    const text = boundedText(item, maximumLength, 1)
    if (text === null || (allowed && !allowed.has(text))) return null
    if (!result.includes(text)) result.push(text)
  }
  return result
}

function invalid(...details: string[]): ParseResult {
  return { ok: false, error: 'invalid_diagnostic', details }
}

function parseUseCase(input: Record<string, unknown>): ParseResult {
  if (!exactKeys(input, ['version', 'path', 'outcome', 'workflow', 'specification', 'experience', 'risk', 'constraints'])) {
    return invalid('Unexpected or missing use-case fields.')
  }
  const outcome = input.outcome
  const workflow = input.workflow
  const specification = input.specification
  const experience = input.experience
  const risk = input.risk
  const constraints = input.constraints
  if (!record(outcome) || !record(workflow) || !record(specification)
    || !record(experience) || !record(risk) || !record(constraints)) {
    return invalid('Use-case sections must be objects.')
  }
  if (!exactKeys(outcome, ['desiredOutcome'])
    || !exactKeys(workflow, ['currentProcess'])
    || !exactKeys(specification, ['inputs', 'output', 'success'])
    || !exactKeys(experience, ['level', 'evidence', 'artifactUrl'])
    || !exactKeys(risk, ['dataSensitivity', 'existingSystems', 'consequence', 'humanApproval'])
    || !exactKeys(constraints, ['role', 'codingComfort', 'weeklyHours', 'approach', 'teamMode', 'budget'])) {
    return invalid('Unexpected or missing use-case section fields.')
  }

  const desiredOutcome = boundedText(outcome.desiredOutcome, 2_000)
  const currentProcess = boundedText(workflow.currentProcess, 3_000)
  const inputs = boundedText(specification.inputs, 1_500)
  const output = boundedText(specification.output, 1_500)
  const success = boundedText(specification.success, 1_500)
  const level = enumValue(experience.level, experienceLevels)
  const evidence = boundedText(experience.evidence, 3_000)
  const artifactUrl = optionalUrl(experience.artifactUrl)
  const dataSensitivity = enumValue(risk.dataSensitivity, dataSensitivities, true)
  const existingSystems = boundedText(risk.existingSystems, 1_500)
  const consequence = enumValue(risk.consequence, consequences, true)
  const humanApproval = enumValue(risk.humanApproval, new Set(['yes', 'no', 'unsure']), true)
  const role = boundedText(constraints.role, 500)
  const codingComfort = enumValue(constraints.codingComfort, codingComforts, true)
  const weeklyHours = integerOrNull(constraints.weeklyHours, 1, 40)
  const approach = enumValue(constraints.approach, buildApproaches, true)
  const teamMode = enumValue(constraints.teamMode, new Set(['solo', 'team']), true)
  const budget = enumValue(constraints.budget, new Set(['free-only', 'low-cost-ok', 'organisation-decides']), true)
  if ([desiredOutcome, currentProcess, inputs, output, success, level, evidence, artifactUrl, dataSensitivity,
    existingSystems, consequence, humanApproval, role, codingComfort, weeklyHours, approach, teamMode, budget]
    .some(value => value === null || value === undefined)) return invalid('One or more use-case values are invalid or too long.')

  return { ok: true, value: {
    version: AI_PATH_DIAGNOSTIC_VERSION,
    path: 'use-case',
    outcome: { desiredOutcome: desiredOutcome! },
    workflow: { currentProcess: currentProcess! },
    specification: { inputs: inputs!, output: output!, success: success! },
    experience: { level: level as ExperienceLevel, evidence: evidence!, artifactUrl: artifactUrl! },
    risk: {
      dataSensitivity: dataSensitivity as DataSensitivity | '',
      existingSystems: existingSystems!,
      consequence: consequence as ConsequenceLevel | '',
      humanApproval: humanApproval as 'yes' | 'no' | 'unsure' | '',
    },
    constraints: {
      role: role!, codingComfort: codingComfort as CodingComfort | '', weeklyHours: weeklyHours!,
      approach: approach as BuildApproach | '', teamMode: teamMode as 'solo' | 'team' | '',
      budget: budget as 'free-only' | 'low-cost-ok' | 'organisation-decides' | '',
    },
  } }
}

function parseCapability(input: Record<string, unknown>): ParseResult {
  if (!exactKeys(input, ['version', 'path', 'direction', 'experience', 'evidence', 'reasoning', 'foundations', 'constraints'])) {
    return invalid('Unexpected or missing capability fields.')
  }
  const direction = input.direction
  const experience = input.experience
  const evidence = input.evidence
  const reasoning = input.reasoning
  const foundations = input.foundations
  const constraints = input.constraints
  if (!record(direction) || !record(experience) || !record(evidence)
    || !record(reasoning) || !record(foundations) || !record(constraints)) {
    return invalid('Capability sections must be objects.')
  }
  if (!exactKeys(direction, ['roleContext', 'interests'])
    || !exactKeys(experience, ['levels'])
    || !exactKeys(evidence, ['description', 'supportedDomains', 'artifactUrl'])
    || !exactKeys(reasoning, ['scenarioId', 'response'])
    || !exactKeys(foundations, ['codingComfort', 'dataComfort', 'tools'])
    || !exactKeys(constraints, ['weeklyHours', 'learningPreference', 'pace', 'resourceBudget', 'publicProject'])) {
    return invalid('Unexpected or missing capability section fields.')
  }
  const experienceLevelsInput = experience.levels
  if (!record(experienceLevelsInput) || !exactKeys(experienceLevelsInput, capabilityDomains)) {
    return invalid('Every capability level is required exactly once.')
  }

  const roleContext = boundedText(direction.roleContext, 500)
  const interests = stringList(direction.interests, new Set(['everyday-work', 'automate-repeated-work', 'build-ai-tool', 'improve-reliability', 'discover-fit']), 2, 64)
  const levels = Object.fromEntries(capabilityDomains.map(domain => [domain, enumValue(experienceLevelsInput[domain], experienceLevels)])) as Record<CapabilityDomain, ExperienceLevel | null>
  const description = boundedText(evidence.description, 3_000)
  const supportedDomains = stringList(evidence.supportedDomains, new Set(capabilityDomains), capabilityDomains.length, 64)
  const artifactUrl = optionalUrl(evidence.artifactUrl)
  const scenarioId = boundedText(reasoning.scenarioId, 100)
  const response = boundedText(reasoning.response, 3_000)
  const codingComfort = enumValue(foundations.codingComfort, codingComforts, true)
  const dataComfort = enumValue(foundations.dataComfort, new Set(['documents', 'spreadsheets', 'queries', 'pipelines']), true)
  const tools = stringList(foundations.tools, null, 12, 100)
  const weeklyHours = integerOrNull(constraints.weeklyHours, 1, 40)
  const learningPreference = enumValue(constraints.learningPreference, new Set(['guided', 'projects', 'balanced']), true)
  const pace = enumValue(constraints.pace, new Set(['exploratory', '30-day', 'longer']), true)
  const resourceBudget = enumValue(constraints.resourceBudget, new Set(['free-only', 'paid-ok']), true)
  const publicProject = enumValue(constraints.publicProject, new Set(['yes', 'no', 'unsure']), true)
  if ([roleContext, interests, ...Object.values(levels), description, supportedDomains, artifactUrl, scenarioId,
    response, codingComfort, dataComfort, tools, weeklyHours, learningPreference, pace, resourceBudget, publicProject]
    .some(value => value === null || value === undefined)) return invalid('One or more capability values are invalid or too long.')

  return { ok: true, value: {
    version: AI_PATH_DIAGNOSTIC_VERSION,
    path: 'capability-growth',
    direction: { roleContext: roleContext!, interests: interests! },
    experience: { levels: levels as Record<CapabilityDomain, ExperienceLevel> },
    evidence: { description: description!, supportedDomains: supportedDomains as CapabilityDomain[], artifactUrl: artifactUrl! },
    reasoning: { scenarioId: scenarioId!, response: response! },
    foundations: {
      codingComfort: codingComfort as CodingComfort | '',
      dataComfort: dataComfort as 'documents' | 'spreadsheets' | 'queries' | 'pipelines' | '',
      tools: tools!,
    },
    constraints: {
      weeklyHours: weeklyHours!,
      learningPreference: learningPreference as 'guided' | 'projects' | 'balanced' | '',
      pace: pace as 'exploratory' | '30-day' | 'longer' | '',
      resourceBudget: resourceBudget as 'free-only' | 'paid-ok' | '',
      publicProject: publicProject as 'yes' | 'no' | 'unsure' | '',
    },
  } }
}

export function parseDiagnosticIntake(value: unknown): ParseResult {
  if (!record(value) || value.version !== AI_PATH_DIAGNOSTIC_VERSION) return invalid('Unsupported diagnostic version.')
  if (value.path === 'use-case') return parseUseCase(value)
  if (value.path === 'capability-growth') return parseCapability(value)
  return invalid('Unsupported diagnostic path.')
}
