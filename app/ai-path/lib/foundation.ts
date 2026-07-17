import { selectPublishedCatalogResources } from '../catalog/production.mjs'
import { isAiPathGoalType, type AiPathGoalType } from './goal-type.ts'

export const AI_PATH_TAXONOMY_VERSION = '2026-07-16.v1' as const
export const AI_PATH_SCORING_VERSION = '2026-07-16.v1' as const
export const AI_PATH_REPORT_VERSION = '2026-07-16.v1' as const
export const AI_PATH_CATALOG_VERSION = '2026-07-17.v2' as const
export const AI_PATH_CONSENT_VERSION = '2026-07-16.v1' as const
export const AI_PATH_VOICE_CONSENT_VERSION = '2026-07-17.voice.v1' as const

export const AI_PATH_SKILL_IDS = [
  'foundations',
  'prompt-context',
  'workflow-design',
  'data-retrieval',
  'coding-apis',
  'agents-tools',
  'evaluation-reliability',
  'deployment-operations',
  'safety-governance',
] as const

export type SkillId = (typeof AI_PATH_SKILL_IDS)[number]
export type SkillLevel = 0 | 1 | 2 | 3 | 4
export type Confidence = 'low' | 'medium' | 'high'
export type EvidenceStrength = 'weak' | 'moderate' | 'strong'
export type Independence = 'observed' | 'guided' | 'independent' | 'owner'
export type SessionMode = 'voice' | 'text'
export type SessionStatus =
  | 'created'
  | 'consented'
  | 'connecting'
  | 'active'
  | 'ending'
  | 'analysis_pending'
  | 'complete'
  | 'failed'
  | 'expired'

export type SkillDefinition = {
  id: SkillId
  name: string
  description: string
  levels: Record<SkillLevel, string>
}

const level = (
  none: string,
  awareness: string,
  applied: string,
  shipped: string,
  operational: string
): Record<SkillLevel, string> => ({
  0: none,
  1: awareness,
  2: applied,
  3: shipped,
  4: operational,
})

export const AI_PATH_TAXONOMY: readonly SkillDefinition[] = [
  {
    id: 'foundations',
    name: 'AI foundations',
    description: 'Understands model capabilities, limitations, and appropriate problem framing.',
    levels: level(
      'No reliable evidence collected.',
      'Can describe common AI capabilities and limitations.',
      'Chooses suitable model patterns for bounded tasks.',
      'Applies foundation knowledge in a shipped workflow.',
      'Guides system-level tradeoffs and teaches others.'
    ),
  },
  {
    id: 'prompt-context',
    name: 'Prompt and context design',
    description: 'Designs instructions, examples, context, and output contracts for reliable behavior.',
    levels: level(
      'No reliable evidence collected.',
      'Uses clear task instructions and basic examples.',
      'Builds repeatable prompts with context and output constraints.',
      'Maintains tested prompt contracts in a real workflow.',
      'Designs reusable context systems and governance.'
    ),
  },
  {
    id: 'workflow-design',
    name: 'Workflow design',
    description: 'Decomposes a domain workflow into inputs, decisions, outputs, and human checkpoints.',
    levels: level(
      'No reliable evidence collected.',
      'Identifies a useful task for AI assistance.',
      'Maps a bounded workflow with inputs and outputs.',
      'Ships a workflow with human review and failure handling.',
      'Optimizes a portfolio of workflows using outcome data.'
    ),
  },
  {
    id: 'data-retrieval',
    name: 'Data and retrieval',
    description: 'Prepares data and grounds model behavior in relevant, permissioned sources.',
    levels: level(
      'No reliable evidence collected.',
      'Recognizes when proprietary context is needed.',
      'Builds a simple grounded or retrieval-assisted flow.',
      'Evaluates retrieval quality and handles permissions in production.',
      'Operates retrieval architecture, quality, and data lifecycle controls.'
    ),
  },
  {
    id: 'coding-apis',
    name: 'Coding and API integration',
    description: 'Builds, debugs, and integrates model-backed software using APIs and structured data.',
    levels: level(
      'No reliable evidence collected.',
      'Can modify a guided example or no-code integration.',
      'Builds a bounded API integration independently.',
      'Ships and debugs an application with production constraints.',
      'Designs maintainable integration architecture and developer standards.'
    ),
  },
  {
    id: 'agents-tools',
    name: 'Agents and tool use',
    description: 'Designs constrained tool-using systems with clear authority and recovery behavior.',
    levels: level(
      'No reliable evidence collected.',
      'Can explain when tool use or an agent may help.',
      'Builds a bounded tool-calling flow with validation.',
      'Ships an agent with permissions, recovery, and observability.',
      'Designs multi-step agent architecture and governance.'
    ),
  },
  {
    id: 'evaluation-reliability',
    name: 'Evaluation and reliability',
    description: 'Defines quality, tests outputs, diagnoses failures, and prevents regressions.',
    levels: level(
      'No reliable evidence collected.',
      'Reviews outputs manually against a stated goal.',
      'Uses examples, rubrics, or metrics to compare quality.',
      'Runs repeatable evaluations and release gates.',
      'Operates an evaluation program with monitoring and incident learning.'
    ),
  },
  {
    id: 'deployment-operations',
    name: 'Deployment and operations',
    description: 'Deploys, observes, budgets, and maintains AI-backed systems.',
    levels: level(
      'No reliable evidence collected.',
      'Understands basic deployment and latency concerns.',
      'Deploys a bounded application with logging.',
      'Operates reliability, cost, and rollback controls.',
      'Owns service-level architecture and operational standards.'
    ),
  },
  {
    id: 'safety-governance',
    name: 'Safety and governance',
    description: 'Manages privacy, security, misuse, human oversight, and responsible deployment.',
    levels: level(
      'No reliable evidence collected.',
      'Recognizes basic privacy and hallucination risks.',
      'Adds bounded safeguards and human review.',
      'Ships permission, privacy, and abuse controls with testing.',
      'Defines governance, audit, and risk-management standards.'
    ),
  },
] as const

