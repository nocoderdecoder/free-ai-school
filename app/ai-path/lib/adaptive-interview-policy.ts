import {
  CAPABILITY_SECTION_IDS,
  USE_CASE_SECTION_IDS,
  type DiagnosticPath,
} from './diagnostic.ts'
import {
  nextDiagnosticQuestionSection,
  type DiagnosticSectionId,
} from './constrained-question-routing.ts'

export const ADAPTIVE_INTERVIEW_POLICY_VERSION = '2026-07-18.v2' as const
export const MAXIMUM_INTERVIEW_CLARIFIERS = 2 as const

export type GroundedClarifier = Readonly<{
  version: typeof ADAPTIVE_INTERVIEW_POLICY_VERSION
  id: string
  path: DiagnosticPath
  sectionId: DiagnosticSectionId
  reason: string
  prompt: string
  answerGuidance: string
}>

export type AdaptiveInterviewPolicyDecision = Readonly<{
  version: typeof ADAPTIVE_INTERVIEW_POLICY_VERSION
  action: 'clarify_current' | 'advance' | 'complete'
  fixedRoute: true
  currentSectionId: DiagnosticSectionId
  nextSectionId: DiagnosticSectionId | null
  clarifier: GroundedClarifier | null
}>

type ClarifierDefinition = Readonly<{
  id: string
  reason: string
  prompt: string
  answerGuidance: string
}>

const CLARIFIERS: Readonly<Record<DiagnosticPath, Readonly<Partial<Record<DiagnosticSectionId, ClarifierDefinition>>>>> = Object.freeze({
  'use-case': Object.freeze({
    outcome: Object.freeze({
      id: 'use-case-real-task',
      reason: 'A real task makes the project and learning advice specific.',
      prompt: 'Take one real example. Who is doing the task, what are they trying to finish, and what should be better afterward?',
      answerGuidance: 'A person or team, one task, and the change you want to see.',
    }),
    workflow: Object.freeze({
      id: 'use-case-current-bottleneck',
      reason: 'The first project should start where the current work actually gets stuck.',
      prompt: 'Think of the last time this happened. What did someone do first, what happened next, and where did they wait, redo work, search, or ask for a check?',
      answerGuidance: 'Two or three current steps and the step that causes the most trouble.',
    }),
    specification: Object.freeze({
      id: 'use-case-example-contract',
      reason: 'One example helps us keep the first version small and testable.',
      prompt: 'For one real example, what information would you give the AI, what should it give back, and how would you decide the result is good enough?',
      answerGuidance: 'One example input, one expected result, and one visible success check.',
    }),
    experience: Object.freeze({
      id: 'use-case-personal-attempt',
      reason: 'We should build from what you have actually tried, not from a title or confidence rating.',
      prompt: 'What did you personally make, change, or test for this idea, and what happened when you tried it?',
      answerGuidance: 'Your action, what you produced, and one result or problem you noticed.',
    }),
  }),
  'capability-growth': Object.freeze({
    evidence: Object.freeze({
      id: 'capability-real-attempt',
      reason: 'A small real attempt tells us more than a list of tools or courses.',
      prompt: 'Choose one thing you tried with AI. What did you do yourself, what did you produce, and how did you check whether it helped?',
      answerGuidance: 'One task, your part in it, the result, and any check you used.',
    }),
    reasoning: Object.freeze({
      id: 'capability-decision-check',
      reason: 'A concrete decision shows how you test quality and know when a person should step in.',
      prompt: 'Name one check you would run before using the result, one problem that would make you stop, and when a person should review it.',
      answerGuidance: 'One check, one stop condition, and one human-review point.',
    }),
  }),
})

