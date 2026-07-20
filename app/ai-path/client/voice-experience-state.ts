export const VOICE_EXPERIENCE_PHASES = Object.freeze([
  'welcome',
  'sound-check',
  'connecting',
  'listening',
  'user-speaking',
  'thinking',
  'advisor-speaking',
  'understanding-review',
  'generating',
  'path',
  'reconnecting',
  'permission-denied',
  'service-unavailable',
  'typed-fallback',
] as const)

export type VoiceExperiencePhase = (typeof VOICE_EXPERIENCE_PHASES)[number]
export type VoiceExperienceMode = 'voice' | 'typed' | null
export type VoiceExperienceIssue =
  | 'microphone-permission-denied'
  | 'service-unavailable'
  | 'reconnect-limit-reached'
  | null

export type VoiceExperienceState = Readonly<{
  phase: VoiceExperiencePhase
  mode: VoiceExperienceMode
  reconnectAttempt: number
  issue: VoiceExperienceIssue
}>

export type VoiceExperienceEvent =
  | Readonly<{ type: 'BEGIN_VOICE' }>
  | Readonly<{ type: 'BEGIN_TYPED' }>
  | Readonly<{ type: 'MICROPHONE_READY' }>
  | Readonly<{ type: 'MICROPHONE_PERMISSION_DENIED' }>
  | Readonly<{ type: 'CONNECTION_ESTABLISHED' }>
  | Readonly<{ type: 'CONNECTION_LOST' }>
  | Readonly<{ type: 'SERVICE_UNAVAILABLE' }>
  | Readonly<{ type: 'USER_SPEECH_STARTED' }>
  | Readonly<{ type: 'USER_SPEECH_ENDED' }>
  | Readonly<{ type: 'ADVISOR_RESPONSE_STARTED' }>
  | Readonly<{ type: 'ADVISOR_RESPONSE_ENDED' }>
  | Readonly<{ type: 'VOICE_INTERVIEW_COMPLETE' }>
  | Readonly<{ type: 'TYPED_INTERVIEW_COMPLETE' }>
  | Readonly<{ type: 'CONTINUE_CONVERSATION' }>
  | Readonly<{ type: 'CONFIRM_UNDERSTANDING' }>
  | Readonly<{ type: 'PATH_READY' }>
  | Readonly<{ type: 'PATH_FAILED' }>
  | Readonly<{ type: 'RETRY_MICROPHONE' }>
  | Readonly<{ type: 'RETRY_SERVICE' }>
  | Readonly<{ type: 'USE_TYPED_FALLBACK' }>
  | Readonly<{ type: 'RETURN_TO_VOICE' }>
  | Readonly<{ type: 'START_OVER' }>

export type VoiceExperienceTransition = Readonly<{
  state: VoiceExperienceState
  accepted: boolean
  reason: 'invalid-transition' | null
}>

export const MAX_VOICE_RECONNECT_ATTEMPTS = 2

export const INITIAL_VOICE_EXPERIENCE_STATE: VoiceExperienceState = Object.freeze({
  phase: 'welcome',
  mode: null,
  reconnectAttempt: 0,
  issue: null,
})

const ACTIVE_VOICE_PHASES = new Set<VoiceExperiencePhase>([
  'connecting',
  'listening',
  'user-speaking',
  'thinking',
  'advisor-speaking',
])

const TYPED_FALLBACK_PHASES = new Set<VoiceExperiencePhase>([
  'sound-check',
  'connecting',
  'listening',
  'user-speaking',
  'thinking',
  'advisor-speaking',
  'reconnecting',
  'permission-denied',
  'service-unavailable',
])

function nextState(
  phase: VoiceExperiencePhase,
  mode: VoiceExperienceMode,
  reconnectAttempt = 0,
  issue: VoiceExperienceIssue = null,
): VoiceExperienceState {
  return Object.freeze({ phase, mode, reconnectAttempt, issue })
}

function accepted(state: VoiceExperienceState): VoiceExperienceTransition {
  return Object.freeze({ state, accepted: true, reason: null })
}

function rejected(state: VoiceExperienceState): VoiceExperienceTransition {
  return Object.freeze({ state, accepted: false, reason: 'invalid-transition' })
}

/**
 * Pure state transition for the user-visible voice journey.
 *
 * This model deliberately has no browser, credential, network, or provider
 * dependencies. Transport code may report events into it, but cannot be
 * invoked by it. Invalid or out-of-order events preserve the exact current
 * state object so callers fail closed instead of skipping product gates.
 */
