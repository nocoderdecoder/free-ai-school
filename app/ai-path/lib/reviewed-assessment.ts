import type {
  EvidenceRecord,
  SkillId,
  SkillLevel,
  TranscriptTurn,
} from './foundation'
import { isAiPathGoalType, type AiPathGoalType } from './goal-type.ts'

const reviewedAssessmentSkillIds = [
  'foundations',
  'prompt-context',
  'workflow-design',
  'data-retrieval',
  'coding-apis',
  'agents-tools',
  'evaluation-reliability',
  'deployment-operations',
  'safety-governance',
] as const satisfies readonly SkillId[]

export type ReviewedInput = { id: string; value: string }

export type ParsedReviewedAssessment = {
  inputs: ReviewedInput[]
  transcriptTurns: TranscriptTurn[]
  evidence: EvidenceRecord[]
  targetLevels: Partial<Record<SkillId, SkillLevel>>
  timeBudgetHours: number
}

const allowedInputIds = new Set(['goal', 'starting-point', 'constraint'])
const targetLevelsByGoal: Record<string, Partial<Record<SkillId, SkillLevel>>> = {
  workflows: { 'workflow-design': 3, 'evaluation-reliability': 2, 'prompt-context': 2 },
  builder: { 'coding-apis': 3, 'agents-tools': 2, 'evaluation-reliability': 2 },
  career: { foundations: 2, 'coding-apis': 2, 'workflow-design': 2, 'evaluation-reliability': 2 },
  leader: { 'workflow-design': 3, 'evaluation-reliability': 2, 'safety-governance': 2 },
  foundations: { foundations: 2, 'prompt-context': 2, 'safety-governance': 1 },
  unsure: { foundations: 2, 'workflow-design': 2, 'prompt-context': 2 },
}

const signalRules: ReadonlyArray<{ skillId: SkillId; pattern: RegExp }> = [
  { skillId: 'foundations', pattern: /\b(model|hallucinat|capabilit|limitation|token|machine learning|llm)\b/i },
  { skillId: 'prompt-context', pattern: /\b(prompt|instruction|context|few[- ]?shot|structured output|output format)\b/i },
  { skillId: 'workflow-design', pattern: /\b(workflow|process|step|handoff|delegate|automate|input|output)\b/i },
  { skillId: 'data-retrieval', pattern: /\b(sources?|citations?|documents?|retriev(?:e|al)|rag|databases?|knowledge base|data)\b/i },
  { skillId: 'coding-apis', pattern: /\b(api|code|python|javascript|typescript|sdk|webhook)\b/i },
  { skillId: 'agents-tools', pattern: /\b(agent|tool call|function call|multi[- ]?step)\b/i },
  { skillId: 'evaluation-reliability', pattern: /\b(test|evaluat|rubric|metric|compare|verify|quality|review|trust|failure)\b/i },
  { skillId: 'deployment-operations', pattern: /\b(deploy|production|monitor|logging|latency|rollback|budget|incident)\b/i },
  { skillId: 'safety-governance', pattern: /\b(privacy|security|permission|pii|safety|governance|human review|abuse)\b/i },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseInputs(value: unknown): { ok: true; value: ReviewedInput[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) {
    return { ok: false, errors: ['reviewedInputs must contain 2-3 reviewed responses'] }
  }
  const errors: string[] = []
  const seen = new Set<string>()
  const inputs: ReviewedInput[] = []
  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      errors.push(`reviewedInputs[${index}] must be an object`)
      return
    }
    const id = typeof candidate.id === 'string' ? candidate.id.trim() : ''
    const text = typeof candidate.value === 'string' ? candidate.value.trim() : ''
    if (!allowedInputIds.has(id)) errors.push(`reviewedInputs[${index}].id is unsupported`)
    if (seen.has(id)) errors.push(`reviewedInputs[${index}].id must be unique`)
    if (text.length < 3 || text.length > 2000) errors.push(`reviewedInputs[${index}].value must contain 3-2000 characters`)
    seen.add(id)
    inputs.push({ id, value: text })
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: inputs }
}

function buildEvidence(inputs: readonly ReviewedInput[]): EvidenceRecord[] {
  const experience = inputs.find(input => input.id === 'starting-point')
  if (!experience || /no concrete example was captured/i.test(experience.value)) return []

  return signalRules
    .filter(rule => rule.pattern.test(experience.value))
    .map((rule, index) => ({
      id: `self-report-${rule.skillId}-${index + 1}`,
      skillId: rule.skillId,
      observedLevel: 1,
      strength: 'weak',
      independence: 'observed',
      sourceTurnIds: ['review-starting-point'],
      quote: experience.value,
      speaker: 'user',
      source: 'typed-response',
    }))
}

export function parseReviewedAssessment(body: Record<string, unknown>, trustedGoalType?: AiPathGoalType):
  | { ok: true; value: ParsedReviewedAssessment }
  | { ok: false; errors: string[] } {
  const parsedInputs = parseInputs(body.reviewedInputs)
  const goalType = trustedGoalType ?? (isAiPathGoalType(body.goalType) ? body.goalType : 'unsure')
  const weeklyHours = Number.isInteger(body.weeklyHours) ? Number(body.weeklyHours) : 0
  const errors = parsedInputs.ok ? [] : parsedInputs.errors
  if (weeklyHours < 1 || weeklyHours > 20) errors.push('weeklyHours must be an integer from 1-20')
  if (errors.length || !parsedInputs.ok) return { ok: false, errors }

  const transcriptTurns = parsedInputs.value.map(input => ({
    id: `review-${input.id}`,
    speaker: 'user' as const,
    source: 'typed-response' as const,
    text: input.value,
  }))
  const targetLevels = targetLevelsByGoal[goalType] ?? targetLevelsByGoal.unsure
  const unknownTargets = Object.keys(targetLevels).filter(key => !reviewedAssessmentSkillIds.includes(key as SkillId))
  if (unknownTargets.length) return { ok: false, errors: ['configured goal targets contain an unknown skill'] }

  return {
    ok: true,
    value: {
      inputs: parsedInputs.value,
      transcriptTurns,
      evidence: buildEvidence(parsedInputs.value),
      targetLevels,
      timeBudgetHours: Math.min(80, weeklyHours * 4),
    },
  }
}
