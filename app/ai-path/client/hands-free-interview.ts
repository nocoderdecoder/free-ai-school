import {
  canonicalQuestionPresentation,
  nextDiagnosticQuestionSection,
  type AdaptiveQuestionPresentation,
  type DiagnosticSectionId,
} from '../lib/constrained-question-routing.ts'
import { isSubstantiveDiagnosticText, type DiagnosticPath } from '../lib/diagnostic.ts'

export const HANDS_FREE_INTERVIEW_VERSION = '2026-07-19.v1' as const
export const HANDS_FREE_CORE_QUESTION_COUNT = 6 as const
export const MAX_HANDS_FREE_TRANSCRIPT_CHARACTERS = 2_000 as const
export const MAX_HANDS_FREE_REPAIR_ATTEMPTS = 1 as const

export type HandsFreeInterviewPhase =
  | 'ready'
  | 'advisor-speaking'
  | 'listening'
  | 'user-speaking'
  | 'analyzing'
  | 'reviewing'
  | 'generating-plan'
  | 'complete'
  | 'failed'
  | 'closed'

export type HandsFreeSpokenKind = 'opening' | 'question' | 'repair'

export type HandsFreeInterviewState = Readonly<{
  version: typeof HANDS_FREE_INTERVIEW_VERSION
  path: DiagnosticPath
  phase: HandsFreeInterviewPhase
  currentSectionId: DiagnosticSectionId
  question: AdaptiveQuestionPresentation
  spokenText: string
  spokenKind: HandsFreeSpokenKind
  coreQuestionNumber: number
  coreQuestionCount: typeof HANDS_FREE_CORE_QUESTION_COUNT
  acceptedAnswerCount: number
  repairAttempt: number
  answerCharacterCount: number
  issue: 'answer-needs-detail' | 'answer-needs-typed-fallback' | 'service-unavailable' | null
}>

export type HandsFreeInterviewEvent =
  | Readonly<{ type: 'START' }>
  | Readonly<{ type: 'ADVISOR_FINISHED' }>
  | Readonly<{ type: 'SPEECH_STARTED' }>
  | Readonly<{ type: 'FINAL_TRANSCRIPT'; characterCount: number }>
  | Readonly<{ type: 'ANSWER_REPAIR'; prompt: string }>
  | Readonly<{
      type: 'NEXT_QUESTION'
      presentation: AdaptiveQuestionPresentation
      spokenText: string
      action: 'clarify_current' | 'advance'
    }>
  | Readonly<{ type: 'GENERATE_PLAN' }>
  | Readonly<{ type: 'REVIEW_TRANSCRIPT' }>
  | Readonly<{ type: 'SILENCE_TIMEOUT'; prompt: string }>
  | Readonly<{ type: 'REPAIR_EXHAUSTED' }>
  | Readonly<{ type: 'PLAN_READY' }>
  | Readonly<{ type: 'FAILED' }>
  | Readonly<{ type: 'CLOSE' }>

export type HandsFreeAnswerReview =
  | Readonly<{ ok: false; repairPrompt: string }>
  | Readonly<{
      ok: true
      answers: Readonly<Record<string, unknown>>
      acknowledgement: string
    }>

export type HandsFreeNextQuestion =
  | Readonly<{ action: 'complete' }>
  | Readonly<{
      action: 'clarify_current' | 'advance'
      presentation: AdaptiveQuestionPresentation
    }>

export type HandsFreeTranscriptTurn = Readonly<{
  itemId: string
  sectionId: DiagnosticSectionId
  question: string
  answer: string
}>

export type HandsFreeInterviewController<Plan> = Readonly<{
  start(): Promise<HandsFreeInterviewState>
  notifyAdvisorFinished(): HandsFreeInterviewState
  notifySpeechStarted(): HandsFreeInterviewState
  submitFinalTranscript(input: Readonly<{ itemId: string; text: string }>): Promise<HandsFreeInterviewState>
  updateTranscript(input: Readonly<{ itemId: string; text: string }>): HandsFreeInterviewState
  confirmTranscript(): Promise<HandsFreeInterviewState>
  close(): HandsFreeInterviewState
  getState(): HandsFreeInterviewState
  getTranscript(): readonly HandsFreeTranscriptTurn[]
  getPlan(): Plan | null
}>