const skillIdSet = new Set<string>(AI_PATH_SKILL_IDS)

export type EvidenceRecord = {
  id: string
  skillId: SkillId
  observedLevel: SkillLevel
  strength: EvidenceStrength
  independence: Independence
  sourceTurnIds: string[]
  quote: string
  speaker: 'user'
  source: 'voice-transcript' | 'typed-response'
  artifact?: string
  outcome?: string
  recencyMonths?: number
  contradiction?: boolean
}

export type SkillResult = {
  skillId: SkillId
  status: 'assessed' | 'not_assessed'
  level: SkillLevel | null
  confidence: Confidence
  evidenceIds: string[]
  contradictionIds: string[]
  evidenceReferences: Array<{
    id: string
    quote: string
    sourceTurnIds: string[]
    observedLevel: SkillLevel
    strength: EvidenceStrength
    contradiction: boolean
  }>
  rationale: string
}

export type ResourceFormat = 'reading' | 'course' | 'project' | 'reference'

export type CatalogResource = {
  id: string
  title: string
  provider: string
  canonicalUrl: string | null
  format: ResourceFormat
  free: boolean
  costDisclosure: string
  estimatedHours: number
  quality: number
  skills: Array<{ skillId: SkillId; entryLevel: SkillLevel; exitLevel: SkillLevel }>
  prerequisites: Array<{ skillId: SkillId; minimumLevel: SkillLevel }>
  codingRequirement: 'none' | 'optional' | 'required'
  accountRequirement: 'none' | 'required'
  paidServiceRequirement: 'none' | 'optional' | 'required'
  deferredForGoalTypes: AiPathGoalType[]
  reason: string
}

export type RankedRecommendation = CatalogResource & {
  rank: number
  score: number
  matchedSkillIds: SkillId[]
}

/** @deprecated Migration reference only. buildAssessmentReport cannot access this array. */
export const LEGACY_CURATED_RESOURCES: readonly Omit<
  CatalogResource,
  'costDisclosure' | 'codingRequirement' | 'accountRequirement' | 'paidServiceRequirement' | 'deferredForGoalTypes'
