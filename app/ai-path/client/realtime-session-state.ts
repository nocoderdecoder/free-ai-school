export type RealtimeVoicePhase =
  | 'idle'
  | 'consent-required'
  | 'provider-disabled'
  | 'requesting-microphone'
  | 'connecting'
  | 'connected'
  | 'interrupted'
  | 'reconnecting'
  | 'device-lost'
  | 'failed'
  | 'text-fallback'
  | 'closed'

export type RealtimeVoiceState = Readonly<{
  phase: RealtimeVoicePhase
  attempt: number
  error: string | null
}>

export type RealtimeVoiceAction =
  | { type: 'CONSENT_MISSING' }
  | { type: 'PROVIDER_BLOCKED' }
  | { type: 'MICROPHONE_REQUESTED' }
  | { type: 'OFFER_STARTED' }
  | { type: 'CONNECTED' }
  | { type: 'SPEECH_STARTED' }
  | { type: 'SPEECH_STOPPED' }
  | { type: 'RECONNECTING'; attempt: number }
  | { type: 'DEVICE_LOST' }
  | { type: 'FAILED'; error: string }
  | { type: 'TEXT_FALLBACK' }
  | { type: 'CLOSED' }

export const INITIAL_REALTIME_VOICE_STATE: RealtimeVoiceState = Object.freeze({
  phase: 'idle',
  attempt: 0,
  error: null,
})

export function reduceRealtimeVoiceState(
  state: RealtimeVoiceState,
  action: RealtimeVoiceAction,
): RealtimeVoiceState {
  switch (action.type) {
    case 'CONSENT_MISSING': return Object.freeze({ ...state, phase: 'consent-required', error: null })
    case 'PROVIDER_BLOCKED': return Object.freeze({ ...state, phase: 'provider-disabled', error: null })
    case 'MICROPHONE_REQUESTED': return Object.freeze({ ...state, phase: 'requesting-microphone', error: null })
    case 'OFFER_STARTED': return Object.freeze({ ...state, phase: 'connecting', error: null })
    case 'CONNECTED': return Object.freeze({ phase: 'connected', attempt: state.attempt, error: null })
    case 'SPEECH_STARTED':
      return state.phase === 'connected' ? Object.freeze({ ...state, phase: 'interrupted' }) : state
    case 'SPEECH_STOPPED':
      return state.phase === 'interrupted' ? Object.freeze({ ...state, phase: 'connected' }) : state
    case 'RECONNECTING': return Object.freeze({ phase: 'reconnecting', attempt: action.attempt, error: null })
    case 'DEVICE_LOST': return Object.freeze({ ...state, phase: 'device-lost', error: 'Microphone device was disconnected.' })
    case 'FAILED': return Object.freeze({ ...state, phase: 'failed', error: action.error })
    case 'TEXT_FALLBACK': return Object.freeze({ ...state, phase: 'text-fallback', error: null })
    case 'CLOSED': return Object.freeze({ ...state, phase: 'closed', error: null })
  }
}