export type HandsFreeInterviewControllerOptions<Plan> = Readonly<{
  path: DiagnosticPath
  initialAnswers: Readonly<Record<string, unknown>>
  reviewAnswer(input: Readonly<{
    path: DiagnosticPath
    sectionId: DiagnosticSectionId
    transcript: string
    answers: Readonly<Record<string, unknown>>
    repairAttempt: number
  }>): Promise<HandsFreeAnswerReview>
  requestNextQuestion(input: Readonly<{
    path: DiagnosticPath
    completedSectionId: DiagnosticSectionId
    expectedSectionId: DiagnosticSectionId | null
    answers: Readonly<Record<string, unknown>>
    usedClarifierSectionIds: readonly DiagnosticSectionId[]
  }>): Promise<HandsFreeNextQuestion>
  generatePlan(input: Readonly<{
    path: DiagnosticPath
    answers: Readonly<Record<string, unknown>>
  }>): Promise<Plan>
  speak(input: Readonly<{ kind: HandsFreeSpokenKind; text: string }>): Promise<void>
  stopSpeaking?(): void
  finalizeTranscript?(input: Readonly<{
    path: DiagnosticPath
    initialAnswers: Readonly<Record<string, unknown>>
    currentAnswers: Readonly<Record<string, unknown>>
    transcript: readonly HandsFreeTranscriptTurn[]
  }>): Promise<Readonly<Record<string, unknown>>>
  silenceTimeoutMs?: number
  scheduleTimeout?(callback: () => void, delayMs: number): ReturnType<typeof setTimeout>
  clearScheduledTimeout?(timeout: ReturnType<typeof setTimeout>): void
  onStateChange?(state: HandsFreeInterviewState): void
  onPlanReady?(plan: Plan): void
}>

const allowedActiveTranscriptPhases = new Set<HandsFreeInterviewPhase>(['listening', 'user-speaking'])

function freezeState(state: HandsFreeInterviewState): HandsFreeInterviewState {
  return Object.freeze(state)
}

function firstSection(path: DiagnosticPath): DiagnosticSectionId {
  return path === 'use-case' ? 'outcome' : 'direction'
}

function openingText(question: AdaptiveQuestionPresentation) {
  return `Let's build your AI path together. ${question.prompt}`
}

function safeRepairPrompt(value: string) {
  const prompt = value.trim().replace(/\s+/g, ' ').slice(0, 240)
  return prompt.length >= 12
    ? prompt
    : 'Could you give me one concrete example so I can make your path specific?'
}

function safeAcknowledgement(value: string) {
  const acknowledgement = value.trim().replace(/\s+/g, ' ').replace(/\?+/g, '.').slice(0, 160)
  if (acknowledgement.length < 3) return 'Got it.'
  return /[.!]$/.test(acknowledgement) ? acknowledgement : `${acknowledgement}.`
}

function questionText(acknowledgement: string, question: AdaptiveQuestionPresentation) {
  return `${safeAcknowledgement(acknowledgement)} ${question.prompt}`
}

export function createInitialHandsFreeInterviewState(path: DiagnosticPath): HandsFreeInterviewState {
  const sectionId = firstSection(path)
  const question = canonicalQuestionPresentation(path, sectionId)
  return freezeState({
    version: HANDS_FREE_INTERVIEW_VERSION,
    path,
    phase: 'ready',
    currentSectionId: sectionId,
    question,
    spokenText: openingText(question),
    spokenKind: 'opening',
    coreQuestionNumber: 1,
    coreQuestionCount: HANDS_FREE_CORE_QUESTION_COUNT,
    acceptedAnswerCount: 0,
    repairAttempt: 0,
    answerCharacterCount: 0,
    issue: null,
  })
}

/**
 * Provider-free state transition for the hands-free interview. Raw transcripts,
 * credentials, media objects, and provider errors never enter this state.
 */