>[] = [
  {
    id: 'google-ml-crash-course',
    title: 'Machine Learning Crash Course',
    provider: 'Google for Developers',
    canonicalUrl: 'https://developers.google.com/machine-learning/crash-course',
    format: 'course',
    free: true,
    estimatedHours: 12,
    quality: 0.93,
    skills: [{ skillId: 'foundations', entryLevel: 0, exitLevel: 2 }],
    prerequisites: [],
    reason: 'Build model and evaluation foundations through an alternative provider perspective.',
  },
  {
    id: 'openai-academy-foundations',
    title: 'OpenAI Academy',
    provider: 'OpenAI',
    canonicalUrl: 'https://academy.openai.com/',
    format: 'course',
    free: true,
    estimatedHours: 3,
    quality: 0.9,
    skills: [
      { skillId: 'foundations', entryLevel: 0, exitLevel: 2 },
      { skillId: 'workflow-design', entryLevel: 0, exitLevel: 1 },
    ],
    prerequisites: [],
    reason: 'Build broad foundations before specializing in implementation details.',
  },
  {
    id: 'openai-api-quickstart',
    title: 'OpenAI API quickstart',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/quickstart',
    format: 'reading',
    free: true,
    estimatedHours: 2,
    quality: 0.92,
    skills: [
      { skillId: 'coding-apis', entryLevel: 1, exitLevel: 2 },
      { skillId: 'prompt-context', entryLevel: 1, exitLevel: 2 },
    ],
    prerequisites: [{ skillId: 'foundations', minimumLevel: 1 }],
    reason: 'Turn conceptual understanding into a small, inspectable API integration.',
  },
  {
    id: 'openai-function-calling',
    title: 'Function calling guide',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/guides/function-calling',
    format: 'reference',
    free: true,
    estimatedHours: 3,
    quality: 0.94,
    skills: [
      { skillId: 'agents-tools', entryLevel: 1, exitLevel: 3 },
      { skillId: 'coding-apis', entryLevel: 2, exitLevel: 3 },
    ],
    prerequisites: [{ skillId: 'coding-apis', minimumLevel: 2 }],
    reason: 'Practice constrained tool use with explicit schemas and application-owned execution.',
  },
  {
    id: 'openai-retrieval-guide',
    title: 'Retrieval guide',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/guides/retrieval',
    format: 'reference',
    free: true,
    estimatedHours: 3,
    quality: 0.91,
    skills: [{ skillId: 'data-retrieval', entryLevel: 1, exitLevel: 3 }],
    prerequisites: [{ skillId: 'coding-apis', minimumLevel: 1 }],
    reason: 'Learn how to ground answers in selected sources rather than model memory alone.',
  },
  {
    id: 'openai-evals-guide',
    title: 'Evals guide',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/guides/evals',
    format: 'reference',
    free: true,
    estimatedHours: 4,
    quality: 0.96,
    skills: [{ skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 3 }],
    prerequisites: [{ skillId: 'prompt-context', minimumLevel: 1 }],
    reason: 'Convert subjective output review into repeatable test cases and release criteria.',
  },
  {
    id: 'openai-production-best-practices',
    title: 'Production best practices',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/guides/production-best-practices',
    format: 'reference',
    free: true,
    estimatedHours: 3,
    quality: 0.9,
    skills: [{ skillId: 'deployment-operations', entryLevel: 1, exitLevel: 3 }],
    prerequisites: [{ skillId: 'coding-apis', minimumLevel: 2 }],
    reason: 'Add operational controls after a bounded integration works locally.',
  },
  {
    id: 'openai-safety-best-practices',
    title: 'Safety best practices',
    provider: 'OpenAI',
    canonicalUrl: 'https://developers.openai.com/api/docs/guides/safety-best-practices',
    format: 'reference',
    free: true,
    estimatedHours: 2,
    quality: 0.94,
    skills: [{ skillId: 'safety-governance', entryLevel: 0, exitLevel: 3 }],
    prerequisites: [],
    reason: 'Add privacy, misuse, and human-oversight controls to the workflow design.',
  },
  {
    id: 'owasp-llm-prompt-injection',
    title: 'LLM Prompt Injection Prevention Cheat Sheet',
    provider: 'OWASP',
    canonicalUrl: 'https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html',
    format: 'reference',
    free: true,
    estimatedHours: 2,
    quality: 0.97,
    skills: [
      { skillId: 'safety-governance', entryLevel: 1, exitLevel: 3 },
      { skillId: 'agents-tools', entryLevel: 1, exitLevel: 2 },
    ],
    prerequisites: [],
    reason: 'Use a vendor-neutral security reference to test injection and tool-abuse boundaries.',
  },
  {
    id: 'deeplearning-ai-generative-ai-for-everyone',
    title: 'Generative AI for Everyone',
    provider: 'DeepLearning.AI',
    canonicalUrl: 'https://www.deeplearning.ai/courses/generative-ai-for-everyone/',
    format: 'course',
    free: true,
    estimatedHours: 6,
    quality: 0.91,
    skills: [
      { skillId: 'foundations', entryLevel: 0, exitLevel: 2 },
      { skillId: 'workflow-design', entryLevel: 0, exitLevel: 2 },
    ],
    prerequisites: [],
    reason: 'Develop a practical, non-coding view of capability, limits, and workflow selection.',
  },
  {
    id: 'project-evidence-sprint',
    title: 'AI workflow evidence sprint',
    provider: 'Free AI School',
    canonicalUrl: null,
    format: 'project',
    free: true,
    estimatedHours: 6,
    quality: 0.88,
    skills: [
      { skillId: 'workflow-design', entryLevel: 1, exitLevel: 3 },
      { skillId: 'evaluation-reliability', entryLevel: 1, exitLevel: 2 },
    ],
    prerequisites: [{ skillId: 'foundations', minimumLevel: 1 }],
    reason: 'Produce a real workflow artifact, a small test set, and evidence of an outcome.',
  },
] as const

