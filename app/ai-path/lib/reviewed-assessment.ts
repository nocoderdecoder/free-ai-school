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

export type ReviewedInput = {
  id: string
  value: string
  source: 'voice-transcript' | 'typed-response'
}

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
  { skillId: 'workflow-design', pattern: /\b(workflow|process|step|handoff|delegate|automate|intake|approval|input|output)\b/i },
  { skillId: 'data-retrieval', pattern: /\b(sources?|source[- ](?:grounded|backed)|grounded|cit(?:ation|ations|ed)|documents?|retriev(?:e|al)|rag|databases?|knowledge base|data)\b/i },
  { skillId: 'coding-apis', pattern: /\b(api|integrat(?:e|ed|ion)|code|python|javascript|typescript|sdk|webhook)\b/i },
  { skillId: 'agents-tools', pattern: /\b(agent|tool call|function call|multi[- ]?step|orchestrat(?:e|ed|ion))\b/i },
  { skillId: 'evaluation-reliability', pattern: /\b(test(?:ed|ing)?|check(?:ed|ing)?|validat(?:e|ed|ion)|evaluat(?:e|ed|ion)|rubric|metric|compar(?:e|ed|ison)|verif(?:y|ied|ication)|quality|review(?:ed)?|trust|fail(?:ed|ure)?)\b/i },
  { skillId: 'deployment-operations', pattern: /\b(deploy(?:ed|ment)?|production|release|live|monitor(?:ed|ing)?|logging|latency|rollback|budget|incident|on[- ]call)\b/i },
  { skillId: 'safety-governance', pattern: /\b(privacy|security|permission|pii|safety|governance|human review|abuse)\b/i },
]

const demonstratedActionPattern = /\b(?:I|we)\s+(?:(?:personally|manually)\s+)?(?:built|created|developed|implemented|integrated|(?:re)?designed|configured|set up|put together|tested|checked|validated|evaluated|assessed|decided|led|delivered|launched|shipped|maintained|operated|owned|wrote|ran|review(?:ed)?|verified|compared|mapped|used|tried|fixed|debugged|deployed|monitored|measured)\b/i
const demonstratedResponsibilityPattern = /\b(?:I|we)\s+(?:was|were|am|are)\s+(?:directly\s+)?responsible\s+for\b|\bmy\s+(?:role|work|responsibilit(?:y|ies))\s+(?:included|involved|required|focused on)\b/i
const aspirationOnlyPattern = /\b(?:I|we)\s+(?:want|hope|plan|intend|would like|need)\s+to\b/i
const noExperiencePattern = /\b(?:I|we)\s+(?:have\s+)?(?:not|never|haven't|have not|didn't|did not)\s+(?:build|built|create|created|develop|developed|implement|implemented|design|designed|configure|configured|test|tested|evaluate|evaluated|use|used|try|tried|deploy|deployed|monitor|monitored|maintain|maintained|operate|operated|own|owned|lead|led|work|worked)\b|\bno concrete example\b/i
const ownershipDenialPattern = /\b(?:I|we)\s+(?:did not|didn't|have not|haven't|never)\s+(?:[^.!?]{0,50}\b)?(?:build|built|create|created|design|designed|implement|implemented|own|owned|lead|led|maintain|maintained|operate|operated|work|worked)\b|\b(?:someone else|another person|a teammate|the team)\s+(?:built|created|designed|implemented|owned|led|maintained|operated)\b/i
const ownerPattern = /\bI\s+(?:(?:personally|manually)\s+)?(?:built|created|developed|implemented|integrated|(?:re)?designed|configured|set up|tested|checked|validated|evaluated|assessed|decided|led|delivered|launched|shipped|maintained|operated|owned|wrote|ran|review(?:ed)?|verified|compared|mapped|fixed|debugged|deployed|monitored|measured)\b|\b(?:independently|by myself|my role|I (?:was|am) responsible for)\b/i
const guidedPattern = /\b(?:with guidance|with help|pair(?:ed)? with|a teammate|the team|someone else)\b/i
const artifactEvidencePattern = /\b(?:app|application|automation|workflow|prototype|repository|repo|dashboard|report|brief|document|spreadsheet|notebook|demo|deployment|pipeline|service|system|output|evaluation set|test set)\b/i
const outcomeEvidencePattern = /\b(?:saved|reduced|improved|increased|decreased|accuracy|latency|adoption|hours?|minutes?|percent|%)\b|\b\d+(?:\.\d+)?\b/i
const measuredOutcomePattern = /\b(?:saved|reduced|improved|increased|decreased|blocked|prevented|cut|raised|lowered)\b[^.!?]{0,80}\b(?:\d+(?:\.\d+)?|percent|%|hours?|minutes?|errors?|regressions?|defects?|latency|accuracy|adoption)\b/i
const shippedEvidencePattern = /\b(?:shipped|launched|released|deployed|production|live|in use|customers?|users?)\b/i
const reliabilityControlPattern = /\b(?:test set|evaluation|release gate|failure handling|human review|regression|rollback|monitor(?:ed|ing)?|incident|permission)\b/i

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
    const source = candidate.source === undefined ? 'typed-response' : candidate.source
    if (!legacyInputIds.has(id) && !evidenceInputIdPattern.test(id) && !constraintInputIdPattern.test(id)) errors.push(`reviewedInputs[${index}].id is unsupported`)
    if (seen.has(id)) errors.push(`reviewedInputs[${index}].id must be unique`)
    if (text.length < 3 || text.length > 2000) errors.push(`reviewedInputs[${index}].value must contain 3-2000 characters`)
    if (source !== 'typed-response' && source !== 'voice-transcript') errors.push(`reviewedInputs[${index}].source is invalid`)
    seen.add(id)
    if (source === 'typed-response' || source === 'voice-transcript') inputs.push({ id, value: text, source })
  })
  return errors.length ? { ok: false, errors } : { ok: true, value: inputs }
}