export function reduceHandsFreeInterview(
  state: HandsFreeInterviewState,
  event: HandsFreeInterviewEvent,
): HandsFreeInterviewState {
  if (event.type === 'CLOSE') return freezeState({ ...state, phase: 'closed', spokenText: '', issue: null })
  switch (event.type) {
    case 'START':
      return state.phase === 'ready'
        ? freezeState({ ...state, phase: 'advisor-speaking', issue: null })
        : state
    case 'ADVISOR_FINISHED':
      return state.phase === 'advisor-speaking'
        ? freezeState({ ...state, phase: 'listening', spokenText: '', issue: null })
        : state
    case 'SPEECH_STARTED':
      return (state.phase === 'listening' || state.phase === 'advisor-speaking')
        ? freezeState({ ...state, phase: 'user-speaking', spokenText: '', issue: null })
        : state
    case 'FINAL_TRANSCRIPT':
      return allowedActiveTranscriptPhases.has(state.phase) && event.characterCount > 0
        ? freezeState({ ...state, phase: 'analyzing', answerCharacterCount: event.characterCount, issue: null })
        : state
    case 'ANSWER_REPAIR':
      return state.phase === 'analyzing'
        ? freezeState({
            ...state,
            phase: 'advisor-speaking',
            spokenText: safeRepairPrompt(event.prompt),
            spokenKind: 'repair',
            repairAttempt: state.repairAttempt + 1,
            issue: 'answer-needs-detail',
          })
        : state
    case 'SILENCE_TIMEOUT':
      return state.phase === 'listening'
        ? freezeState({
            ...state,
            phase: 'advisor-speaking',
            spokenText: safeRepairPrompt(event.prompt),
            spokenKind: 'repair',
            repairAttempt: state.repairAttempt + 1,
            issue: 'answer-needs-detail',
          })
        : state
    case 'REPAIR_EXHAUSTED':
      return ['listening', 'analyzing', 'advisor-speaking'].includes(state.phase)
        ? freezeState({
            ...state,
            phase: 'failed',
            spokenText: '',
            issue: 'answer-needs-typed-fallback',
          })
        : state
    case 'NEXT_QUESTION': {
      if (state.phase !== 'analyzing') return state
      const advanced = event.action === 'advance'
      return freezeState({
        ...state,
        phase: 'advisor-speaking',
        currentSectionId: event.presentation.sectionId,
        question: event.presentation,
        spokenText: event.spokenText,
        spokenKind: 'question',
        coreQuestionNumber: advanced ? Math.min(HANDS_FREE_CORE_QUESTION_COUNT, state.coreQuestionNumber + 1) : state.coreQuestionNumber,
        acceptedAnswerCount: state.acceptedAnswerCount + (advanced ? 1 : 0),
        repairAttempt: 0,
        answerCharacterCount: 0,
        issue: null,
      })
    }
    case 'REVIEW_TRANSCRIPT':
      return state.phase === 'analyzing'
        ? freezeState({
            ...state,
            phase: 'reviewing',
            acceptedAnswerCount: Math.min(HANDS_FREE_CORE_QUESTION_COUNT, state.acceptedAnswerCount + 1),
            spokenText: '',
            issue: null,
          })
        : state
    case 'GENERATE_PLAN':
      return state.phase === 'reviewing'
        && state.acceptedAnswerCount >= 4
        && state.acceptedAnswerCount <= HANDS_FREE_CORE_QUESTION_COUNT
        ? freezeState({ ...state, phase: 'generating-plan', spokenText: '', issue: null })
        : state
    case 'PLAN_READY':
      return state.phase === 'generating-plan'
        ? freezeState({ ...state, phase: 'complete', spokenText: '', issue: null })
        : state
    case 'FAILED':
      return ['analyzing', 'generating-plan', 'advisor-speaking'].includes(state.phase)
        ? freezeState({ ...state, phase: 'failed', spokenText: '', issue: 'service-unavailable' })
        : state
    default:
      return state
  }
}

