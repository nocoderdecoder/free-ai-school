import { isCurrentVoiceConsent, type VoiceConsent } from './realtime-consent.ts'
import {
  INITIAL_REALTIME_VOICE_STATE,
  reduceRealtimeVoiceState,
  type RealtimeVoiceAction,
  type RealtimeVoiceState,
} from './realtime-session-state.ts'
import {
  applyTranscriptUpdate,
  normalizeRealtimeTranscriptEvent,
  type VoiceTranscriptItem,
} from './realtime-transcript.ts'

export const AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH = true as const

type EventListener = (event: unknown) => void

export type RealtimeMediaTrack = {
  stop(): void
  addEventListener?(type: 'ended', listener: EventListener): void
  removeEventListener?(type: 'ended', listener: EventListener): void
}

export type RealtimeMediaStream = {
  getTracks(): RealtimeMediaTrack[]
  getAudioTracks(): RealtimeMediaTrack[]
}

export type RealtimeDataChannel = {
  readonly readyState: string
  send(value: string): void
  close(): void
  addEventListener(type: 'open' | 'close' | 'error' | 'message', listener: EventListener): void
  removeEventListener(type: 'open' | 'close' | 'error' | 'message', listener: EventListener): void
}

export type RealtimePeerConnection = {
  readonly connectionState: string
  addTrack(track: RealtimeMediaTrack, stream: RealtimeMediaStream): void
  createDataChannel(label: 'oai-events'): RealtimeDataChannel
  createOffer(): Promise<{ type: 'offer'; sdp?: string }>
  setLocalDescription(description: { type: 'offer'; sdp?: string }): Promise<void>
  setRemoteDescription(description: { type: 'answer'; sdp: string }): Promise<void>
  addEventListener(type: 'track' | 'connectionstatechange', listener: EventListener): void
  removeEventListener(type: 'track' | 'connectionstatechange', listener: EventListener): void
  close(): void
}

export type RealtimeControllerDependencies = Readonly<{
  networkAccess: 'none' | 'provider'
  getUserMedia(constraints: { audio: true }): Promise<RealtimeMediaStream>
  createPeerConnection(): RealtimePeerConnection
  exchangeSdp(offerSdp: string): Promise<string>
  attachRemoteAudio(stream: unknown | null): Promise<void> | void
}>

export type RealtimeVoiceController = Readonly<{
  connect(consent: VoiceConsent | null): Promise<RealtimeVoiceState>
  reconnect(): Promise<RealtimeVoiceState>
  sendTypedMessage(text: string): boolean
  speakText(text: string): Promise<boolean>
  stopSpeaking(): boolean
  useTextFallback(): void
  close(): void
  getState(): RealtimeVoiceState
  getTranscript(): readonly VoiceTranscriptItem[]
}>

type ControllerOptions = Readonly<{
  dependencies: RealtimeControllerDependencies
  onStateChange?: (state: RealtimeVoiceState) => void
  onTranscriptChange?: (items: readonly VoiceTranscriptItem[]) => void
  onFinalUserTranscript?: (item: VoiceTranscriptItem) => void
  onFinalAssistantTranscript?: (item: VoiceTranscriptItem) => void
  maxReconnectAttempts?: number
}>

function safeMessage(error: unknown) {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'NotAllowedError') return 'Microphone permission was not granted.'
  return 'The voice session could not be connected. Continue by typing.'
}

