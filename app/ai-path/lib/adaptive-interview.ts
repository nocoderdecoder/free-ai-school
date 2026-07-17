import { AI_PATH_GOAL_TYPES, isAiPathGoalType, type AiPathGoalType } from './goal-type.ts'

export const AI_PATH_ADAPTIVE_INTERVIEW_VERSION = '2026-07-17.v1' as const
export const AI_PATH_ADAPTIVE_INTERVIEW_MIN_QUESTIONS = 5 as const
export const AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS = 7 as const
export const AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS = 2_000 as const

export const AI_PATH_INTERVIEW_EVIDENCE_DIMENSIONS = [
  'concrete_example',
  'ownership_independence',
  'artifact',
  'measurable_outcome',
  'failure_limitation',
  'evaluation_reliability',
  'safety_privacy',
  'constraint_time',
] as const

export type AdaptiveInterviewEvidenceDimension =
  (typeof AI_PATH_INTERVIEW_EVIDENCE_DIMENSIONS)[number]
export type AdaptiveInterviewDimensionStatus = 'missing' | 'present' | 'contradictory'

export type AdaptiveInterviewStartInput = Readonly<{
  goalType: AiPathGoalType
  goal: string
  role?: string
  weeklyMinutes: number
  blocker?: string
}>

export type AdaptiveInterviewQuestion = Readonly<{
  id: string
  ordinal: number
  prompt: string
  purpose: string
  dimensions: readonly AdaptiveInterviewEvidenceDimension[]
  answerMinChars: 1
  answerMaxChars: typeof AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS
}>

export type AdaptiveInterviewTurn = Readonly<{
  id: string
  questionId: string
  question: string
  answer: string
  dimensionsProbed: readonly AdaptiveInterviewEvidenceDimension[]
}>

export type AdaptiveInterviewState = Readonly<{
  version: typeof AI_PATH_ADAPTIVE_INTERVIEW_VERSION
  context: AdaptiveInterviewStartInput
  status: 'in_progress' | 'complete'
  turns: readonly AdaptiveInterviewTurn[]
  askedQuestionIds: readonly string[]
  currentQuestion: AdaptiveInterviewQuestion | null
}>

export type AdaptiveInterviewDimensionSummary = Readonly<{
  dimension: AdaptiveInterviewEvidenceDimension
  status: AdaptiveInterviewDimensionStatus
  supportingAnswerIds: readonly string[]
}>

export type AdaptiveInterviewSummary = Readonly<{
  version: typeof AI_PATH_ADAPTIVE_INTERVIEW_VERSION
  status: AdaptiveInterviewState['status']
  goalType: AiPathGoalType
  answeredQuestionCount: number
  insufficientEvidence: boolean
  missingDimensions: readonly AdaptiveInterviewEvidenceDimension[]
  contradictoryDimensions: readonly AdaptiveInterviewEvidenceDimension[]
  dimensions: readonly AdaptiveInterviewDimensionSummary[]
  transcriptTurns: readonly Readonly<{
    id: string
    speaker: 'user'
    source: 'typed-response'
    questionId: string
    text: string
  }>[]
  nextQuestion: AdaptiveInterviewQuestion | null
}>

export type AdaptiveInterviewIssue = Readonly<{
  field: string
  code: 'unknown_field' | 'invalid_type' | 'out_of_bounds' | 'invalid_value'
}>

export type StartAdaptiveInterviewResult =
  | Readonly<{ ok: true; state: AdaptiveInterviewState }>
  | Readonly<{ ok: false; error: 'invalid_start'; issues: readonly AdaptiveInterviewIssue[] }>

export type SubmitAdaptiveInterviewAnswerResult =
  | Readonly<{ ok: true; state: AdaptiveInterviewState }>
  | Readonly<{
    ok: false
    error: 'invalid_state' | 'invalid_answer'
    issues: readonly AdaptiveInterviewIssue[]
  }>

type QuestionTemplate = Readonly<{
  id: string
  prompt: string
  purpose: string
  dimensions: readonly AdaptiveInterviewEvidenceDimension[]
}>