type ValidationSuccess<T> = { ok: true; value: T }
type ValidationFailure = { ok: false; errors: string[] }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function boundedString(value: unknown, minimum: number, maximum: number): string | null {
  if (typeof value !== 'string') return null
  const result = value.trim()
  return result.length >= minimum && result.length <= maximum ? result : null
}

function isSkillLevel(value: unknown): value is SkillLevel {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 4
}

export function parseEvidenceRecords(value: unknown): ValidationResult<EvidenceRecord[]> {
  if (!Array.isArray(value) || value.length > 100) {
    return { ok: false, errors: ['evidence must be an array with at most 100 items'] }
  }

  const evidence: EvidenceRecord[] = []
  const errors: string[] = []
  const seenIds = new Set<string>()

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`evidence[${index}] must be an object`)
      return
    }

    const id = boundedString(item.id, 1, 100)
    const skillId = typeof item.skillId === 'string' && skillIdSet.has(item.skillId)
      ? item.skillId as SkillId
      : null
    const observedLevel = isSkillLevel(item.observedLevel) ? item.observedLevel : null
    const strength = ['weak', 'moderate', 'strong'].includes(String(item.strength))
      ? item.strength as EvidenceStrength
      : null
    const independence = ['observed', 'guided', 'independent', 'owner'].includes(String(item.independence))
      ? item.independence as Independence
      : null
    const sourceTurnIds = Array.isArray(item.sourceTurnIds)
      ? item.sourceTurnIds.map(value => boundedString(value, 1, 100)).filter((turn): turn is string => Boolean(turn))
      : []
    const quote = boundedString(item.quote, 1, 1200)
    const speaker = item.speaker === 'user' ? 'user' as const : null
    const source = item.source === 'voice-transcript' || item.source === 'typed-response'
      ? item.source
      : null

    if (!id) errors.push(`evidence[${index}].id is invalid`)
    else if (seenIds.has(id)) errors.push(`evidence[${index}].id is duplicated`)
    if (!skillId) errors.push(`evidence[${index}].skillId is unknown`)
    if (observedLevel === null) errors.push(`evidence[${index}].observedLevel must be 0-4`)
    if (!strength) errors.push(`evidence[${index}].strength is invalid`)
    if (!independence) errors.push(`evidence[${index}].independence is invalid`)
    if (sourceTurnIds.length === 0 || sourceTurnIds.length > 12) {
      errors.push(`evidence[${index}].sourceTurnIds must contain 1-12 valid IDs`)
    }
    if (!quote) errors.push(`evidence[${index}].quote is required`)
    if (!speaker) errors.push(`evidence[${index}].speaker must be user`)
    if (!source) errors.push(`evidence[${index}].source is invalid`)

    const recencyMonths = item.recencyMonths === undefined
      ? undefined
      : Number.isInteger(item.recencyMonths) && Number(item.recencyMonths) >= 0 && Number(item.recencyMonths) <= 240
        ? Number(item.recencyMonths)
        : null
    if (recencyMonths === null) errors.push(`evidence[${index}].recencyMonths is invalid`)

    if (!id || !skillId || observedLevel === null || !strength || !independence || sourceTurnIds.length === 0 || !quote || !speaker || !source || recencyMonths === null) {
      return
    }

    seenIds.add(id)
    evidence.push({
      id,
      skillId,
      observedLevel,
      strength,
      independence,
      sourceTurnIds,
      quote,
      speaker,
      source,
      artifact: boundedString(item.artifact, 1, 300) ?? undefined,
      outcome: boundedString(item.outcome, 1, 300) ?? undefined,
      recencyMonths,
      contradiction: item.contradiction === true,
    })
  })

  return errors.length ? { ok: false, errors } : { ok: true, value: evidence }
}

const strengthPoints: Record<EvidenceStrength, number> = { weak: 1, moderate: 2, strong: 3 }
const independencePoints: Record<Independence, number> = { observed: 0, guided: 0.25, independent: 0.75, owner: 1 }

function evidencePoints(item: EvidenceRecord): number {
  const artifactBonus = item.artifact ? 0.5 : 0
  const outcomeBonus = item.outcome ? 0.5 : 0
  const recencyPenalty = item.recencyMonths !== undefined && item.recencyMonths > 36 ? 0.5 : 0
  return Math.max(0, strengthPoints[item.strength] + independencePoints[item.independence] + artifactBonus + outcomeBonus - recencyPenalty)
}