export function transitionVoiceExperience(
  state: VoiceExperienceState,
  event: VoiceExperienceEvent,
): VoiceExperienceTransition {
  switch (event.type) {
    case 'BEGIN_VOICE':
      return state.phase === 'welcome'
        ? accepted(nextState('sound-check', 'voice'))
        : rejected(state)

    case 'BEGIN_TYPED':
      return state.phase === 'welcome'
        ? accepted(nextState('typed-fallback', 'typed'))
        : rejected(state)

    case 'MICROPHONE_READY':
      return state.phase === 'sound-check' && state.mode === 'voice'
        ? accepted(nextState('connecting', 'voice'))
        : rejected(state)

    case 'MICROPHONE_PERMISSION_DENIED':
      return state.phase === 'sound-check' && state.mode === 'voice'
        ? accepted(nextState('permission-denied', 'voice', 0, 'microphone-permission-denied'))
        : rejected(state)

    case 'CONNECTION_ESTABLISHED':
      return (state.phase === 'connecting' || state.phase === 'reconnecting') && state.mode === 'voice'
        ? accepted(nextState('listening', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'CONNECTION_LOST': {
      if (!ACTIVE_VOICE_PHASES.has(state.phase) || state.mode !== 'voice') return rejected(state)
      const reconnectAttempt = state.reconnectAttempt + 1
      return reconnectAttempt <= MAX_VOICE_RECONNECT_ATTEMPTS
        ? accepted(nextState('reconnecting', 'voice', reconnectAttempt))
        : accepted(nextState('service-unavailable', 'voice', state.reconnectAttempt, 'reconnect-limit-reached'))
    }

    case 'SERVICE_UNAVAILABLE':
      return (ACTIVE_VOICE_PHASES.has(state.phase) || state.phase === 'reconnecting') && state.mode === 'voice'
        ? accepted(nextState('service-unavailable', 'voice', state.reconnectAttempt, 'service-unavailable'))
        : rejected(state)

    case 'USER_SPEECH_STARTED':
      return (state.phase === 'listening' || state.phase === 'advisor-speaking') && state.mode === 'voice'
        ? accepted(nextState('user-speaking', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'USER_SPEECH_ENDED':
      return state.phase === 'user-speaking' && state.mode === 'voice'
        ? accepted(nextState('thinking', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'ADVISOR_RESPONSE_STARTED':
      return state.phase === 'thinking' && state.mode === 'voice'
        ? accepted(nextState('advisor-speaking', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'ADVISOR_RESPONSE_ENDED':
      return state.phase === 'advisor-speaking' && state.mode === 'voice'
        ? accepted(nextState('listening', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'VOICE_INTERVIEW_COMPLETE':
      return state.phase === 'listening' && state.mode === 'voice'
        ? accepted(nextState('understanding-review', 'voice', state.reconnectAttempt))
        : rejected(state)

    case 'TYPED_INTERVIEW_COMPLETE':
      return state.phase === 'typed-fallback' && state.mode === 'typed'
        ? accepted(nextState('understanding-review', 'typed'))
        : rejected(state)

    case 'CONTINUE_CONVERSATION':
      if (state.phase !== 'understanding-review') return rejected(state)
      if (state.mode === 'voice') return accepted(nextState('listening', 'voice', state.reconnectAttempt))
      if (state.mode === 'typed') return accepted(nextState('typed-fallback', 'typed'))
      return rejected(state)

    case 'CONFIRM_UNDERSTANDING':
      return state.phase === 'understanding-review' && state.mode !== null
        ? accepted(nextState('generating', state.mode, state.reconnectAttempt))
        : rejected(state)

    case 'PATH_READY':
      return state.phase === 'generating' && state.mode !== null
        ? accepted(nextState('path', state.mode, state.reconnectAttempt))
        : rejected(state)

    case 'PATH_FAILED':
      return state.phase === 'generating' && state.mode !== null
        ? accepted(nextState('understanding-review', state.mode, state.reconnectAttempt))
        : rejected(state)

    case 'RETRY_MICROPHONE':
      return state.phase === 'permission-denied' && state.mode === 'voice'
        ? accepted(nextState('sound-check', 'voice'))
        : rejected(state)

    case 'RETRY_SERVICE':
      return state.phase === 'service-unavailable' && state.mode === 'voice'
        ? accepted(nextState('connecting', 'voice'))
        : rejected(state)

    case 'USE_TYPED_FALLBACK':
      return TYPED_FALLBACK_PHASES.has(state.phase)
        ? accepted(nextState('typed-fallback', 'typed'))
        : rejected(state)

    case 'RETURN_TO_VOICE':
      return state.phase === 'typed-fallback' && state.mode === 'typed'
        ? accepted(nextState('sound-check', 'voice'))
        : rejected(state)

    case 'START_OVER':
      return accepted(INITIAL_VOICE_EXPERIENCE_STATE)

    default:
      return rejected(state)
  }
}

export function reduceVoiceExperienceState(
  state: VoiceExperienceState,
  event: VoiceExperienceEvent,
): VoiceExperienceState {
  return transitionVoiceExperience(state, event).state
}