const goalOpeningPrompts: Record<AiPathGoalType, string> = {
  workflows: 'Describe one real work process you want to improve. What happens today, and where does it become slow, unreliable, or hard to review?',
  builder: 'Describe the most relevant app, automation, or technical project you have attempted. What did it do, and how far did you get?',
  career: 'Describe the strongest AI-related example you could show for the kind of role you want. What does it demonstrate today?',
  leader: 'Describe one AI use case you have evaluated or would be responsible for evaluating. What decision or workflow is involved?',
  foundations: 'Describe one real task where you tried to use or understand AI. What did you do, and what remained unclear?',
  unsure: 'Describe one recurring task where better speed, quality, or judgment would matter. What have you tried so far, if anything?',
}

const followUpTemplates: readonly QuestionTemplate[] = [
  {
    id: 'concrete-detail',
    prompt: 'Use one specific occasion rather than a general description. What was the input, what action did you take, and what came out?',
    purpose: 'Seek a concrete example while allowing the learner to say that no example exists yet.',
    dimensions: ['concrete_example'],
  },
  {
    id: 'ownership-independence',
    prompt: 'Which parts did you personally decide or complete, which parts were guided or done by someone else, and where did you need help?',
    purpose: 'Separate learner ownership from exposure, assistance, or team outcomes.',
    dimensions: ['ownership_independence'],
  },
  {
    id: 'artifact-outcome',
    prompt: 'What inspectable artifact exists, if any, and what observable result would show that it was useful?',
    purpose: 'Look for an artifact and an outcome without assuming either exists.',
    dimensions: ['artifact', 'measurable_outcome'],
  },
  {
    id: 'failure-evaluation',
    prompt: 'What failed, became unreliable, or remained uncertain, and how did you check the quality of the result?',
    purpose: 'Look for limitations and evaluation practices without assigning a level.',
    dimensions: ['failure_limitation', 'evaluation_reliability'],
  },
  {
    id: 'safety-privacy',
    prompt: 'What data, permission, privacy, security, or human-review boundary matters for this work?',
    purpose: 'Surface relevant safety and privacy boundaries without inferring sensitive traits.',
    dimensions: ['safety_privacy'],
  },
  {
    id: 'constraint-time',
    prompt: 'Given your real calendar, tools, and access, what is the main constraint a 30-day plan must respect?',
    purpose: 'Capture a practical time or access constraint for later planning.',
    dimensions: ['constraint_time'],
  },
]

const concretePattern = /\b(?:last time|for example|specific|project|workflow|process|task|use case|built|created|implemented|attempted|used|tried)\b/i
const ownershipPattern = /\b(?:I|we)\s+(?:personally\s+)?(?:built|created|implemented|designed|configured|tested|decided|owned|wrote|ran|reviewed|chose|mapped)\b|\b(?:independently|by myself|my role|with guidance|with help|someone else|the team)\b/i
const artifactPattern = /\b(?:artifact|app|application|automation|workflow|prototype|repository|repo|dashboard|report|brief|document|spreadsheet|notebook|prompt|demo|deployment|evaluation set|test set)\b/i
const measurableOutcomePattern = /\b(?:metric|measure|baseline|result|outcome|increased|decreased|reduced|improved|saved|conversion|accuracy|latency|adoption|hours?|minutes?|days?|percent|%)\b|\b\d+(?:\.\d+)?\b/i
const failurePattern = /\b(?:fail(?:ed|ure)?|broke|broken|wrong|error|unreliable|hallucinat(?:e|ed|ion)|limitation|blocked|stuck|could not|couldn't|did not work|didn't work|uncertain)\b/i
const evaluationPattern = /\b(?:test(?:ed|ing)?|evaluat(?:e|ed|ion)|rubric|checklist|compare(?:d|ison)?|verify|verified|validation|quality criteria|acceptance criteria|reviewed outputs?|regression)\b/i
const safetyPattern = /\b(?:privacy|private|sensitive|confidential|personal data|pii|permission|consent|security|safety|governance|human review|access control|abuse|risk|customer data|patient data|employee data)\b/i
const constraintPattern = /\b(?:constraint|calendar|time|hours? per week|minutes? per week|deadline|budget|access|permission|no[- ]?code|coding|tooling|blocked|blocker|availability)\b/i