function buildEvidence(inputs: readonly ReviewedInput[]): EvidenceRecord[] {
  const experience = inputs.filter(input => input.id === 'starting-point' || evidenceInputIdPattern.test(input.id))
  if (!experience.length) return []
  const clauses = experience
    .filter(input => !/no concrete example was captured/i.test(input.value))
    .flatMap(input => (
      input.value.match(/[^;.!?\n]+(?:;|[.!?])?/g)
        ?.flatMap((sentence, sentenceIndex) => sentence
          .split(/(?:,\s+(?:and\s+)?(?=(?:now\s+)?(?:I|we)\b)|\s+and\s+(?=(?:now\s+)?(?:I|we)\b)|\s+\b(?:but|while|although|however)\b\s+)/i)
          .map((clause, clauseIndex) => ({
            text: clause.trim(),
            inputId: input.id,
            source: input.source,
            sourceTurnId: `review-${input.id}`,
            ordinal: `${sentenceIndex + 1}-${clauseIndex + 1}`,
          })))
        .filter(clause => Boolean(clause.text)) ?? []
  ))

  const supporting: EvidenceRecord[] = []
  const supportingClauseIndexes = new Map<string, number>()

  clauses.forEach((clause, clauseIndex) => {
    const demonstrated = demonstratedActionPattern.test(clause.text) || demonstratedResponsibilityPattern.test(clause.text)
    if (!demonstrated || noExperiencePattern.test(clause.text) || (aspirationOnlyPattern.test(clause.text) && !demonstrated)) return

    const matchedSkills = signalRules.filter(rule => rule.pattern.test(clause.text)).map(rule => rule.skillId)
    matchedSkills.forEach(skillId => {
      const independence = ownerPattern.test(clause.text) ? 'owner' : guidedPattern.test(clause.text) ? 'guided' : 'observed'
      const adjacentOutcome = clauses[clauseIndex + 1]?.sourceTurnId === clause.sourceTurnId
        && !demonstratedActionPattern.test(clauses[clauseIndex + 1].text)
        && outcomeEvidencePattern.test(clauses[clauseIndex + 1].text)
          ? clauses[clauseIndex + 1]
          : undefined
      const quote = adjacentOutcome ? `${clause.text} ${adjacentOutcome.text}` : clause.text
      const hasArtifact = artifactEvidencePattern.test(quote)
      const hasOutcome = outcomeEvidencePattern.test(quote)
      const hasMeasuredOutcome = measuredOutcomePattern.test(quote)
      const shipped = shippedEvidencePattern.test(quote)
      const controlled = reliabilityControlPattern.test(quote)
      const strong = independence === 'owner' && hasArtifact && hasMeasuredOutcome && shipped && controlled
      const moderate = !strong && independence === 'owner' && hasArtifact && hasOutcome
      const evidenceRecord: EvidenceRecord = {
        id: `self-report-${clause.inputId}-${clause.ordinal}-${skillId}`,
        skillId,
        observedLevel: strong ? 3 : moderate ? 2 : 1,
        strength: strong ? 'strong' : moderate ? 'moderate' : 'weak',
        independence,
        sourceTurnIds: [clause.sourceTurnId],
        quote,
        speaker: 'user',
        source: clause.source,
        ...(hasArtifact ? { artifact: 'Learner described an inspectable work artifact.' } : {}),
        ...(hasOutcome ? { outcome: 'Learner described an observable result.' } : {}),
      }
      supporting.push(evidenceRecord)
      supportingClauseIndexes.set(evidenceRecord.id, clauseIndex)
    })
  })

  const contradictions: EvidenceRecord[] = []
  const recordedContradictions = new Set<string>()
  clauses.forEach((clause, clauseIndex) => {
    if (!noExperiencePattern.test(clause.text) && !ownershipDenialPattern.test(clause.text)) return
    const directSkills = signalRules.filter(rule => rule.pattern.test(clause.text)).map(rule => rule.skillId)
    const priorSupporting = supporting.filter(item => (supportingClauseIndexes.get(item.id) ?? Number.POSITIVE_INFINITY) < clauseIndex)
    const nearestPriorClauseIndex = priorSupporting.reduce(
      (latest, item) => Math.max(latest, supportingClauseIndexes.get(item.id) ?? -1),
      -1
    )
    const nearestPriorSkills = priorSupporting
      .filter(item => supportingClauseIndexes.get(item.id) === nearestPriorClauseIndex)
      .map(item => item.skillId)
    const referencedSkills = directSkills.length
      ? directSkills
      : /\b(?:it|that|this|the work|the project)\b/i.test(clause.text)
        ? [...new Set(nearestPriorSkills)]
        : []
    referencedSkills.forEach(skillId => {
      const prior = priorSupporting.filter(item => item.skillId === skillId)
      if (!prior.length) return
      const contradictionKey = `${clause.sourceTurnId}:${skillId}`
      if (recordedContradictions.has(contradictionKey)) return
      recordedContradictions.add(contradictionKey)
      contradictions.push({
        id: `contradiction-${clause.inputId}-${clause.ordinal}-${skillId}`,
        skillId,
        observedLevel: Math.max(...prior.map(item => item.observedLevel)) as SkillLevel,
        strength: 'moderate',
        independence: 'observed',
        sourceTurnIds: [clause.sourceTurnId],
        quote: clause.text,
        speaker: 'user',
        source: clause.source,
        contradiction: true,
      })
    })
  })

  return [...supporting, ...contradictions]
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
    source: input.source,
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
