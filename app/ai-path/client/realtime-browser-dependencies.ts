import type {
  RealtimeControllerDependencies,
  RealtimeMediaStream,
  RealtimePeerConnection,
} from './realtime-controller.ts'

const MAX_SDP_BYTES = 200_000

type AudioSink = Pick<HTMLAudioElement, 'autoplay' | 'pause' | 'play' | 'srcObject'>

async function readBoundedText(response: Response, maxBytes: number) {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let bytes = 0
  let value = ''
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    bytes += chunk.value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      throw new Error('Realtime response exceeded the safe size limit.')
    }
    value += decoder.decode(chunk.value, { stream: true })
  }
  return value + decoder.decode()
}

function answerSdp(response: Response, body: string) {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    let value: unknown
    try { value = JSON.parse(body) } catch { throw new Error('Realtime bootstrap returned invalid JSON.') }
    const answer = value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>).answerSdp
      : null
    if (typeof answer !== 'string') throw new Error('Realtime bootstrap did not return an SDP answer.')
    return answer
  }
  return body
}

export function createBrowserRealtimeDependencies(input: Readonly<{
  assessmentSessionId: string
  remoteAudio: AudioSink
  endpoint?: string
  fetch?: typeof globalThis.fetch
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  createPeerConnection?: () => RTCPeerConnection
}>): RealtimeControllerDependencies {
  const assessmentSessionId = input.assessmentSessionId.trim()
  if (!assessmentSessionId || assessmentSessionId.length > 100) throw new Error('Assessment session id is required.')
  const fetchImpl = input.fetch ?? globalThis.fetch.bind(globalThis)
  const getUserMedia = input.getUserMedia
    ?? (constraints => navigator.mediaDevices.getUserMedia(constraints))
  const createPeerConnection = input.createPeerConnection ?? (() => new RTCPeerConnection())

  return Object.freeze({
    networkAccess: 'provider' as const,
    async getUserMedia() {
      return await getUserMedia({ audio: true }) as unknown as RealtimeMediaStream
    },
    createPeerConnection() {
      return createPeerConnection() as unknown as RealtimePeerConnection
    },
    async exchangeSdp(offerSdp) {
      if (!/^v=0(?:\r?\n|$)/.test(offerSdp) || offerSdp.length > MAX_SDP_BYTES || offerSdp.includes('\0')) {
        throw new Error('Realtime SDP offer is invalid.')
      }
      const response = await fetchImpl(input.endpoint ?? '/api/ai-path/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentSessionId, sdp: offerSdp }),
        cache: 'no-store',
        credentials: 'same-origin',
      })
      const body = await readBoundedText(response, MAX_SDP_BYTES + 1_000)
      if (!response.ok) throw new Error('Realtime bootstrap is unavailable.')
      const answer = answerSdp(response, body).trim()
      if (!/^v=0(?:\r?\n|$)/.test(answer) || answer.length > MAX_SDP_BYTES || answer.includes('\0')) {
        throw new Error('Realtime SDP answer is invalid.')
      }
      return answer
    },
    async attachRemoteAudio(stream) {
      if (!stream) {
        input.remoteAudio.pause()
        input.remoteAudio.srcObject = null
        return
      }
      input.remoteAudio.autoplay = true
      input.remoteAudio.srcObject = stream as MediaStream
      await input.remoteAudio.play().catch(() => undefined)
    },
  })
}