const levelRequirements: Record<SkillLevel, { points: number; count: number; strong: number; owner: number }> = {
  0: { points: 0, count: 0, strong: 0, owner: 0 },
  1: { points: 1, count: 1, strong: 0, owner: 0 },
  2: { points: 3, count: 1, strong: 0, owner: 0 },
  3: { points: 6, count: 2, strong: 1, owner: 0 },
  4: { points: 9, count: 2, strong: 2, owner: 1 },
}

function achievedLevel(items: EvidenceRecord[]): SkillLevel {
  for (let candidate = 4 as SkillLevel; candidate >= 1; candidate = (candidate - 1) as SkillLevel) {
    const eligible = items.filter(item => item.observedLevel >= candidate)
    const requirements = levelRequirements[candidate]
    if (
      eligible.length >= requirements.count &&
      eligible.reduce((sum, item) => sum + evidencePoints(item), 0) >= requirements.points &&
      eligible.filter(item => item.strength === 'strong').length >= requirements.strong &&
      eligible.filter(item => item.independence === 'owner').length >= requirements.owner
    ) return candidate
  }
  return items.length ? 1 : 0
}

export function scoreSkills(evidence: readonly EvidenceRecord[]): SkillResult[] {
  return AI_PATH_SKILL_IDS.map(skillId => {
    const items = evidence.filter(item => item.skillId === skillId)
    const supporting = items.filter(item => !item.contradiction)
    const contradictions = items.filter(item => item.contradiction)
    const evidenceReferences = items.map(item => ({
      id: item.id,
      quote: item.quote,
      sourceTurnIds: [...item.sourceTurnIds],
      observedLevel: item.observedLevel,
      strength: item.strength,
      contradiction: item.contradiction === true,
    }))
    if (supporting.length === 0) {
      return {
        skillId,
        status: 'not_assessed',
        level: null,
        confidence: 'low',
        evidenceIds: [],
        contradictionIds: contradictions.map(item => item.id),
        evidenceReferences,
        rationale: contradictions.length
          ? 'Only contradictory or experience-denial evidence was collected; this remains not assessed rather than becoming a zero score.'
          : 'No evidence was collected; this is not a zero score.',
      }
    }

    let assessedLevel = achievedLevel(supporting)
    if (contradictions.some(item => item.observedLevel >= assessedLevel) && assessedLevel > 0) {
      assessedLevel = (assessedLevel - 1) as SkillLevel
    }

    if (assessedLevel === 0 && contradictions.length > 0) {
      return {
        skillId,
        status: 'not_assessed',
        level: null,
        confidence: 'low',
        evidenceIds: supporting.map(item => item.id),
        contradictionIds: contradictions.map(item => item.id),
        evidenceReferences,
        rationale: 'The available supporting claim was directly contradicted, so this remains not assessed rather than becoming a zero score.',
      }
    }

    const totalPoints = supporting.reduce((sum, item) => sum + evidencePoints(item), 0)
    const sourceCount = new Set(supporting.flatMap(item => item.sourceTurnIds)).size
    const confidence: Confidence = contradictions.length > 0
      ? 'low'
      : supporting.length >= 2 && sourceCount >= 2 && totalPoints >= 7
        ? 'high'
        : totalPoints >= 3
          ? 'medium'
          : 'low'

    return {
      skillId,
      status: 'assessed',
      level: assessedLevel,
      confidence,
      evidenceIds: supporting.map(item => item.id),
      contradictionIds: contradictions.map(item => item.id),
      evidenceReferences,
      rationale: contradictions.length
        ? 'Supporting and contradictory evidence were both found, so the level or confidence was reduced.'
        : `Level ${assessedLevel} is supported by ${supporting.length} evidence item${supporting.length === 1 ? '' : 's'}.`,
    }
  })
}

export type RecommendationPreferences = {
  targetLevels: Partial<Record<SkillId, SkillLevel>>
  timeBudgetHours: number
  freeOnly?: boolean
  formats?: ResourceFormat[]
  limit?: number
  codingPreference?: 'no-code' | 'light-code' | 'code-ready'
  accessPreference?: 'open-only' | 'account-ok'
  allowPaidServiceExercise?: boolean
  goalType?: AiPathGoalType
}

function currentLevel(results: readonly SkillResult[], skillId: SkillId): SkillLevel {
  return results.find(result => result.skillId === skillId)?.level ?? 0
}