const dimensionPatterns: Record<AdaptiveInterviewEvidenceDimension, RegExp> = {
  concrete_example: concretePattern,
  ownership_independence: ownershipPattern,
  artifact: artifactPattern,
  measurable_outcome: measurableOutcomePattern,
  failure_limitation: failurePattern,
  evaluation_reliability: evaluationPattern,
  safety_privacy: safetyPattern,
  constraint_time: constraintPattern,
}

const positiveOwnershipPattern = /\b(?:I|we)\s+(?:personally\s+)?(?:built|created|implemented|designed|owned|did|completed)\b/i
const negativeOwnershipPattern = /\b(?:I|we)\s+(?:did not|didn't|never)\s+(?:build|create|implement|design|own|do|complete)\b|\bsomeone else (?:built|created|implemented|did)\b/i
const positiveReliabilityPattern = /\b(?:worked reliably|was reliable|passed every test|no failures?)\b/i
const negativeReliabilityPattern = /\b(?:failed|was unreliable|did not work|didn't work|broke)\b/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed)
  return Object.keys(value).filter(key => !allowedSet.has(key))
}

function freezeArray<T>(items: readonly T[]): readonly T[] {
  return Object.freeze([...items])
}

function freezeIssue(issue: AdaptiveInterviewIssue): AdaptiveInterviewIssue {
  return Object.freeze({ ...issue })
}

function freezeContext(input: AdaptiveInterviewStartInput): AdaptiveInterviewStartInput {
  return Object.freeze({
    goalType: input.goalType,
    goal: input.goal,
    ...(input.role === undefined ? {} : { role: input.role }),
    weeklyMinutes: input.weeklyMinutes,
    ...(input.blocker === undefined ? {} : { blocker: input.blocker }),
  })
}

function questionFromTemplate(template: QuestionTemplate, ordinal: number): AdaptiveInterviewQuestion {
  return Object.freeze({
    id: template.id,
    ordinal,
    prompt: template.prompt,
    purpose: template.purpose,
    dimensions: freezeArray(template.dimensions),
    answerMinChars: 1,
    answerMaxChars: AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS,
  })
}

function openingQuestion(goalType: AiPathGoalType): AdaptiveInterviewQuestion {
  return questionFromTemplate({
    id: `opening-${goalType}`,
    prompt: goalOpeningPrompts[goalType],
    purpose: 'Ground the interview in a goal-relevant concrete example without scoring the learner.',
    dimensions: ['concrete_example'],
  }, 1)
}

function answerHasContradiction(answer: string, dimension: AdaptiveInterviewEvidenceDimension) {
  if (dimension === 'ownership_independence') {
    return positiveOwnershipPattern.test(answer) && negativeOwnershipPattern.test(answer)
  }
  if (dimension === 'evaluation_reliability') {
    return positiveReliabilityPattern.test(answer) && negativeReliabilityPattern.test(answer)
  }
  return false
}

function dimensionSummaries(turns: readonly AdaptiveInterviewTurn[]): AdaptiveInterviewDimensionSummary[] {
  return AI_PATH_INTERVIEW_EVIDENCE_DIMENSIONS.map(dimension => {
    const supporting = turns.filter(turn => dimensionPatterns[dimension].test(turn.answer))
    const contradictory = supporting.some(turn => answerHasContradiction(turn.answer, dimension))
    return Object.freeze({
      dimension,
      status: contradictory ? 'contradictory' : supporting.length ? 'present' : 'missing',
      supportingAnswerIds: freezeArray(supporting.map(turn => turn.id)),
    })
  })
}

function safetyRelevant(context: AdaptiveInterviewStartInput, turns: readonly AdaptiveInterviewTurn[]) {
  if (context.goalType === 'workflows' || context.goalType === 'builder' || context.goalType === 'leader') return true
  const boundedContext = `${context.goal} ${context.role ?? ''} ${context.blocker ?? ''}`
  return safetyPattern.test(boundedContext) || turns.some(turn => safetyPattern.test(turn.answer))
}

function requiredDimensions(context: AdaptiveInterviewStartInput, turns: readonly AdaptiveInterviewTurn[]) {
  return AI_PATH_INTERVIEW_EVIDENCE_DIMENSIONS.filter(dimension => (
    dimension !== 'safety_privacy' || safetyRelevant(context, turns)
  ))
}

function selectNextTemplate(state: AdaptiveInterviewState): QuestionTemplate | null {
  const asked = new Set(state.askedQuestionIds)
  const available = followUpTemplates.filter(template => (
    !asked.has(template.id)
      && (template.id !== 'safety-privacy' || safetyRelevant(state.context, state.turns))
  ))
  if (!available.length) return null

  const summaries = new Map(dimensionSummaries(state.turns).map(summary => [summary.dimension, summary]))
  const needsEvidence = (dimension: AdaptiveInterviewEvidenceDimension) => (
    summaries.get(dimension)?.status !== 'present'
  )
  const missingFirst = available.find(template => template.dimensions.some(needsEvidence))
  if (missingFirst) return missingFirst

  const directlyProbed = new Set(state.turns.flatMap(turn => [...turn.dimensionsProbed]))
  return available.find(template => template.dimensions.some(dimension => !directlyProbed.has(dimension)))
    ?? available[0]
}

function shouldComplete(state: AdaptiveInterviewState) {
  if (state.turns.length >= AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS) return true
  if (state.turns.length < AI_PATH_ADAPTIVE_INTERVIEW_MIN_QUESTIONS) return false
  const summaries = new Map(dimensionSummaries(state.turns).map(summary => [summary.dimension, summary.status]))
  return requiredDimensions(state.context, state.turns).every(dimension => summaries.get(dimension) === 'present')
    || selectNextTemplate(state) === null
}

function freezeTurn(turn: AdaptiveInterviewTurn): AdaptiveInterviewTurn {
  return Object.freeze({ ...turn, dimensionsProbed: freezeArray(turn.dimensionsProbed) })
}

function freezeState(state: AdaptiveInterviewState): AdaptiveInterviewState {
  return Object.freeze({
    version: state.version,
    context: freezeContext(state.context),
    status: state.status,
    turns: freezeArray(state.turns.map(freezeTurn)),
    askedQuestionIds: freezeArray(state.askedQuestionIds),
    currentQuestion: state.currentQuestion,
  })
}

function validateStart(value: unknown): { value?: AdaptiveInterviewStartInput; issues: AdaptiveInterviewIssue[] } {
  const issues: AdaptiveInterviewIssue[] = []
  if (!isRecord(value)) return { issues: [{ field: '$', code: 'invalid_type' }] }
  for (const key of exactKeys(value, ['goalType', 'goal', 'role', 'weeklyMinutes', 'blocker'])) {
    issues.push({ field: key, code: 'unknown_field' })
  }
  if (!isAiPathGoalType(value.goalType)) issues.push({ field: 'goalType', code: 'invalid_value' })
  const goal = typeof value.goal === 'string' ? value.goal.trim() : ''
  if (typeof value.goal !== 'string') issues.push({ field: 'goal', code: 'invalid_type' })
  else if (goal.length < 20 || goal.length > 1_200) issues.push({ field: 'goal', code: 'out_of_bounds' })
  const role = value.role === undefined ? undefined : typeof value.role === 'string' ? value.role.trim() : null
  if (value.role !== undefined && typeof value.role !== 'string') issues.push({ field: 'role', code: 'invalid_type' })
  else if (role !== undefined && (role === null || role.length < 1 || role.length > 160)) issues.push({ field: 'role', code: 'out_of_bounds' })
  if (!Number.isInteger(value.weeklyMinutes)) issues.push({ field: 'weeklyMinutes', code: 'invalid_type' })
  else if ((value.weeklyMinutes as number) < 15 || (value.weeklyMinutes as number) > 1_200) issues.push({ field: 'weeklyMinutes', code: 'out_of_bounds' })
  const blocker = value.blocker === undefined ? undefined : typeof value.blocker === 'string' ? value.blocker.trim() : null
  if (value.blocker !== undefined && typeof value.blocker !== 'string') issues.push({ field: 'blocker', code: 'invalid_type' })
  else if (blocker !== undefined && (blocker === null || blocker.length < 1 || blocker.length > 600)) issues.push({ field: 'blocker', code: 'out_of_bounds' })
  if (issues.length || !isAiPathGoalType(value.goalType)) return { issues }
  return {
    issues,
    value: {
      goalType: value.goalType,
      goal,
      ...(role === undefined ? {} : { role: role as string }),
      weeklyMinutes: value.weeklyMinutes as number,
      ...(blocker === undefined ? {} : { blocker: blocker as string }),
    },
  }
}

function knownQuestionTemplate(context: AdaptiveInterviewStartInput, id: string): QuestionTemplate | null {
  if (id === `opening-${context.goalType}`) {
    return {
      id,
      prompt: goalOpeningPrompts[context.goalType],
      purpose: 'Ground the interview in a goal-relevant concrete example without scoring the learner.',
      dimensions: ['concrete_example'],
    }
  }
  return followUpTemplates.find(template => template.id === id) ?? null
}

function validQuestion(
  value: unknown,
  context: AdaptiveInterviewStartInput,
  expectedId: string,
  expectedOrdinal: number,
): value is AdaptiveInterviewQuestion {
  if (!isRecord(value) || exactKeys(value, ['id', 'ordinal', 'prompt', 'purpose', 'dimensions', 'answerMinChars', 'answerMaxChars']).length) return false
  const template = knownQuestionTemplate(context, expectedId)
  return Boolean(template)
    && value.id === expectedId
    && value.ordinal === expectedOrdinal
    && value.prompt === template?.prompt
    && value.purpose === template?.purpose
    && Array.isArray(value.dimensions)
    && value.dimensions.length === template?.dimensions.length
    && value.dimensions.every((dimension, index) => dimension === template?.dimensions[index])
    && value.answerMinChars === 1
    && value.answerMaxChars === AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS
}

function validTurn(
  value: unknown,
  context: AdaptiveInterviewStartInput,
  expectedQuestionId: string,
  index: number,
): value is AdaptiveInterviewTurn {
  if (!isRecord(value) || exactKeys(value, ['id', 'questionId', 'question', 'answer', 'dimensionsProbed']).length) return false
  const template = knownQuestionTemplate(context, expectedQuestionId)
  return Boolean(template)
    && value.id === `answer-${index + 1}`
    && value.questionId === expectedQuestionId
    && value.question === template?.prompt
    && typeof value.answer === 'string'
    && value.answer === value.answer.trim()
    && value.answer.length >= 1
    && value.answer.length <= AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS
    && Array.isArray(value.dimensionsProbed)
    && value.dimensionsProbed.length === template?.dimensions.length
    && value.dimensionsProbed.every((dimension, dimensionIndex) => dimension === template?.dimensions[dimensionIndex])
}

function validState(state: unknown): state is AdaptiveInterviewState {
  if (!isRecord(state)
    || exactKeys(state, ['version', 'context', 'status', 'turns', 'askedQuestionIds', 'currentQuestion']).length
    || state.version !== AI_PATH_ADAPTIVE_INTERVIEW_VERSION) return false
  if (!isRecord(state.context)) return false
  const parsedContext = validateStart(state.context)
  if (!parsedContext.value) return false
  const context = parsedContext.value
  if (state.status !== 'in_progress' && state.status !== 'complete') return false
  if (!Array.isArray(state.turns) || !Array.isArray(state.askedQuestionIds)) return false
  if (state.turns.length > AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS) return false
  if (state.askedQuestionIds.some(id => typeof id !== 'string')
    || new Set(state.askedQuestionIds).size !== state.askedQuestionIds.length
    || state.askedQuestionIds[0] !== `opening-${context.goalType}`) return false
  const askedQuestionIds = state.askedQuestionIds as string[]
  const expectedAskedCount = state.turns.length + (state.status === 'in_progress' ? 1 : 0)
  if (askedQuestionIds.length !== expectedAskedCount
    || askedQuestionIds.length > AI_PATH_ADAPTIVE_INTERVIEW_MAX_QUESTIONS) return false
  if (!state.turns.every((turn, index) => validTurn(turn, context, askedQuestionIds[index], index))) return false
  if (state.status === 'in_progress') {
    const currentId = askedQuestionIds[askedQuestionIds.length - 1]
    if (!validQuestion(state.currentQuestion, context, currentId, state.turns.length + 1)) return false
  } else if (state.currentQuestion !== null) return false
  return true
}

export function startAdaptiveInterview(input: unknown): StartAdaptiveInterviewResult {
  const parsed = validateStart(input)
  if (!parsed.value) return Object.freeze({ ok: false, error: 'invalid_start', issues: freezeArray(parsed.issues.map(freezeIssue)) })
  const currentQuestion = openingQuestion(parsed.value.goalType)
  return Object.freeze({
    ok: true,
    state: freezeState({
      version: AI_PATH_ADAPTIVE_INTERVIEW_VERSION,
      context: parsed.value,
      status: 'in_progress',
      turns: [],
      askedQuestionIds: [currentQuestion.id],
      currentQuestion,
    }),
  })
}

export function submitAdaptiveInterviewAnswer(
  state: unknown,
  answer: unknown,
): SubmitAdaptiveInterviewAnswerResult {
  if (!validState(state) || state.status !== 'in_progress' || !state.currentQuestion) {
    return Object.freeze({
      ok: false,
      error: 'invalid_state',
      issues: freezeArray([Object.freeze({ field: 'state', code: 'invalid_value' as const })]),
    })
  }
  if (typeof answer !== 'string') {
    return Object.freeze({
      ok: false,
      error: 'invalid_answer',
      issues: freezeArray([Object.freeze({ field: 'answer', code: 'invalid_type' as const })]),
    })
  }
  const normalizedAnswer = answer.trim()
  if (normalizedAnswer.length < 1 || normalizedAnswer.length > AI_PATH_ADAPTIVE_INTERVIEW_MAX_ANSWER_CHARS) {
    return Object.freeze({
      ok: false,
      error: 'invalid_answer',
      issues: freezeArray([Object.freeze({ field: 'answer', code: 'out_of_bounds' as const })]),
    })
  }

  const turn = freezeTurn({
    id: `answer-${state.turns.length + 1}`,
    questionId: state.currentQuestion.id,
    question: state.currentQuestion.prompt,
    answer: normalizedAnswer,
    dimensionsProbed: state.currentQuestion.dimensions,
  })
  const answeredState = freezeState({
    ...state,
    turns: [...state.turns, turn],
    currentQuestion: state.currentQuestion,
  })
  if (shouldComplete(answeredState)) {
    return Object.freeze({ ok: true, state: freezeState({ ...answeredState, status: 'complete', currentQuestion: null }) })
  }
  const template = selectNextTemplate(answeredState)
  if (!template) {
    return Object.freeze({ ok: true, state: freezeState({ ...answeredState, status: 'complete', currentQuestion: null }) })
  }
  const currentQuestion = questionFromTemplate(template, answeredState.turns.length + 1)
  return Object.freeze({
    ok: true,
    state: freezeState({
      ...answeredState,
      askedQuestionIds: [...answeredState.askedQuestionIds, currentQuestion.id],
      currentQuestion,
    }),
  })
}

export function summarizeAdaptiveInterview(state: unknown): AdaptiveInterviewSummary | null {
  if (!validState(state)) return null
  const dimensions = dimensionSummaries(state.turns)
  const required = new Set(requiredDimensions(state.context, state.turns))
  const missingDimensions = dimensions
    .filter(item => required.has(item.dimension) && item.status === 'missing')
    .map(item => item.dimension)
  const contradictoryDimensions = dimensions
    .filter(item => item.status === 'contradictory')
    .map(item => item.dimension)
  const transcriptTurns = state.turns.map(turn => Object.freeze({
    id: turn.id,
    speaker: 'user' as const,
    source: 'typed-response' as const,
    questionId: turn.questionId,
    text: turn.answer,
  }))
  return Object.freeze({
    version: AI_PATH_ADAPTIVE_INTERVIEW_VERSION,
    status: state.status,
    goalType: state.context.goalType,
    answeredQuestionCount: state.turns.length,
    insufficientEvidence: missingDimensions.length > 0 || contradictoryDimensions.length > 0,
    missingDimensions: freezeArray(missingDimensions),
    contradictoryDimensions: freezeArray(contradictoryDimensions),
    dimensions: freezeArray(dimensions),
    transcriptTurns: freezeArray(transcriptTurns),
    nextQuestion: state.currentQuestion,
  })
}

export function supportedAdaptiveInterviewGoalTypes(): readonly AiPathGoalType[] {
  return freezeArray(AI_PATH_GOAL_TYPES)
}
