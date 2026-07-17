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

const legacyInputIds = new Set(['goal', 'starting-point', 'constraint'])
const evidenceInputIdPattern = /^evidence-[1-7]$/
const constraintInputIdPattern = /^constraint(?:-follow-up)?$/
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
  { skillId: 'data-retrieval', pattern: /\b(sources?|cit(?:ation|ations|ed)|documents?|retriev(?:e|al)|rag|databases?|knowledge base|data)\b/i },
  { skillId: 'coding-apis', pattern: /\b(api|code|python|javascript|typescript|sdk|webhook)\b/i },
  { skillId: 'agents-tools', pattern: /\b(agent|tool call|function call|multi[- ]?step)\b/i },
  { skillId: 'evaluation-reliability', pattern: /\b(test(?:ed|ing)?|evaluat(?:e|ed|ion)|rubric|metric|compar(?:e|ed|ison)|verif(?:y|ied|ication)|quality|review(?:ed)?|trust|fail(?:ed|ure)?)\b/i },
  { skillId: 'deployment-operations', pattern: /\b(deploy|production|monitor|logging|latency|rollback|budget|incident)\b/i },
  { skillId: 'safety-governance', pattern: /\b(privacy|security|permission|pii|safety|governance|human review|abuse)\b/i },
]

const demonstratedActionPattern = /\b(?:I|we)\s+(?:(?:personally|manually)\s+)?(?:built|created|implemented|designed|configured|tested|evaluated|decided|owned|wrote|ran|review(?:ed)?|verified|compared|mapped|used|tried|fixed|deployed|monitored)\b/i
const aspirationOnlyPattern = /\b(?:I|we)\s+(?:want|hope|plan|intend|would like|need)\s+to\b/i
const noExperiencePattern = /\b(?:I|we)\s+(?:have\s+)?(?:not|never|haven't|have not|didn't|did not)\s+(?:built|created|implemented|designed|configured|tested|evaluated|used|tried|deployed|monitored|worked)\b|\bno concrete example\b/i
const ownerPattern = /\bI\s+(?:(?:personally|manually)\s+)?(?:built|created|implemented|designed|configured|tested|evaluated|decided|owned|wrote|ran|review(?:ed)?|verified|compared|mapped|fixed|deployed|monitored)\b|\b(?:independently|by myself|my role)\b/i
const guidedPattern = /\b(?:with guidance|with help|pair(?:ed)? with|a teammate|the team|someone else)\b/i
const artifactEvidencePattern = /\b(?:app|application|automation|workflow|prototype|repository|repo|dashboard|report|brief|document|spreadsheet|notebook|demo|deployment|output|evaluation set|test set)\b/i
const outcomeEvidencePattern = /\b(?:saved|reduced|improved|increased|decreased|accuracy|latency|adoption|hours?|minutes?|percent|%)\b|\b\d+(?:\.\d+)?\b/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseInputs(value: unknown): { ok: true; value: ReviewedInput[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(value) || value.length < 2 || value.length > 9) {
    return { ok: false, errors: ['reviewedInputs must contain 2-9 reviewed responses'] }
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
    if (!legacyInputIds.has(id) && !evidenceInputIdPattern.test(id) && !constraintInputIdPattern.test(id)) errors.push(`reviewedInputs[${index}].id is unsupported`)
    if (seen.has(id)) errors.push(`reviewedInputs[${index}].id must be unique`)
    if (text.length < 3 || text.length > 2000) errors.push(`reviewedInputs[${index}].value must contain 3-2000 characters`)
    seen.add(id)
    inputs.push({ id, value: text })
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: inputs }
}

function buildEvidence(inputs: readonly ReviewedInput[]): EvidenceRecord[] {
  const experience = inputs.filter(input => input.id === 'starting-point' || evidenceInputIdPattern.test(input.id))
  if (!experience.length) return []
  const sentences = experience
    .filter(input => !/no concrete example was captured/i.test(input.value))
    .flatMap(input => (
      input.value.match(/[^.!?\n]+[.!?]?/g)
        ?.flatMap(sentence => sentence
          .split(/(?:;\s*|,\s+(?:and\s+)?(?=(?:now\s+)?(?:I|we)\b)|\s+and\s+(?=(?:now\s+)?(?:I|we)\b)|\s+\b(?:but|while|although|however)\b\s+)/i)
          .map(clause => ({ text: clause.trim(), sourceTurnId: `review-${input.id}` })))
        .filter(sentence => Boolean(sentence.text)) ?? []
  ))

  return signalRules.flatMap((rule, index) => {
    const actionIndex = sentences.findIndex(sentence => (
      rule.pattern.test(sentence.text)
        && demonstratedActionPattern.test(sentence.text)
        && !noExperiencePattern.test(sentence.text)
        && !(aspirationOnlyPattern.test(sentence.text) && !demonstratedActionPattern.test(sentence.text))
    ))
    if (actionIndex < 0) return []
    const actionSentence = sentences[actionIndex]
    const adjacentOutcome = sentences[actionIndex + 1]?.sourceTurnId === actionSentence.sourceTurnId
      ? sentences[actionIndex + 1]
      : undefined
    const quote = adjacentOutcome && outcomeEvidencePattern.test(adjacentOutcome.text)
      ? `${actionSentence.text} ${adjacentOutcome.text}`
      : actionSentence.text
    const independence = ownerPattern.test(actionSentence.text) ? 'owner' : guidedPattern.test(actionSentence.text) ? 'guided' : 'observed'
    const demonstratedOutcome = artifactEvidencePattern.test(actionSentence.text) && outcomeEvidencePattern.test(quote)
    const moderate = independence === 'owner' && demonstratedOutcome
    return [{
      id: `self-report-${rule.skillId}-${index + 1}`,
      skillId: rule.skillId,
      observedLevel: moderate ? 2 as const : 1 as const,
      strength: moderate ? 'moderate' as const : 'weak' as const,
      independence,
      sourceTurnIds: [actionSentence.sourceTurnId],
      quote,
      speaker: 'user' as const,
      source: 'typed-response' as const,
      ...(artifactEvidencePattern.test(quote) ? { artifact: 'Learner described an inspectable work artifact.' } : {}),
      ...(outcomeEvidencePattern.test(quote) ? { outcome: 'Learner described an observable result.' } : {}),
    }]
  })
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