export function rankRecommendations(
  results: readonly SkillResult[],
  preferences: RecommendationPreferences,
  resources: readonly CatalogResource[]
): RankedRecommendation[] {
  const budget = Math.max(1, Math.min(80, Math.floor(preferences.timeBudgetHours)))
  const limit = Math.max(1, Math.min(6, preferences.limit ?? 4))
  const allowedFormats = preferences.formats?.length ? new Set(preferences.formats) : null

  return resources
    .filter(resource => !preferences.freeOnly || resource.free)
    .filter(resource => !allowedFormats || allowedFormats.has(resource.format))
    .filter(resource => resource.estimatedHours <= budget)
    .filter(resource => preferences.codingPreference !== 'no-code' || resource.codingRequirement === 'none')
    .filter(resource => preferences.codingPreference !== 'light-code' || resource.codingRequirement !== 'required')
    .filter(resource => preferences.accessPreference !== 'open-only' || resource.accountRequirement === 'none')
    .filter(resource => preferences.allowPaidServiceExercise === true || resource.paidServiceRequirement === 'none')
    .filter(resource => !preferences.goalType || !resource.deferredForGoalTypes.includes(preferences.goalType))
    .filter(resource => resource.prerequisites.every(prerequisite =>
      currentLevel(results, prerequisite.skillId) >= prerequisite.minimumLevel
    ))
    .map(resource => {
      const matchedSkillIds = resource.skills
        .filter(mapping => {
          const target = preferences.targetLevels[mapping.skillId]
          if (target === undefined) return false
          const current = currentLevel(results, mapping.skillId)
          return current < target && current <= mapping.exitLevel
        })
        .map(mapping => mapping.skillId)

      const gapScore = matchedSkillIds.reduce((sum, skillId) => {
        const target = preferences.targetLevels[skillId] ?? 0
        return sum + Math.max(0, target - currentLevel(results, skillId)) * 100
      }, 0)
      const timeFit = Math.max(0, 20 - Math.abs(budget / Math.max(1, limit) - resource.estimatedHours) * 2)
      const score = gapScore + resource.quality * 20 + timeFit + (resource.free ? 5 : 0)
      return { resource, matchedSkillIds, score }
    })
    .filter(candidate => candidate.matchedSkillIds.length > 0)
    .sort((left, right) => right.score - left.score || left.resource.id.localeCompare(right.resource.id))
    .slice(0, limit)
    .map((candidate, index) => ({
      ...candidate.resource,
      matchedSkillIds: candidate.matchedSkillIds,
      score: Number(candidate.score.toFixed(2)),
      rank: index + 1,
    }))
}

export type SessionStartInput = {
  consentVersion: string
  locale: string
  mode: SessionMode
  goal: string
  goalType: AiPathGoalType
  targetRole?: string
  saveTranscript: boolean
}

export function parseSessionStartInput(value: unknown): ValidationResult<SessionStartInput> {
  if (!isRecord(value)) return { ok: false, errors: ['body must be an object'] }
  const errors: string[] = []
  const consentVersion = boundedString(value.consentVersion, 1, 40)
  const locale = boundedString(value.locale, 2, 20)
  const mode = value.mode === 'voice' || value.mode === 'text' ? value.mode : null
  const goal = boundedString(value.goal, 20, 1200)
  const goalType = isAiPathGoalType(value.goalType) ? value.goalType : null
  const targetRole = value.targetRole === undefined ? undefined : boundedString(value.targetRole, 1, 160)
  const saveTranscript = value.saveTranscript === true

  const expectedConsentVersion = mode === 'voice'
    ? AI_PATH_VOICE_CONSENT_VERSION
    : AI_PATH_CONSENT_VERSION
  if (!consentVersion) errors.push('consentVersion is required')
  else if (consentVersion !== expectedConsentVersion) errors.push(`consentVersion must be ${expectedConsentVersion}`)
  if (!locale) errors.push('locale is invalid')
  if (!mode) errors.push('mode must be voice or text')
  if (!goal) errors.push('goal must contain 20-1200 characters')
  if (!goalType) errors.push('goalType is invalid')
  if (value.targetRole !== undefined && !targetRole) errors.push('targetRole is invalid')
  if (typeof value.saveTranscript !== 'boolean') errors.push('saveTranscript must be boolean')

  if (errors.length || !consentVersion || !locale || !mode || !goal || !goalType) return { ok: false, errors }
  return { ok: true, value: { consentVersion, locale, mode, goal, goalType, targetRole: targetRole ?? undefined, saveTranscript } }
}

export type TranscriptTurn = {
  id: string
  speaker: 'user' | 'assistant'
  source: 'voice-transcript' | 'typed-response' | 'agent-response'
  text: string
}