export function createRealtimeVoiceController(options: ControllerOptions): RealtimeVoiceController {
  let state = INITIAL_REALTIME_VOICE_STATE
  let transcript: readonly VoiceTranscriptItem[] = Object.freeze([])
  let consent: VoiceConsent | null = null
  let peer: RealtimePeerConnection | null = null
  let channel: RealtimeDataChannel | null = null
  let localStream: RealtimeMediaStream | null = null
  let closing = false
  let pendingSpeech: { resolve(value: boolean): void; timeout: ReturnType<typeof setTimeout> } | null = null
  const pendingChannelMessages: string[] = []
  const maxReconnectAttempts = Math.max(0, Math.min(3, options.maxReconnectAttempts ?? 2))

  const dispatch = (action: RealtimeVoiceAction) => {
    state = reduceRealtimeVoiceState(state, action)
    options.onStateChange?.(state)
  }

  const handleTrackEnded = () => {
    if (closing) return
    dispatch({ type: 'DEVICE_LOST' })
    cleanup(false)
  }

  const handleDataMessage = (raw: unknown) => {
    const data = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data: unknown }).data : null
    if (typeof data !== 'string') return
    let event: unknown
    try { event = JSON.parse(data) } catch { return }
    const type = event && typeof event === 'object' && 'type' in event ? (event as { type: unknown }).type : null
    if (type === 'input_audio_buffer.speech_started') dispatch({ type: 'SPEECH_STARTED' })
    if (type === 'input_audio_buffer.speech_stopped') dispatch({ type: 'SPEECH_STOPPED' })
    if (type === 'response.done' || type === 'response.output_audio.done') {
      const resolver = pendingSpeech
      pendingSpeech = null
      if (resolver) {
        clearTimeout(resolver.timeout)
        resolver.resolve(true)
      }
    }
    if (type === 'error') {
      const resolver = pendingSpeech
      pendingSpeech = null
      if (resolver) {
        clearTimeout(resolver.timeout)
        resolver.resolve(false)
      }
      dispatch({ type: 'FAILED', error: 'The live conversation reported an error. Continue by typing.' })
      cleanup(false)
      return
    }
    const update = normalizeRealtimeTranscriptEvent(event)
    if (!update) return
    transcript = applyTranscriptUpdate(transcript, update)
    options.onTranscriptChange?.(transcript)
    const updated = transcript.find(item => item.itemId === update.itemId)
    if (updated?.final && updated.text.trim()) {
      if (updated.role === 'user') options.onFinalUserTranscript?.(updated)
      if (updated.role === 'assistant') options.onFinalAssistantTranscript?.(updated)
    }
  }

  const handleChannelOpen = () => {
    if (!channel || closing) return
    while (pendingChannelMessages.length && channel.readyState === 'open') {
      channel.send(pendingChannelMessages.shift() as string)
    }
    dispatch({ type: 'CONNECTED' })
  }
  const handleChannelClose = () => {
    if (!closing && state.phase !== 'device-lost' && state.phase !== 'failed') {
      dispatch({ type: 'FAILED', error: 'The voice connection closed. Reconnect or continue by typing.' })
    }
  }
  const handleChannelError = () => {
    if (!closing) {
      dispatch({ type: 'FAILED', error: 'The voice connection failed. Continue by typing.' })
      cleanup(false)
    }
  }
  const handleRemoteTrack = (raw: unknown) => {
    const streams = raw && typeof raw === 'object' && 'streams' in raw ? (raw as { streams?: unknown[] }).streams : null
    try {
      void Promise.resolve(options.dependencies.attachRemoteAudio(streams?.[0] ?? null)).catch(() => {
        if (!closing) dispatch({ type: 'FAILED', error: 'Remote audio could not be played. Continue by typing.' })
      })
    } catch {
      if (!closing) dispatch({ type: 'FAILED', error: 'Remote audio could not be played. Continue by typing.' })
    }
  }
  const handleConnectionState = () => {
    if (!peer || closing) return
    if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
      dispatch({ type: 'FAILED', error: 'The network connection was interrupted. Reconnect or continue by typing.' })
      cleanup(false)
    }
  }

  function cleanup(markClosed: boolean) {
    closing = true
    const resolver = pendingSpeech
    pendingSpeech = null
    if (resolver) {
      clearTimeout(resolver.timeout)
      resolver.resolve(false)
    }
    channel?.removeEventListener('open', handleChannelOpen)
    channel?.removeEventListener('close', handleChannelClose)
    channel?.removeEventListener('error', handleChannelError)
    channel?.removeEventListener('message', handleDataMessage)
    channel?.close()
    peer?.removeEventListener('track', handleRemoteTrack)
    peer?.removeEventListener('connectionstatechange', handleConnectionState)
    peer?.close()
    const tracks = typeof localStream?.getTracks === 'function' ? localStream.getTracks() : []
    for (const track of tracks) {
      track.removeEventListener?.('ended', handleTrackEnded)
      track.stop()
    }
    try {
      void Promise.resolve(options.dependencies.attachRemoteAudio(null)).catch(() => undefined)
    } catch {
      // Cleanup remains best-effort and never reopens media or provider access.
    }
    channel = null
    peer = null
    localStream = null
    pendingChannelMessages.length = 0
    if (markClosed) dispatch({ type: 'CLOSED' })
    closing = false
  }

  function sendOrQueue(value: string) {
    if (channel?.readyState === 'open') {
      channel.send(value)
      return true
    }
    if (channel && channel.readyState === 'connecting') {
      pendingChannelMessages.push(value)
      return true
    }
    return false
  }

  async function performConnection(nextConsent: VoiceConsent): Promise<RealtimeVoiceState> {
    try {
      dispatch({ type: 'MICROPHONE_REQUESTED' })
      localStream = await options.dependencies.getUserMedia({ audio: true })
      for (const track of localStream.getAudioTracks()) track.addEventListener?.('ended', handleTrackEnded)
      peer = options.dependencies.createPeerConnection()
      peer.addEventListener('track', handleRemoteTrack)
      peer.addEventListener('connectionstatechange', handleConnectionState)
      for (const track of localStream.getAudioTracks()) peer.addTrack(track, localStream)
      channel = peer.createDataChannel('oai-events')
      channel.addEventListener('open', handleChannelOpen)
      channel.addEventListener('close', handleChannelClose)
      channel.addEventListener('error', handleChannelError)
      channel.addEventListener('message', handleDataMessage)
      dispatch({ type: 'OFFER_STARTED' })
      const offer = await peer.createOffer()
      if (!offer.sdp) throw new Error('missing SDP')
      await peer.setLocalDescription(offer)
      const answerSdp = await options.dependencies.exchangeSdp(offer.sdp)
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      consent = nextConsent
    } catch (error) {
      cleanup(false)
      dispatch({ type: 'FAILED', error: safeMessage(error) })
    }
    return state
  }

  return Object.freeze({
    async connect(nextConsent) {
      if (!isCurrentVoiceConsent(nextConsent)) {
        dispatch({ type: 'CONSENT_MISSING' })
        return state
      }
      if (options.dependencies.networkAccess === 'provider' && !AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH) {
        dispatch({ type: 'PROVIDER_BLOCKED' })
        return state
      }
      cleanup(false)
      return performConnection(nextConsent)
    },
    async reconnect() {
      if (!consent || state.attempt >= maxReconnectAttempts) {
        dispatch({ type: 'FAILED', error: 'Reconnect limit reached. Continue by typing.' })
        return state
      }
      const attempt = state.attempt + 1
      cleanup(false)
      dispatch({ type: 'RECONNECTING', attempt })
      return performConnection(consent)
    },
    sendTypedMessage(value) {
      const text = value.trim()
      if (!text) return false
      const created = sendOrQueue(JSON.stringify({
        type: 'conversation.item.create',
        item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
      }))
      const requested = sendOrQueue(JSON.stringify({ type: 'response.create' }))
      return created && requested
    },
    speakText(value) {
      const text = value.trim().replace(/\s+/g, ' ').slice(0, 1_200)
      if (!text || !channel || !['connecting', 'open'].includes(channel.readyState)) return Promise.resolve(false)
      const previous = pendingSpeech
      pendingSpeech = null
      if (previous) {
        clearTimeout(previous.timeout)
        previous.resolve(false)
      }
      return new Promise(resolve => {
        const timeout = setTimeout(() => {
          if (pendingSpeech?.resolve === resolve) pendingSpeech = null
          resolve(false)
        }, Math.max(4_000, Math.min(20_000, text.length * 75)))
        pendingSpeech = { resolve, timeout }
        const sent = sendOrQueue(JSON.stringify({
          type: 'response.create',
          response: {
            instructions: [
              'Speak the following AI Path interview line exactly in a calm, premium product voice.',
              'Do not add any new question, extra advice, course recommendation, or explanation.',
              text,
            ].join('\n\n'),
            modalities: ['audio', 'text'],
          },
        }))
        if (!sent) {
          pendingSpeech = null
          clearTimeout(timeout)
          resolve(false)
        }
      })
    },
    stopSpeaking() {
      pendingChannelMessages.length = 0
      if (!channel || !['connecting', 'open'].includes(channel.readyState)) return false
      const resolver = pendingSpeech
      pendingSpeech = null
      if (resolver) {
        clearTimeout(resolver.timeout)
        resolver.resolve(false)
      }
      try {
        return sendOrQueue(JSON.stringify({ type: 'response.cancel' }))
      } catch {
        return false
      }
    },
    useTextFallback() {
      cleanup(false)
      dispatch({ type: 'TEXT_FALLBACK' })
    },
    close() { cleanup(true) },
    getState: () => state,
    getTranscript: () => transcript,
  })
}