export function createHandsFreeInterviewController<Plan>(
  options: HandsFreeInterviewControllerOptions<Plan>,
): HandsFreeInterviewController<Plan> {
  let state = createInitialHandsFreeInterviewState(options.path)
  let answers = options.initialAnswers
  let plan: Plan | null = null
  let acceptedTranscript: HandsFreeTranscriptTurn[] = []
  let closed = false
  let operation = 0
  const transcriptItemIds = new Set<string>()
  const usedClarifierSectionIds: DiagnosticSectionId[] = []
  let silenceTimer: ReturnType<typeof setTimeout> | null = null
  const scheduleTimeout = options.scheduleTimeout ?? ((callback, delayMs) => setTimeout(callback, delayMs))
  const clearScheduledTimeout = options.clearScheduledTimeout ?? (timeout => clearTimeout(timeout))
  const silenceTimeoutMs = Math.max(8_000, Math.min(90_000, options.silenceTimeoutMs ?? 30_000))

  const clearSilenceTimer = () => {
    if (silenceTimer) clearScheduledTimeout(silenceTimer)
    silenceTimer = null
  }

  const dispatch = (event: HandsFreeInterviewEvent) => {
    state = reduceHandsFreeInterview(state, event)
    options.onStateChange?.(state)
    return state
  }

  async function speakCurrent(operationId: number) {
    if (closed || operationId !== operation || state.phase !== 'advisor-speaking') return state
    try {
      await options.speak({ kind: state.spokenKind, text: state.spokenText })
      if (!closed && operationId === operation) {
        const nextState = dispatch({ type: 'ADVISOR_FINISHED' })
        if (nextState.phase !== 'listening') return state
        clearSilenceTimer()
        silenceTimer = scheduleTimeout(() => {
          if (closed || operationId !== operation || state.phase !== 'listening') return
          if (state.repairAttempt >= MAX_HANDS_FREE_REPAIR_ATTEMPTS) {
            dispatch({ type: 'REPAIR_EXHAUSTED' })
            return
          }
          dispatch({
            type: 'SILENCE_TIMEOUT',
            prompt: 'Take your time. When you are ready, tell me one concrete example—or say that you have not tried this yet.',
          })
          void speakCurrent(operationId)
        }, silenceTimeoutMs)
      }
    } catch {
      if (!closed && operationId === operation) dispatch({ type: 'FAILED' })
    }
    return state
  }

  return Object.freeze({
    async start() {
      if (closed || state.phase !== 'ready') return state
      const operationId = ++operation
      dispatch({ type: 'START' })
      return speakCurrent(operationId)
    },
    notifyAdvisorFinished() {
      return dispatch({ type: 'ADVISOR_FINISHED' })
    },
    notifySpeechStarted() {
      clearSilenceTimer()
      if (state.phase === 'advisor-speaking') {
        operation += 1
        options.stopSpeaking?.()
      }
      return dispatch({ type: 'SPEECH_STARTED' })
    },
    async submitFinalTranscript(input) {
      if (closed || !allowedActiveTranscriptPhases.has(state.phase)) return state
      clearSilenceTimer()
      const itemId = input.itemId.trim()
      const answerText = input.text.trim().replace(/\s+/g, ' ')
      if (!itemId || transcriptItemIds.has(itemId)) return state
      if (
        answerText.length > MAX_HANDS_FREE_TRANSCRIPT_CHARACTERS
        || !isSubstantiveDiagnosticText(answerText, 3)
      ) {
        const operationId = ++operation
        dispatch({ type: 'FINAL_TRANSCRIPT', characterCount: Math.max(1, answerText.length) })
        if (state.repairAttempt >= MAX_HANDS_FREE_REPAIR_ATTEMPTS) {
          return dispatch({ type: 'REPAIR_EXHAUSTED' })
        }
        dispatch({ type: 'ANSWER_REPAIR', prompt: 'I did not catch enough to use that answer. Please give me one concrete example.' })
        return speakCurrent(operationId)
      }
      transcriptItemIds.add(itemId)
      const operationId = ++operation
      const completedSectionId = state.currentSectionId
      const repairAttempt = state.repairAttempt
      dispatch({ type: 'FINAL_TRANSCRIPT', characterCount: answerText.length })
      try {
        const review = await options.reviewAnswer({
          path: options.path,
          sectionId: completedSectionId,
          transcript: answerText,
          answers,
          repairAttempt,
        })
        if (closed || operationId !== operation) return state
        if (!review.ok) {
          transcriptItemIds.delete(itemId)
          if (state.repairAttempt >= MAX_HANDS_FREE_REPAIR_ATTEMPTS) {
            return dispatch({ type: 'REPAIR_EXHAUSTED' })
          }
          dispatch({ type: 'ANSWER_REPAIR', prompt: review.repairPrompt })
          return speakCurrent(operationId)
        }
        answers = review.answers
        acceptedTranscript.push(Object.freeze({
          itemId,
          sectionId: completedSectionId,
          question: state.question.prompt,
          answer: answerText,
        }))
        const expectedSectionId = nextDiagnosticQuestionSection(options.path, completedSectionId)
        const next = await options.requestNextQuestion({
          path: options.path,
          completedSectionId,
          expectedSectionId,
          answers,
          usedClarifierSectionIds,
        })
        if (closed || operationId !== operation) return state
        if (next.action === 'complete') {
          const acceptedAnswerCount = state.acceptedAnswerCount + 1
          if (
            expectedSectionId !== null
            || acceptedAnswerCount < 4
            || acceptedAnswerCount > HANDS_FREE_CORE_QUESTION_COUNT
          ) {
            throw new Error('hands_free_premature_completion')
          }
          dispatch({ type: 'REVIEW_TRANSCRIPT' })
          return state
        }
        if (next.action === 'clarify_current') {
          if (!usedClarifierSectionIds.includes(completedSectionId)) usedClarifierSectionIds.push(completedSectionId)
          if (next.presentation.sectionId !== completedSectionId) throw new Error('hands_free_invalid_clarifier')
        } else if (next.presentation.sectionId !== expectedSectionId) {
          throw new Error('hands_free_invalid_next_section')
        }
        dispatch({
          type: 'NEXT_QUESTION',
          action: next.action,
          presentation: next.presentation,
          spokenText: questionText(review.acknowledgement, next.presentation),
        })
        return speakCurrent(operationId)
      } catch {
        if (state.phase === 'analyzing') transcriptItemIds.delete(itemId)
        if (!closed && operationId === operation) dispatch({ type: 'FAILED' })
        return state
      }
    },
    updateTranscript(input) {
      if (closed || state.phase !== 'reviewing') return state
      const itemId = input.itemId.trim()
      const text = input.text.trim().replace(/\s+/g, ' ')
      if (
        !itemId
        || !transcriptItemIds.has(itemId)
        || !acceptedTranscript.some(turn => turn.itemId === itemId)
        || !isSubstantiveDiagnosticText(text, 3)
        || text.length > MAX_HANDS_FREE_TRANSCRIPT_CHARACTERS
      ) {
        return state
      }
      acceptedTranscript = acceptedTranscript.map(turn => turn.itemId === itemId
        ? Object.freeze({ ...turn, answer: text })
        : turn)
      options.onStateChange?.(state)
      return state
    },
    async confirmTranscript() {
      if (closed || state.phase !== 'reviewing') return state
      const operationId = ++operation
      const generatingState = dispatch({ type: 'GENERATE_PLAN' })
      if (generatingState.phase !== 'generating-plan') return state
      try {
        if (options.finalizeTranscript) {
          answers = await options.finalizeTranscript({
            path: options.path,
            initialAnswers: options.initialAnswers,
            currentAnswers: answers,
            transcript: acceptedTranscript,
          })
        }
        if (closed || operationId !== operation) return state
        plan = await options.generatePlan({ path: options.path, answers })
        if (closed || operationId !== operation) return state
        dispatch({ type: 'PLAN_READY' })
        options.onPlanReady?.(plan)
      } catch {
        if (!closed && operationId === operation) dispatch({ type: 'FAILED' })
      }
      return state
    },
    close() {
      closed = true
      operation += 1
      clearSilenceTimer()
      options.stopSpeaking?.()
      return dispatch({ type: 'CLOSE' })
    },
    getState: () => state,
    getTranscript: () => Object.freeze(acceptedTranscript.map(turn => Object.freeze({ ...turn }))),
    getPlan: () => plan,
  })
}