export function parseTranscriptTurns(value: unknown): ValidationResult<TranscriptTurn[]> {
  if (!Array.isArray(value) || value.length > 200) {
    return { ok: false, errors: ['transcriptTurns must be an array with at most 200 items'] }
  }
  const turns: TranscriptTurn[] = []
  const errors: string[] = []
  const ids = new Set<string>()
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`transcriptTurns[${index}] must be an object`)
      return
    }
    const id = boundedString(item.id, 1, 100)
    const speaker = item.speaker === 'user' || item.speaker === 'assistant' ? item.speaker : null
    const source = ['voice-transcript', 'typed-response', 'agent-response'].includes(String(item.source))
      ? item.source as TranscriptTurn['source']
      : null
    const text = boundedString(item.text, 1, 6000)
    if (!id || ids.has(id)) errors.push(`transcriptTurns[${index}].id is invalid or duplicated`)
    if (!speaker) errors.push(`transcriptTurns[${index}].speaker is invalid`)
    if (!source) errors.push(`transcriptTurns[${index}].source is invalid`)
    if (!text) errors.push(`transcriptTurns[${index}].text is invalid`)
    if (!id || !speaker || !source || !text || ids.has(id)) return
    ids.add(id)
    turns.push({ id, speaker, source, text })
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: turns }
}