const noExperiencePattern = /\b(?:have not|haven't|never|not yet|no (?:experience|example)|just getting started)\b/i
const actionPattern = /\b(?:build|built|create|created|make|made|change|changed|adapt|adapted|test|tested|try|tried|use|used|run|ran|compare|compared|measure|measured|review|reviewed)\b/i
const workflowPattern = /\b(?:first|then|next|after|before|currently|today|manual|wait|slow|search|repeat|redo|review|approve|error|handoff|step)\b/i
const actorPattern = /\b(?:I|we|my|our|team|person|people|user|customer|client|student|manager|employee|sales|operations|support|teacher|writer|analyst|founder)\b/i
const successPattern = /\b(?:\d|percent|%|minute|hour|faster|slower|accuracy|accurate|correct|approved|every|all|fewer|reduce|increase|save|quality|complete)\b/i
const evaluationPattern = /\b(?:test|check|measure|compare|example|rubric|expected|baseline|verify|validate)\b/i
const failurePattern = /\b(?:wrong|fail|error|uncertain|edge|risk|harm|stop|reject|escalate|unsupported)\b/i
const humanPattern = /\b(?:person|people|human|review|approve|manager|expert|owner|team)\b/i

function record(value: unknown): Readonly<Record<string, unknown>> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {}
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function nestedText(answers: Readonly<Record<string, unknown>>, section: string, field: string): string {
  return text(record(answers[section])[field])
}

function meaningfulWordCount(value: string): number {
  return value
    .toLowerCase()
    .match(/[a-z0-9]+(?:'[a-z]+)?/g)
    ?.filter(word => !['a', 'an', 'and', 'are', 'as', 'at', 'be', 'for', 'from', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'we', 'with'].includes(word))
    .length ?? 0
}

function needsUseCaseClarifier(sectionId: DiagnosticSectionId, answers: Readonly<Record<string, unknown>>): boolean {
  if (sectionId === 'outcome') {
    const value = nestedText(answers, 'outcome', 'desiredOutcome')
    return meaningfulWordCount(value) < 8 || !actorPattern.test(value)
  }
  if (sectionId === 'workflow') {
    const value = nestedText(answers, 'workflow', 'currentProcess')
    return meaningfulWordCount(value) < 10 || !workflowPattern.test(value)
  }
  if (sectionId === 'specification') {
    const section = record(answers.specification)
    const input = text(section.inputs)
    const output = text(section.output)
    const success = text(section.success)
    return meaningfulWordCount(input) < 3 || meaningfulWordCount(output) < 3 || meaningfulWordCount(success) < 4 || !successPattern.test(success)
  }
  if (sectionId === 'experience') {
    const section = record(answers.experience)
    const level = text(section.level)
    const evidence = text(section.evidence)
    if (level === 'none' || noExperiencePattern.test(evidence)) return false
    return ['adapted', 'independent', 'demonstrated', 'operational'].includes(level)
      && (meaningfulWordCount(evidence) < 10 || !actionPattern.test(evidence))
  }
  return false
}

function needsCapabilityClarifier(sectionId: DiagnosticSectionId, answers: Readonly<Record<string, unknown>>): boolean {
  if (sectionId === 'evidence') {
    const value = nestedText(answers, 'evidence', 'description')
    if (noExperiencePattern.test(value)) return false
    return meaningfulWordCount(value) < 10 || !actionPattern.test(value)
  }
  if (sectionId === 'reasoning') {
    const value = nestedText(answers, 'reasoning', 'response')
    const decisionSignals = [evaluationPattern, failurePattern, humanPattern].filter(pattern => pattern.test(value)).length
    return meaningfulWordCount(value) < 12 || decisionSignals < 2
  }
  return false
}

function needsClarifier(path: DiagnosticPath, sectionId: DiagnosticSectionId, answers: Readonly<Record<string, unknown>>): boolean {
  return path === 'use-case'
    ? needsUseCaseClarifier(sectionId, answers)
    : needsCapabilityClarifier(sectionId, answers)
}

function validSection(path: DiagnosticPath, sectionId: DiagnosticSectionId): boolean {
  const ids: readonly string[] = path === 'use-case' ? USE_CASE_SECTION_IDS : CAPABILITY_SECTION_IDS
  return ids.includes(sectionId)
}

export function decideAdaptiveInterviewPolicy(input: Readonly<{
  path: DiagnosticPath
  completedSectionId: DiagnosticSectionId
  answers: Readonly<Record<string, unknown>>
  usedClarifierSectionIds: readonly DiagnosticSectionId[]
}>): AdaptiveInterviewPolicyDecision {
  if (!validSection(input.path, input.completedSectionId)) throw new Error('invalid_adaptive_interview_section')
  const usedSections = new Set(input.usedClarifierSectionIds)
  if (
    input.usedClarifierSectionIds.length > MAXIMUM_INTERVIEW_CLARIFIERS
    || usedSections.size !== input.usedClarifierSectionIds.length
    || input.usedClarifierSectionIds.some(sectionId => !validSection(input.path, sectionId))
  ) {
    throw new Error('invalid_adaptive_interview_clarifier_state')
  }
  const nextSectionId = nextDiagnosticQuestionSection(input.path, input.completedSectionId)
  const definition = CLARIFIERS[input.path][input.completedSectionId]
  const shouldClarify = usedSections.size < MAXIMUM_INTERVIEW_CLARIFIERS
    && !usedSections.has(input.completedSectionId)
    && Boolean(definition)
    && needsClarifier(input.path, input.completedSectionId, input.answers)

  if (shouldClarify && definition) {
    return Object.freeze({
      version: ADAPTIVE_INTERVIEW_POLICY_VERSION,
      action: 'clarify_current',
      fixedRoute: true,
      currentSectionId: input.completedSectionId,
      nextSectionId,
      clarifier: Object.freeze({
        version: ADAPTIVE_INTERVIEW_POLICY_VERSION,
        id: definition.id,
        path: input.path,
        sectionId: input.completedSectionId,
        reason: definition.reason,
        prompt: definition.prompt,
        answerGuidance: definition.answerGuidance,
      }),
    })
  }

  return Object.freeze({
    version: ADAPTIVE_INTERVIEW_POLICY_VERSION,
    action: nextSectionId ? 'advance' : 'complete',
    fixedRoute: true,
    currentSectionId: input.completedSectionId,
    nextSectionId,
    clarifier: null,
  })
}