export function validateEvidenceAgainstTranscript(
  evidence: readonly EvidenceRecord[],
  transcriptTurns: readonly TranscriptTurn[]
): ValidationResult<EvidenceRecord[]> {
  const turnsById = new Map(transcriptTurns.map(turn => [turn.id, turn]))
  const errors: string[] = []
  evidence.forEach((item, index) => {
    const referenced = item.sourceTurnIds.map(id => turnsById.get(id)).filter((turn): turn is TranscriptTurn => Boolean(turn))
    if (referenced.length !== item.sourceTurnIds.length) {
      errors.push(`evidence[${index}] references an unknown transcript turn`)
      return
    }
    if (referenced.some(turn => turn.speaker !== 'user')) {
      errors.push(`evidence[${index}] may only cite user turns`)
    }
    if (referenced.some(turn => turn.source !== item.source)) {
      errors.push(`evidence[${index}] source does not match its transcript turn`)
    }
    if (!referenced.some(turn => turn.text.includes(item.quote))) {
      errors.push(`evidence[${index}].quote is not an exact transcript span`)
    }
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: [...evidence] }
}

export type RealtimeEnvironment = {
  enableLiveRealtime?: string
  allowPaidApiCalls?: string
  authReady?: string
  distributedRateLimitReady?: string
  spendControlsReady?: string
  admissionReady?: boolean
  approvedDailyBudgetUsd?: string
  apiKey?: string
  safetyIdentifierSalt?: string
  model?: string
}

// Launch invariant: a public route must not mint a live Realtime session until
// persisted ownership checks and one-active-session enforcement are implemented.
export const AI_PATH_PUBLIC_REALTIME_BOOTSTRAP_READY = false as const

export function canBootstrapPublicRealtime(capability: { liveEnabled: boolean }): boolean {
  return AI_PATH_PUBLIC_REALTIME_BOOTSTRAP_READY && capability.liveEnabled
}

export function resolveRealtimeCapability(environment: RealtimeEnvironment): {
  mode: 'mock' | 'live'
  liveEnabled: boolean
  reason: string
  model: string
} {
  const model = environment.model?.trim() || 'gpt-realtime-2.1'
  if (environment.enableLiveRealtime !== 'true') {
    return { mode: 'mock', liveEnabled: false, reason: 'live mode is not enabled', model }
  }
  if (environment.allowPaidApiCalls !== 'true') {
    return { mode: 'mock', liveEnabled: false, reason: 'paid API calls are not explicitly allowed', model }
  }
  if (environment.authReady !== 'true') {
    return { mode: 'mock', liveEnabled: false, reason: 'authenticated persisted session ownership is not ready', model }
  }
  if (environment.distributedRateLimitReady !== 'true') {
    return { mode: 'mock', liveEnabled: false, reason: 'distributed rate limiting is not ready', model }
  }
  if (environment.spendControlsReady !== 'true') {
    return { mode: 'mock', liveEnabled: false, reason: 'per-user concurrency and spend controls are not ready', model }
  }
  if (environment.admissionReady !== true) {
    return { mode: 'mock', liveEnabled: false, reason: 'atomic Realtime admission is not ready', model }
  }
  const dailyBudgetUsd = Number(environment.approvedDailyBudgetUsd)
  if (!Number.isFinite(dailyBudgetUsd) || dailyBudgetUsd <= 0 || dailyBudgetUsd > 10_000) {
    return { mode: 'mock', liveEnabled: false, reason: 'an approved bounded daily budget is not configured', model }
  }
  if (!environment.apiKey) {
    return { mode: 'mock', liveEnabled: false, reason: 'OpenAI API key is not configured', model }
  }
  if (!environment.safetyIdentifierSalt) {
    return { mode: 'mock', liveEnabled: false, reason: 'safety identifier salt is not configured', model }
  }
  return { mode: 'live', liveEnabled: true, reason: 'explicit live configuration is complete', model }
}

const allowedSessionTransitions: Record<SessionStatus, readonly SessionStatus[]> = {
  created: ['consented', 'failed', 'expired'],
  consented: ['connecting', 'failed', 'expired'],
  connecting: ['active', 'failed', 'expired'],
  active: ['ending', 'failed', 'expired'],
  ending: ['analysis_pending', 'failed'],
  analysis_pending: ['complete', 'failed'],
  complete: [],
  failed: [],
  expired: [],
}

export function validateSessionTransition(current: SessionStatus, next: SessionStatus): ValidationResult<SessionStatus> {
  return allowedSessionTransitions[current].includes(next)
    ? { ok: true, value: next }
    : { ok: false, errors: [`cannot transition session from ${current} to ${next}`] }
}

export type AssessmentReport = {
  reportVersion: typeof AI_PATH_REPORT_VERSION
  taxonomyVersion: typeof AI_PATH_TAXONOMY_VERSION
  scoringVersion: typeof AI_PATH_SCORING_VERSION
  catalogVersion: typeof AI_PATH_CATALOG_VERSION
  generatedAt: string
  goal: string
  results: SkillResult[]
  strengths: SkillId[]
  growthAreas: SkillId[]
  recommendationStatus: 'available' | 'no_eligible_resources' | 'catalog_unavailable'
  recommendations: RankedRecommendation[]
  disclaimer: string
}

export type BuildReportInput = {
  goal: string
  evidence: EvidenceRecord[]
  preferences: RecommendationPreferences
  generatedAt?: Date
}

export function buildAssessmentReport(input: BuildReportInput): AssessmentReport {
  const results = scoreSkills(input.evidence)
  const generatedAt = (input.generatedAt ?? new Date()).toISOString()
  const targetEntries = Object.entries(input.preferences.targetLevels) as Array<[SkillId, SkillLevel]>
  const strengths = targetEntries
    .filter(([skillId, target]) => currentLevel(results, skillId) >= target)
    .map(([skillId]) => skillId)
  const growthAreas = targetEntries
    .filter(([skillId, target]) => currentLevel(results, skillId) < target)
    .map(([skillId]) => skillId)
  const catalogSelection = selectPublishedCatalogResources({
    asOf: generatedAt,
    language: 'en',
    maximumMinutes: Math.max(60, Math.floor(input.preferences.timeBudgetHours * 60)),
    freeOnly: input.preferences.freeOnly,
    formats: input.preferences.formats,
    codingPreference: input.preferences.codingPreference,
    accessPreference: input.preferences.accessPreference,
    allowPaidServiceExercise: input.preferences.allowPaidServiceExercise,
    goalType: input.preferences.goalType,
  }) as {
    status: 'available' | 'no_eligible_resources' | 'catalog_unavailable'
    resources: CatalogResource[]
  }
  const recommendations = catalogSelection.status === 'available'
    ? rankRecommendations(results, input.preferences, catalogSelection.resources)
    : []
  const recommendationStatus = recommendations.length
    ? 'available'
    : catalogSelection.status === 'catalog_unavailable'
      ? 'catalog_unavailable'
      : 'no_eligible_resources'

  return {
    reportVersion: AI_PATH_REPORT_VERSION,
    taxonomyVersion: AI_PATH_TAXONOMY_VERSION,
    scoringVersion: AI_PATH_SCORING_VERSION,
    catalogVersion: AI_PATH_CATALOG_VERSION,
    generatedAt,
    goal: input.goal.trim(),
    results,
    strengths,
    growthAreas,
    recommendationStatus,
    recommendations,
    disclaimer: 'This learning assessment reflects the evidence shared in this session. It is guidance, not a credential or employment decision.',
  }
}

export function parseTargetLevels(value: unknown): ValidationResult<Partial<Record<SkillId, SkillLevel>>> {
  if (!isRecord(value)) return { ok: false, errors: ['targetLevels must be an object'] }
  const targetLevels: Partial<Record<SkillId, SkillLevel>> = {}
  const errors: string[] = []
  for (const [skillId, level] of Object.entries(value)) {
    if (!skillIdSet.has(skillId)) errors.push(`unknown target skill: ${skillId}`)
    else if (!isSkillLevel(level)) errors.push(`target level for ${skillId} must be 0-4`)
    else targetLevels[skillId as SkillId] = level
  }
  if (Object.keys(targetLevels).length === 0) errors.push('at least one target skill is required')
  return errors.length ? { ok: false, errors } : { ok: true, value: targetLevels }
}
